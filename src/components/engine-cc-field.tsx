import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EngineCcField({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>Engine size (CC, optional)</Label>
      <Input id={id} type="number" inputMode="decimal" min="0.01" max="100000"
        step="0.01" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 110, 125, 155 or 171.7" list={`${id}-sizes`} />
      <datalist id={`${id}-sizes`}>
        {[50, 100, 110, 125, 150, 155, 160, 175, 200, 250, 300, 400, 500, 650, 660, 750, 1000].map(cc => <option key={cc} value={cc} />)}
      </datalist>
      <p className="text-xs text-muted-foreground">Choose a common size or type the actual CC. Leave blank for electric vehicles.</p>
    </div>
  );
}
