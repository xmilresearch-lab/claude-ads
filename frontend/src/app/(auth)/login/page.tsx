import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign In — Automate" };

export default function LoginPage() {
  return (
    <>
      <div className="mb-5">
        <h2 className="text-base font-display font-semibold text-text-primary">
          Sign In
        </h2>
        <p className="text-sm text-text-muted mt-0.5">
          Access your automation command center
        </p>
      </div>
      <LoginForm />
    </>
  );
}
