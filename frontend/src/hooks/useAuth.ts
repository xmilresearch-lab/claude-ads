"use client";

import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@/lib/api/endpoints/auth";

export function useChangePassword() {
  return useMutation({
    mutationFn: changePassword,
  });
}
