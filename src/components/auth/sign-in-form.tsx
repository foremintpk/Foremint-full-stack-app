'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useRef, useState, startTransition, Suspense } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Loader2,
  Shield,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  LayoutGrid,
  TrendingUp,
} from 'lucide-react';
import { loginAction } from '@/actions/auth';
import { createClient } from '@/lib/supabase/client';

const cn = (...inputs: Array<string | false | null | undefined>) =>
  inputs.filter(Boolean).join(' ');

function AccountDisabledDetector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    if (searchParams.get('reason') === 'account-disabled') {
      shown.current = true;
      toast.error(
        'Your account has been deactivated by an administrator. Please contact support if you believe this is a mistake.',
        { duration: 8000 }
      );
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}

/*
  Brand colour: #34078F (replaces all previous blues/indigos/purples)
  - #34078F  = rgb(52, 7, 143)
  - shades used for gradients:
      #1F0566  = darker   (gradient stop)
      #280670  = mid      (mobile bg gradient)
      #1F0550  = darkest  (mobile bg gradient)
*/

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [clientErrors, setClientErrors] = useState<{ email?: string; password?: string }>({});
  const [state, formAction, isPending] = useActionState(loginAction, null);

  /* prevent scroll */
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  /* restore remembered email */
  useEffect(() => {
    const t = window.setTimeout(() => {
      const saved = localStorage.getItem('foremint_remember_email');
      if (localStorage.getItem('foremint_remember_me') === 'true' && saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  /* handle server result */
  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message || 'Signed in successfully.');
      if (rememberMe) {
        localStorage.setItem('foremint_remember_email', email);
        localStorage.setItem('foremint_remember_me', 'true');
      } else {
        localStorage.removeItem('foremint_remember_email');
        localStorage.removeItem('foremint_remember_me');
      }
      return;
    }
    toast.error(state.error);
  }, [state, rememberMe, email]);

  const emailError =
    clientErrors.email ||
    (state?.success === false && state.errorType === 'email' ? state.error : null);
  const passwordError =
    clientErrors.password ||
    (state?.success === false && state.errorType === 'password' ? state.error : null);
  const generalError =
    state?.success === false &&
      (state.errorType === 'network' || state.errorType === 'general')
      ? state.error : null;
  const loading = isPending || googleLoading;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = 'Email address is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Please enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (Object.keys(errors).length > 0) { setClientErrors(errors); return; }
    setClientErrors({});
    const fd = new FormData();
    fd.append('email', email);
    fd.append('password', password);
    startTransition(() => {
      formAction(fd);
    });
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    if (error) {
      setGoogleLoading(false);
      toast.error('Google sign-in could not start. Please try again.');
    }
  };

  return (
    <main className="flex h-dvh max-h-dvh w-full overflow-hidden bg-[#34078F]">
      <Suspense fallback={null}>
        <AccountDisabledDetector />
      </Suspense>

      {/* =========================================================
          DESKTOP EXPERIENCE
      ========================================================= */}
      <div className="relative hidden h-dvh w-full gap-9 overflow-hidden bg-[#F4F1FF] py-7 pr-7 lg:flex">
        {/* Dot pattern background overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(52,7,143,0.18)_1px,transparent_1px)] bg-[length:20px_20px] opacity-50" />

        {/* ════════════════ LEFT PANEL — FORM ════════════════ */}
        <div className="relative z-10 flex min-h-0 w-[35%] min-w-[500px] flex-col py-2 pl-14 pr-5 justify-center">
          {/* Logo */}
          <div className="mb-7">
            <Image
              src="/logo_blue.png"
              alt="ForeMint"
              width={150}
              height={34}
              className="h-7 w-auto object-contain"
            />
          </div>
          <div>
            {/* Badge */}
            <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[rgba(52,7,143,0.12)] bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#34078F]">
              <Shield size={11} strokeWidth={2.4} />
              Secure. Simple. Powerful.
            </div>

            {/* Heading */}
            <h1 className="m-0 text-[38px] font-extrabold leading-[1.05] tracking-[-0.025em] text-slate-900">
              Welcome{' '}
              <span className="text-[#34078F]">Back</span>
            </h1>

            <p className="mb-5 mt-2 max-w-[420px] text-[13.5px] leading-[1.55] text-slate-500">
              Sign in to your account and continue managing your
              companies with ease.
            </p>

            {generalError && (
              <div className="mb-3 rounded-[10px] bg-red-50 p-2.5 text-[12.5px] font-semibold text-red-600">
                {generalError}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3"
            >
              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email-desktop"
                  className="mb-1.5 block text-[12.5px] font-bold text-slate-800"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="name@company.com"
                    className={cn(
                      'box-border h-11 w-full rounded-[11px] border-[1.5px] border-slate-200 bg-white pl-10 pr-3.5 text-[13.5px] text-slate-900 outline-none shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
                      emailError && '!border-red-500'
                    )}
                  />
                </div>

                {emailError && (
                  <p className="mt-1 text-[11.5px] text-red-600">{emailError}</p>
                )}
              </div>

              {/* PASSWORD */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="password-desktop"
                    className="text-[12.5px] font-bold text-slate-800"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-[11.5px] font-bold text-[#34078F] no-underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="password-desktop"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Enter your password"
                    className={cn(
                      'box-border h-11 w-full rounded-[11px] border-[1.5px] border-slate-200 bg-white pl-10 pr-[42px] text-[13.5px] text-slate-900 outline-none shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
                      passwordError && '!border-red-500'
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

                {passwordError && (
                  <p className="mt-1 text-[11.5px] text-red-600">{passwordError}</p>
                )}
              </div>

              {/* Remember me */}
              <label className="mt-0.5 flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-[14px] w-[14px] cursor-pointer accent-[#34078F]"
                />
                Remember me
              </label>

              {/* Sign in button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-[11px] border-none bg-gradient-to-br from-[#1F0566] to-[#34078F] text-[13.5px] font-bold text-white shadow-[0_10px_24px_rgba(52,7,143,0.30)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              {/* OR divider */}
              <div className="my-0.5 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[10.5px] font-bold tracking-[0.05em] text-slate-400">
                  OR
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-[11px] border-[1.5px] border-slate-200 bg-white text-[13.5px] font-bold text-gray-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {googleLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {googleLoading ? 'Opening Google…' : 'Continue with Google'}
              </button>

              {/* Signup link */}
              <p className="mt-0.5 text-center text-[12.5px] text-slate-500">
                Don&apos;t have an account?{' '}
                <Link
                  href="/onboarding"
                  className="font-bold text-[#34078F] no-underline"
                >
                  Sign up now
                </Link>
              </p>
              {/* Footer — encrypted message (sibling of form so mt-auto works) */}
              <div className="mt-auto flex items-center justify-center gap-2 pt-3 text-[11.5px] font-medium text-[#34078F]">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(52,7,143,0.14)] text-[#34078F]">
                  <ShieldCheck size={11} strokeWidth={2.5} />
                </span>
                Your data is encrypted and secure
              </div>

            </form>
          </div>
        </div>


        {/* ════════════════ RIGHT PANEL — IMAGE + FEATURES ════════════════ */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-[18px]">
          {/* Image card */}
          <div className="relative min-h-0 min-w-0 flex-1">
            <Image
              src="/loginImage.webp"
              alt="ForeMint Dashboard"
              fill
              priority
              sizes="(min-width: 1024px) 100vw, 100vw"
              className="object-cover object-center w-[85%]"
            />
          </div>

          {/* Bottom 3 features */}
          <div className="grid flex-shrink-0 grid-cols-3 gap-5">
            {/* 1 — All-in-One Dashboard */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-white text-[#34078F] shadow-[0_4px_10px_rgba(52,7,143,0.12)]">
                <LayoutGrid size={17} strokeWidth={2.3} />
              </div>
              <div>
                <div className="mb-[3px] text-[13px] font-bold text-slate-900">
                  All-in-One Dashboard
                </div>
                <div className="text-[11px] leading-[1.5] text-slate-500">
                  Manage your LLCs, billing, and compliance in one place.
                </div>
              </div>
            </div>

            {/* 2 — Real-Time Insights */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-white text-[#34078F] shadow-[0_4px_10px_rgba(52,7,143,0.12)]">
                <TrendingUp size={17} strokeWidth={2.3} />
              </div>
              <div>
                <div className="mb-[3px] text-[13px] font-bold text-slate-900">
                  Real-Time Insights
                </div>
                <div className="text-[11px] leading-[1.5] text-slate-500">
                  Stay updated with important alerts and deadlines.
                </div>
              </div>
            </div>

            {/* 3 — Secure & Reliable */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-white text-[#34078F] shadow-[0_4px_10px_rgba(52,7,143,0.12)]">
                <Shield size={17} strokeWidth={2.3} />
              </div>
              <div>
                <div className="mb-[3px] text-[13px] font-bold text-slate-900">
                  Secure &amp; Reliable
                </div>
                <div className="text-[11px] leading-[1.5] text-slate-500">
                  Enterprise-grade security for your peace of mind.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE  –  full screen (unchanged visually, converted to Tailwind)
          ═══════════════════════════════════════════════════════════ */}
      <div className="relative flex h-dvh w-full flex-col overflow-hidden lg:hidden">
        {/* Background: purple gradient (uses #34078F + darker shades) */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#34078F_0%,#280670_50%,#1F0550_100%)]" />
        {/* Grid pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:36px_36px]" />


        {/* Purple hero zone */}
        <div className="relative z-10 flex flex-shrink-0 flex-col items-center pb-[35px] pt-2.5">
          <h1
            className="m-0 mt-5 text-center text-[clamp(2rem,9vw,2.75rem)] font-black leading-[1.05] tracking-[-0.025em] text-white"
            style={{ fontFamily: 'Manrope, Inter, sans-serif' }}
          >
            Sign In
          </h1>
          <p className="mt-2 text-center text-sm font-medium text-white/65">
            Its nice to see you Again
          </p>
        </div>

        {/* White card — no horizontal margin, rounded top only */}
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden rounded-t-[28px] bg-white/[0.98] shadow-[0_-8px_60px_rgba(8,2,36,0.45)]">
            <div className="flex-1 overflow-y-auto p-8">
              {/* Form area */}
              <div className="flex flex-1 flex-col justify-center">
                {generalError && (
                  <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">
                    {generalError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email-mobile"
                      className="mb-1.5 block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gray-500"
                    >
                      Email
                    </label>
                    <input
                      id="email-mobile"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                      placeholder="name@company.com"
                      className={cn(
                        'box-border h-11 w-full rounded-lg border-[1.5px] border-gray-200 bg-white px-3.5 text-sm font-medium text-slate-900 outline-none shadow-[0_2px_8px_rgba(31,24,65,0.06)]',
                        emailError && '!border-red-400'
                      )}
                    />
                    {emailError && (
                      <p className="mt-1 text-[0.7rem] font-semibold text-red-600">{emailError}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label
                        htmlFor="password-mobile"
                        className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-gray-500"
                      >
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs font-bold text-[#34078F] no-underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="password-mobile"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className={cn(
                          'box-border h-11 w-full rounded-lg border-[1.5px] border-gray-200 bg-white pl-3.5 pr-11 text-sm font-medium text-slate-900 outline-none shadow-[0_2px_8px_rgba(31,24,65,0.06)]',
                          passwordError && '!border-red-400'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={loading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center border-none bg-transparent text-gray-400"
                      >
                        {showPassword ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="mt-1 text-[0.7rem] font-semibold text-red-600">{passwordError}</p>
                    )}
                  </div>

                  {/* Remember me */}
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="h-[15px] w-[15px] accent-[#34078F]"
                    />
                    Remember me
                  </label>

                  {/* Sign in */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-gradient-to-br from-[#1F0566] to-[#34078F] text-sm font-bold text-white shadow-[0_10px_28px_rgba(52,7,143,0.38)] disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Signing in…' : 'Sign in'}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-gray-200" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">or</span>
                    <span className="h-px flex-1 bg-gray-200" />
                  </div>

                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-gray-200 bg-white text-sm font-bold text-gray-800 shadow-[0_2px_8px_rgba(31,24,65,0.06)] disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    )}
                    {googleLoading ? 'Opening Google…' : 'Continue with Google'}
                  </button>
                </form>
              </div>

              {/* Signup */}
              <p className="mt-5 text-center text-sm font-medium text-gray-500">
                Don&apos;t have an account?{' '}
                <Link href="/onboarding" className="font-black text-[#34078F] no-underline">
                  Signup Now
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
