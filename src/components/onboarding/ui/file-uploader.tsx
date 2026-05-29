'use client';

import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { FieldError } from './field-error';

interface FileUploaderProps {
  label: string;
  tempSessionKey: string;
  uploadType: 'passport' | 'payment_receipt';
  memberIndex?: number;
  currentUrl?: string;
  onUploadComplete: (result: {
    url: string;
    publicId: string;
    fileName: string;
    slotKey: string;
  }) => void;
  onRemove: () => void;
  error?: string;
}

export function FileUploader({
  label,
  tempSessionKey,
  uploadType,
  memberIndex,
  currentUrl,
  onUploadComplete,
  onRemove,
  error,
}: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate client-side
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('temp_session_key', tempSessionKey);
    formData.append('upload_type', uploadType);
    if (memberIndex !== undefined) formData.append('member_index', memberIndex.toString());

    try {
      const res = await fetch('/api/onboarding/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json() as {
        success?: boolean;
        url?: string;
        publicId?: string;
        fileName?: string;
        slotKey?: string;
        error?: string;
      };
      if (result.success && result.url) {
        onUploadComplete({
          url: result.url,
          publicId: result.publicId ?? result.url,
          fileName: result.fileName ?? file.name,
          slotKey:
            result.slotKey ??
            (memberIndex !== undefined
              ? `member_${memberIndex}_passport`
              : `${uploadType}_${Date.now()}`),
        });
      } else {
        setUploadError(result.error || 'Upload failed. Please try again.');
      }
    } catch (err) {
      setUploadError('An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadError(null);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-bold text-gray-700 font-inter">
        {label} <span className="text-[#34088f]">*</span>
      </label>

      <div 
        onClick={() => !isUploading && !currentUrl && fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-sm p-8 transition-all duration-300 text-center cursor-pointer",
          currentUrl ? "border-[#10B981] bg-[#F0FDF4]/50" : "border-gray-200 hover:border-[#34088f] hover:bg-[#F5F0FF]/30",
          isUploading && "opacity-60 cursor-wait",
          (error || uploadError) && "border-[#EF4444] bg-[#FEF2F2]"
        )}
      >
        <input 
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          disabled={isUploading || !!currentUrl}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95">
            <Loader2 className="w-8 h-8 text-[#34088f] animate-spin" />
            <span className="text-[12px] font-black uppercase tracking-widest text-[#34088f] font-manrope">Uploading Document...</span>
          </div>
        ) : currentUrl ? (
          <div className="flex flex-col items-center gap-3 animate-in zoom-in-95">
            <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
            <div className="flex flex-col">
              <span className="text-[12px] font-black uppercase tracking-widest text-[#10B981] font-manrope">Document Uploaded</span>
              <button 
                onClick={clearFile}
                className="text-[11px] font-bold text-gray-400 hover:text-[#EF4444] underline mt-1 font-inter"
              >
                Remove and replace
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-gray-300" />
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-black font-inter">Click to upload or drag and drop</span>
              <span className="text-[11px] font-medium text-gray-400 font-inter">Passport, ID, or Drivers License (PDF, JPG, PNG up to 10MB)</span>
            </div>
          </div>
        )}
      </div>

      <FieldError error={error || uploadError || undefined} />
    </div>
  );
}
