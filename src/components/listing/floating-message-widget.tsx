import { useEffect, useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Props {
  sellerName?: string | null;
  sellerAvatarUrl?: string | null;
  listingTitle?: string | null;
  message: string;
  setMessage: (v: string) => void;
  onSend: () => Promise<void> | void;
  sending: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
}

/**
 * Facebook Messenger-style floating chat widget for the listing detail page.
 * Presentation-only; reuses the existing sendMessage handler + message state.
 */
export function FloatingMessageWidget({
  sellerName,
  sellerAvatarUrl,
  listingTitle,
  message,
  setMessage,
  onSend,
  sending,
  open,
  setOpen,
}: Props) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const initial = (sellerName || "S").trim().charAt(0).toUpperCase();

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        aria-label={open ? "Close message widget" : "Message the seller"}
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 active:scale-95",
          "bottom-20 lg:bottom-6",
          open && "rotate-90",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!open && (
          <span className="absolute inline-flex h-3 w-3 -top-0.5 -right-0.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Send a message"
          className={cn(
            "fixed right-4 z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl",
            "bottom-[8.5rem] lg:bottom-24",
            "animate-in slide-in-from-bottom-4 fade-in duration-200",
          )}
        >
          <div className="flex items-center gap-3 border-b border-border bg-primary/95 px-4 py-3 text-primary-foreground">
            {sellerAvatarUrl ? (
              <img
                src={sellerAvatarUrl}
                alt={sellerName ?? "Seller"}
                className="h-9 w-9 rounded-full border-2 border-primary-foreground/40 object-cover"
              />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/20 text-sm font-semibold">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{sellerName || "Seller"}</p>
              <p className="truncate text-[11px] opacity-80">
                Usually replies within a few hours
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-primary-foreground/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-32 overflow-y-auto bg-secondary/40 px-4 py-3">
            <div className="inline-block max-w-[85%] rounded-2xl rounded-tl-sm bg-card px-3 py-2 text-xs text-foreground shadow-sm">
              👋 Hi! Ask about
              {listingTitle ? (
                <>
                  {" "}
                  <span className="font-semibold">{listingTitle}</span>
                </>
              ) : (
                " this listing"
              )}
              . Keep transactions safe — meet in person.
            </div>
          </div>

          <div className="border-t border-border bg-card p-3">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, is this still available?"
              rows={3}
              className="resize-none text-sm"
            />
            <Button
              onClick={onSend}
              disabled={sending || !message.trim()}
              className="mt-2 w-full"
              size="sm"
            >
              {sending ? (
                "Sending…"
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" /> Send message
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
