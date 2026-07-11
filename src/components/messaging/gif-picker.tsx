import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { giphyTrending, giphySearch, type GiphyItem } from "@/lib/giphy.functions";

interface Props {
  onPick: (gif: GiphyItem) => void;
}

export function GifPicker({ onPick }: Props) {
  const trending = useServerFn(giphyTrending);
  const search = useServerFn(giphySearch);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<GiphyItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const run = async () => {
      try {
        const results = q.trim()
          ? await search({ data: { q } })
          : await trending({ data: {} });
        if (!cancelled) setItems(results);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(run, q ? 350 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, search, trending]);

  return (
    <div className="w-[320px] rounded-xl border border-border bg-popover p-2 shadow-lg">
      <div className="relative mb-2">
        <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search GIPHY"
          className="pl-8"
          autoFocus
        />
      </div>
      <div className="grid max-h-[280px] grid-cols-2 gap-1 overflow-y-auto">
        {loading && (
          <div className="col-span-2 flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="col-span-2 py-6 text-center text-xs text-muted-foreground">
            No GIFs found
          </div>
        )}
        {items.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => onPick(g)}
            className="overflow-hidden rounded-md bg-secondary/50 transition-transform hover:scale-[1.02]"
          >
            <img
              src={g.preview_url}
              alt={g.title || "GIF"}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground text-right">Powered by GIPHY</div>
    </div>
  );
}
