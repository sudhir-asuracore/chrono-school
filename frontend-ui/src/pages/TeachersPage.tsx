import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherService, subjectService } from '../services/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../utils/cn';
import { PRESET_COLORS, getNextUnusedColor } from '../utils/colors';

const TeachersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', max_slots_per_week: 25, qualified_subjects: [] as string[], color: PRESET_COLORS[0] });

  const { data: teachers, isLoading, isError, error } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });

  const createMutation = useMutation({
    mutationFn: teacherService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsAdding(false);
      setFormData({ name: '', max_slots_per_week: 25, qualified_subjects: [], color: PRESET_COLORS[0] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => teacherService.update(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setEditingId(null);
      setIsAdding(false);
      setFormData({ name: '', max_slots_per_week: 25, qualified_subjects: [], color: PRESET_COLORS[0] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: teacherService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for duplicate names
    const isDuplicate = teachers?.some(t => 
      t.name.toLowerCase() === formData.name.toLowerCase() && t.id !== editingId
    );
    
    if (isDuplicate) {
      alert('A teacher with this name already exists.');
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
    const usedColors = teachers?.map(t => t.color) || [];
    setFormData({ name: '', max_slots_per_week: 25, qualified_subjects: [], color: getNextUnusedColor(usedColors) });
    setIsAdding(true);
  };

  const startEditing = (teacher: any) => {
    setEditingId(teacher.id);
    const usedColors = teachers?.map(t => t.color) || [];
    setFormData({
      name: teacher.name,
      max_slots_per_week: teacher.max_slots_per_week,
      qualified_subjects: teacher.qualified_subjects || [],
      color: teacher.color || getNextUnusedColor(usedColors)
    });
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', max_slots_per_week: 25, qualified_subjects: [], color: PRESET_COLORS[0] });
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark"></div>
    </div>
  );

  if (isError) return (
    <div className="bg-red-50 p-6 rounded-3xl text-red-700 border border-red-100">
      <h3 className="font-bold">Error loading teachers</h3>
      <p>{(error as any)?.message || 'An unexpected error occurred'}</p>
      <button 
        onClick={() => queryClient.invalidateQueries({ queryKey: ['teachers'] })}
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
          <h2 className="text-4xl font-bold text-gray-900">Teachers</h2>
          <div className="flex items-center space-x-4 mt-4">
            <div className="bg-brand-dark text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center space-x-2">
              <span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse"></span>
              <span>{teachers?.length || 0} Total</span>
            </div>
            <div className="bg-white border border-gray-100 px-4 py-1.5 rounded-full text-sm font-medium text-gray-500">
              Active
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search teachers..." 
              className="pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:border-brand-primary focus:ring-brand-primary bg-white/50"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
          <button
            onClick={startAdding}
            className="flex items-center space-x-2 bg-brand-primary text-brand-dark px-6 py-2.5 rounded-full font-bold hover:brightness-95 transition-all shadow-sm"
          >
            <Plus size={20} />
            <span>Add Teacher</span>
          </button>
        </div>
      </div>

      <Modal 
        isOpen={isAdding} 
        onClose={cancelForm} 
        title={editingId ? 'Edit Teacher' : 'Add New Teacher'}
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
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Max Slots Per Week</label>
              <input
                type="number"
                required
                className="block w-full rounded-full border border-gray-200 px-4 py-2.5 focus:border-brand-primary focus:ring-brand-primary"
                value={formData.max_slots_per_week}
                onChange={(e) => setFormData({ ...formData, max_slots_per_week: parseInt(e.target.value) })}
              />
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

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-4 ml-1">Qualified Subjects</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {subjects?.map(s => (
                <label key={s.id} className={cn(
                  "flex items-center justify-center px-4 py-2 rounded-full border text-sm font-medium cursor-pointer transition-all",
                  formData.qualified_subjects.includes(s.id)
                    ? "bg-brand-secondary border-brand-primary text-brand-dark"
                    : "bg-white border-gray-200 text-gray-600 hover:border-brand-primary"
                )}>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.qualified_subjects.includes(s.id)}
                    onChange={(e) => {
                      const newSubjs = e.target.checked
                        ? [...formData.qualified_subjects, s.id]
                        : formData.qualified_subjects.filter(id => id !== s.id);
                      setFormData({ ...formData, qualified_subjects: newSubjs });
                    }}
                  />
                  <span>{s.name}</span>
                </label>
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
              <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Max Slots</th>
              <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Subjects</th>
              <th className="px-8 py-5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50/50">
            {teachers?.map((t) => (
              <tr key={t.id} className="hover:bg-brand-secondary/30 transition-colors group">
                <td className="px-8 py-5 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm"
                      style={{ backgroundColor: t.color || '#cbd5e1' }}
                    >
                      {t.name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{t.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                  <span className="bg-gray-100 px-3 py-1 rounded-full">{t.max_slots_per_week} hrs</span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-brand-dark">{t.qualified_subjects?.length || 0}</span>
                    <span>qualified</span>
                  </div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEditing(t)}
                      className="p-2 text-gray-400 hover:text-brand-dark hover:bg-brand-primary rounded-full transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteMutation.mutate(t.id)}
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

export default TeachersPage;
