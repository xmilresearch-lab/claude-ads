"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: "Passwords don't match", path: ["confirmPassword"] },
);

type FormData = z.infer<typeof schema>;

const STRENGTH_LABELS = ["", "Weak", "Fair", "Strong", "Secure"] as const;

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i < score ? "bg-amber" : "bg-bg-elevated",
            )}
          />
        ))}
      </div>
      <p className="text-2xs font-mono text-text-muted">{STRENGTH_LABELS[score]}</p>
    </div>
  );
}

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const passwordValue = useWatch({ control, name: "password", defaultValue: "" });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser({ email: data.email, password: data.password });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold text-text-primary">Create account</h2>
        <p className="mt-1 text-sm text-text-secondary">Start automating in minutes.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="operator@company.com"
          autoComplete="email"
          className="input-command"
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
          placeholder="Min 8 chars, uppercase, number, symbol"
          autoComplete="new-password"
          className="input-command"
          {...register("password")}
        />
        <PasswordStrength password={passwordValue} />
        {errors.password && (
          <p className="text-2xs font-mono text-danger">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repeat password"
          autoComplete="new-password"
          className="input-command"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-2xs font-mono text-danger">{errors.confirmPassword.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 rounded bg-amber px-4 py-2.5
                   font-display text-sm font-semibold text-bg-base
                   hover:bg-amber-dark transition-colors duration-150
                   disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <span className="status-live" />
            Creating workspace…
          </>
        ) : (
          "Initialize account →"
        )}
      </button>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-amber hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
