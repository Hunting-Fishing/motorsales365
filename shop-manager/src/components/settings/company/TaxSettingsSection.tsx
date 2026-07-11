import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Percent } from "lucide-react";
import { useTaxSettings } from "@/hooks/useTaxSettings";

interface TaxSettingsSectionProps {
  shopId: string;
  onDataChange?: (changed: boolean) => void;
}

export function TaxSettingsSection({ shopId, onDataChange }: TaxSettingsSectionProps) {
  const {
    taxSettings,
    loading,
    updateTaxSetting,
    dataChanged
  } = useTaxSettings(shopId);

  React.useEffect(() => {
    onDataChange?.(dataChanged);
  }, [dataChanged, onDataChange]);

  const handleTaxRateChange = (field: 'labor_tax_rate' | 'parts_tax_rate', value: string) => {
    const numericValue = parseFloat(value) || 0;
    updateTaxSetting(field, Math.max(0, Math.min(100, numericValue)));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Tax Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Tax Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tax Rates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="labor-tax-rate">Labor Tax Rate (%)</Label>
            <div className="relative">
              <Input
                id="labor-tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxSettings.labor_tax_rate}
                onChange={(e) => handleTaxRateChange('labor_tax_rate', e.target.value)}
                className="pr-8"
              />
              <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="parts-tax-rate">Parts Tax Rate (%)</Label>
            <div className="relative">
              <Input
                id="parts-tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxSettings.parts_tax_rate}
                onChange={(e) => handleTaxRateChange('parts_tax_rate', e.target.value)}
                className="pr-8"
              />
              <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Tax Application Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Apply Tax to Labor</Label>
              <p className="text-sm text-muted-foreground">
                Include labor charges in tax calculations
              </p>
            </div>
            <Switch
              checked={taxSettings.apply_tax_to_labor}
              onCheckedChange={(checked) => updateTaxSetting('apply_tax_to_labor', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Apply Tax to Parts</Label>
              <p className="text-sm text-muted-foreground">
                Include parts/inventory in tax calculations
              </p>
            </div>
            <Switch
              checked={taxSettings.apply_tax_to_parts}
              onCheckedChange={(checked) => updateTaxSetting('apply_tax_to_parts', checked)}
            />
          </div>
        </div>

        {/* Tax Calculation Method */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="tax-calculation-method">Tax Calculation Method</Label>
            <Select
              value={taxSettings.tax_calculation_method}
              onValueChange={(value: 'separate' | 'compound') => 
                updateTaxSetting('tax_calculation_method', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select calculation method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="separate">Separate (Labor + Parts separately)</SelectItem>
                <SelectItem value="compound">Compound (Combined total)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tax-display-method">Tax Display Method</Label>
            <Select
              value={taxSettings.tax_display_method}
              onValueChange={(value: 'inclusive' | 'exclusive') => 
                updateTaxSetting('tax_display_method', value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select display method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exclusive">Tax Exclusive (Add tax to total)</SelectItem>
                <SelectItem value="inclusive">Tax Inclusive (Tax included in price)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tax Description */}
        <div className="space-y-2">
          <Label htmlFor="tax-description">Tax Description</Label>
          <Input
            id="tax-description"
            value={taxSettings.tax_description}
            onChange={(e) => updateTaxSetting('tax_description', e.target.value)}
            placeholder="e.g., GST, Sales Tax, VAT"
          />
          <p className="text-sm text-muted-foreground">
            This text will appear on invoices and estimates
          </p>
        </div>
      </CardContent>
    </Card>
  );
}