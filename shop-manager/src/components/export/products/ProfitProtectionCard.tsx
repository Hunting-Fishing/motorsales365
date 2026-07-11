import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Lock, TrendingDown } from 'lucide-react';

interface ProfitProtectionCardProps {
  product: any;
}

export function ProfitProtectionCard({ product: p }: ProfitProtectionCardProps) {
  const margin = Number(p.profit_margin_pct || 0);
  const minMargin = Number(p.min_margin_threshold || 10);
  const maxDiscount = Number(p.max_discount_pct || 15);
  const priceFloor = Number(p.price_floor || 0);
  const landed = Number(p.landed_cost_per_unit || 0);
  const sell = Number(p.unit_price || 0);
  const antiDumping = Number(p.anti_dumping_duty_pct || 0);
  const countervailing = Number(p.countervailing_duty_pct || 0);

  const isBelowMinMargin = margin < minMargin && margin > 0;
  const isNegativeMargin = margin < 0;
  const isBelowFloor = priceFloor > 0 && sell < priceFloor;

  const alerts: { icon: React.ReactNode; text: string; severity: 'destructive' | 'warning' }[] = [];
  if (isNegativeMargin) alerts.push({ icon: <TrendingDown className="h-3 w-3" />, text: `Negative margin: ${margin}%`, severity: 'destructive' });
  if (isBelowMinMargin) alerts.push({ icon: <AlertTriangle className="h-3 w-3" />, text: `Below min margin (${minMargin}%)`, severity: 'warning' });
  if (isBelowFloor) alerts.push({ icon: <AlertTriangle className="h-3 w-3" />, text: `Below price floor ($${priceFloor.toFixed(2)})`, severity: 'destructive' });

  return (
    <Card className={alerts.length > 0 ? 'border-2 border-destructive/50' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600" /> Profit Protection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length > 0 && (
          <div className="space-y-1.5">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-md ${
                a.severity === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400'
              }`}>
                {a.icon}
                <span className="font-medium">{a.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Min Margin Threshold</p>
            <p className="font-medium text-foreground">{minMargin}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Max Discount Allowed</p>
            <p className="font-medium text-foreground">{maxDiscount}%</p>
          </div>
          {priceFloor > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Price Floor</p>
              <p className="font-medium text-foreground">${priceFloor.toFixed(2)}</p>
            </div>
          )}
          {Number(p.markup_pct || 0) > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Markup</p>
              <p className="font-medium text-foreground">{p.markup_pct}%</p>
            </div>
          )}
        </div>

        {(antiDumping > 0 || countervailing > 0) && (
          <div className="pt-1">
            <p className="text-xs text-muted-foreground mb-1.5">Trade Duties</p>
            <div className="flex flex-wrap gap-1.5">
              {antiDumping > 0 && <Badge variant="outline" className="text-xs">Anti-dumping: {antiDumping}%</Badge>}
              {countervailing > 0 && <Badge variant="outline" className="text-xs">Countervailing: {countervailing}%</Badge>}
            </div>
          </div>
        )}

        {p.cost_locked && (
          <div className="flex items-center gap-2 text-xs p-2 rounded-md bg-muted/50">
            <Lock className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Costs locked{p.cost_locked_at ? ` on ${new Date(p.cost_locked_at).toLocaleDateString()}` : ''}</span>
          </div>
        )}

        {p.last_cost_review_at && (
          <p className="text-xs text-muted-foreground">Last cost review: {new Date(p.last_cost_review_at).toLocaleDateString()}</p>
        )}
      </CardContent>
    </Card>
  );
}
