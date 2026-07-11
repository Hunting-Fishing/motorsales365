import React from 'react';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAutomotiveRegion } from '@/hooks/useAutomotiveRegion';
import {
  AUTOMOTIVE_REGIONS,
  AutomotiveRegion,
  REGION_META,
} from '@/lib/regions/automotive';

interface Props {
  className?: string;
}

export function RegionSwitcher({ className }: Props) {
  const { region, setRegion, isSaving } = useAutomotiveRegion();

  return (
    <div className={className}>
      <Select
        value={region}
        onValueChange={(v) => setRegion(v as AutomotiveRegion)}
        disabled={isSaving}
      >
        <SelectTrigger className="w-[220px]">
          <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          {AUTOMOTIVE_REGIONS.map((r) => (
            <SelectItem key={r} value={r}>
              <span className="mr-2">{REGION_META[r].flag}</span>
              {REGION_META[r].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
