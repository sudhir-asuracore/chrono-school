import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomService } from '../services/api';
import { Plus, Trash2, Edit2, MapPin } from 'lucide-react';
import Modal from '../components/Modal';
import { cn } from '../utils/cn';

const RoomsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', type: 'General' });

  const { data: rooms, isLoading, isError, error } = useQuery({ queryKey: ['rooms'], queryFn: roomService.getAll });

  const createMutation = useMutation({
    mutationFn: roomService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsAdding(false);
      setFormData({ name: '', type: 'General' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => roomService.update(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setEditingId(null);
      setIsAdding(false);
      setFormData({ name: '', type: 'General' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: roomService.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
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
    setFormData({ name: '', type: 'General' });
    setIsAdding(true);
  };

  const startEditing = (room: any) => {
    setEditingId(room.id);
    setFormData({
      name: room.name,
      type: room.type,
    });
    setIsAdding(true);
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', type: 'General' });
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark"></div>
    </div>
  );

  if (isError) return (
    <div className="bg-red-50 p-6 rounded-3xl text-red-700 border border-red-100">
      <h3 className="font-bold">Error loading rooms</h3>
      <p>{(error as any)?.message || 'An unexpected error occurred'}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-bold text-gray-900">Rooms</h2>
          <div className="flex items-center space-x-4 mt-4">
            <div className="bg-brand-dark text-white px-4 py-1.5 rounded-full text-sm font-medium flex items-center space-x-2">
              <span>{rooms?.length || 0} Total</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={startAdding}
          className="flex items-center space-x-2 bg-brand-primary text-brand-dark px-6 py-2.5 rounded-full font-bold hover:brightness-95 transition-all shadow-sm"
        >
          <Plus size={20} />
          <span>Add Room</span>
        </button>
      </div>

      <Modal 
        isOpen={isAdding} 
        onClose={cancelForm} 
        title={editingId ? 'Edit Room' : 'Add New Room'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Name</label>
            <input
              type="text"
              required
              className="block w-full rounded-full border border-gray-200 px-4 py-2.5 focus:border-brand-primary focus:ring-brand-primary"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Science Lab 1"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Type</label>
            <select
              className="block w-full rounded-full border border-gray-200 px-4 py-2.5 focus:border-brand-primary focus:ring-brand-primary appearance-none"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="General">General Classroom</option>
              <option value="Science Lab">Science Lab</option>
              <option value="IT Lab">IT Lab</option>
              <option value="Gym">Gym/Field</option>
              <option value="Music Room">Music Room</option>
              <option value="Art Studio">Art Studio</option>
            </select>
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
              <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Room Name</th>
              <th className="px-8 py-5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
              <th className="px-8 py-5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50/50">
            {rooms?.map((r) => (
              <tr key={r.id} className="hover:bg-brand-secondary/30 transition-colors group">
                <td className="px-8 py-5 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="bg-brand-secondary p-2 rounded-full text-brand-dark">
                      <MapPin size={16} />
                    </div>
                    <span className="text-sm font-bold text-gray-900">{r.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 whitespace-nowrap">
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                    {r.type}
                  </span>
                </td>
                <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEditing(r)}
                      className="p-2 text-gray-400 hover:text-brand-dark hover:bg-brand-primary rounded-full transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => deleteMutation.mutate(r.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-full transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rooms?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-8 py-10 text-center text-gray-400 italic">
                  No rooms defined. Add a room to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoomsPage;
