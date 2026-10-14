import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { adminCreateSearchShelf } from "@/lib/shop.functions";
import { KNOWN_MARKETPLACES } from "@/lib/marketplace-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { id: string; name: string; slug: string };

export function SearchShelfDialog({
  categories,
  onCreated,
}: {
  categories: Category[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("Bidirectional OBD2");
  const [categoryId, setCategoryId] = useState("");
  const [count, setCount] = useState(6);
  const [slugs, setSlugs] = useState<string[]>(KNOWN_MARKETPLACES.map((m) => m.slug));

  const fill = useMutation({
    mutationFn: () =>
      adminCreateSearchShelf({
        data: {
          term,
          categoryId,
          count,
          networkSlugs: slugs,
        },
      }),
    onSuccess: (res) => {
      const extra = [...(res.skipped ?? []), ...(res.notes ?? [])];
      toast.success(`Added ${res.created} partner link${res.created === 1 ? "" : "s"}`);
      if (extra.length) toast.message(extra.slice(0, 3).join(" "));
      setOpen(false);
      onCreated();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not fill links"),
  });

  function toggle(slug: string) {
    setSlugs((cur) => (cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="mr-1 h-4 w-4" />
          Fill from a search
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fill a category from a search term</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Type a part, like bidirectional OBD2. This adds 3–10 Part Picks in that category,
            split into Budget, Everyday, and Professional. Each card opens that store’s search.
            It does not invent a price.
          </p>
          <div className="space-y-1">
            <Label htmlFor="shelf-term">Search term</Label>
            <Input
              id="shelf-term"
              value={term}
              maxLength={80}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Bidirectional OBD2"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="shelf-count">How many links</Label>
              <Input
                id="shelf-count"
                type="number"
                min={3}
                max={10}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Stores</Label>
            <div className="flex flex-wrap gap-2">
              {KNOWN_MARKETPLACES.map((m) => {
                const on = slugs.includes(m.slug);
                return (
                  <Button
                    key={m.slug}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => toggle(m.slug)}
                  >
                    {m.label}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              A store must already exist and be active under Networks. Amazon uses that network’s
              tag (Store ID 366industries-20). A future store works if its deeplink template
              contains {"{QUERY}"}.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={fill.isPending || term.trim().length < 2 || !categoryId || slugs.length === 0}
            onClick={() => fill.mutate()}
          >
            {fill.isPending ? "Adding…" : "Add links"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
