'use client';

import React, { useState, useTransition } from 'react';
import { AddonCategory } from '@/types/admin';
import { createAddonCategory, updateAddonCategory, deleteAddonCategory } from '@/lib/admin/actions/addonActions';
import { X, Plus, Edit2, Trash2, Check, Loader2 } from 'lucide-react';

interface AddonCategoryModalProps {
  categories: AddonCategory[];
  onClose: () => void;
}

export function AddonCategoryModal({ categories, onClose }: AddonCategoryModalProps) {
  const [isPending, startTransition] = useTransition();
  const [newCatName, setNewCatName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  // Inline delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setError(null);
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', newCatName.trim());
      const res = await createAddonCategory(formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        setNewCatName('');
      }
    });
  };

  const startEdit = (cat: AddonCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setDeletingId(null);
    setError(null);
  };

  const handleUpdate = (id: string) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', editingName.trim());
      const res = await updateAddonCategory(id, formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        setEditingId(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await deleteAddonCategory(id);
      if (res && res.error) {
        setError(res.error);
      } else {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-inter">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#e0d9f7] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0d9f7] bg-[#f4f0fe] shrink-0 rounded-t-2xl">
          <h3 className="text-base font-bold text-gray-900 font-manrope">
            Manage Categories
          </h3>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Create New Form */}
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              disabled={isPending}
              placeholder="New category name"
              className="flex-1 h-10 px-4 bg-white border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all"
            />
            <button
              type="submit"
              disabled={isPending || !newCatName.trim()}
              className="h-10 px-4 bg-[#34088f] text-white rounded-full text-sm font-medium transition-all disabled:opacity-50 hover:bg-[#34088f]/90 flex flex-shrink-0 items-center gap-1.5"
            >
              {isPending && newCatName.trim() ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </form>

          {/* Categories List */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-4">
                No categories yet.
              </p>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-transparent hover:border-[#e0d9f7] transition-colors group">
                  
                  {editingId === cat.id ? (
                    // Editing Mode
                    <div className="flex-1 flex items-center gap-2 mr-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={isPending}
                        className="flex-1 h-8 px-3 text-sm bg-white border border-[#34088f] rounded-lg outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdate(cat.id)}
                        disabled={isPending}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={isPending}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : deletingId === cat.id ? (
                    // Deleting Mode
                    <div className="flex-1 flex items-center justify-between mr-2">
                      <span className="text-sm text-red-600 font-medium">Delete?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(cat.id)}
                          disabled={isPending}
                          className="px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1"
                        >
                          {isPending && deletingId === cat.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          Yes
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          disabled={isPending}
                          className="px-3 py-1 text-xs font-bold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Default View Mode
                    <>
                      <div 
                        className="flex-1 cursor-text" 
                        onClick={() => startEdit(cat)}
                      >
                        <span className="text-sm text-gray-900 font-medium select-none">
                          {cat.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => startEdit(cat)}
                          className="p-1.5 text-gray-400 hover:text-[#34088f] hover:bg-[#f4f0fe] rounded-full transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingId(cat.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
