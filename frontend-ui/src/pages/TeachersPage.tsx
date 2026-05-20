import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherService, subjectService } from '../services/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const TeachersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', max_slots_per_week: 25, qualified_subjects: [] as string[] });

  const { data: teachers, isLoading, isError, error } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });

  const createMutation = useMutation({
    mutationFn: teacherService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsAdding(false);
      setFormData({ name: '', max_slots_per_week: 25, qualified_subjects: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => teacherService.update(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setEditingId(null);
      setIsAdding(false);
      setFormData({ name: '', max_slots_per_week: 25, qualified_subjects: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teacherService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
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
    setFormData({ name: '', max_slots_per_week: 25, qualified_subjects: [] });
    setIsAdding(true);
  };

  const startEditing = (teacher: any) => {
    setEditingId(teacher.id);
    setFormData({
      name: teacher.name,
      max_slots_per_week: teacher.max_slots_per_week,
      qualified_subjects: teacher.qualified_subjects || []
    });
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', max_slots_per_week: 25, qualified_subjects: [] });
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (isError) return (
    <div className="bg-red-50 p-4 rounded-lg text-red-700 border border-red-200">
      <h3 className="font-bold">Error loading teachers</h3>
      <p>{(error as any)?.message || 'An unexpected error occurred'}</p>
      <button 
        onClick={() => queryClient.invalidateQueries({ queryKey: ['teachers'] })}
        className="mt-2 text-sm font-medium underline"
      >
        Try again
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Teachers</h2>
        <button
          onClick={startAdding}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>Add Teacher</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Teacher' : 'Add New Teacher'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium text-gray-700">Max Slots Per Week</label>
              <input
                type="number"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={formData.max_slots_per_week}
                onChange={(e) => setFormData({ ...formData, max_slots_per_week: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Qualified Subjects</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {subjects?.map(s => (
                  <label key={s.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={formData.qualified_subjects.includes(s.id)}
                      onChange={(e) => {
                        const newSubjs = e.target.checked
                          ? [...formData.qualified_subjects, s.id]
                          : formData.qualified_subjects.filter(id => id !== s.id);
                        setFormData({ ...formData, qualified_subjects: newSubjs });
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-600">{s.name}</span>
                  </label>
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

      <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Slots</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subjects</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teachers?.map((t) => (
              <tr key={t.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{t.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{t.max_slots_per_week}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {t.qualified_subjects?.length || 0} subjects
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button 
                    onClick={() => startEditing(t)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(t.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeachersPage;
