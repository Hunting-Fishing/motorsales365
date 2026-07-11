
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryFormField } from '../InventoryFormField';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';

interface PricingSectionProps {
  values: any;
  errors: any;
  onChange: (field: string, value: any) => void;
}

export function PricingSection({
  values,
  errors,
  onChange
}: PricingSectionProps) {
  // Calculate per-unit price from total cost and quantity
  const totalCost = values.unit_price || 0;
  const quantity = values.quantity || 1;
  const pricePerUnit = quantity > 0 ? totalCost / quantity : 0;

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-slate-200">
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Pricing Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <InventoryFormField 
                label="Total Cost (All Units)" 
                name="unit_price" 
                type="number" 
                value={values.unit_price || ''} 
                onChange={e => onChange('unit_price', parseFloat(e.target.value) || 0)} 
                error={errors.unit_price} 
                min="0" 
                step="0.01" 
                placeholder="500.00" 
                description="Total cost for all units in this inventory lot"
                className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-4">
              <InventoryFormField 
                label="Sell Price Per Unit" 
                name="sell_price_per_unit" 
                type="number" 
                value={values.sell_price_per_unit || ''} 
                onChange={e => onChange('sell_price_per_unit', parseFloat(e.target.value) || 0)} 
                error={errors.sell_price_per_unit} 
                min="0" 
                step="0.01" 
                placeholder="45.00" 
                description="Price per unit (e.g., per lb, per piece)"
                className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InventoryFormField 
              label="Markup Percentage" 
              name="marginMarkup" 
              type="number" 
              value={values.marginMarkup || ''} 
              onChange={e => onChange('marginMarkup', parseFloat(e.target.value) || 0)} 
              error={errors.marginMarkup} 
              min="0" 
              step="0.1" 
              placeholder="50.0" 
              description="Markup percentage over cost"
              className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
            />

            <InventoryFormField 
              label="Cost Per Unit" 
              name="cost_per_unit" 
              type="number" 
              value={pricePerUnit.toFixed(2)} 
              onChange={() => {}} // Read-only calculated field
              disabled={true} 
              description="Calculated: Total Cost ÷ Quantity"
              className="bg-slate-50 border-slate-200"
            />

            <InventoryFormField 
              label="Total Inventory Value" 
              name="total_value" 
              type="number" 
              value={totalCost.toFixed(2)} 
              onChange={() => {}} // Read-only calculated field
              disabled={true} 
              description="Total value of this inventory lot"
              className="bg-slate-50 border-slate-200"
            />
          </div>

          {quantity > 0 && totalCost > 0 && (
            <div className="mt-6 p-6 border-2 border-emerald-200 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="h-5 w-5 text-emerald-600" />
                <h4 className="font-semibold text-emerald-900">Pricing Summary</h4>
              </div>
              <div className="space-y-2 text-emerald-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Cost:</span>
                  <span className="font-medium">${totalCost.toFixed(2)} for {quantity} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Cost Per Unit:</span>
                  <span className="text-lg font-bold text-emerald-700">${pricePerUnit.toFixed(2)} per unit</span>
                </div>
                {values.sell_price_per_unit && (
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
                    <span className="text-sm flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Profit Per Unit:
                    </span>
                    <span className="font-medium text-emerald-700">
                      ${((values.sell_price_per_unit || 0) - pricePerUnit).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
            <InventoryFormField 
              label="Date Purchased" 
              name="dateBought" 
              type="date" 
              value={values.dateBought || ''} 
              onChange={e => onChange('dateBought', e.target.value)} 
              error={errors.dateBought}
              className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
            />

            <InventoryFormField 
              label="Last Price Update" 
              name="dateLast" 
              type="date" 
              value={values.dateLast || ''} 
              onChange={e => onChange('dateLast', e.target.value)} 
              error={errors.dateLast}
              className="border-slate-300 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
