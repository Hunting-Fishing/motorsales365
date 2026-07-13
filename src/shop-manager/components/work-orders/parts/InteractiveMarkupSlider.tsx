import React, { useEffect, useState } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { WorkOrderPartFormValues } from '@/types/workOrderPart';

interface InteractiveMarkupSliderProps {
  form: UseFormReturn<WorkOrderPartFormValues>;
}

export function InteractiveMarkupSlider({ form }: InteractiveMarkupSliderProps) {
  const [supplierCost, setSupplierCost] = useState(0);
  const [markupPercentage, setMarkupPercentage] = useState(50);
  const [customerPrice, setCustomerPrice] = useState(0);

  // Watch form values for real-time updates (only for calculation inputs)
  const watchedSupplierCost = form.watch('supplierCost') || 0;
  const watchedMarkup = form.watch('markupPercentage') || 50;
  const watchedSuggestedRetail = form.watch('supplierSuggestedRetail') || 0;

  // Update local state when form values change (only for calculation inputs)
  useEffect(() => {
    setSupplierCost(watchedSupplierCost);
    setMarkupPercentage(watchedMarkup);
  }, [watchedSupplierCost, watchedMarkup]);

  // Calculate customer price whenever supplier cost or markup changes
  useEffect(() => {
    const calculated = supplierCost * (1 + markupPercentage / 100);
    setCustomerPrice(calculated);
    form.setValue('customerPrice', calculated);
    form.setValue('unit_price', calculated); // Also update unit_price for invoice
  }, [supplierCost, markupPercentage, form]);

  // Color coding logic based on customer price vs supplier suggested retail
  const getPriceColorCode = () => {
    if (watchedSuggestedRetail === 0) return { color: 'default', text: 'No comparison available' };
    
    const ratio = customerPrice / watchedSuggestedRetail;
    
    if (ratio <= 1.0) {
      return { color: 'success', text: `${(ratio * 100).toFixed(0)}% of suggested retail` };
    } else if (ratio <= 1.1) {
      return { color: 'warning', text: `${(ratio * 100).toFixed(0)}% of suggested retail` };
    } else if (ratio <= 1.25) {
      return { color: 'destructive', text: `${(ratio * 100).toFixed(0)}% of suggested retail` };
    } else {
      return { color: 'destructive', text: `${(ratio * 100).toFixed(0)}% - Well above suggested retail` };
    }
  };

  const priceComparison = getPriceColorCode();

  // Preset markup buttons
  const presetMarkups = [20, 50, 75, 100, 150];

  const handleMarkupChange = (value: number[]) => {
    const newMarkup = value[0];
    setMarkupPercentage(newMarkup);
    form.setValue('markupPercentage', newMarkup);
  };

  const handleSupplierCostChange = (value: number) => {
    setSupplierCost(value);
    form.setValue('supplierCost', value);
  };

  const profitAmount = customerPrice - supplierCost;
  const profitMargin = supplierCost > 0 ? ((profitAmount / supplierCost) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Supplier Cost & Suggested Retail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="supplierCost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier Cost *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...field}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    field.onChange(value);
                    handleSupplierCostChange(value);
                  }}
                  placeholder="Cost you paid"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supplierSuggestedRetail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Supplier Suggested Retail</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    field.onChange(value);
                  }}
                  placeholder="Supplier's suggested price"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Interactive Markup Slider */}
      <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="font-medium">Interactive Markup Calculator</span>
        </div>

        {/* Preset Markup Buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">Quick presets:</span>
          {presetMarkups.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant={markupPercentage === preset ? "default" : "outline"}
              size="sm"
              onClick={() => handleMarkupChange([preset])}
            >
              {preset}%
            </Button>
          ))}
        </div>

        {/* Markup Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <FormLabel>Markup Percentage</FormLabel>
            <Badge variant="secondary" className="font-mono">
              {markupPercentage.toFixed(1)}%
            </Badge>
          </div>
          
          <Slider
            value={[markupPercentage]}
            onValueChange={handleMarkupChange}
            max={300}
            min={0}
            step={1}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>150%</span>
            <span>300%+</span>
          </div>
        </div>

        {/* Manual Markup Input */}
        <FormField
          control={form.control}
          name="markupPercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Precise Markup %</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  {...field}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    field.onChange(value);
                    setMarkupPercentage(value);
                  }}
                  placeholder="Enter exact percentage"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Calculated Customer Price with Color Coding */}
      <div className="space-y-4 p-4 bg-background border rounded-lg">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="font-medium">Customer Price Calculation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Price Display */}
          <div className="space-y-2">
            <FormLabel>Customer Price (Auto-calculated)</FormLabel>
            <div className={`p-3 rounded-md border-2 ${
              priceComparison.color === 'success' ? 'border-green-200 bg-green-50' :
              priceComparison.color === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              'border-red-200 bg-red-50'
            }`}>
              <div className="text-2xl font-bold">
                ${customerPrice.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">
                ${supplierCost.toFixed(2)} + {markupPercentage.toFixed(1)}% markup
              </div>
            </div>
          </div>

          {/* Price Comparison & Profit Analysis */}
          <div className="space-y-3">
            <div>
              <FormLabel>Price Comparison</FormLabel>
              <Badge 
                variant={priceComparison.color === 'success' ? 'default' : 
                        priceComparison.color === 'warning' ? 'secondary' : 'destructive'}
                className="ml-2"
              >
                {priceComparison.text}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="text-sm">
                <span className="text-muted-foreground">Profit Amount: </span>
                <span className="font-medium text-green-600">
                  ${profitAmount.toFixed(2)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Profit Margin: </span>
                <span className="font-medium">
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
              {watchedSuggestedRetail > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">vs Suggested: </span>
                  <span className={`font-medium ${
                    customerPrice <= watchedSuggestedRetail ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${(customerPrice - watchedSuggestedRetail).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden field to store the calculated customer price */}
        <FormField
          control={form.control}
          name="customerPrice"
          render={({ field }) => (
            <input type="hidden" {...field} value={customerPrice} />
          )}
        />
      </div>
    </div>
  );
}