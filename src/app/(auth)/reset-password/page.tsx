import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password — Foremint",
  description: "Create a new secure password for your Foremint account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
