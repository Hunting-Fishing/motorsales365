import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getWorkspaceNotifications } from "@/lib/workspace-notifications.functions";

type Counts = { tow: number; inquiries: number; bookings: number; messages: number; total: number };

type Ctx = {
  businessId: string;
  counts: Counts;
  data:
    | {
        tow: any[];
        inquiries: any[];
        bookings: any[];
        messages: any[];
        ownerId: string | null;
      }
    | undefined;
  isLoading: boolean;
  refetch: () => void;
  requestBrowserPermission: () => void;
  browserPermission: NotificationPermission | "unsupported";
};

const WorkspaceNotificationsCtx = createContext<Ctx | null>(null);

export function useWorkspaceNotifications() {
  const v = useContext(WorkspaceNotificationsCtx);
  if (!v) throw new Error("useWorkspaceNotifications must be used inside provider");
  return v;
}

export function WorkspaceNotificationsProvider({
  businessId,
  children,
}: {
  businessId: string;
  children: React.ReactNode;
}) {
  const load = useServerFn(getWorkspaceNotifications);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const queryKey = ["workspace-notifications", businessId];
  const q = useQuery({
    queryKey,
    queryFn: () => load({ data: { businessId } }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "unsupported">(
    typeof window === "undefined" || !("Notification" in window)
      ? "unsupported"
      : Notification.permission,
  );

  const requestBrowserPermission = () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    Notification.requestPermission().then((p) => setBrowserPermission(p));
  };

  const counts: Counts = useMemo(() => {
    const tow = q.data?.tow.length ?? 0;
    const inquiries = q.data?.inquiries.length ?? 0;
    const bookings = q.data?.bookings.length ?? 0;
    const messages = q.data?.messages.length ?? 0;
    return { tow, inquiries, bookings, messages, total: tow + inquiries + bookings + messages };
  }, [q.data]);

  // Track seen IDs to avoid duplicate toasts from realtime + refetch overlap
  const seenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!q.data) return;
    [...q.data.tow, ...q.data.inquiries, ...q.data.bookings, ...q.data.messages].forEach((i: any) =>
      seenRef.current.add(i.id),
    );
  }, [q.data]);

  // Realtime subscriptions
  useEffect(() => {
    if (!q.data) return;
    const ownerId = q.data.ownerId;

    const showToast = (
      kind: "tow" | "inquiry" | "booking" | "message",
      title: string,
      description: string,
      onClick: () => void,
    ) => {
      // Play chime
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==",
        );
        audio.volume = 0.4;
        audio.play().catch(() => {});
      } catch {}

      const variant = kind === "tow" ? "error" : kind === "message" ? "info" : "success";
      const opts = {
        description,
        duration: 12_000,
        action: { label: "View", onClick },
      };
      if (variant === "error") toast.error(title, opts);
      else if (variant === "info") toast.info(title, opts);
      else toast.success(title, opts);

      // Browser notification when tab hidden
      if (
        typeof document !== "undefined" &&
        document.hidden &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const n = new Notification(title, { body: description, tag: kind });
          n.onclick = () => {
            window.focus();
            onClick();
          };
        } catch {}
      }
    };

    const channel = supabase.channel(`workspace-notif-${businessId}`);

    // Tow requests
    if (ownerId) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tow_requests", filter: `provider_id=eq.${ownerId}` },
        (payload: any) => {
          const row = payload.new;
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);
          showToast(
            "tow",
            "New tow request",
            `${row.vehicle_summary ?? "Vehicle"} • ${row.pickup_city ?? "Pickup"}`,
            () =>
              navigate({
                to: "/dashboard/business/$businessId/dispatch",
                params: { businessId },
              }),
          );
          qc.invalidateQueries({ queryKey });
        },
      );
      // Also catch when an open request is targeted to us via requested_provider_id
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tow_requests",
          filter: `requested_provider_id=eq.${ownerId}`,
        },
        (payload: any) => {
          const row = payload.new;
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);
          showToast(
            "tow",
            "Tow request offered to you",
            `${row.vehicle_summary ?? "Vehicle"} • ${row.pickup_city ?? "Pickup"}`,
            () => navigate({ to: "/dashboard/business/$businessId/dispatch", params: { businessId } }),
          );
          qc.invalidateQueries({ queryKey });
        },
      );

      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${ownerId}` },
        (payload: any) => {
          const row = payload.new;
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);
          showToast(
            "message",
            "New message",
            (row.body ?? "").slice(0, 120),
            () => navigate({ to: "/dashboard/inbox" as any }),
          );
          qc.invalidateQueries({ queryKey });
        },
      );
    }

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "business_inquiries", filter: `business_id=eq.${businessId}` },
      (payload: any) => {
        const row = payload.new;
        if (seenRef.current.has(row.id)) return;
        seenRef.current.add(row.id);
        showToast(
          "inquiry",
          `New inquiry from ${row.name ?? "customer"}`,
          (row.message ?? "").slice(0, 120),
          () => navigate({ to: "/dashboard/business/$businessId" as any, params: { businessId } }),
        );
        qc.invalidateQueries({ queryKey });
      },
    );

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "business_bookings", filter: `business_id=eq.${businessId}` },
      (payload: any) => {
        const row = payload.new;
        if (seenRef.current.has(row.id)) return;
        seenRef.current.add(row.id);
        showToast(
          "booking",
          `New booking from ${row.customer_name ?? "customer"}`,
          `Starts ${new Date(row.starts_at).toLocaleString()}`,
          () => navigate({ to: "/dashboard/business/$businessId" as any, params: { businessId } }),
        );
        qc.invalidateQueries({ queryKey });
      },
    );

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, q.data?.ownerId]);

  const value: Ctx = {
    businessId,
    counts,
    data: q.data,
    isLoading: q.isLoading,
    refetch: () => qc.invalidateQueries({ queryKey }),
    requestBrowserPermission,
    browserPermission,
  };

  return (
    <WorkspaceNotificationsCtx.Provider value={value}>{children}</WorkspaceNotificationsCtx.Provider>
  );
}
