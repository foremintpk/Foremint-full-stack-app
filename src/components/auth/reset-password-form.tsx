'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState, useEffect, useState, startTransition } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, Loader2, Shield, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { resetPasswordAction, type ActionResult } from '@/actions/auth';

const cn = (...inputs: Array<string | false | null | undefined>) =>
  inputs.filter(Boolean).join(' ');

function strengthLevel(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  if (pw.length < 8) return 1;
  if (pw.length < 10) return 2;
  if (pw.length < 12) return 3;
  return 4;
}

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;
const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'] as const;

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    resetPasswordAction,
    null
  );

  useEffect(() => {
    if (state?.success === false) toast.error(state.error);
  }, [state]);

  const strength = strengthLevel(password);

  const handleSubmit = (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    const errs: { password?: string; confirm?: string } = {};
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 8) errs.password = 'Must be at least 8 characters.';
    if (password !== confirmPassword) errs.confirm = 'Passwords do not match.';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    const fd = new FormData();
    fd.append('password', password);
    fd.append('confirmPassword', confirmPassword);
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
            Secure password update
          </div>

          <h1 className="m-0 text-[38px] font-extrabold leading-[1.05] tracking-[-0.025em] text-slate-900">
            Set a new{' '}
            <span className="text-[#34078F]">password</span>
          </h1>
          <p className="mb-7 mt-2 max-w-[400px] text-[13.5px] leading-[1.55] text-slate-500">
            Choose a strong password for your account. It must be at least 8 characters long.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* New password */}
            <div>
              <label htmlFor="rp-password-desktop" className="mb-1.5 block text-[12.5px] font-bold text-slate-800">
                New password
              </label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="rp-password-desktop"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                  placeholder="Min. 8 characters"
                  className={cn(
                    'box-border h-11 w-full rounded-[11px] border-[1.5px] border-slate-200 bg-white pl-10 pr-[42px] text-[13.5px] text-slate-900 outline-none shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:border-[#34078F] transition-colors',
                    errors.password && '!border-red-500'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 flex h-[34px] w-[34px] -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent text-slate-400"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-[11.5px] text-red-600">{errors.password}</p>}

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {([1, 2, 3, 4] as const).map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          i <= strength ? strengthColor[strength] : 'bg-slate-200'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 w-10 text-right">
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="rp-confirm-desktop" className="mb-1.5 block text-[12.5px] font-bold text-slate-800">
                Confirm password
              </label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="rp-confirm-desktop"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isPending}
                  placeholder="Repeat your password"
                  className={cn(
                    'box-border h-11 w-full rounded-[11px] border-[1.5px] border-slate-200 bg-white pl-10 pr-[42px] text-[13.5px] text-slate-900 outline-none shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus:border-[#34078F] transition-colors',
                    errors.confirm && '!border-red-500'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-1 top-1/2 flex h-[34px] w-[34px] -translate-y-1/2 cursor-pointer items-center justify-center border-none bg-transparent text-slate-400"
                >
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.confirm && <p className="mt-1 text-[11.5px] text-red-600">{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-[11px] border-none bg-gradient-to-br from-[#1F0566] to-[#34078F] text-[13.5px] font-bold text-white shadow-[0_10px_24px_rgba(52,7,143,0.30)] disabled:cursor-not-allowed disabled:opacity-70 transition-opacity"
            >
              {isPending ? (
                <><Loader2 size={15} className="animate-spin" />Updating…</>
              ) : (
                <><CheckCircle2 size={15} />Update password</>
              )}
            </button>
          </form>

          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#34078F] no-underline hover:underline"
          >
            Back to sign in
          </Link>

          <div className="mt-4 flex items-center gap-2 text-[11.5px] font-medium text-[#34078F]">
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
            New Password
          </h1>
          <p className="mt-2 text-center text-sm font-medium text-white/65">
            Choose a strong, secure password
          </p>
        </div>

        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden rounded-t-[28px] bg-white/[0.98] shadow-[0_-8px_60px_rgba(8,2,36,0.45)]">
            <div className="flex-1 overflow-y-auto p-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">

                {/* New password */}
                <div>
                  <label htmlFor="rp-password-mobile" className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gray-500">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="rp-password-mobile"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isPending}
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                      className={cn(
                        'box-border h-11 w-full rounded-lg border-[1.5px] border-gray-200 bg-white pl-3.5 pr-11 text-sm font-medium text-slate-900 outline-none shadow-[0_2px_8px_rgba(31,24,65,0.06)] focus:border-[#34078F] transition-colors',
                        errors.password && '!border-red-400'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isPending}
                      className="absolute right-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center border-none bg-transparent text-gray-400"
                    >
                      {showPassword ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-[0.7rem] font-semibold text-red-600">{errors.password}</p>}

                  {password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {([1, 2, 3, 4] as const).map((i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 flex-1 rounded-full transition-colors',
                              i <= strength ? strengthColor[strength] : 'bg-slate-200'
                            )}
                          />
                        ))}
                      </div>
                      <span className="w-10 text-right text-[11px] font-semibold text-slate-500">
                        {strengthLabel[strength]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label htmlFor="rp-confirm-mobile" className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gray-500">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="rp-confirm-mobile"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isPending}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      className={cn(
                        'box-border h-11 w-full rounded-lg border-[1.5px] border-gray-200 bg-white pl-3.5 pr-11 text-sm font-medium text-slate-900 outline-none shadow-[0_2px_8px_rgba(31,24,65,0.06)] focus:border-[#34078F] transition-colors',
                        errors.confirm && '!border-red-400'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      disabled={isPending}
                      className="absolute right-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center border-none bg-transparent text-gray-400"
                    >
                      {showConfirm ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                    </button>
                  </div>
                  {errors.confirm && <p className="mt-1 text-[0.7rem] font-semibold text-red-600">{errors.confirm}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-gradient-to-br from-[#1F0566] to-[#34078F] text-sm font-bold text-white shadow-[0_10px_28px_rgba(52,7,143,0.38)] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPending ? 'Updating…' : 'Update password'}
                </button>
              </form>

              <Link
                href="/login"
                className="mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-[#34078F] no-underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}
