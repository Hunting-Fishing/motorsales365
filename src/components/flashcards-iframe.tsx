import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  getFlashcardProgress,
  saveFlashcardProgress,
  type FlashcardProgressRow,
} from "@/lib/flashcards.functions";

type Props = {
  className?: string;
  title?: string;
};

type ProgressMsg = {
  type: "flashcards-progress";
  cardId: string;
  ok: boolean;
  pts: number;
};

/**
 * Embeds the static flashcards game at /flashcards/index.html.
 *
 * - Shows a skeleton overlay until the iframe finishes loading.
 * - When the viewer is signed in, fetches their cloud-side progress and
 *   seeds the iframe via postMessage("flashcards-init", aggregateStats).
 * - Listens for "flashcards-progress" messages from the iframe on every
 *   correct/wrong answer and persists them to Lovable Cloud.
 */
export function FlashcardsIframe({ className, title = "365 Flashcards" }: Props) {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { user } = useAuth();

  const fetchProgress = useServerFn(getFlashcardProgress);
  const persistProgress = useServerFn(saveFlashcardProgress);

  // Pull cloud progress once the user is known + iframe is loaded.
  useEffect(() => {
    if (!user || !loaded) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = (await fetchProgress()) as FlashcardProgressRow[];
        if (cancelled) return;
        const aggregate = rows.reduce(
          (acc, r) => {
            acc.points += r.points || 0;
            acc.correct += r.correctCount || 0;
            acc.attempts += (r.correctCount || 0) + (r.wrongCount || 0);
            return acc;
          },
          { points: 0, correct: 0, attempts: 0 },
        );
        iframeRef.current?.contentWindow?.postMessage(
          { type: "flashcards-init", data: aggregate },
          "*",
        );
      } catch {
        // Best-effort hydration; localStorage fallback still works.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loaded, fetchProgress]);

  // Mirror progress events from the iframe to Lovable Cloud.
  useEffect(() => {
    if (!user) return;
    const handler = (ev: MessageEvent) => {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const msg = ev.data as ProgressMsg | undefined;
      if (!msg || msg.type !== "flashcards-progress" || !msg.cardId) return;
      void persistProgress({
        data: {
          cardId: msg.cardId,
          correctDelta: msg.ok ? 1 : 0,
          wrongDelta: msg.ok ? 0 : 1,
          seenDelta: 1,
          pointsDelta: msg.ok ? msg.pts || 0 : 0,
        },
      }).catch(() => {
        // Silent — localStorage is the source of truth for the active session.
      });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [user, persistProgress]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-sm font-medium">Loading flashcards…</div>
          <div className="text-xs">Card decks across automotive, marine, motorcycle, heavy-duty and more.</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src="/flashcards/index.html"
        title={title}
        loading="eager"
        onLoad={() => setLoaded(true)}
        className="block h-full w-full border-0"
        allow="fullscreen"
      />
    </div>
  );
}
