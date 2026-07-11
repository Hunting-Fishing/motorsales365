import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Settings } from 'lucide-react';
import { useExportModuleSettings } from '@/hooks/export/useExportModuleSettings';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR', 'BRL', 'MXN'];
const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90', 'CIA', 'COD', 'Letter of Credit'];

export default function ExportSettings() {
  const { settings, loading, save } = useExportModuleSettings();
  const [form, setForm] = useState({
    default_currency: 'USD',
    default_incoterm: 'FOB',
    default_origin_port: '',
    default_origin_country: '',
    default_payment_terms: 'Net 30',
    auto_generate_invoice_numbers: true,
    invoice_prefix: 'EXP-INV-',
    shipment_prefix: 'EXP-SHP-',
    order_prefix: 'EXP-ORD-',
    weight_unit: 'kg',
    dimension_unit: 'cm',
    enable_trade_alerts: true,
    enable_low_stock_alerts: true,
    low_stock_threshold: 10,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        default_currency: settings.default_currency || 'USD',
        default_incoterm: settings.default_incoterm || 'FOB',
        default_origin_port: settings.default_origin_port || '',
        default_origin_country: settings.default_origin_country || '',
        default_payment_terms: settings.default_payment_terms || 'Net 30',
        auto_generate_invoice_numbers: settings.auto_generate_invoice_numbers ?? true,
        invoice_prefix: settings.invoice_prefix || 'EXP-INV-',
        shipment_prefix: settings.shipment_prefix || 'EXP-SHP-',
        order_prefix: settings.order_prefix || 'EXP-ORD-',
        weight_unit: settings.weight_unit || 'kg',
        dimension_unit: settings.dimension_unit || 'cm',
        enable_trade_alerts: settings.enable_trade_alerts ?? true,
        enable_low_stock_alerts: settings.enable_low_stock_alerts ?? true,
        low_stock_threshold: settings.low_stock_threshold || 10,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await save(form);
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Module Settings</h1>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Trade Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Default Currency</Label>
              <Select value={form.default_currency} onValueChange={v => setForm(f => ({ ...f, default_currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Default Incoterm</Label>
              <Select value={form.default_incoterm} onValueChange={v => setForm(f => ({ ...f, default_incoterm: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INCOTERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Origin Port</Label><Input value={form.default_origin_port} onChange={e => setForm(f => ({ ...f, default_origin_port: e.target.value }))} /></div>
            <div><Label>Origin Country</Label><Input value={form.default_origin_country} onChange={e => setForm(f => ({ ...f, default_origin_country: e.target.value }))} /></div>
          </div>
          <div>
            <Label>Payment Terms</Label>
            <Select value={form.default_payment_terms} onValueChange={v => setForm(f => ({ ...f, default_payment_terms: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Numbering & Prefixes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Auto-generate invoice numbers</Label>
            <Switch checked={form.auto_generate_invoice_numbers} onCheckedChange={v => setForm(f => ({ ...f, auto_generate_invoice_numbers: v }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Invoice Prefix</Label><Input value={form.invoice_prefix} onChange={e => setForm(f => ({ ...f, invoice_prefix: e.target.value }))} /></div>
            <div><Label>Shipment Prefix</Label><Input value={form.shipment_prefix} onChange={e => setForm(f => ({ ...f, shipment_prefix: e.target.value }))} /></div>
            <div><Label>Order Prefix</Label><Input value={form.order_prefix} onChange={e => setForm(f => ({ ...f, order_prefix: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Units</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Weight Unit</Label>
              <Select value={form.weight_unit} onValueChange={v => setForm(f => ({ ...f, weight_unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                  <SelectItem value="mt">Metric Tons (MT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dimension Unit</Label>
              <Select value={form.dimension_unit} onValueChange={v => setForm(f => ({ ...f, dimension_unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">Centimeters (cm)</SelectItem>
                  <SelectItem value="in">Inches (in)</SelectItem>
                  <SelectItem value="m">Meters (m)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Alerts</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Trade Alerts</Label>
            <Switch checked={form.enable_trade_alerts} onCheckedChange={v => setForm(f => ({ ...f, enable_trade_alerts: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Enable Low Stock Alerts</Label>
            <Switch checked={form.enable_low_stock_alerts} onCheckedChange={v => setForm(f => ({ ...f, enable_low_stock_alerts: v }))} />
          </div>
          {form.enable_low_stock_alerts && (
            <div><Label>Low Stock Threshold</Label><Input type="number" value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: parseInt(e.target.value) || 0 }))} /></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
