import { Heart, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSavedListings } from "@/hooks/use-saved-listings";
import { nativeShare, canNativeShare } from "@/lib/share";

interface Props {
  listingId: string;
  title: string;
}

/**
 * Floating quick actions for marketplace cards — Save (heart) and Share.
 * Always visible on touch, fade-in on hover for desktop. Kept tiny so it
 * doesn't compete with the card image.
 */
export function ListingQuickActions({ listingId, title }: Props) {
  const { has, toggle } = useSavedListings();
  const saved = has(listingId);

  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSave = (e: React.MouseEvent) => {
    stop(e);
    const nowSaved = toggle(listingId);
    toast.success(nowSaved ? "Saved to your list" : "Removed from saved");
  };

  const handleShare = async (e: React.MouseEvent) => {
    stop(e);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/listing/${listingId}`
        : `/listing/${listingId}`;
    if (canNativeShare()) {
      await nativeShare({ title, url });
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-auto absolute bottom-2 right-2 z-10 flex items-center gap-1.5",
        "opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100",
        "md:focus-within:opacity-100",
      )}
    >
      <button
        type="button"
        onClick={handleSave}
        title={saved ? "Remove from saved" : "Save listing"}
        aria-label={saved ? "Remove from saved" : "Save listing"}
        aria-pressed={saved}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full backdrop-blur transition",
          saved
            ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
            : "bg-black/55 text-white hover:bg-black/75",
        )}
      >
        <Heart className={cn("h-4 w-4", saved && "fill-current")} />
      </button>
      <button
        type="button"
        onClick={handleShare}
        title="Share listing"
        aria-label="Share listing"
        className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
      >
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  );
}
