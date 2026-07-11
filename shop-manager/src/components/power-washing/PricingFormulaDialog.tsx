import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SURFACE_TYPES, APPLICATIONS, CATEGORIES, LABOR_RATE_TYPES } from '@/types/pricing-formula';
import type { PricingFormula } from '@/types/pricing-formula';
import { FormulaChemicalSelector, type FormulaChemical } from './FormulaChemicalSelector';

interface PricingFormulaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formula?: PricingFormula | null;
  onSave: (data: Partial<PricingFormula>, chemicals: FormulaChemical[]) => void;
  isLoading?: boolean;
  initialChemicals?: FormulaChemical[];
}

const defaultFormula: Partial<PricingFormula> = {
  name: '',
  surface_type: 'concrete',
  application: 'driveway',
  category: 'residential',
  price_per_sqft_light: 0.12,
  price_per_sqft_medium: 0.18,
  price_per_sqft_heavy: 0.28,
  minimum_charge: 125,
  sh_concentration_light: 1.0,
  sh_concentration_medium: 3.0,
  sh_concentration_heavy: 5.0,
  mix_coverage_sqft: 150,
  minutes_per_100sqft: 3,
  setup_minutes: 20,
  labor_rate_type: 'standard',
  notes: '',
  is_active: true,
};

export function PricingFormulaDialog({ 
  open, 
  onOpenChange, 
  formula, 
  onSave,
  isLoading,
  initialChemicals = [],
}: PricingFormulaDialogProps) {
  const [formData, setFormData] = useState<Partial<PricingFormula>>(defaultFormula);
  const [chemicals, setChemicals] = useState<FormulaChemical[]>([]);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    // Only reset when dialog opens (transition from closed to open)
    if (open && !prevOpenRef.current) {
      if (formula) {
        setFormData(formula);
      } else {
        setFormData(defaultFormula);
      }
      setChemicals(initialChemicals);
    }
    prevOpenRef.current = open;
  }, [open, formula, initialChemicals]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, chemicals);
  };

  const updateField = <K extends keyof PricingFormula>(field: K, value: PricingFormula[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{formula ? 'Edit Pricing Formula' : 'New Pricing Formula'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="labor">Labor & Chemicals</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Formula Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Driveway - Residential"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Surface Type</Label>
                  <Select
                    value={formData.surface_type}
                    onValueChange={(v) => updateField('surface_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SURFACE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Application</Label>
                  <Select
                    value={formData.application}
                    onValueChange={(v) => updateField('application', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATIONS.map((app) => (
                        <SelectItem key={app.value} value={app.value}>
                          {app.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => updateField('category', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={formData.display_order || 0}
                    onChange={(e) => updateField('display_order', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(v) => updateField('is_active', v)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Application notes, special considerations..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="space-y-4">
                <h4 className="font-medium">Price per Square Foot</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-green-600">Light Condition</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price_per_sqft_light || ''}
                        onChange={(e) => updateField('price_per_sqft_light', parseFloat(e.target.value) || 0)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-yellow-600">Medium Condition</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price_per_sqft_medium || ''}
                        onChange={(e) => updateField('price_per_sqft_medium', parseFloat(e.target.value) || 0)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-red-600">Heavy Condition</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price_per_sqft_heavy || ''}
                        onChange={(e) => updateField('price_per_sqft_heavy', parseFloat(e.target.value) || 0)}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Minimum Charge</Label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="5"
                    min="0"
                    value={formData.minimum_charge || ''}
                    onChange={(e) => updateField('minimum_charge', parseFloat(e.target.value) || 0)}
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Jobs will never be priced below this amount
                </p>
              </div>
            </TabsContent>

            <TabsContent value="labor" className="space-y-6 mt-4">
              {/* Multi-Chemical Selector */}
              <FormulaChemicalSelector
                chemicals={chemicals}
                onChange={setChemicals}
              />

              <div className="space-y-2">
                <Label>Mix Coverage (sqft per gallon)</Label>
                <Input
                  type="number"
                  step="10"
                  min="1"
                  value={formData.mix_coverage_sqft || ''}
                  onChange={(e) => updateField('mix_coverage_sqft', parseFloat(e.target.value) || 150)}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Default coverage - can be overridden per chemical
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minutes per 100 sqft</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.minutes_per_100sqft || ''}
                    onChange={(e) => updateField('minutes_per_100sqft', parseInt(e.target.value) || 3)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Setup Minutes</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.setup_minutes || ''}
                    onChange={(e) => updateField('setup_minutes', parseInt(e.target.value) || 20)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Labor Rate Type</Label>
                <Select
                  value={formData.labor_rate_type}
                  onValueChange={(v) => updateField('labor_rate_type', v)}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LABOR_RATE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : formula ? 'Update Formula' : 'Create Formula'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
