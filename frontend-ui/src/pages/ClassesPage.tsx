import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService, subjectService } from '../services/api';
import { Plus, Trash2, Edit2, Book } from 'lucide-react';
import Modal from '../components/Modal';
import { CurriculumItem } from '../types';
import { cn } from '../utils/cn';

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
    
    // Check for duplicate names
    const isDuplicate = classes?.some(c => 
      c.name.toLowerCase() === formData.name.toLowerCase() && c.id !== editingId
    );
    
    if (isDuplicate) {
      alert('A class with this name already exists.');
      return;
    }

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
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark"></div>
    </div>
  );

  if (isError) return (
    <div className="bg-red-50 p-6 rounded-3xl text-red-700 border border-red-100">
      <h3 className="font-bold">Error loading classes</h3>
      <p>{(classError as any)?.message || 'An unexpected error occurred'}</p>
      <button
        onClick={() => queryClient.invalidateQueries({ queryKey: ['classes'] })}
        className="mt-4 px-4 py-2 bg-white rounded-full text-sm font-medium shadow-sm"
      >
        Try again
      </button>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-gray-900">Classes</h2>
          <div className="flex items-center space-x-4 mt-4">
            <div className="bg-brand-dark text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center space-x-2">
              <span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></span>
              <span>{classes?.length || 0} Total</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={startAdding}
            className="flex items-center space-x-2 bg-brand-primary text-brand-dark px-6 py-2.5 rounded-full font-bold hover:brightness-95 transition-all shadow-sm"
          >
            <Plus size={20} />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      <Modal 
        isOpen={isAdding} 
        onClose={cancelForm} 
        title={editingId ? 'Edit Class' : 'Add New Class'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Name</label>
              <input
                type="text"
                required
                className="block w-full rounded-full border border-brand-primary ring-brand-primary px-4 py-2.5 focus:border-brand-primary focus:ring-brand-primary"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Type</label>
              <select
                className="block w-full rounded-full border border-gray-200 px-4 py-2.5 focus:border-brand-primary focus:ring-brand-primary appearance-none bg-white"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-bold text-gray-700 ml-1">Curriculum</label>
              <button
                type="button"
                onClick={addCurriculumItem}
                className="bg-white px-4 py-1.5 rounded-full text-xs font-bold text-brand-dark shadow-sm border border-gray-100 hover:bg-gray-50"
              >
                + Add Subject
              </button>
            </div>
            <div className="space-y-3">
              {formData.curriculum.map((item, index) => (
                <div key={index} className="flex items-center space-x-3 animate-in slide-in-from-top-2 duration-200">
                  <select
                    className="flex-1 rounded-full border border-gray-200 px-4 py-2 focus:border-brand-primary focus:ring-brand-primary text-sm appearance-none bg-white"
                    value={item.subject_id}
                    onChange={(e) => updateCurriculumItem(index, 'subject_id', e.target.value)}
                  >
                    {subjects?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      className="w-20 rounded-full border border-gray-200 px-4 py-2 focus:border-brand-primary focus:ring-brand-primary text-sm"
                      value={item.periods_per_week}
                      onChange={(e) => updateCurriculumItem(index, 'periods_per_week', parseInt(e.target.value))}
                    />
                    <span className="text-xs font-bold text-gray-400 uppercase">P/W</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCurriculumItem(index)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {formData.curriculum.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm italic">
                  No subjects added to curriculum yet.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={cancelForm}
              className="px-6 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 text-sm font-bold text-brand-dark bg-brand-primary rounded-full hover:brightness-95 transition-all shadow-md"
            >
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {classes?.map((c) => (
          <div key={c.id} className="bg-white/80 backdrop-blur-sm p-8 rounded-[2.5rem] shadow-sm border border-white hover:shadow-md transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900">{c.name}</h3>
                <span className="inline-block mt-1 px-3 py-1 bg-brand-secondary text-brand-dark rounded-full text-[10px] font-black uppercase tracking-widest">{c.type}</span>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEditing(c)}
                  className="p-2 text-gray-400 hover:text-brand-dark hover:bg-brand-primary rounded-full transition-all"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-full transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                <Book size={14} className="mr-2" />
                <span>Curriculum</span>
              </div>
              <div className="grid gap-2">
                {c.curriculum?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-gray-50/50 px-4 py-2.5 rounded-2xl border border-gray-100/50">
                    <span className="text-sm font-bold text-gray-700">
                      {subjects?.find(s => s.id === item.subject_id)?.name || 'Unknown'}
                    </span>
                    <span className="text-xs font-black text-brand-dark bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">{item.periods_per_week}h</span>
                  </div>
                ))}
                {(!c.curriculum || c.curriculum.length === 0) && (
                  <p className="text-sm text-gray-400 italic text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">No subjects assigned</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassesPage;
