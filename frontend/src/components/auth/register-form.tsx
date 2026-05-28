"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/use-auth";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

const schema = z.object({
  email:          z.string().email("Invalid email address"),
  password:       z
    .string()
    .min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Requires uppercase letter")
    .regex(/[0-9]/, "Requires number")
    .regex(/[^A-Za-z0-9]/, "Requires special character"),
  workspace_name: z.string().min(2, "Workspace name must be at least 2 characters"),
});

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const { register: registerUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Registration failed";
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="workspace_name">Workspace Name</Label>
        <Input
          id="workspace_name"
          type="text"
          placeholder="Acme Corp"
          {...register("workspace_name")}
        />
        {errors.workspace_name && (
          <p className="text-2xs font-mono text-danger">{errors.workspace_name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="operator@company.com"
          autoComplete="email"
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
          {...register("password")}
        />
        {errors.password && (
          <p className="text-2xs font-mono text-danger">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating workspace…
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-amber hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
