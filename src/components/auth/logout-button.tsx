"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LogoutButton({ className, children }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => {
      router.replace("/api/auth/logout");
    });
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className={className}
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {isPending ? "Signing out…" : (children ?? "Sign out")}
    </button>
  );
}
