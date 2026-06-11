import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export type GalleryMedia = { id: string; url: string; type: "photo" | "video" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: GalleryMedia[];
  index: number;
  onIndexChange: (i: number) => void;
  title?: string;
}

export function GalleryLightbox({ open, onOpenChange, items, index, onIndexChange, title }: Props) {
  const total = items.length;
  const current = items[index];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onIndexChange((index + 1) % total);
      else if (e.key === "ArrowLeft") onIndexChange((index - 1 + total) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, total, onIndexChange]);

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl border-0 bg-black/95 p-0 sm:rounded-xl">
        <div className="relative flex h-[85vh] items-center justify-center">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {total > 1 && (
            <>
              <button
                onClick={() => onIndexChange((index - 1 + total) % total)}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => onIndexChange((index + 1) % total)}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {current.type === "photo" ? (
            <img
              src={current.url}
              alt={title ?? `Photo ${index + 1}`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <video src={current.url} controls autoPlay className="max-h-full max-w-full" />
          )}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {index + 1} / {total}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
