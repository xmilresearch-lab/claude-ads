import { api } from "@/lib/api/client";
import type { WorkspaceResponse, BrandVoice } from "@/lib/api/types";

export function getMyWorkspace(): Promise<WorkspaceResponse> {
  return api.get<WorkspaceResponse>("/workspaces/me");
}

export function updateWorkspace(payload: Partial<Pick<WorkspaceResponse, "name" | "settings">>): Promise<WorkspaceResponse> {
  return api.patch<WorkspaceResponse>("/workspaces/me", payload);
}

export function setBrandVoice(brandVoice: BrandVoice): Promise<WorkspaceResponse> {
  return api.put<WorkspaceResponse>("/workspaces/me/brand-voice", brandVoice);
}

export function deleteBrandVoice(): Promise<void> {
  return api.delete("/workspaces/me/brand-voice");
}

export function updateSettings(settings: Record<string, unknown>): Promise<WorkspaceResponse> {
  return api.patch<WorkspaceResponse>("/workspaces/me/settings", settings);
}
