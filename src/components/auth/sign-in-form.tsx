'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState, startTransition } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { loginAction } from '@/actions/auth';
import { createClient } from '@/lib/supabase/client';

export function SignInForm() {
  const router = useRouter();
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

  const handleBack = () => {
    router.replace('/');
  };

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
    /**
     * PAGE ROOT
     * Background = deep purple (this is the "accent" colour visible
     * around all four sides of the floating card)
     */
    <main
      style={{
        display: 'flex',
        width: '100%',
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        background: '#21067B',
      }}
    >

      {/* ═══════════════════════════════════════════════════════════
          DESKTOP  –  LEFT COLUMN  40%
          Purple background (from <main>) shows as "accent border"
          around the floating white card.
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:flex-col"
        style={{
          position: 'relative',
          width: '40%',
          flexShrink: 0,
          height: '100dvh',
          overflow: 'hidden',
          /* add padding so purple bg peeks around the card */
          padding: '16px',
        }}
      >
        {/* Subtle grid on the purple bg */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.055) 1px,transparent 1px)',
            backgroundSize: '44px 44px',
            pointerEvents: 'none',
          }}
        />
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '-20%', left: '-20%',
            width: '80%', height: '70%',
            background: 'radial-gradient(circle,rgba(139,92,246,0.3) 0%,transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* ── FLOATING CARD ── */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.98)',
            boxShadow: '0 32px 100px rgba(8,2,36,0.55)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              padding: '32px 36px',
            }}
          >
            {/* Logo + back btn row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* <Image
                src="/logo_blue.png"
                alt="Foremint"
                width={150}
                height={32}
                style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
              /> */}
              <button
                type="button"
                onClick={handleBack}
                aria-label="Go back"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(52,8,143,0.08)',
                  color: '#34088f',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(52,8,143,0.16)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(52,8,143,0.08)')}
              >
                <ArrowLeft style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Heading */}


            {/* Form — centred in the remaining space */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: '8px' }}>
              {generalError && (
                <div style={{ marginBottom: '16px', borderRadius: '8px', background: '#fff1f2', padding: '12px 16px', fontSize: '0.875rem', color: '#be123c', fontWeight: 500 }}>
                  {generalError}
                </div>
              )}
              <div style={{ marginTop: '32px' }}>
                <h1
                  style={{
                    fontFamily: 'Manrope, Inter, sans-serif',
                    fontWeight: 900,
                    fontSize: 'clamp(2rem,3.2vw,2.75rem)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.025em',
                    color: '#0f0820',
                    margin: 0,
                  }}
                >
                  Sign In
                </h1>
                <p style={{ marginTop: '8px', marginBottom: '32px', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>
                  Its nice to see you Again
                </p>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Email */}
                <div>
                  <label htmlFor="email-desktop" style={{ display: 'block', marginBottom: '6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                    Email
                  </label>
                  <input
                    id="email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                    placeholder="name@company.com"
                    style={{
                      height: '46px', width: '100%', borderRadius: '8px',
                      background: '#fff', padding: '0 16px',
                      fontSize: '0.875rem', fontWeight: 500, color: '#0f172a',
                      outline: 'none', boxSizing: 'border-box',
                      border: emailError ? '1.5px solid #f87171' : '1.5px solid #e5e7eb',
                      boxShadow: '0 2px 10px rgba(31,24,65,0.06)',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = emailError ? '#f87171' : '#34088f')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = emailError ? '#f87171' : '#e5e7eb')}
                  />
                  {emailError && <p style={{ marginTop: '4px', fontSize: '0.7rem', fontWeight: 600, color: '#dc2626' }}>{emailError}</p>}
                </div>

                {/* Password */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label htmlFor="password-desktop" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                      Password
                    </label>
                    <Link href="/forgot-password" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34088f', textDecoration: 'none' }}>
                      Forgot password?
                    </Link>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password-desktop"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      style={{
                        height: '46px', width: '100%', borderRadius: '8px',
                        background: '#fff', padding: '0 48px 0 16px',
                        fontSize: '0.875rem', fontWeight: 500, color: '#0f172a',
                        outline: 'none', boxSizing: 'border-box',
                        border: passwordError ? '1.5px solid #f87171' : '1.5px solid #e5e7eb',
                        boxShadow: '0 2px 10px rgba(31,24,65,0.06)',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = passwordError ? '#f87171' : '#34088f')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = passwordError ? '#f87171' : '#e5e7eb')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={loading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                    </button>
                  </div>
                  {passwordError && <p style={{ marginTop: '4px', fontSize: '0.7rem', fontWeight: 600, color: '#dc2626' }}>{passwordError}</p>}
                </div>

                {/* Remember me */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', cursor: 'pointer' }}>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={loading} style={{ width: '16px', height: '16px', accentColor: '#34088f' }} />
                  Remember me
                </label>

                {/* Sign in */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    height: '46px', width: '100%', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg,#5014c8 0%,#34088f 100%)',
                    boxShadow: '0 10px 28px rgba(52,8,143,0.38)',
                    color: '#fff', fontSize: '0.875rem', fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.65 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {isPending && <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />}
                  {isPending ? 'Signing in…' : 'Sign in'}
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                  <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9ca3af' }}>or</span>
                  <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                </div>

                {/* Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  style={{
                    height: '46px', width: '100%', borderRadius: '8px',
                    background: '#fff', border: '1.5px solid #e5e7eb',
                    boxShadow: '0 2px 10px rgba(31,24,65,0.06)',
                    fontSize: '0.875rem', fontWeight: 700, color: '#1f2937',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.65 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  }}
                >
                  {googleLoading ? (
                    <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
                  ) : (
                    <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  {googleLoading ? 'Opening Google…' : 'Continue with Google'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginTop: '0px' }}>
                  Don&apos;t have an account?{' '}
                  <Link href="/onboarding" style={{ fontWeight: 900, color: '#34088f', textDecoration: 'none' }}>
                    Signup Now
                  </Link>
                </p>
              </form>
            </div>

            {/* Signup link */}
            {/* <p style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginTop: '20px' }}>
              Don&apos;t have an account?{' '}
              <Link href="/onboarding" style={{ fontWeight: 900, color: '#34088f', textDecoration: 'none' }}>
                Signup Now
              </Link>
            </p> */}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          DESKTOP  –  RIGHT COLUMN  60%
          login_image.webp fills this + bleeds left under the card
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:block"
        style={{
          position: 'relative',
          flex: 1,
          height: '100dvh',
          overflow: 'hidden',
        }}
      >
        {/* Image: bleeds -60px left so it appears under the card's right edge */}
        <div style={{ position: 'absolute', inset: '-60px 0px -80px -60px', left: '-60px', right: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login_image.webp"
            alt="Foremint dashboard preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'left center',
              display: 'block',
            }}
          />
        </div>
        {/* Subtle left-edge fade so image blends into the card */}
        <div
          style={{
            position: 'absolute',
            top: 0, bottom: 0, left: 0,
            width: '80px',
            background: 'linear-gradient(to right, rgba(36,8,116,0.6) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE  –  full screen
          Top zone: purple bg + logo + heading (white)
          Bottom zone: white card, rounded top corners, no side padding
          ═══════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col lg:hidden"
        style={{
          width: '100%',
          height: '100dvh',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Background: purple gradient + grid */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,#3c10a6 0%,#260878 50%,#160452 100%)' }} />
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px)',
            backgroundSize: '36px 36px',
            pointerEvents: 'none',
          }}
        />
        {/* Back button */}
        <div style={{ marginBottom: '8px' }}>
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255, 255, 255, 1)', color: '#ffffffff',
              border: 'none', cursor: 'pointer',
            }}
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Image peek behind card at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '38%', opacity: 0.15, pointerEvents: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/login_image.webp" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} aria-hidden />
        </div>

        {/* Purple hero zone */}
        <div
          style={{
            position: 'relative', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            paddingTop: '10px', paddingBottom: '35px',
            flexShrink: 0,
          }}
        >

          {/* <Image src="/logo_white.png" alt="Foremint" width={140} height={30} style={{ height: '100px', width: '100%', objectFit: 'contain' }} /> */}
          <h1
            style={{
              fontFamily: 'Manrope, Inter, sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(2rem,9vw,2.75rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: '#fff',
              margin: '20px 0 0',
              textAlign: 'center',
            }}
          >
            Sign In
          </h1>
          <p style={{ marginTop: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
            Its nice to see you Again
          </p>
        </div>

        {/* White card — no horizontal margin, rounded top only */}
        <div style={{ position: 'relative', zIndex: 10, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.98)',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 60px rgba(8,2,36,0.45)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '32px 24px 32px',
              }}
            >


              {/* Form area */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
                {generalError && (
                  <div style={{ marginBottom: '16px', borderRadius: '8px', background: '#fff1f2', padding: '12px 16px', fontSize: '0.875rem', color: '#be123c', fontWeight: 500 }}>
                    {generalError}
                  </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Email */}
                  <div>
                    <label htmlFor="email-mobile" style={{ display: 'block', marginBottom: '6px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
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
                      style={{
                        height: '44px', width: '100%', borderRadius: '8px',
                        background: '#fff', padding: '0 14px',
                        fontSize: '0.875rem', fontWeight: 500, color: '#0f172a',
                        outline: 'none', boxSizing: 'border-box',
                        border: emailError ? '1.5px solid #f87171' : '1.5px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(31,24,65,0.06)',
                      }}
                    />
                    {emailError && <p style={{ marginTop: '4px', fontSize: '0.7rem', fontWeight: 600, color: '#dc2626' }}>{emailError}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label htmlFor="password-mobile" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6b7280' }}>
                        Password
                      </label>
                      <Link href="/forgot-password" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34088f', textDecoration: 'none' }}>
                        Forgot password?
                      </Link>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="password-mobile"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        style={{
                          height: '44px', width: '100%', borderRadius: '8px',
                          background: '#fff', padding: '0 44px 0 14px',
                          fontSize: '0.875rem', fontWeight: 500, color: '#0f172a',
                          outline: 'none', boxSizing: 'border-box',
                          border: passwordError ? '1.5px solid #f87171' : '1.5px solid #e5e7eb',
                          boxShadow: '0 2px 8px rgba(31,24,65,0.06)',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={loading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {showPassword ? <EyeOff style={{ width: '15px', height: '15px' }} /> : <Eye style={{ width: '15px', height: '15px' }} />}
                      </button>
                    </div>
                    {passwordError && <p style={{ marginTop: '4px', fontSize: '0.7rem', fontWeight: 600, color: '#dc2626' }}>{passwordError}</p>}
                  </div>

                  {/* Remember me */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', cursor: 'pointer' }}>
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={loading} style={{ width: '15px', height: '15px', accentColor: '#34088f' }} />
                    Remember me
                  </label>

                  {/* Sign in */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      height: '46px', width: '100%', borderRadius: '8px', border: 'none',
                      background: 'linear-gradient(135deg,#5014c8 0%,#34088f 100%)',
                      boxShadow: '0 10px 28px rgba(52,8,143,0.38)',
                      color: '#fff', fontSize: '0.875rem', fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    {isPending && <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />}
                    {isPending ? 'Signing in…' : 'Sign in'}
                  </button>

                  {/* Divider */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9ca3af' }}>or</span>
                    <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                  </div>

                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{
                      height: '46px', width: '100%', borderRadius: '8px',
                      background: '#fff', border: '1.5px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(31,24,65,0.06)',
                      fontSize: '0.875rem', fontWeight: 700, color: '#1f2937',
                      cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.65 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    }}
                  >
                    {googleLoading ? (
                      <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
                    ) : (
                      <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none">
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
              <p style={{ textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginTop: '20px' }}>
                Don&apos;t have an account?{' '}
                <Link href="/onboarding" style={{ fontWeight: 900, color: '#34088f', textDecoration: 'none' }}>
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
