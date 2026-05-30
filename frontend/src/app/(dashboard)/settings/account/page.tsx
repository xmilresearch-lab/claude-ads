"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/hooks/use-auth";
import { useChangePassword } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import {
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from "@/lib/push";

const PLAN_VARIANT = {
  free:  "secondary",
  pro:   "default",
  admin: null, // special amber pill
} as const;

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

const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Required"),
  new_password: z.string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});
type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function AccountPage() {
  const { user } = useAuth();

  const changePassword = useChangePassword();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
  });

  const newPasswordValue = useWatch({ control, name: "new_password", defaultValue: "" });

  const onSubmit = async (data: ChangePasswordForm) => {
    await changePassword.mutateAsync(
      { current_password: data.current_password, new_password: data.new_password },
      {
        onSuccess: () => {
          toast.success("Password updated successfully");
          reset();
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 400) {
            setError("current_password", { message: "Current password is incorrect" });
          } else {
            toast.error("Failed to update password");
          }
        },
      },
    );
  };

  // Push notifications state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">(
    () => (typeof window !== "undefined" ? getNotificationPermission() : "default"),
  );
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setIsPushSubscribed(!!sub))
        .catch(() => {});
    }
  }, []);

  const handlePushToggle = useCallback(async () => {
    setPushLoading(true);
    try {
      if (isPushSubscribed) {
        const ok = await unsubscribeFromNotifications();
        if (ok) {
          setIsPushSubscribed(false);
          toast.success("Push notifications disabled");
        } else {
          toast.error("Failed to disable push notifications");
        }
      } else {
        const permission = await requestNotificationPermission();
        setPushPermission(permission);
        if (permission !== "granted") {
          toast.error("Notification permission denied. Enable it in your browser settings.");
          return;
        }
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
        if (!vapidKey) {
          toast.error("Push notifications are not configured");
          return;
        }
        const ok = await subscribeToNotifications(vapidKey);
        if (ok) {
          setIsPushSubscribed(true);
          toast.success("Push notifications enabled");
        } else {
          toast.error("Failed to enable push notifications");
        }
      }
    } finally {
      setPushLoading(false);
    }
  }, [isPushSubscribed]);

  const plan = user?.plan ?? "free";
  const isAdmin = plan === "admin";

  return (
    <>
      <PageHeader
        title="Account"
        description="Your profile and security settings"
        breadcrumb={[{ label: "Settings" }, { label: "Account" }]}
      />
      <div className="p-6 space-y-4 max-w-2xl">
        {/* Section A — Profile */}
        <div className="card-command p-6">
          <h2 className="font-display text-sm font-semibold text-text-primary mb-5">Profile</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">Email</Label>
              <p className="font-mono text-sm text-amber">{user?.email ?? "—"}</p>
              <p className="text-xs text-text-muted">Email cannot be changed.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">Plan</Label>
              <div>
                {isAdmin ? (
                  <span className="inline-flex items-center rounded-sm px-2 py-0.5 text-2xs font-mono font-medium bg-amber text-bg-base">
                    Admin
                  </span>
                ) : (
                  <Badge variant={PLAN_VARIANT[plan as keyof typeof PLAN_VARIANT] ?? "secondary"}>
                    {plan === "pro" ? "Pro" : "Free"}
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-text-muted">User ID</Label>
              <p className="font-mono text-xs text-amber">{user?.id ?? "—"}</p>
            </div>
          </div>
        </div>

        {/* Section B — Change Password */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={cn(
            "card-command p-6 transition-colors duration-150",
            isDirty && "border-amber/30",
          )}>
            <h2 className="font-display text-sm font-semibold text-text-primary mb-5">
              Change Password
            </h2>
            <div className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label htmlFor="current-pw" className="text-xs text-text-muted">Current Password</Label>
                <Input
                  id="current-pw"
                  type="password"
                  autoComplete="current-password"
                  {...register("current_password")}
                />
                {errors.current_password && (
                  <p className="text-2xs font-mono text-danger">{errors.current_password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-pw" className="text-xs text-text-muted">New Password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  {...register("new_password")}
                />
                <PasswordStrength password={newPasswordValue} />
                {errors.new_password && (
                  <p className="text-2xs font-mono text-danger">{errors.new_password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pw" className="text-xs text-text-muted">Confirm New Password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirm_password")}
                />
                {errors.confirm_password && (
                  <p className="text-2xs font-mono text-danger">{errors.confirm_password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                {isDirty && (
                  <p className="text-2xs font-mono text-amber">Unsaved changes</p>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!isDirty || isSubmitting}
                  className="ml-auto"
                >
                  {isSubmitting ? "Updating…" : "Update password"}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Section C — Push Notifications */}
        <div className="card-command p-6">
          <h2 className="font-display text-sm font-semibold text-text-primary mb-1">
            Push Notifications
          </h2>
          <p className="text-xs text-text-muted mb-5">
            Receive browser alerts when content items need your approval.
          </p>

          {pushPermission === "unsupported" ? (
            <p className="text-xs font-mono text-text-muted">
              Push notifications are not supported in this browser.
            </p>
          ) : (
            <div className="flex items-center justify-between max-w-md">
              <div className="space-y-0.5">
                <p className="text-xs text-text-primary font-medium">Content approval alerts</p>
                <p className="text-2xs font-mono text-text-muted">
                  {pushPermission === "denied"
                    ? "Blocked — enable in browser settings"
                    : isPushSubscribed
                    ? "Active — you will receive approval alerts"
                    : "Inactive — click Enable to subscribe"}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={isPushSubscribed ? "secondary" : "default"}
                disabled={pushLoading || pushPermission === "denied"}
                onClick={handlePushToggle}
                className="flex items-center gap-1.5 shrink-0"
              >
                {pushLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : isPushSubscribed ? (
                  <BellOff className="w-3 h-3" />
                ) : (
                  <Bell className="w-3 h-3" />
                )}
                {isPushSubscribed ? "Disable" : "Enable"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
