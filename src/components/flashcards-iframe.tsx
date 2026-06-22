import { useState } from "react";
import { Loader2 } from "lucide-react";

type Props = {
  className?: string;
  title?: string;
};

/**
 * Embeds the static flashcards game at /flashcards/index.html with a
 * skeleton overlay until the iframe finishes loading. The skeleton hides
 * on the iframe's `load` event (DOMContentLoaded inside the iframe), so
 * the user sees instant feedback instead of a frozen white panel.
 */
export function FlashcardsIframe({ className, title = "365 Flashcards" }: Props) {
  const [loaded, setLoaded] = useState(false);
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
