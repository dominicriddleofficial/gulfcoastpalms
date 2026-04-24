import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlatformNotification {
  id: string;
  business_id: string | null;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  link_url: string | null;
  icon: string | null;
  is_read: boolean;
  is_archived: boolean;
  priority: string;
  created_at: string;
  read_at: string | null;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }
    userIdRef.current = uid;

    const { data, error } = await supabase
      .from("platform_notifications" as any)
      .select("*")
      .eq("recipient_user_id", uid)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as unknown as PlatformNotification[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;

      channel = supabase
        .channel(`notifications:${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "platform_notifications",
            filter: `recipient_user_id=eq.${uid}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as PlatformNotification, ...prev].slice(0, 20));
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "platform_notifications",
            filter: `recipient_user_id=eq.${uid}`,
          },
          (payload) => {
            const updated = payload.new as PlatformNotification;
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n)).filter((n) => !n.is_archived)
            );
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    await supabase
      .from("platform_notifications" as any)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? now })));
    await supabase
      .from("platform_notifications" as any)
      .update({ is_read: true, read_at: now })
      .eq("recipient_user_id", uid)
      .eq("is_read", false);
  }, []);

  const archive = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase
      .from("platform_notifications" as any)
      .update({ is_archived: true })
      .eq("id", id);
  }, []);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, archive, refetch: fetchNotifications };
}
