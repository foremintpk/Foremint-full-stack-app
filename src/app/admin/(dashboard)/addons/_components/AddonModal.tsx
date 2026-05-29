'use client';

import React, { useState, useTransition } from 'react';
import { Addon, AddonCategory, AddonStatus } from '@/types/admin';
import { createAddon, updateAddon } from '@/lib/admin/actions/addonActions';
import { X, Loader2 } from 'lucide-react';

interface AddonModalProps {
  mode: 'create' | 'edit';
  addon?: Addon;
  categories: AddonCategory[];
  onClose: () => void;
}

export function AddonModal({ mode, addon, categories, onClose }: AddonModalProps) {
  const [name, setName] = useState(addon?.name || '');
  const [price, setPrice] = useState(addon?.price !== undefined ? String(addon.price) : '');
  const [featuresRaw, setFeaturesRaw] = useState(addon?.features ? addon.features.join('\n') : '');
  const [status, setStatus] = useState<AddonStatus>(addon?.status || 'draft');
  const [categoryIds, setCategoryIds] = useState<string[]>(
    addon?.categories.map(c => c.id) || []
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCategoryToggle = (id: string) => {
    setCategoryIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!price || isNaN(Number(price)) || Number(price) < 0) {
      setError('Please enter a valid price >= 0.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('price', price);
      formData.append('featuresRaw', featuresRaw.trim());
      formData.append('status', status);
      
      categoryIds.forEach(id => {
        formData.append('categoryIds', id);
      });

      let res;
      if (mode === 'create') {
        res = await createAddon(formData);
      } else {
        res = await updateAddon(addon!.id, formData);
      }

      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in font-inter">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-[#e0d9f7] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e0d9f7] bg-[#f4f0fe] rounded-t-2xl shrink-0">
          <h3 className="text-base font-bold text-gray-900 font-manrope">
            {mode === 'create' ? 'Create Addon' : 'Edit Addon'}
          </h3>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 flex-1">
          <form id="addon-form" onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label htmlFor="addon-name" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Name
              </label>
              <input
                id="addon-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                placeholder="e.g. Expedited Processing"
                className="block w-full h-10 px-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all"
                required
              />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label htmlFor="addon-price" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Price
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 text-sm font-medium">
                  $
                </span>
                <input
                  id="addon-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isPending}
                  placeholder="0.00"
                  className="block w-full h-10 pl-8 pr-4 border border-[#e0d9f7] rounded-full text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Categories Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Categories
              </label>
              <div className="rounded-2xl border border-[#e0d9f7] p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50/50">
                {categories.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No categories yet. Create one first.
                  </p>
                ) : (
                  categories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={categoryIds.includes(cat.id)}
                        onChange={() => handleCategoryToggle(cat.id)}
                        disabled={isPending}
                        className="w-4 h-4 rounded border-gray-300 text-[#34088f] focus:ring-[#34088f] accent-[#34088f]"
                      />
                      <span className="text-sm text-gray-700 select-none">
                        {cat.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Features Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="addon-features" className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Features
              </label>
              <textarea
                id="addon-features"
                value={featuresRaw}
                onChange={(e) => setFeaturesRaw(e.target.value)}
                disabled={isPending}
                placeholder="One feature per line"
                rows={4}
                className="block w-full p-4 border border-[#e0d9f7] rounded-2xl text-sm text-[#111111] placeholder-[#9ca3af] outline-none focus:border-[#34088f] focus:ring-2 focus:ring-[#34088f]/20 transition-all resize-none"
              />
              <p className="text-[10px] text-gray-400 pl-1">
                Each line becomes a bullet point.
              </p>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Status
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  disabled={isPending}
                  className={`flex-1 h-10 rounded-full text-sm font-medium transition-colors ${
                    status === 'draft'
                      ? 'bg-[#34088f] text-white shadow-sm'
                      : 'bg-white border border-[#e0d9f7] text-gray-600 hover:border-[#34088f] hover:text-[#34088f]'
                  }`}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('published')}
                  disabled={isPending}
                  className={`flex-1 h-10 rounded-full text-sm font-medium transition-colors ${
                    status === 'published'
                      ? 'bg-[#34088f] text-white shadow-sm'
                      : 'bg-white border border-[#e0d9f7] text-gray-600 hover:border-[#34088f] hover:text-[#34088f]'
                  }`}
                >
                  Published
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e0d9f7] bg-gray-50 rounded-b-2xl shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-5 py-2.5 text-xs font-bold text-gray-700 bg-white border border-[#e0d9f7] rounded-full hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            form="addon-form"
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 text-xs font-bold text-white bg-[#34088f] hover:bg-[#34088f]/90 rounded-full transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {mode === 'create' ? 'Create Addon' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
