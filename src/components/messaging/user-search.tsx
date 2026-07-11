import { useEffect, useState } from "react";
import { Search, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export interface UserPick {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  selected: UserPick[];
  onChange: (users: UserPick[]) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export function UserSearch({ selected, onChange, excludeIds = [], placeholder }: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserPick[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("public_profiles")
        .select("id,full_name,business_name,avatar_url")
        .or(`full_name.ilike.%${term}%,business_name.ilike.%${term}%`)
        .limit(15);
      if (cancelled) return;
      const rows = (data ?? []).map((p: any) => ({
        id: p.id as string,
        name: (p.business_name || p.full_name || "Unnamed") as string,
        avatar_url: (p.avatar_url ?? null) as string | null,
      }));
      const exclude = new Set([...excludeIds, ...selected.map((s) => s.id)]);
      setResults(rows.filter((r) => !exclude.has(r.id)));
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, excludeIds, selected]);

  const toggle = (u: UserPick) => {
    if (selected.find((s) => s.id === u.id)) {
      onChange(selected.filter((s) => s.id !== u.id));
    } else {
      onChange([...selected, u]);
    }
  };

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs"
            >
              {u.name}
              <button
                type="button"
                onClick={() => toggle(u)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${u.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? "Search people by name…"}
          className="pl-8"
        />
      </div>
      {q.trim().length >= 2 && (
        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border">
          {loading ? (
            <div className="p-3 text-xs text-muted-foreground">Searching…</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground">No people found.</div>
          ) : (
            results.map((r) => {
              const picked = !!selected.find((s) => s.id === r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggle(r)}
                  className="flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-secondary/50"
                >
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 truncate">{r.name}</span>
                  {picked && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
