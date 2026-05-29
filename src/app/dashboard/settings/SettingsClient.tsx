'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateCustomerProfile,
  updateCustomerEmail,
  updateCustomerPassword,
} from '@/lib/dashboard/actions';
import {
  User, Mail, Lock, Loader2, Check, AlertCircle, Save, Eye, EyeOff
} from 'lucide-react';

function Card({ title, description, icon: Icon, children }: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#34088f]/5 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#34088f]" />
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900 font-manrope">{title}</h3>
          {description && <p className="text-xs text-gray-500 font-inter mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function InputField({ label, id, ...props }: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1.5 font-inter">{label}</label>
      <input
        id={id}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-inter bg-gray-50 focus:bg-white focus:border-[#34088f] focus:ring-1 focus:ring-[#34088f]/20 outline-none transition-all"
        {...props}
      />
    </div>
  );
}

function PasswordField({ label, id, value, onChange }: {
  label: string; id: string; value: string; onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-1.5 font-inter">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-4 py-2.5 pr-11 rounded-xl border border-gray-200 text-sm font-inter bg-gray-50 focus:bg-white focus:border-[#34088f] focus:ring-1 focus:ring-[#34088f]/20 outline-none transition-all"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ResultBanner({ result }: { result: { type: 'success' | 'error'; msg: string } | null }) {
  if (!result) return null;
  return (
    <div className={`p-3 rounded-xl text-xs font-inter flex items-center gap-2 ${
      result.type === 'success'
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-red-50 text-red-600 border border-red-200'
    }`}>
      {result.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {result.msg}
    </div>
  );
}

interface Props {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
}

export default function SettingsClient({ userId, fullName, email, phone }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 font-manrope">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1 font-inter">Manage your profile, email, and password.</p>
      </div>

      <ProfileSection userId={userId} initialName={fullName} initialPhone={phone} />
      <EmailSection email={email} />
      <PasswordSection />
    </div>
  );
}

// ── Profile Section ────────────────────────────────────────────────────────
function ProfileSection({ userId, initialName, initialPhone }: {
  userId: string; initialName: string; initialPhone: string;
}) {
  const [name, setName] = useState(initialName);
  const [phoneVal, setPhoneVal] = useState(initialPhone);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      setResult(null);
      const res = await updateCustomerProfile(userId, name.trim(), phoneVal.trim() || null);
      if (res.success) {
        setResult({ type: 'success', msg: 'Profile updated successfully.' });
        router.refresh();
      } else {
        setResult({ type: 'error', msg: res.error || 'Update failed' });
      }
    });
  };

  return (
    <Card title="Profile Information" description="Update your display name and phone number." icon={User}>
      <div className="space-y-4 max-w-lg">
        <ResultBanner result={result} />
        <InputField
          label="Full Name"
          id="fullName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your full name"
        />
        <InputField
          label="Phone Number"
          id="phone"
          value={phoneVal}
          onChange={(e) => setPhoneVal(e.target.value)}
          placeholder="+1 (555) 000-0000"
        />
        <button
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#34088f] text-white text-sm font-semibold hover:bg-[#2a0673] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </Card>
  );
}

// ── Email Section ──────────────────────────────────────────────────────────
function EmailSection({ email }: { email: string }) {
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(async () => {
      setResult(null);
      const fd = new FormData();
      fd.set('newEmail', newEmail);
      fd.set('confirmEmail', confirmEmail);
      fd.set('currentPassword', password);
      const res = await updateCustomerEmail(fd);
      if (res.requiresReLogin) {
        router.push('/login?reason=email_changed');
      } else if (res.error) {
        setResult({ type: 'error', msg: res.error });
      }
    });
  };

  return (
    <Card title="Email Address" description={`Current email: ${email}`} icon={Mail}>
      <div className="space-y-4 max-w-lg">
        <ResultBanner result={result} />
        <InputField
          label="New Email"
          id="newEmail"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="new@example.com"
        />
        <InputField
          label="Confirm New Email"
          id="confirmEmail"
          type="email"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          placeholder="new@example.com"
        />
        <PasswordField
          label="Current Password"
          id="emailCurrentPassword"
          value={password}
          onChange={setPassword}
        />
        <button
          onClick={handleSubmit}
          disabled={isPending || !newEmail || !confirmEmail || !password}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#34088f] text-white text-sm font-semibold hover:bg-[#2a0673] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Update Email
        </button>
      </div>
    </Card>
  );
}

// ── Password Section ───────────────────────────────────────────────────────
function PasswordSection() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const router = useRouter();

  const handleSubmit = () => {
    startTransition(async () => {
      setResult(null);
      const fd = new FormData();
      fd.set('currentPassword', currentPw);
      fd.set('newPassword', newPw);
      fd.set('confirmPassword', confirmPw);
      const res = await updateCustomerPassword(fd);
      if (res.requiresReLogin) {
        router.push('/login?reason=password_changed');
      } else if (res.error) {
        setResult({ type: 'error', msg: res.error });
      }
    });
  };

  return (
    <Card title="Change Password" description="Update your account password." icon={Lock}>
      <div className="space-y-4 max-w-lg">
        <ResultBanner result={result} />
        <PasswordField label="Current Password" id="currentPassword" value={currentPw} onChange={setCurrentPw} />
        <PasswordField label="New Password" id="newPassword" value={newPw} onChange={setNewPw} />
        <PasswordField label="Confirm New Password" id="confirmPassword" value={confirmPw} onChange={setConfirmPw} />
        <button
          onClick={handleSubmit}
          disabled={isPending || !currentPw || !newPw || !confirmPw}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#34088f] text-white text-sm font-semibold hover:bg-[#2a0673] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-inter"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Update Password
        </button>
      </div>
    </Card>
  );
}
