/**
 * @file src/app/(auth)/login/page.tsx
 * @description Alias of the sign-in page rendering the premium user authentication form.
 * 
 * 1. Server vs Client choice rationale: Server Component page wrapping a Client Component form.
 * 2. Caching layer: N/A.
 * 3. RBAC: N/A.
 * 4. Revalidation / Cache Busting: N/A.
 */

import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata = {
  title: 'Sign In | Foremint',
  description: 'Sign in to access your Foremint dashboard and operations control center.',
};

export default function LoginPage() {
  return <SignInForm />;
}
