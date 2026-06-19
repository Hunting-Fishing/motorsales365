import { useState } from "react";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_TREE,
  categoryLabel,
  subcategoryLabel,
  subsFor,
} from "@/lib/share-kit/categories";

type Props = {
  category: string | null;
  subcategory: string | null;
  onChange: (category: string | null, subcategory: string | null) => void;
  disabled?: boolean;
};

export function CategoryPicker({ category, subcategory, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<string | null>(category);
  const [sub, setSub] = useState<string | null>(subcategory);

  const labelText = subcategory
    ? subcategoryLabel(subcategory)
    : category
      ? categoryLabel(category)
      : "Tag";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          title={labelText}
          disabled={disabled}
        >
          <Tag className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="end">
        <div className="text-xs font-semibold text-muted-foreground">Category</div>
        <Select
          value={cat ?? ""}
          onValueChange={(v) => {
            setCat(v || null);
            setSub(null);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Pick category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_TREE.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="text-xs font-semibold text-muted-foreground">Subcategory</div>
        <Select
          value={sub ?? ""}
          onValueChange={(v) => setSub(v || null)}
          disabled={!cat}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder={cat ? "Pick subcategory" : "Pick category first"} />
          </SelectTrigger>
          <SelectContent>
            {subsFor(cat).map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCat(null);
              setSub(null);
              onChange(null, null);
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onChange(cat, sub);
              setOpen(false);
            }}
          >
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
