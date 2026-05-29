'use client';

import React, { useState } from 'react';
import { ExpenseCategory } from '@/types/admin';
import { createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from '@/lib/admin/actions/expenseActions';
import { X, Check, Trash2, Edit2 } from 'lucide-react';
import { ICON_EMOJI_MAP } from './ExpenseCategoryBadge';

interface ExpenseCategoryModalProps {
  categories: ExpenseCategory[];
  onClose: () => void;
}

export function ExpenseCategoryModal({ categories, onClose }: ExpenseCategoryModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Form State
  const [addName, setAddName] = useState('');
  const [addIcon, setAddIcon] = useState('');
  const [addColor, setAddColor] = useState('#6b7280');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('');

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError(null);

    const fd = new FormData();
    fd.append('name', addName);
    fd.append('icon', addIcon);
    fd.append('color', addColor);

    const res = await createExpenseCategory(fd);
    if (res.error) {
      setError(res.error);
    } else {
      setAddName('');
      setAddIcon('');
      setAddColor('#6b7280');
    }
    setIsAdding(false);
  };

  const startEdit = (cat: ExpenseCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setEditColor(cat.color);
    setError(null);
  };

  const saveEdit = async (id: string) => {
    setError(null);
    const fd = new FormData();
    fd.append('name', editName);
    fd.append('icon', editIcon);
    fd.append('color', editColor);

    const res = await updateExpenseCategory(id, fd);
    if (res.error) {
      setError(res.error);
    } else {
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    const res = await deleteExpenseCategory(id);
    if (res.error) {
      setError(res.error);
    }
    setDeletingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm font-inter select-text">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#e0d9f7] bg-[#f4f0fe] rounded-t-2xl shrink-0">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#34088f] font-manrope">Manage Categories</h2>
            <p className="text-xs text-[#34088f]/70 font-medium">Add, edit, or remove expense categories.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#34088f] hover:bg-[#34088f]/10 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto shrink">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Add Form */}
          <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-2xl border border-[#e0d9f7] mb-6 flex flex-col sm:flex-row gap-3 items-end">
            <div className="w-full sm:flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Server Costs"
                required
                className="w-full px-4 py-2 border border-[#e0d9f7] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#34088f]/20"
              />
            </div>
            <div className="w-full sm:flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Icon Name</label>
              <input
                type="text"
                value={addIcon}
                onChange={(e) => setAddIcon(e.target.value)}
                placeholder="e.g. package, monitor, zap"
                required
                className="w-full px-4 py-2 border border-[#e0d9f7] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#34088f]/20"
              />
            </div>
            <div className="shrink-0">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={addColor}
                onChange={(e) => setAddColor(e.target.value)}
                className="w-10 h-10 border border-[#e0d9f7] rounded-full cursor-pointer p-1 bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="w-full sm:w-auto h-10 px-5 bg-[#34088f] hover:bg-[#34088f]/90 text-white rounded-full text-sm font-bold transition-all shadow-[0_1px_4px_rgba(52,8,143,0.06)] disabled:opacity-50 shrink-0"
            >
              Add
            </button>
          </form>

          {/* List */}
          <div className="space-y-3">
            {categories.map((cat) => {
              const isEditing = editingId === cat.id;
              const isDeleting = deletingId === cat.id;
              const emoji = ICON_EMOJI_MAP[cat.icon] || '🏷️';

              if (isEditing) {
                return (
                  <div key={cat.id} className="flex flex-col sm:flex-row gap-3 items-center p-3 rounded-2xl border border-[#34088f]/30 bg-[#f4f0fe]/50">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full sm:flex-1 px-3 py-1.5 border border-[#e0d9f7] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#34088f]/20"
                    />
                    <input
                      type="text"
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="w-full sm:w-32 px-3 py-1.5 border border-[#e0d9f7] rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#34088f]/20"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-8 h-8 border border-[#e0d9f7] rounded-full cursor-pointer p-0.5 bg-white"
                      />
                      <button onClick={() => saveEdit(cat.id)} className="p-1.5 text-green-600 hover:bg-green-100 rounded-full transition-colors">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              }

              if (isDeleting) {
                return (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-2xl border border-red-200 bg-red-50 text-sm">
                    <span className="text-red-800 font-medium truncate pr-4">Delete "{cat.name}"?</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleDelete(cat.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold transition-colors">
                        Yes
                      </button>
                      <button onClick={() => setDeletingId(null)} className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-full font-bold transition-colors">
                        No
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-2xl border border-[#e0d9f7] hover:border-[#34088f]/30 transition-colors group">
                  <div className="flex items-center gap-3 truncate pr-4">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-semibold text-gray-900 truncate">{cat.name}</span>
                    <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-100 rounded-full shrink-0 hidden sm:inline-block">
                      {emoji} {cat.icon}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-500 hover:text-[#34088f] hover:bg-[#f4f0fe] rounded-full transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeletingId(cat.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {categories.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-500">
                No categories found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
