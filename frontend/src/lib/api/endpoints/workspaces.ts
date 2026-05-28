import { api } from "@/lib/api/client";
import type { BrandVoice, WorkspaceSettings, WorkspaceResponse } from "@/lib/api/types";

export type { BrandVoice, WorkspaceSettings, WorkspaceResponse };

export const workspacesApi = {
  getMe: () =>
    api.get<WorkspaceResponse>("/workspaces/me"),

  updateMe: (data: Partial<Pick<WorkspaceResponse, "name" | "settings">>) =>
    api.patch<WorkspaceResponse>("/workspaces/me", data),

  getBrandVoice: () =>
    api.get<BrandVoice | null>("/workspaces/me/brand-voice"),

  setBrandVoice: (data: BrandVoice) =>
    api.put<BrandVoice>("/workspaces/me/brand-voice", data),

  deleteBrandVoice: () =>
    api.delete<void>("/workspaces/me/brand-voice"),

  getSettings: () =>
    api.get<WorkspaceSettings>("/workspaces/me/settings"),

  updateSettings: (data: Partial<WorkspaceSettings>) =>
    api.patch<WorkspaceSettings>("/workspaces/me/settings", data),
};

// Backward-compat named exports (used by legacy callers)
export const getMyWorkspace = workspacesApi.getMe;
export const updateWorkspace = workspacesApi.updateMe;
export const setBrandVoice = workspacesApi.setBrandVoice;
export const deleteBrandVoice = workspacesApi.deleteBrandVoice;
export const updateSettings = (data: Partial<WorkspaceSettings>) =>
  workspacesApi.updateSettings(data);
