type EmailCheckResult =
  | { exists: false }
  | { exists: true; method: 'password' | 'google' | 'unknown' };

/**
 * Probes whether an email is already registered in Supabase Auth.
 * Uses a throwaway sign-in attempt — does NOT create or modify any account.
 * Never throws — always returns a typed result.
 */
export async function checkEmailExists(email: string): Promise<EmailCheckResult> {
  try {
    const res = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.toLowerCase().trim() }),
    });

    if (!res.ok) {
      return { exists: false };
    }

    const data = await res.json();
    if (data && typeof data.exists === 'boolean') {
      return {
        exists: data.exists,
        method: data.method || 'unknown',
      };
    }

    return { exists: false };
  } catch (err) {
    console.error('Error calling check-email endpoint:', err);
    return { exists: false };
  }
}

/**
 * Validates a phone number for E.164 format (+XXXXXXXXXXX)
 */
export function validatePhone(value: string): string | null {
  if (!value || value === '') return null; // optional field
  if (!value.startsWith('+')) return 'Phone number must start with +';
  if (!/^\+\d+$/.test(value)) return 'Only digits allowed after +';
  if (value.length < 10) return 'Phone number is too short. Include your country code (e.g. +923214567890)';
  if (value.length > 16) return 'Phone number is too long';
  return null; // valid
}
