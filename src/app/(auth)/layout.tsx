import { redirect } from "next/navigation";
import { getRoleRedirect, getSessionSafe } from "@/lib/auth/get-session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionSafe();

  if (session) {
    redirect(getRoleRedirect(session.profile.role));
  }

  return <>{children}</>;
}
