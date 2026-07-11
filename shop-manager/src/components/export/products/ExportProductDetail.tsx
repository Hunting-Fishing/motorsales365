import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, TrendingUp, TrendingDown, DollarSign, Package, Truck, Shield, BarChart3, Globe } from 'lucide-react';
import { ProfitProtectionCard } from './ProfitProtectionCard';
import { ProductVariantsManager } from './ProductVariantsManager';
import { ProductIngredientsManager } from './ProductIngredientsManager';

interface ExportProductDetailProps {
  product: any;
  onBack: () => void;
  onEdit: () => void;
}

const catLabel = (c: string) => ({ dehydrated_food: 'Dehydrated Food', salt: 'Salt', vehicle: 'Vehicle', other: 'Other' }[c] || c);

const Stat = ({ label, value, prefix = '', suffix = '' }: { label: string; value: any; prefix?: string; suffix?: string }) => (
  <div className="space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{prefix}{value != null ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}{suffix}</p>
  </div>
);

export function ExportProductDetail({ product: p, onBack, onEdit }: ExportProductDetailProps) {
  const landed = Number(p.landed_cost_per_unit || 0);
  const sell = Number(p.unit_price || 0);
  const profit = sell - landed;
  const margin = Number(p.profit_margin_pct || 0);
  const isProfit = profit >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button size="sm" onClick={onEdit} className="gap-1"><Edit className="h-4 w-4" /> Edit</Button>
      </div>

      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
          <Package className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground truncate">{p.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className="text-xs">{catLabel(p.category)}</Badge>
            {p.sku && <Badge variant="outline" className="text-xs">{p.sku}</Badge>}
            <Badge variant={p.is_active !== false ? 'default' : 'destructive'} className="text-xs">
              {p.is_active !== false ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>

      {/* ROI Overview */}
      <Card className="border-2 border-emerald-200 dark:border-emerald-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-600" /> Profitability Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2.5 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Sell Price</p>
              <p className="text-lg font-bold text-foreground">${sell.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">/{p.unit_of_measure}</p>
            </div>
            <div className="text-center p-2.5 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">Landed Cost</p>
              <p className="text-lg font-bold text-foreground">${landed.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">/{p.unit_of_measure}</p>
            </div>
            <div className={`text-center p-2.5 rounded-lg ${isProfit ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-destructive/10'}`}>
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className={`text-lg font-bold flex items-center justify-center gap-1 ${isProfit ? 'text-emerald-600' : 'text-destructive'}`}>
                {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                ${Math.abs(profit).toFixed(2)}
              </p>
              <p className={`text-xs font-medium ${isProfit ? 'text-emerald-600' : 'text-destructive'}`}>{margin}% margin</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Variants */}
      <ProductVariantsManager productId={p.id} productName={p.name} />

      {/* Ingredients */}
      <ProductIngredientsManager productId={p.id} productName={p.name} />

      {/* Profit Protection */}
      <ProfitProtectionCard product={p} />

      {/* Cost Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Cost Breakdown (per {p.unit_of_measure})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: 'Purchase Cost', val: p.purchase_cost_per_unit },
              { label: 'Shipping', val: p.shipping_cost_per_unit },
              { label: 'Customs Duty', val: p.customs_duty_per_unit },
              { label: 'Insurance', val: p.insurance_cost_per_unit },
              { label: 'Handling', val: p.handling_fee_per_unit },
              { label: 'Packaging', val: p.packaging_cost_per_unit },
              { label: 'Inspection', val: p.inspection_cost_per_unit },
            ].map(({ label, val }) => {
              const v = Number(val || 0);
              const pct = landed > 0 ? (v / landed * 100) : 0;
              return (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="font-medium text-foreground w-16 text-right">${v.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
            <Separator />
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-foreground">Total Landed Cost</span>
              <span className="text-foreground">${landed.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Tracking */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Sales & Revenue</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total Units Sold" value={p.total_units_sold} suffix={` ${p.unit_of_measure}`} />
            <Stat label="Total Revenue" value={p.total_revenue} prefix="$" />
            <Stat label="Total Cost" value={p.total_cost} prefix="$" />
            <Stat label="Avg Monthly Volume" value={p.avg_monthly_volume} suffix={` ${p.unit_of_measure}`} />
          </div>
        </CardContent>
      </Card>

      {/* Supplier */}
      {p.supplier_name && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Truck className="h-4 w-4" /> Supplier</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground">Supplier</p><p className="text-sm font-medium text-foreground">{p.supplier_name}</p></div>
              {p.supplier_country && <div><p className="text-xs text-muted-foreground">Country</p><p className="text-sm font-medium text-foreground">{p.supplier_country}</p></div>}
              {p.supplier_contact && <div><p className="text-xs text-muted-foreground">Contact</p><p className="text-sm font-medium text-foreground">{p.supplier_contact}</p></div>}
              {p.supplier_lead_time_days && <div><p className="text-xs text-muted-foreground">Lead Time</p><p className="text-sm font-medium text-foreground">{p.supplier_lead_time_days} days</p></div>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Specs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4" /> Product Specs</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {p.grade && <div><p className="text-xs text-muted-foreground">Grade</p><p className="font-medium text-foreground">{p.grade}</p></div>}
            {p.grain_size && <div><p className="text-xs text-muted-foreground">Grain Size</p><p className="font-medium text-foreground">{p.grain_size}</p></div>}
            {p.moisture_content_pct != null && <div><p className="text-xs text-muted-foreground">Moisture</p><p className="font-medium text-foreground">{p.moisture_content_pct}%</p></div>}
            {p.weight_per_unit && <div><p className="text-xs text-muted-foreground">Weight/Unit</p><p className="font-medium text-foreground">{p.weight_per_unit} {p.unit_of_measure}</p></div>}
            {p.shelf_life_days && <div><p className="text-xs text-muted-foreground">Shelf Life</p><p className="font-medium text-foreground">{p.shelf_life_days} days</p></div>}
            {p.packaging_type && <div><p className="text-xs text-muted-foreground">Packaging</p><p className="font-medium text-foreground">{p.packaging_type}</p></div>}
          </div>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Compliance</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {p.hs_code && <div><p className="text-xs text-muted-foreground">HS Code</p><p className="font-medium text-foreground">{p.hs_code}</p></div>}
            {p.country_of_origin && <div><p className="text-xs text-muted-foreground">Origin</p><p className="font-medium text-foreground">{p.country_of_origin}</p></div>}
            <div><p className="text-xs text-muted-foreground">Incoterms</p><p className="font-medium text-foreground">{p.preferred_incoterms}</p></div>
            {p.tariff_classification && <div><p className="text-xs text-muted-foreground">Tariff Class</p><p className="font-medium text-foreground">{p.tariff_classification}</p></div>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {p.export_license_required && <Badge variant="outline" className="text-xs">Export License</Badge>}
            {p.phytosanitary_required && <Badge variant="outline" className="text-xs">Phytosanitary</Badge>}
            {p.fumigation_required && <Badge variant="outline" className="text-xs">Fumigation</Badge>}
          </div>
          {(p.certifications || []).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {p.certifications.map((c: string) => <Badge key={c} className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">{c}</Badge>)}
              </div>
            </div>
          )}
          {(p.target_markets || []).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Globe className="h-3 w-3" /> Target Markets</p>
              <div className="flex flex-wrap gap-1.5">
                {p.target_markets.map((m: string) => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {p.description && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{p.description}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
