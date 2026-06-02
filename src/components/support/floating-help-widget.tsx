import { useState, useEffect } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  HelpCircle,
  X,
  MessageSquare,
  Search,
  Tag,
  UserCheck,
  Store,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchSupportContact } from "@/lib/site-settings";

const QUICK_LINKS = [
  { to: "/support/buying", label: "Buying a vehicle", icon: Search },
  { to: "/support/selling", label: "Selling & boosting", icon: Tag },
  { to: "/support/account", label: "Account & verification", icon: UserCheck },
  { to: "/support/business", label: "Business & shop", icon: Store },
] as const;

const HIDDEN_PREFIXES = [
  "/support",
  "/admin",
  "/login",
  "/signup",
  "/checkout",
  "/payments/",
  "/dashboard/messages",
];

export function FloatingHelpWidget() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [contact, setContact] = useState<{
    whatsappHref: string | null;
    messengerHref: string | null;
  }>({ whatsappHref: null, messengerHref: null });

  useEffect(() => {
    fetchSupportContact()
      .then(setContact)
      .catch(() => {});
  }, []);

  // Don't show on routes where it would get in the way
  if (
    HIDDEN_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p),
    )
  ) {
    return null;
  }

  const hasChat = contact.whatsappHref || contact.messengerHref;

  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close help" : "Open help"}
        aria-expanded={open}
        className={cn(
          "fixed z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-primary/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "right-4 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-6 md:right-6",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Help shortcuts"
          className={cn(
            "fixed z-40 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-xl border border-border bg-background shadow-2xl",
            "right-4 bottom-[calc(128px+env(safe-area-inset-bottom))] md:bottom-24 md:right-6",
          )}
        >
          <div className="bg-gradient-to-br from-primary to-primary/85 px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              <p className="text-sm font-semibold">How can we help?</p>
            </div>
            <p className="mt-0.5 text-xs text-primary-foreground/80">
              Quick links + full help center.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="flex flex-col items-start gap-1 rounded-lg border border-border p-3 transition-colors hover:bg-secondary"
              >
                <l.icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium leading-tight">{l.label}</span>
              </Link>
            ))}
          </div>
          {hasChat && (
            <div className="border-t border-border px-3 pb-3 pt-2">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Chat with us</p>
              <div className="flex gap-2">
                {contact.whatsappHref && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setOpen(false)}
                  >
                    <a href={contact.whatsappHref} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                )}
                {contact.messengerHref && (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setOpen(false)}
                  >
                    <a href={contact.messengerHref} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4" /> Messenger
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
          <div className="border-t border-border p-3">
            <Button asChild className="w-full" size="sm" onClick={() => setOpen(false)}>
              <Link to="/support">
                <MessageSquare className="h-4 w-4" /> Open Help Center
              </Link>
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
