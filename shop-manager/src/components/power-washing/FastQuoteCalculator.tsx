import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, Droplets, Clock, DollarSign, TrendingUp, Copy, Plus, Beaker } from 'lucide-react';
import { usePricingFormulas } from '@/hooks/power-washing/usePricingFormulas';
import { SH_SOURCE_CONCENTRATION, type ConditionLevel } from '@/types/pricing-formula';

interface FastQuoteCalculatorProps {
  onCreateQuote?: (data: {
    price: number;
    sqft: number;
    formulaName: string;
    condition: ConditionLevel;
    breakdown: string;
  }) => void;
  onAddToQuote?: (data: {
    price: number;
    sqft: number;
    formulaName: string;
    condition: ConditionLevel;
  }) => void;
}

export function FastQuoteCalculator({ onCreateQuote, onAddToQuote }: FastQuoteCalculatorProps) {
  const { formulas, isLoading, calculateQuote } = usePricingFormulas();
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('');
  const [sqft, setSqft] = useState<number>(0);
  const [condition, setCondition] = useState<ConditionLevel>('medium');
  const [shCostPerGallon, setShCostPerGallon] = useState<number>(3.50);
  const [laborRatePerHour, setLaborRatePerHour] = useState<number>(75);
  const [surfactantCostPerOz, setSurfactantCostPerOz] = useState<number>(0.50);
  const [surfactantOzPerGallon, setSurfactantOzPerGallon] = useState<number>(1.0);

  const selectedFormula = useMemo(() => 
    formulas.find(f => f.id === selectedFormulaId),
    [formulas, selectedFormulaId]
  );

  const calculation = useMemo(() => {
    if (!selectedFormula || sqft <= 0) return null;
    return calculateQuote(
      selectedFormula, 
      sqft, 
      condition, 
      shCostPerGallon, 
      laborRatePerHour,
      surfactantCostPerOz,
      surfactantOzPerGallon
    );
  }, [selectedFormula, sqft, condition, shCostPerGallon, laborRatePerHour, surfactantCostPerOz, surfactantOzPerGallon, calculateQuote]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const getBreakdownText = () => {
    if (!calculation || !selectedFormula) return '';
    return `
${selectedFormula.name} - ${condition.charAt(0).toUpperCase() + condition.slice(1)} Condition
Square Footage: ${sqft.toLocaleString()} sqft
Service Price: ${formatCurrency(calculation.price)}
SH Needed: ${calculation.shGallonsNeeded.toFixed(2)} gal @ ${formatCurrency(shCostPerGallon)}/gal = ${formatCurrency(calculation.shCost)}
Surfactant: ${calculation.surfactantOzNeeded.toFixed(1)} oz @ ${formatCurrency(surfactantCostPerOz)}/oz = ${formatCurrency(calculation.surfactantCost)}
Total Chemical Cost: ${formatCurrency(calculation.chemicalCost)}
Labor Time: ${formatMinutes(calculation.laborMinutes)} @ ${formatCurrency(laborRatePerHour)}/hr = ${formatCurrency(calculation.laborCost)}
Total Cost: ${formatCurrency(calculation.totalCost)}
Profit: ${formatCurrency(calculation.profit)} (${calculation.margin.toFixed(1)}% margin)
    `.trim();
  };

  const handleCopyBreakdown = () => {
    navigator.clipboard.writeText(getBreakdownText());
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (formulas.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pricing formulas configured.</p>
            <p className="text-sm mt-2">Add formulas in Pricing Formulas settings first.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Fast Quote Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Surface / Application</Label>
            <Select value={selectedFormulaId} onValueChange={setSelectedFormulaId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a formula..." />
              </SelectTrigger>
              <SelectContent>
                {formulas.filter(f => f.is_active).map((formula) => (
                  <SelectItem key={formula.id} value={formula.id}>
                    {formula.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Square Feet</Label>
            <Input
              type="number"
              value={sqft || ''}
              onChange={(e) => setSqft(parseFloat(e.target.value) || 0)}
              placeholder="Enter square footage"
              min={0}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Soil Condition</Label>
          <RadioGroup
            value={condition}
            onValueChange={(v) => setCondition(v as ConditionLevel)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="cursor-pointer">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Light</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="medium" id="medium" />
              <Label htmlFor="medium" className="cursor-pointer">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Medium</Badge>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="heavy" id="heavy" />
              <Label htmlFor="heavy" className="cursor-pointer">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Heavy</Badge>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Cost Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">SH Cost/Gallon</Label>
            <Input
              type="number"
              value={shCostPerGallon}
              onChange={(e) => setShCostPerGallon(parseFloat(e.target.value) || 0)}
              step={0.25}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Labor Rate/Hour</Label>
            <Input
              type="number"
              value={laborRatePerHour}
              onChange={(e) => setLaborRatePerHour(parseFloat(e.target.value) || 0)}
              step={5}
              min={0}
            />
          </div>
        </div>

        {/* Surfactant Settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Surfactant $/oz</Label>
            <Input
              type="number"
              value={surfactantCostPerOz}
              onChange={(e) => setSurfactantCostPerOz(parseFloat(e.target.value) || 0)}
              step={0.10}
              min={0}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Surfactant oz/gal mix</Label>
            <Input
              type="number"
              value={surfactantOzPerGallon}
              onChange={(e) => setSurfactantOzPerGallon(parseFloat(e.target.value) || 0)}
              step={0.25}
              min={0}
            />
          </div>
        </div>

        <Separator />

        {/* Results Section */}
        {calculation && selectedFormula ? (
          <div className="space-y-4">
            <div className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Quote Breakdown
            </div>

            {/* Price */}
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Service Price</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(calculation.price)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ${selectedFormula[`price_per_sqft_${condition}`].toFixed(4)}/sqft × {sqft.toLocaleString()} sqft
                {calculation.price === selectedFormula.minimum_charge && (
                  <span className="ml-2 text-amber-600">(minimum charge applied)</span>
                )}
              </div>
            </div>

            {/* Chemical Costs */}
            <div className="space-y-2">
              {/* SH Cost */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Droplets className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">SH (Sodium Hypochlorite)</span>
                    <span className="font-semibold">{formatCurrency(calculation.shCost)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {calculation.shGallonsNeeded.toFixed(2)} gal @ {selectedFormula[`sh_concentration_${condition}`]}% (from {SH_SOURCE_CONCENTRATION}% stock)
                  </div>
                </div>
              </div>

              {/* Surfactant Cost */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Beaker className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Surfactant</span>
                    <span className="font-semibold">{formatCurrency(calculation.surfactantCost)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {calculation.surfactantOzNeeded.toFixed(1)} oz @ {formatCurrency(surfactantCostPerOz)}/oz ({surfactantOzPerGallon} oz/gal mix)
                  </div>
                </div>
              </div>

              {/* Total Chemical */}
              <div className="flex justify-between text-sm px-3 py-1">
                <span className="text-muted-foreground">Total Chemical Cost</span>
                <span className="font-medium">{formatCurrency(calculation.chemicalCost)}</span>
              </div>
            </div>

            {/* Labor Time */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-medium">Labor Cost</span>
                  <span className="font-semibold">{formatCurrency(calculation.laborCost)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatMinutes(calculation.laborMinutes)} total ({selectedFormula.setup_minutes}m setup + {Math.round(calculation.laborMinutes - selectedFormula.setup_minutes)}m work)
                </div>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Costs</span>
                <span>{formatCurrency(calculation.totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Estimated Profit</span>
                <span className={calculation.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(calculation.profit)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Profit Margin
                </span>
                <Badge variant={calculation.margin >= 50 ? 'default' : calculation.margin >= 30 ? 'secondary' : 'destructive'}>
                  {calculation.margin.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {onCreateQuote && (
                <Button 
                  onClick={() => onCreateQuote({
                    price: calculation.price,
                    sqft,
                    formulaName: selectedFormula.name,
                    condition,
                    breakdown: getBreakdownText(),
                  })}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quote
                </Button>
              )}
              {onAddToQuote && (
                <Button 
                  variant="outline"
                  onClick={() => onAddToQuote({
                    price: calculation.price,
                    sqft,
                    formulaName: selectedFormula.name,
                    condition,
                  })}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Quote
                </Button>
              )}
              <Button variant="ghost" onClick={handleCopyBreakdown}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Select a formula and enter square footage to calculate
          </div>
        )}
      </CardContent>
    </Card>
  );
}
