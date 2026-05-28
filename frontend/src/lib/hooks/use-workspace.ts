import { useQuery } from "@tanstack/react-query";
import { getMyWorkspace } from "@/lib/api/endpoints/workspaces";

export function useWorkspace() {
  return useQuery({
    queryKey: ["workspace"],
    queryFn: getMyWorkspace,
    staleTime: 60_000,
  });
}
