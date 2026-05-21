import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherService, subjectService, levelService } from '../services/api';
import { Plus, Trash2, Edit2, Calendar, AlertCircle, Award } from 'lucide-react';
import Modal from '../components/Modal';
import AvailabilityMatrix from '../components/AvailabilityMatrix';
import { cn } from '../utils/cn';
import { PRESET_COLORS, getNextUnusedColor } from '../utils/colors';

import { TeacherQualification } from '../types';

const TeachersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    max_slots_per_week: 25,
    qualifications: [] as (TeacherQualification & { _id?: string })[],
    color: PRESET_COLORS[0],
    availability_matrix: [] as boolean[][]
  });
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const { data: teachers, isLoading, isError, error } = useQuery({ queryKey: ['teachers'], queryFn: teacherService.getAll });
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: subjectService.getAll });
  const { data: levels } = useQuery({ queryKey: ['levels'], queryFn: levelService.getAll });

  const createMutation = useMutation({
    mutationFn: teacherService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setIsAdding(false);
      setFormData({ name: '', max_slots_per_week: 25, qualifications: [], color: PRESET_COLORS[0], availability_matrix: [] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => teacherService.update(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      setEditingId(null);
      setIsAdding(false);
      setFormData({ name: '', max_slots_per_week: 25, qualifications: [], color: PRESET_COLORS[0], availability_matrix: [] });
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

    const dataToSubmit = {
      ...formData,
      qualifications: formData.qualifications.map(({ _id, ...q }) => q)
    };

    if (editingId) {
      updateMutation.mutate(dataToSubmit);
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const startAdding = () => {
    setEditingId(null);
    const usedColors = teachers?.map(t => t.color) || [];
    setFormData({
      name: '',
      max_slots_per_week: 25,
      qualifications: [],
      color: getNextUnusedColor(usedColors),
      availability_matrix: Array(5).fill(null).map(() => Array(8).fill(true))
    });
    setIsAdding(true);
  };

  const startEditing = (teacher: any) => {
    setEditingId(teacher.id);
    const usedColors = teachers?.map(t => t.color) || [];
    setFormData({
      name: teacher.name,
      max_slots_per_week: teacher.max_slots_per_week,
      qualifications: (teacher.qualifications || []).map((q: any) => ({ ...q, _id: Math.random().toString(36).substr(2, 9) })),
      color: teacher.color || getNextUnusedColor(usedColors),
      availability_matrix: teacher.availability_matrix || Array(5).fill(null).map(() => Array(8).fill(true))
    });
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setHighlightedId(null);
    setFormData({ name: '', max_slots_per_week: 25, qualifications: [], color: PRESET_COLORS[0], availability_matrix: [] });
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
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-bold text-gray-700 ml-1">Qualifications (Subject + Level)</label>
              <button
                type="button"
                onClick={() => {
                  if (subjects && subjects.length > 0 && levels && levels.length > 0) {
                    const newId = Math.random().toString(36).substr(2, 9);
                    setFormData({
                      ...formData,
                      qualifications: [{ subject_id: subjects[0].id, level_id: levels[0].id, _id: newId }, ...formData.qualifications]
                    });
                    setHighlightedId(newId);
                    setTimeout(() => setHighlightedId(null), 2000);
                  }
                }}
                className="bg-white px-4 py-1.5 rounded-full text-xs font-bold text-brand-dark shadow-sm border border-gray-100 hover:bg-gray-50"
              >
                + Add Qualification
              </button>
            </div>
            <div className="space-y-3">
              {formData.qualifications.map((qual, index) => (
                <div 
                  key={qual._id || index} 
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-2xl border transition-all duration-500",
                    highlightedId === qual._id 
                      ? "bg-brand-primary/20 border-brand-primary scale-[1.02] shadow-sm" 
                      : "bg-gray-50 border-gray-100"
                  )}
                >
                  <select
                    className="flex-1 rounded-full border border-gray-200 px-4 py-2 focus:border-brand-primary focus:ring-brand-primary text-sm appearance-none bg-white"
                    value={qual.subject_id}
                    onChange={(e) => {
                      const newQuals = [...formData.qualifications];
                      newQuals[index] = { ...newQuals[index], subject_id: e.target.value };
                      setFormData({ ...formData, qualifications: newQuals });
                    }}
                  >
                    {subjects?.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <select
                    className="flex-1 rounded-full border border-gray-200 px-4 py-2 focus:border-brand-primary focus:ring-brand-primary text-sm appearance-none bg-white"
                    value={qual.level_id}
                    onChange={(e) => {
                      const newQuals = [...formData.qualifications];
                      newQuals[index] = { ...newQuals[index], level_id: e.target.value };
                      setFormData({ ...formData, qualifications: newQuals });
                    }}
                  >
                    {levels?.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const newQuals = [...formData.qualifications];
                      newQuals.splice(index, 1);
                      setFormData({ ...formData, qualifications: newQuals });
                    }}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {formData.qualifications.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  No qualifications added yet.
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-4 ml-1">Availability Matrix</label>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <AvailabilityMatrix
                value={formData.availability_matrix}
                onChange={(m) => setFormData({ ...formData, availability_matrix: m })}
              />
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
              <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Qualifications</th>
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
                    {t.is_stale && (
                      <AlertCircle 
                        size={16} 
                        className="text-orange-500 cursor-help animate-pulse" 
                        title="Some of this teacher's qualified subjects have been deleted. Please review their qualifications." 
                      />
                    )}
                  </div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500 font-medium">
                  <span className="bg-gray-100 px-3 py-1 rounded-full">{t.max_slots_per_week} hrs</span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <span className="font-bold text-brand-dark">{t.qualifications?.length || 0}</span>
                    <span>active</span>
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
                      onClick={() => setDeleteConfirmation({ id: t.id, name: t.name })}
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
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-6">
          <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
            <p className="text-red-800 font-medium">
              Are you sure you want to delete teacher <span className="font-black underline">{deleteConfirmation?.name}</span>?
            </p>
            <p className="text-red-600 text-sm mt-2">
              This action cannot be undone. If this teacher is part of any saved timetables, those tables will be marked as stale.
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                if (deleteConfirmation) {
                  deleteMutation.mutate(deleteConfirmation.id);
                  setDeleteConfirmation(null);
                }
              }}
              className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-black hover:bg-red-600 transition-all shadow-lg shadow-red-200 active:scale-95"
            >
              Yes, Delete
            </button>
            <button
              onClick={() => setDeleteConfirmation(null)}
              className="flex-1 bg-gray-100 text-gray-900 py-4 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TeachersPage;
