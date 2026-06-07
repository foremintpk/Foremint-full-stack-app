import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password — Foremint",
  description: "Reset your Foremint account password securely.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
