import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Create Account — Automate" };

export default function RegisterPage() {
  return (
    <>
      <div className="mb-5">
        <h2 className="text-base font-display font-semibold text-text-primary">
          Create Account
        </h2>
        <p className="text-sm text-text-muted mt-0.5">
          Set up your workspace in 30 seconds
        </p>
      </div>
      <RegisterForm />
    </>
  );
}
