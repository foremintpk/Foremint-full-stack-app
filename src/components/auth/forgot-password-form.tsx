'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState, useEffect, useState, startTransition } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Loader2, Shield, ShieldCheck, SendHorizonal } from 'lucide-react';
import { forgotPasswordAction, type ActionResult } from '@/actions/auth';

const cn = (...inputs: Array<string | false | null | undefined>) =>
  inputs.filter(Boolean).join(' ');

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    forgotPasswordAction,
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.error);
  }, [state]);

  const sent = state?.success === true;

  const handleSubmit = (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!email.trim()) { setEmailError('Email address is required.'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Please enter a valid email address.'); return; }
    const fd = new FormData();
    fd.append('email', email);
    startTransition(() => { formAction(fd); });
  };

  return (
    <main className="flex h-dvh max-h-dvh w-full overflow-hidden bg-[#34078F]">

      {/* ── DESKTOP ── */}
      <div className="relative hidden h-dvh w-full overflow-hidden bg-[#F4F1FF] lg:flex items-center justify-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(52,7,143,0.18)_1px,transparent_1px)] bg-[length:20px_20px] opacity-50" />

        <div className="relative z-10 flex flex-col w-full max-w-[480px] px-14">
          <div className="mb-7">
            <Image src="/logo_blue.png" alt="ForeMint" width={150} height={34} className="h-7 w-auto object-contain" />
          </div>

          <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(52,7,143,0.12)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#34078F]">
            <Shield size={11} strokeWidth={2.4} />
            Secure password reset
          </div>

          <h1 className="m-0 text-[38px] font-extrabold leading-[1.05] tracking-[-0.025em] text-slate-900">
            Forgot your{' '}
            <span className="text-[#34078F]">password?</span>
          </h1>
          <p className="mb-7 mt-2 max-w-[400px] text-[13.5px] leading-[1.55] text-slate-500">
            Enter your email address and we&apos;ll send you a secure link to reset your password.
          </p>

          {sent ? (
            <div className="rounded-[14px] border border-[rgba(52,7,143,0.15)] bg-[rgba(52,7,143,0.05)] p-5">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#34078F] text-white">
                  <SendHorizonal size={15} />
                </div>
                <span className="text-[14px] font-bold text-slate-900">Check your inbox</span>
              </div>
              <p className="text-[13px] leading-[1.55] text-slate-500">
                We&apos;ve sent a reset link to{' '}
                <strong className="text-slate-700">{email}</strong>.
                Check your spam folder if you don&apos;t see it within a minute.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label htmlFor="fp-email-desktop" className="mb-1.5 block text-[12.5px] font-bold text-slate-800">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="fp-email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    placeholder="name@company.com"
                    className={cn(
                      'box-border h-11 w-full rounded-[11px] border-[1.5px] border-slate-200 bg-white pl-10 pr-3.5 text-[13.5px] text-slate-900 outline-none shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:border-[#34078F] transition-colors',
                      emailError && '!border-red-500'
                    )}
                  />
                </div>
                {emailError && <p className="mt-1 text-[11.5px] text-red-600">{emailError}</p>}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-[11px] border-none bg-gradient-to-br from-[#1F0566] to-[#34078F] text-[13.5px] font-bold text-white shadow-[0_10px_24px_rgba(52,7,143,0.30)] disabled:cursor-not-allowed disabled:opacity-70 transition-opacity"
              >
                {isPending ? (
                  <><Loader2 size={15} className="animate-spin" />Sending…</>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>
          )}

          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#34078F] no-underline hover:underline"
          >
            <ArrowLeft size={13} />
            Back to sign in
          </Link>

          <div className="mt-6 flex items-center gap-2 text-[11.5px] font-medium text-[#34078F]">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(52,7,143,0.14)] text-[#34078F]">
              <ShieldCheck size={11} strokeWidth={2.5} />
            </span>
            Your data is encrypted and secure
          </div>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="relative flex h-dvh w-full flex-col overflow-hidden lg:hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#34078F_0%,#280670_50%,#1F0550_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:36px_36px]" />

        <div className="relative z-10 flex flex-shrink-0 flex-col items-center pb-[35px] pt-2.5">
          <h1
            className="m-0 mt-5 text-center text-[clamp(2rem,9vw,2.75rem)] font-black leading-[1.05] tracking-[-0.025em] text-white"
            style={{ fontFamily: 'Manrope, Inter, sans-serif' }}
          >
            Forgot Password
          </h1>
          <p className="mt-2 text-center text-sm font-medium text-white/65">
            We&apos;ll send you a reset link
          </p>
        </div>

        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden rounded-t-[28px] bg-white/[0.98] shadow-[0_-8px_60px_rgba(8,2,36,0.45)]">
            <div className="flex-1 overflow-y-auto p-8">

              {sent ? (
                <div className="flex flex-col items-center justify-center gap-4 py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#34078F] text-white">
                    <SendHorizonal size={22} />
                  </div>
                  <div className="text-center">
                    <p className="mb-1 text-base font-bold text-slate-900">Check your inbox</p>
                    <p className="text-sm leading-[1.5] text-slate-500">
                      Reset link sent to{' '}
                      <strong className="text-slate-700">{email}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="fp-email-mobile" className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gray-500">
                      Email address
                    </label>
                    <input
                      id="fp-email-mobile"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isPending}
                      autoComplete="email"
                      placeholder="name@company.com"
                      className={cn(
                        'box-border h-11 w-full rounded-lg border-[1.5px] border-gray-200 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none shadow-[0_2px_8px_rgba(31,24,65,0.06)] focus:border-[#34078F] transition-colors',
                        emailError && '!border-red-400'
                      )}
                    />
                    {emailError && <p className="mt-1 text-[0.7rem] font-semibold text-red-600">{emailError}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-gradient-to-br from-[#1F0566] to-[#34078F] text-sm font-bold text-white shadow-[0_10px_28px_rgba(52,7,143,0.38)] disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Sending…' : 'Send reset link'}
                  </button>
                </form>
              )}

              <Link
                href="/login"
                className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-[#34078F] no-underline"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>

            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
