import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/dashboard/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("messages")
      .select("id,body,created_at,sender_id,recipient_id,listing_id,listings:listing_id(title)")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setMessages(data ?? []));
  }, [user]);

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Messages</h1>
      {messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          No messages yet.
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{m.sender_id === user!.id ? "You sent" : "Received"}</span>
                <span>{formatDate(m.created_at)}</span>
              </div>
              <Link to="/listing/$id" params={{ id: m.listing_id }} className="mt-1 block font-medium hover:text-primary">
                Re: {m.listings?.title ?? "Listing"}
              </Link>
              <p className="mt-1 text-sm">{m.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
