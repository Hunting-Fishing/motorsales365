import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Droplets, Star, GripVertical } from 'lucide-react';
import { usePowerWashingInventory, type InventoryItem } from '@/hooks/power-washing/usePowerWashingInventory';
import { SH_CONCENTRATIONS, SH_SOURCE_CONCENTRATION } from '@/types/pricing-formula';

export interface FormulaChemical {
  id?: string;
  inventory_item_id: string | null;
  chemical_name: string;
  concentration_light: number;
  concentration_medium: number;
  concentration_heavy: number;
  coverage_sqft_per_gallon: number;
  is_primary: boolean;
  display_order: number;
  notes?: string;
}

interface FormulaChemicalSelectorProps {
  chemicals: FormulaChemical[];
  onChange: (chemicals: FormulaChemical[]) => void;
}

const defaultChemical: FormulaChemical = {
  inventory_item_id: null,
  chemical_name: '',
  concentration_light: 1.0,
  concentration_medium: 3.0,
  concentration_heavy: 5.0,
  coverage_sqft_per_gallon: 150,
  is_primary: false,
  display_order: 0,
};

export function FormulaChemicalSelector({ chemicals, onChange }: FormulaChemicalSelectorProps) {
  const { data: inventoryItems = [], isLoading } = usePowerWashingInventory('chemicals');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChemical, setNewChemical] = useState<FormulaChemical>({ ...defaultChemical });

  const handleAddChemical = () => {
    if (!newChemical.chemical_name) return;
    
    const updatedChemicals = [
      ...chemicals,
      {
        ...newChemical,
        display_order: chemicals.length,
        is_primary: chemicals.length === 0, // First chemical is primary by default
      },
    ];
    onChange(updatedChemicals);
    setNewChemical({ ...defaultChemical });
    setShowAddForm(false);
  };

  const handleRemoveChemical = (index: number) => {
    const updatedChemicals = chemicals.filter((_, i) => i !== index);
    // Reassign primary if needed
    if (updatedChemicals.length > 0 && !updatedChemicals.some(c => c.is_primary)) {
      updatedChemicals[0].is_primary = true;
    }
    onChange(updatedChemicals);
  };

  const handleSetPrimary = (index: number) => {
    const updatedChemicals = chemicals.map((chem, i) => ({
      ...chem,
      is_primary: i === index,
    }));
    onChange(updatedChemicals);
  };

  const handleUpdateChemical = (index: number, updates: Partial<FormulaChemical>) => {
    const updatedChemicals = chemicals.map((chem, i) => 
      i === index ? { ...chem, ...updates } : chem
    );
    onChange(updatedChemicals);
  };

  const handleSelectInventoryItem = (itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setNewChemical(prev => ({
        ...prev,
        inventory_item_id: itemId,
        chemical_name: item.name,
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Chemicals</h4>
          <p className="text-xs text-muted-foreground">
            Add chemicals with concentration levels for each soil condition
          </p>
        </div>
        {!showAddForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Chemical
          </Button>
        )}
      </div>

      {/* Existing chemicals */}
      {chemicals.length > 0 && (
        <div className="space-y-2">
          {chemicals.map((chem, index) => (
            <Card key={index} className="bg-muted/30">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{chem.chemical_name}</span>
                    {chem.is_primary && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!chem.is_primary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(index)}
                        title="Set as primary chemical"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChemical(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-green-600">Light</Label>
                    <Select
                      value={String(chem.concentration_light)}
                      onValueChange={(v) => handleUpdateChemical(index, { concentration_light: parseFloat(v) })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SH_CONCENTRATIONS.map((conc) => (
                          <SelectItem key={conc.value} value={String(conc.value)}>
                            {conc.label}
                          </SelectItem>
                        ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-yellow-600">Medium</Label>
                    <Select
                      value={String(chem.concentration_medium)}
                      onValueChange={(v) => handleUpdateChemical(index, { concentration_medium: parseFloat(v) })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SH_CONCENTRATIONS.map((conc) => (
                          <SelectItem key={conc.value} value={String(conc.value)}>
                            {conc.label}
                          </SelectItem>
                        ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-red-600">Heavy</Label>
                    <Select
                      value={String(chem.concentration_heavy)}
                      onValueChange={(v) => handleUpdateChemical(index, { concentration_heavy: parseFloat(v) })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SH_CONCENTRATIONS.map((conc) => (
                          <SelectItem key={conc.value} value={String(conc.value)}>
                            {conc.label}
                          </SelectItem>
                        ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Coverage (sqft/gal)</Label>
                  <Input
                    type="number"
                    value={chem.coverage_sqft_per_gallon}
                    onChange={(e) => handleUpdateChemical(index, { coverage_sqft_per_gallon: parseFloat(e.target.value) || 150 })}
                    className="h-8 w-32"
                    min={1}
                  />
                </div>
              </CardContent>
            </Card>
          ))
          }
        </div>
      )}

      {/* Add new chemical form */}
      {showAddForm && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Select from Inventory or Enter Name</Label>
              <div className="flex gap-2">
                <Select
                  value={newChemical.inventory_item_id || ''}
                  onValueChange={handleSelectInventoryItem}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select from inventory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : inventoryItems.length === 0 ? (
                      <SelectItem value="none" disabled>No chemicals in inventory</SelectItem>
                    ) : (
                      inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} {item.sh_percentage ? `(${item.sh_percentage}% SH)` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <span className="text-muted-foreground self-center">or</span>
                <Input
                  placeholder="Enter chemical name..."
                  value={newChemical.chemical_name}
                  onChange={(e) => setNewChemical(prev => ({ ...prev, chemical_name: e.target.value, inventory_item_id: null }))}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Concentration Levels (from {SH_SOURCE_CONCENTRATION}% stock)</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-green-600">Light</Label>
                  <Select
                    value={String(newChemical.concentration_light)}
                    onValueChange={(v) => setNewChemical(prev => ({ ...prev, concentration_light: parseFloat(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SH_CONCENTRATIONS.map((conc) => (
                        <SelectItem key={conc.value} value={String(conc.value)}>
                          {conc.label}
                        </SelectItem>
                      ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-yellow-600">Medium</Label>
                  <Select
                    value={String(newChemical.concentration_medium)}
                    onValueChange={(v) => setNewChemical(prev => ({ ...prev, concentration_medium: parseFloat(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SH_CONCENTRATIONS.map((conc) => (
                        <SelectItem key={conc.value} value={String(conc.value)}>
                          {conc.label}
                        </SelectItem>
                      ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-red-600">Heavy</Label>
                  <Select
                    value={String(newChemical.concentration_heavy)}
                    onValueChange={(v) => setNewChemical(prev => ({ ...prev, concentration_heavy: parseFloat(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SH_CONCENTRATIONS.map((conc) => (
                        <SelectItem key={conc.value} value={String(conc.value)}>
                          {conc.label}
                        </SelectItem>
                      ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Coverage (sqft per gallon)</Label>
              <Input
                type="number"
                value={newChemical.coverage_sqft_per_gallon}
                onChange={(e) => setNewChemical(prev => ({ ...prev, coverage_sqft_per_gallon: parseFloat(e.target.value) || 150 }))}
                className="w-32"
                min={1}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewChemical({ ...defaultChemical });
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddChemical}
                disabled={!newChemical.chemical_name}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Chemical
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {chemicals.length === 0 && !showAddForm && (
        <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
          <Droplets className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No chemicals added yet</p>
          <p className="text-xs">Add chemicals to calculate material costs</p>
        </div>
      )}
    </div>
  );
}
