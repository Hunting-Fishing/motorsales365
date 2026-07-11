import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Package, Search } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  specifications: string | null;
  sell_price: number;
}

interface Props {
  inventory: InventoryItem[];
  onSelect: (id: string) => void;
  compact?: boolean;
}

const WeldingInventoryPicker = ({ inventory, onSelect, compact }: Props) => {
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    const cats = new Set(inventory.map((i) => i.category || "Other"));
    return Array.from(cats).sort();
  }, [inventory]);

  const filtered = useMemo(() => {
    let items = inventory;
    if (categoryFilter) items = items.filter((i) => (i.category || "Other") === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q) || (i.specifications || "").toLowerCase().includes(q));
    }
    return items;
  }, [inventory, categoryFilter, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    for (const item of filtered) {
      const cat = item.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [filtered]);

  const handleSelect = (id: string) => { onSelect(id); setOpen(false); setSearch(""); setCategoryFilter(null); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={compact ? "sm" : "default"} className={compact ? "h-7 text-xs" : "h-8"}>
          <Package className={compact ? "h-3 w-3 mr-1" : "h-3.5 w-3.5 mr-1"} />
          {compact ? "+ Inventory" : "+ From Inventory"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 pt-4 pb-2"><DialogTitle className="text-base">Add from Inventory</DialogTitle></DialogHeader>
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" autoFocus />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 px-4 pb-2">
          <Badge variant={categoryFilter === null ? "default" : "outline"} className="cursor-pointer text-[10px] px-1.5 py-0.5" onClick={() => setCategoryFilter(null)}>All ({inventory.length})</Badge>
          {categories.map((cat) => (
            <Badge key={cat} variant={categoryFilter === cat ? "default" : "outline"} className="cursor-pointer text-[10px] px-1.5 py-0.5" onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}>
              {cat} ({inventory.filter((i) => (i.category || "Other") === cat).length})
            </Badge>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 border-t max-h-[50vh]">
          {Object.keys(grouped).length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No items found</p>}
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="sticky top-0 bg-muted/80 backdrop-blur px-4 py-1 text-xs font-medium text-muted-foreground border-b">{cat}</div>
              {items.map((item) => (
                <button key={item.id} type="button" className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors border-b last:border-b-0 flex items-center gap-2" onClick={() => handleSelect(item.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.name}</div>
                    {item.specifications && <div className="text-[11px] text-muted-foreground truncate">{item.specifications}</div>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">${Number(item.sell_price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeldingInventoryPicker;
