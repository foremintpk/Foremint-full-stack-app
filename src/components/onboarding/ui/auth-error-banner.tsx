'use client';

import { AlertCircle } from 'lucide-react';

interface AuthErrorBannerProps {
  type: 'email_exists_password' | 'email_exists_google' | 'generic';
  message: string;
  onSignInClick?: () => void; // shows inline sign-in if email exists
}

export function AuthErrorBanner({ type, message, onSignInClick }: AuthErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-[0.125rem] border border-red-200 bg-red-50 px-4 py-3 animate-in fade-in zoom-in-95"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
      <div className="flex-1">
        <p className="text-sm font-bold text-red-700 font-inter">
          {message}
        </p>
        {(type === 'email_exists_password' || type === 'email_exists_google') && onSignInClick && (
          <button
            onClick={onSignInClick}
            className="mt-1 text-sm font-black uppercase tracking-widest text-[#34088f] underline underline-offset-4 hover:text-[#2a0672] transition-colors font-manrope"
          >
            {type === 'email_exists_google' ? 'Sign in with Google instead' : 'Sign in here'}
          </button>
        )}
      </div>
    </div>
  );
}
