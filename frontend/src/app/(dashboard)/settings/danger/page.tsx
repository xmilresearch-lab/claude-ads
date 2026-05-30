"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/providers/auth-provider";
import { api } from "@/lib/api/client";

const schema = z.object({
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function DangerPage() {
  const { logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await api.delete<{ message: string }>("/auth/account", {
        body: JSON.stringify({ password: values.password }),
        headers: { "Content-Type": "application/json" },
      });
      setOpen(false);
      reset();
      logout();
      router.push("/login");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete account";
      setServerError(msg === "Password is incorrect" ? msg : "Something went wrong. Please try again.");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset();
      setServerError(null);
    }
    setOpen(next);
  }

  return (
    <>
      <PageHeader
        title="Danger Zone"
        description="Irreversible and destructive actions"
        breadcrumb={[{ label: "Settings" }, { label: "Danger Zone" }]}
      />
      <div className="p-6 max-w-2xl">
        <div className="rounded-md border border-red-900/50 bg-bg-surface p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h2 className="font-display text-sm font-semibold text-text-primary mb-1">
                Delete Account
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Permanently delete your account, workspace, automations, and all associated data.
                This action cannot be undone.
              </p>
              <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete my account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete account</DialogTitle>
                    <DialogDescription>
                      This will permanently delete your account and all associated data.
                      Enter your password to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="px-5 py-4 space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          {...register("password")}
                        />
                        {errors.password && (
                          <p className="text-xs text-red-400">{errors.password.message}</p>
                        )}
                        {serverError && (
                          <p className="text-xs text-red-400">{serverError}</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenChange(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        disabled={isSubmitting}
                      >
                        {isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Delete account
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
