"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_SECONDS = 30;

const schema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/automations";

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!isRateLimited) return;

    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsRateLimited(false);
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRateLimited]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    if (isRateLimited) return;

    try {
      await login(data, from);
      setFailedAttempts(0);
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : null;
      const is429 = apiErr?.status === 429;
      const newCount = failedAttempts + 1;

      setFailedAttempts(newCount);

      if (is429 || newCount >= RATE_LIMIT_ATTEMPTS) {
        setCooldown(RATE_LIMIT_SECONDS);
        setIsRateLimited(true);
      } else {
        toast.error(apiErr ? apiErr.message : "Login failed");
      }
    }
  };

  const buttonDisabled = isSubmitting || isRateLimited;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold text-text-primary">Sign in</h2>
        <p className="mt-1 text-sm text-text-secondary">Access your command center.</p>
      </div>

      {isRateLimited && (
        <div className="flex items-start gap-2.5 rounded border border-amber/30 bg-amber/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <p className="text-sm text-amber">
            Too many failed attempts. Please wait {cooldown}s before trying again.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="operator@company.com"
          autoComplete="email"
          className="input-command"
          disabled={isRateLimited}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-2xs font-mono text-danger">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className="input-command"
          disabled={isRateLimited}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-2xs font-mono text-danger">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={buttonDisabled}
        className="w-full flex items-center justify-center gap-2 rounded bg-amber px-4 py-2.5
                   font-display text-sm font-semibold text-bg-base
                   hover:bg-amber-dark transition-colors duration-150
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isRateLimited ? (
          `Try again in ${cooldown}s`
        ) : isSubmitting ? (
          <>
            <span className="status-live" />
            Authenticating…
          </>
        ) : (
          "Enter command center →"
        )}
      </button>

      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-amber hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
