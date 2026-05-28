"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

const schema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/automations";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data, from);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold text-text-primary">Sign in</h2>
        <p className="mt-1 text-sm text-text-secondary">Access your command center.</p>
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
          placeholder="••••••••"
          autoComplete="current-password"
          className="input-command"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-2xs font-mono text-danger">{errors.password.message}</p>
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
