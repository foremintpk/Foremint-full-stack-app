import { redirect } from 'next/navigation';

/**
 * Root route — this application is the backend platform at app.foremint.com.
 * Marketing website (foremint.com) is a separate deployment.
 * Unauthenticated users start at /onboarding; authenticated users land at /dashboard.
 */
export default function RootPage() {
  redirect('/onboarding');
}
