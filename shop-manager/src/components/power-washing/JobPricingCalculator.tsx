import React, { useMemo, useEffect } from 'react';
import { Calculator, Droplets, Beaker, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { usePricingFormulas } from '@/hooks/power-washing/usePricingFormulas';
import { usePowerWashingInventory } from '@/hooks/power-washing/usePowerWashingInventory';
import type { ConditionLevel } from '@/types/pricing-formula';

interface JobPricingCalculatorProps {
  squareFootage: number | null;
  onPriceCalculated: (price: number) => void;
}

const CONDITIONS: { value: ConditionLevel; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

export function JobPricingCalculator({ squareFootage, onPriceCalculated }: JobPricingCalculatorProps) {
  const { formulas, isLoading: formulasLoading, calculateQuote } = usePricingFormulas();
  const { data: chemicals, isLoading: chemicalsLoading } = usePowerWashingInventory('chemicals');

  const [selectedFormulaId, setSelectedFormulaId] = React.useState<string>('');
  const [condition, setCondition] = React.useState<ConditionLevel>('medium');
  const [isOpen, setIsOpen] = React.useState(false);

  // Get SH and Surfactant costs from inventory (use first match or default)
  const chemicalCosts = useMemo(() => {
    if (!chemicals || chemicals.length === 0) {
      return { shCostPerGallon: 3.50, surfactantCostPerOz: 0.50 };
    }

    // Find SH product (look for "SH", "Sodium Hypochlorite", or sh_percentage)
    const shProduct = chemicals.find(c => 
      c.sh_percentage !== null || 
      c.name.toLowerCase().includes('sh') || 
      c.name.toLowerCase().includes('sodium hypochlorite') ||
      c.name.toLowerCase().includes('bleach')
    );

    // Find Surfactant product
    const surfactantProduct = chemicals.find(c =>
      c.name.toLowerCase().includes('surfactant') ||
      c.name.toLowerCase().includes('soap') ||
      c.name.toLowerCase().includes('elemonator') ||
      c.name.toLowerCase().includes('cling')
    );

    // Calculate per-gallon cost for SH (unit_cost is per unit_of_measure)
    const shCostPerGallon = shProduct ? shProduct.unit_cost : 3.50;
    
    // Calculate per-oz cost for surfactant (assume gallon = 128oz if unit is gallon)
    let surfactantCostPerOz = 0.50;
    if (surfactantProduct) {
      if (surfactantProduct.unit_of_measure.toLowerCase().includes('gal')) {
        surfactantCostPerOz = surfactantProduct.unit_cost / 128;
      } else if (surfactantProduct.unit_of_measure.toLowerCase().includes('oz')) {
        surfactantCostPerOz = surfactantProduct.unit_cost;
      } else {
        surfactantCostPerOz = surfactantProduct.unit_cost / 128; // Default assume gallon
      }
    }

    return { shCostPerGallon, surfactantCostPerOz };
  }, [chemicals]);

  const selectedFormula = useMemo(() => 
    formulas.find(f => f.id === selectedFormulaId),
    [formulas, selectedFormulaId]
  );

  const calculation = useMemo(() => {
    if (!selectedFormula || !squareFootage || squareFootage <= 0) return null;
    return calculateQuote(
      selectedFormula,
      squareFootage,
      condition,
      chemicalCosts.shCostPerGallon,
      75, // labor rate - could be made configurable
      chemicalCosts.surfactantCostPerOz,
      1.0 // surfactant oz per gallon
    );
  }, [selectedFormula, squareFootage, condition, chemicalCosts, calculateQuote]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const isLoading = formulasLoading || chemicalsLoading;

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3" />
      </div>
    );
  }

  if (formulas.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
        <Calculator className="h-5 w-5 mx-auto mb-2 opacity-50" />
        No pricing formulas configured. Set up formulas in Settings → Pricing Formulas.
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto rounded-none">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="font-medium">Price Calculator</span>
              {calculation && (
                <span className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {formatCurrency(calculation.price)}
                </span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t">
            {/* Formula & Condition Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Pricing Formula</Label>
                <Select value={selectedFormulaId} onValueChange={setSelectedFormulaId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select formula..." />
                  </SelectTrigger>
                  <SelectContent>
                    {formulas.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Soil Condition</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as ConditionLevel)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Square Footage Display */}
            <div className="flex items-center justify-between text-sm bg-muted/50 p-3 rounded-lg">
              <span className="text-muted-foreground">Square Footage:</span>
              <span className="font-semibold">
                {squareFootage ? squareFootage.toLocaleString() + ' sqft' : 'Not entered'}
              </span>
            </div>

            {/* Calculation Breakdown */}
            {calculation && selectedFormula && (
              <div className="space-y-3">
                {/* Chemical Costs from Inventory */}
                <div className="text-xs text-muted-foreground mb-2">
                  Using inventory prices: SH @ {formatCurrency(chemicalCosts.shCostPerGallon)}/gal, 
                  Surfactant @ {formatCurrency(chemicalCosts.surfactantCostPerOz)}/oz
                </div>

                {/* SH Cost */}
                <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <div className="flex-1 text-sm">
                    <div className="flex justify-between">
                      <span>SH (Sodium Hypochlorite)</span>
                      <span className="font-medium">{formatCurrency(calculation.shCost)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {calculation.shGallonsNeeded.toFixed(2)} gal @ {selectedFormula[`sh_concentration_${condition}`]}%
                    </div>
                  </div>
                </div>

                {/* Surfactant Cost */}
                <div className="flex items-center gap-3 p-3 bg-purple-500/10 rounded-lg">
                  <Beaker className="h-4 w-4 text-purple-500" />
                  <div className="flex-1 text-sm">
                    <div className="flex justify-between">
                      <span>Surfactant</span>
                      <span className="font-medium">{formatCurrency(calculation.surfactantCost)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {calculation.surfactantOzNeeded.toFixed(1)} oz
                    </div>
                  </div>
                </div>

                {/* Labor */}
                <div className="flex items-center gap-3 p-3 bg-orange-500/10 rounded-lg">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div className="flex-1 text-sm">
                    <div className="flex justify-between">
                      <span>Estimated Labor</span>
                      <span className="font-medium">{formatCurrency(calculation.laborCost)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(calculation.laborMinutes)} min
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span>{formatCurrency(calculation.totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profit</span>
                    <span className="text-green-600 font-medium">{formatCurrency(calculation.profit)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Suggested Price</span>
                    </div>
                    <span className="text-lg font-bold text-primary">{formatCurrency(calculation.price)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {calculation.margin.toFixed(1)}% margin
                  </div>
                </div>

                {/* Apply Price Button */}
                <Button 
                  type="button"
                  className="w-full" 
                  onClick={() => onPriceCalculated(calculation.price)}
                >
                  Apply {formatCurrency(calculation.price)} as Quoted Price
                </Button>
              </div>
            )}

            {!calculation && selectedFormulaId && (
              <div className="text-sm text-center text-muted-foreground py-4">
                Enter square footage to calculate price
              </div>
            )}

            {!selectedFormulaId && (
              <div className="text-sm text-center text-muted-foreground py-4">
                Select a pricing formula to begin
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
