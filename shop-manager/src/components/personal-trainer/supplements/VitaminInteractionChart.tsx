import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

interface VitaminInteractionChartProps {
  supplements: any[];
  onSelect: (s: any) => void;
}

export function VitaminInteractionChart({ supplements, onSelect }: VitaminInteractionChartProps) {
  // Only show supplements that have interaction data
  const withInteractions = supplements.filter(
    s => (s.take_with && s.take_with.length > 0) || (s.avoid_with && s.avoid_with.length > 0)
  );

  if (withInteractions.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        Interaction Guide
      </h3>
      <div className="space-y-2">
        {withInteractions.slice(0, 12).map(s => (
          <Card
            key={s.id}
            className="cursor-pointer hover:shadow-sm transition-all border-border/50"
            onClick={() => onSelect(s)}
          >
            <CardContent className="p-3 flex items-start gap-3">
              <div className="min-w-[120px]">
                <p className="text-xs font-medium text-foreground">{s.name}</p>
              </div>
              <div className="flex-1 flex flex-wrap gap-1">
                {s.take_with?.slice(0, 3).map((t: string) => (
                  <Badge key={`take-${t}`} className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 gap-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5" /> {t}
                  </Badge>
                ))}
                {s.avoid_with?.slice(0, 2).map((a: string) => (
                  <Badge key={`avoid-${a}`} className="text-[9px] bg-red-100 text-red-700 border-red-200 gap-0.5">
                    <XCircle className="h-2.5 w-2.5" /> {a}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
