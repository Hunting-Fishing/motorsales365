import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "ms_cookie_consent_v1";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // ignore (private mode, etc.)
    }
  }, []);

  function set(value: "accepted" | "declined") {
    try { localStorage.setItem(STORAGE_KEY, value); } catch {}
    try { window.dispatchEvent(new CustomEvent("ms-consent-changed")); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Cookie className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">We use cookies</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Essential cookies keep you signed in. Optional analytics cookies help us improve the marketplace.
            See our <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => set("accepted")}>Accept all</Button>
            <Button size="sm" variant="outline" onClick={() => set("declined")}>Decline optional</Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => set("declined")}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
