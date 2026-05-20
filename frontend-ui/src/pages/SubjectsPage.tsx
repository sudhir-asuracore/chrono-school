import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectService } from '../services/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const SubjectsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', requires_double_period: false });

  const { data: subjects, isLoading, isError, error } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });

  const createMutation = useMutation({
    mutationFn: subjectService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setIsAdding(false);
      setFormData({ name: '', requires_double_period: false });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => subjectService.update(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setEditingId(null);
      setIsAdding(false);
      setFormData({ name: '', requires_double_period: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: subjectService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
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
    setFormData({ name: '', requires_double_period: false });
    setIsAdding(true);
  };

  const startEditing = (subject: any) => {
    setEditingId(subject.id);
    setFormData({
      name: subject.name,
      requires_double_period: subject.requires_double_period
    });
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', requires_double_period: false });
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (isError) return (
    <div className="bg-red-50 p-4 rounded-lg text-red-700 border border-red-200">
      <h3 className="font-bold">Error loading subjects</h3>
      <p>{(error as any)?.message || 'An unexpected error occurred'}</p>
      <button 
        onClick={() => queryClient.invalidateQueries({ queryKey: ['subjects'] })}
        className="mt-2 text-sm font-medium underline"
      >
        Try again
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Subjects</h2>
        <button
          onClick={startAdding}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          <span>Add Subject</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Subject' : 'Add New Subject'}</h3>
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
            <div className="flex items-center">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={formData.requires_double_period}
                onChange={(e) => setFormData({ ...formData, requires_double_period: e.target.checked })}
              />
              <label className="ml-2 block text-sm text-gray-700">Requires Double Period</label>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Double Period</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subjects?.map((s) => (
              <tr key={s.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{s.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {s.requires_double_period ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Yes</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">No</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button 
                    onClick={() => startEditing(s)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(s.id)}
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

export default SubjectsPage;
