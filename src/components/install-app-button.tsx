import { useEffect, useState } from "react";
import { Download, Smartphone, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "ios" | "android" | "desktop" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Win|Mac|Linux/.test(ua)) return "desktop";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function InstallAppButton({ variant = "outline", className }: { variant?: "default" | "outline" | "secondary"; className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform>>("other");

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    // iOS Safari has no beforeinstallprompt — show manual instructions
    if (platform === "ios") {
      setShowIosSheet(true);
      return;
    }
    // Fallback for browsers/contexts without install prompt
    setShowIosSheet(true);
  };

  return (
    <>
      <Button variant={variant} size="sm" onClick={handleClick} className={className}>
        <Download className="mr-2 h-4 w-4" />
        Install the app
      </Button>

      <Dialog open={showIosSheet} onOpenChange={setShowIosSheet}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Install 365 MotorSales
            </DialogTitle>
            <DialogDescription>
              {platform === "ios"
                ? "Add 365 MotorSales to your iPhone home screen for a full-app experience."
                : "Your browser doesn't expose a one-tap install. Use the browser menu to add this site to your home screen or desktop."}
            </DialogDescription>
          </DialogHeader>

          {platform === "ios" ? (
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">1</span>
                <span>Open this page in <strong>Safari</strong> (not Chrome or in-app browsers).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">2</span>
                <span className="flex flex-wrap items-center gap-1">Tap the <Share className="inline h-4 w-4" /> <strong>Share</strong> button at the bottom of the screen.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">3</span>
                <span className="flex flex-wrap items-center gap-1">Scroll and choose <Plus className="inline h-4 w-4" /> <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">4</span>
                <span>Tap <strong>Add</strong>. The 365 MotorSales icon will appear on your home screen.</span>
              </li>
            </ol>
          ) : (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Android Chrome:</strong> Menu (⋮) → <em>Add to Home screen</em> / <em>Install app</em>.</li>
              <li>• <strong>Desktop Chrome / Edge:</strong> Look for the <Download className="inline h-3.5 w-3.5" /> icon in the address bar, or Menu → <em>Install 365 MotorSales</em>.</li>
              <li>• <strong>Firefox Android:</strong> Menu → <em>Install</em>.</li>
            </ul>
          )}

          <Button variant="ghost" onClick={() => setShowIosSheet(false)} className="mt-2">
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
