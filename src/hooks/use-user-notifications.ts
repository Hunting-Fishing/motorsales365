import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/user-notifications.functions";

const KEY = ["user-notifications"];

export function useUserNotifications(options?: { limit?: number; enabled?: boolean }) {
  const fetcher = useServerFn(listMyNotifications);
  return useQuery({
    queryKey: [...KEY, options?.limit ?? 20],
    queryFn: () => fetcher({ data: { limit: options?.limit ?? 20 } }),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  const mark = useServerFn(markNotificationRead);
  return useMutation({
    mutationFn: (id: string) => mark({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  const markAll = useServerFn(markAllNotificationsRead);
  return useMutation({
    mutationFn: () => markAll(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
