import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService, subjectService } from '../services/api';
import { Plus, Trash2, Edit2, Book } from 'lucide-react';
import { CurriculumItem } from '../types';

const ClassesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'secondary', curriculum: [] as CurriculumItem[] });

  const { data: classes, isLoading, isError, error: classError } = useQuery({ queryKey: ['classes'], queryFn: classService.getAll });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });

  const createMutation = useMutation({
    mutationFn: classService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setIsAdding(false);
      setFormData({ name: '', type: 'secondary', curriculum: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => classService.update(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setEditingId(null);
      setIsAdding(false);
      setFormData({ name: '', type: 'secondary', curriculum: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: classService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['classes'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const startAdding = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'secondary', curriculum: [] });
    setIsAdding(true);
  };

  const startEditing = (cls: any) => {
    setEditingId(cls.id);
    setFormData({
      name: cls.name,
      type: cls.type,
      curriculum: cls.curriculum || []
    });
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', type: 'secondary', curriculum: [] });
  };

  const addCurriculumItem = () => {
    if (subjects && subjects.length > 0) {
      setFormData({
        ...formData,
        curriculum: [...formData.curriculum, { subject_id: subjects[0].id, periods_per_week: 1 }]
      });
    }
  };

  const removeCurriculumItem = (index: number) => {
    const newCurriculum = [...formData.curriculum];
    newCurriculum.splice(index, 1);
    setFormData({ ...formData, curriculum: newCurriculum });
  };

  const updateCurriculumItem = (index: number, field: keyof CurriculumItem, value: string | number) => {
    const newCurriculum = [...formData.curriculum];
    newCurriculum[index] = { ...newCurriculum[index], [field]: value };
    setFormData({ ...formData, curriculum: newCurriculum });
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (isError) return (
    <div className="bg-red-50 p-4 rounded-lg text-red-700 border border-red-200">
      <h3 className="font-bold">Error loading classes</h3>
      <p>{(classError as any)?.message || 'An unexpected error occurred'}</p>
      <button 
        onClick={() => queryClient.invalidateQueries({ queryKey: ['classes'] })}
        className="mt-2 text-sm font-medium underline"
      >
        Try again
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Classes</h2>
        <button
          onClick={startAdding}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>Add Class</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Class' : 'Add New Class'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Curriculum</label>
                <button
                  type="button"
                  onClick={addCurriculumItem}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  + Add Subject
                </button>
              </div>
              <div className="space-y-2">
                {formData.curriculum.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <select
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={item.subject_id}
                      onChange={(e) => updateCurriculumItem(index, 'subject_id', e.target.value)}
                    >
                      {subjects?.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={item.periods_per_week}
                      onChange={(e) => updateCurriculumItem(index, 'periods_per_week', parseInt(e.target.value))}
                    />
                    <button
                      type="button"
                      onClick={() => removeCurriculumItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              >
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes?.map((c) => (
          <div key={c.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{c.name}</h3>
                <span className="text-xs font-medium text-gray-500 uppercase">{c.type}</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => startEditing(c)}
                  className="text-gray-400 hover:text-indigo-600"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Book size={16} className="mr-2" />
                <span className="font-medium">Curriculum</span>
              </div>
              {c.curriculum?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600">
                    {subjects?.find(s => s.id === item.subject_id)?.name || 'Unknown'}
                  </span>
                  <span className="font-semibold text-gray-900">{item.periods_per_week}p/w</span>
                </div>
              ))}
              {(!c.curriculum || c.curriculum.length === 0) && (
                <p className="text-xs text-gray-400 italic">No subjects assigned</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassesPage;
