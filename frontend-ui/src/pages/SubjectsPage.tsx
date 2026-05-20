import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectService } from '../services/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../utils/cn';
import { PRESET_COLORS, getNextUnusedColor } from '../utils/colors';

const SubjectsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', requires_double_period: false, color: PRESET_COLORS[0] });

  const { data: subjects, isLoading, isError, error } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });

  const createMutation = useMutation({
    mutationFn: subjectService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setIsAdding(false);
      setFormData({ name: '', requires_double_period: false, color: PRESET_COLORS[0] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => subjectService.update(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setEditingId(null);
      setIsAdding(false);
      setFormData({ name: '', requires_double_period: false, color: PRESET_COLORS[0] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: subjectService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate names
    const isDuplicate = subjects?.some(s => 
      s.name.toLowerCase() === formData.name.toLowerCase() && s.id !== editingId
    );
    
    if (isDuplicate) {
      alert('A subject with this name already exists.');
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
    const usedColors = subjects?.map(s => s.color) || [];
    setFormData({ name: '', requires_double_period: false, color: getNextUnusedColor(usedColors) });
    setIsAdding(true);
  };

  const startEditing = (subject: any) => {
    setEditingId(subject.id);
    const usedColors = subjects?.map(s => s.color) || [];
    setFormData({
      name: subject.name,
      requires_double_period: subject.requires_double_period,
      color: subject.color || getNextUnusedColor(usedColors)
    });
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', requires_double_period: false, color: PRESET_COLORS[0] });
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark"></div>
    </div>
  );

  if (isError) return (
    <div className="bg-red-50 p-6 rounded-3xl text-red-700 border border-red-100">
      <h3 className="font-bold">Error loading subjects</h3>
      <p>{(error as any)?.message || 'An unexpected error occurred'}</p>
      <button 
        onClick={() => queryClient.invalidateQueries({ queryKey: ['subjects'] })}
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
          <h2 className="text-4xl font-bold text-gray-900">Subjects</h2>
          <div className="flex items-center space-x-4 mt-4">
            <div className="bg-brand-dark text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center space-x-2">
              <span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></span>
              <span>{subjects?.length || 0} Total</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={startAdding}
            className="flex items-center space-x-2 bg-brand-primary text-brand-dark px-6 py-2.5 rounded-full font-bold hover:brightness-95 transition-all shadow-sm"
          >
            <Plus size={20} />
            <span>Add Subject</span>
          </button>
        </div>
      </div>

      <Modal 
        isOpen={isAdding} 
        onClose={cancelForm} 
        title={editingId ? 'Edit Subject' : 'Add New Subject'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Name</label>
              <input
                type="text"
                required
                className="block w-full rounded-full border border-gray-200 px-4 py-2.5 focus:border-brand-primary focus:ring-brand-primary"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="flex items-center h-full pt-8">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.requires_double_period}
                    onChange={(e) => setFormData({ ...formData, requires_double_period: e.target.checked })}
                  />
                  <div className={cn("block w-14 h-8 rounded-full transition-colors", formData.requires_double_period ? 'bg-brand-primary' : 'bg-gray-200')}></div>
                  <div className={cn("absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform", formData.requires_double_period ? 'translate-x-6' : '')}></div>
                </div>
                <span className="ml-3 text-sm font-bold text-gray-700">Requires Double Period</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-4 ml-1">Color Theme</label>
            <div className="flex flex-wrap gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={cn(
                    "w-10 h-10 rounded-full border-4 transition-all hover:scale-110",
                    formData.color === color ? "border-brand-dark shadow-md" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
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

      <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] overflow-hidden border border-white/50 shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100/50">
              <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Properties</th>
              <th className="px-8 py-5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50/50">
            {subjects?.map((s) => (
              <tr key={s.id} className="hover:bg-brand-secondary/30 transition-colors group">
                <td className="px-8 py-5 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm" 
                      style={{ backgroundColor: s.color || '#cbd5e1' }}
                    />
                    <span className="text-sm font-bold text-gray-900">{s.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                  {s.requires_double_period ? (
                    <span className="bg-brand-secondary text-brand-dark px-3 py-1 rounded-full text-xs font-bold border border-brand-primary/20">Double Period</span>
                  ) : (
                    <span className="bg-gray-100 text-gray-400 px-3 py-1 rounded-full text-xs font-bold">Single Period</span>
                  )}
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEditing(s)}
                      className="p-2 text-gray-400 hover:text-brand-dark hover:bg-brand-primary rounded-full transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteMutation.mutate(s.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-full transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
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
