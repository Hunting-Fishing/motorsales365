import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  ArrowLeft,
  Beaker,
  Star,
  Droplets,
  Copy,
  Trash2,
  Calculator
} from 'lucide-react';
import { 
  usePowerWashingFormulas, 
  usePowerWashingChemicals,
  useCreateFormula,
  useUpdateFormula,
  useDeleteFormula,
  PowerWashingFormula,
  FormulaIngredient
} from '@/hooks/usePowerWashing';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const surfaceTypes = ['concrete', 'wood', 'vinyl', 'brick', 'stucco', 'metal', 'composite'];
const applicationTypes = ['house_wash', 'roof_wash', 'driveway', 'deck', 'fence', 'fleet', 'graffiti'];

const surfaceColors: Record<string, string> = {
  concrete: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  wood: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  vinyl: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  brick: 'bg-red-500/10 text-red-500 border-red-500/20',
  stucco: 'bg-stone-500/10 text-stone-500 border-stone-500/20',
  metal: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  composite: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

export default function PowerWashingFormulas() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<PowerWashingFormula | null>(null);
  
  const { data: formulas, isLoading } = usePowerWashingFormulas();
  const { data: chemicals } = usePowerWashingChemicals();
  const createFormula = useCreateFormula();
  const updateFormula = useUpdateFormula();
  const deleteFormula = useDeleteFormula();

  // Get shop_id
  const { data: shopData } = useQuery({
    queryKey: ['user-shop-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('user_id', user.id)
        .single();
      return data?.shop_id;
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    surface_type: '',
    application: '',
    water_gallons: 1,
    notes: '',
    ingredients: [] as FormulaIngredient[],
  });

  const filteredFormulas = formulas?.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.surface_type?.toLowerCase().includes(query) ||
      item.application?.toLowerCase().includes(query)
    );
  });

  const handleOpenDialog = (formula?: PowerWashingFormula) => {
    if (formula) {
      setEditingFormula(formula);
      setFormData({
        name: formula.name,
        description: formula.description || '',
        surface_type: formula.surface_type || '',
        application: formula.application || '',
        water_gallons: formula.water_gallons,
        notes: formula.notes || '',
        ingredients: formula.ingredients || [],
      });
    } else {
      setEditingFormula(null);
      setFormData({
        name: '',
        description: '',
        surface_type: '',
        application: '',
        water_gallons: 1,
        notes: '',
        ingredients: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleAddIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { chemical_id: '', amount: 1, unit: 'oz' }]
    }));
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  const handleIngredientChange = (index: number, field: keyof FormulaIngredient, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => 
        i === index ? { ...ing, [field]: value } : ing
      )
    }));
  };

  const handleSubmit = async () => {
    if (!shopData || !formData.name) {
      toast.error('Please fill in required fields');
      return;
    }

    const payload = {
      shop_id: shopData,
      name: formData.name,
      description: formData.description || null,
      surface_type: formData.surface_type || null,
      application: formData.application || null,
      water_gallons: formData.water_gallons,
      notes: formData.notes || null,
      ingredients: formData.ingredients,
      is_favorite: editingFormula?.is_favorite || false,
      is_active: true,
      created_by: null,
    };

    if (editingFormula) {
      await updateFormula.mutateAsync({ id: editingFormula.id, ...payload });
    } else {
      await createFormula.mutateAsync(payload);
    }
    setIsDialogOpen(false);
  };

  const handleToggleFavorite = async (formula: PowerWashingFormula) => {
    await updateFormula.mutateAsync({ id: formula.id, is_favorite: !formula.is_favorite });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this formula?')) {
      await deleteFormula.mutateAsync(id);
    }
  };

  const getChemicalName = (chemicalId: string) => {
    return chemicals?.find(c => c.id === chemicalId)?.name || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quick Formulas</h1>
            <p className="text-muted-foreground">Pre-mixed chemical recipes for common jobs</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/power-washing/bleach-calculator')}>
              <Calculator className="h-4 w-4 mr-2" />
              SH Calculator
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Formula
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingFormula ? 'Edit Formula' : 'Create Formula'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Formula Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., House Wash Standard"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Surface Type</Label>
                    <Select value={formData.surface_type} onValueChange={(v) => setFormData(p => ({ ...p, surface_type: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {surfaceTypes.map(s => (
                          <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Application</Label>
                    <Select value={formData.application} onValueChange={(v) => setFormData(p => ({ ...p, application: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {applicationTypes.map(a => (
                          <SelectItem key={a} value={a}>{a.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Water (gallons)</Label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={formData.water_gallons}
                    onChange={(e) => setFormData(p => ({ ...p, water_gallons: parseFloat(e.target.value) || 1 }))}
                  />
                </div>

                {/* Ingredients */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Ingredients</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddIngredient}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Select 
                          value={ing.chemical_id} 
                          onValueChange={(v) => handleIngredientChange(idx, 'chemical_id', v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Chemical..." />
                          </SelectTrigger>
                          <SelectContent>
                            {chemicals?.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          className="w-20"
                          value={ing.amount}
                          onChange={(e) => handleIngredientChange(idx, 'amount', parseFloat(e.target.value) || 0)}
                        />
                        <Select 
                          value={ing.unit} 
                          onValueChange={(v) => handleIngredientChange(idx, 'unit', v)}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="oz">oz</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="cups">cups</SelectItem>
                            <SelectItem value="gal">gal</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveIngredient(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Safety notes, tips, etc."
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={createFormula.isPending || updateFormula.isPending}
                >
                  {editingFormula ? 'Update Formula' : 'Create Formula'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search formulas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Formulas Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : filteredFormulas && filteredFormulas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFormulas.map((formula) => (
            <Card 
              key={formula.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleOpenDialog(formula)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Beaker className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    {formula.surface_type && (
                      <Badge className={surfaceColors[formula.surface_type] || 'bg-gray-500/10 text-gray-500'}>
                        {formula.surface_type}
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(formula); }}
                    >
                      <Star className={`h-4 w-4 ${formula.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </Button>
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg text-foreground mb-1">{formula.name}</h3>
                {formula.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{formula.description}</p>
                )}

                {/* Recipe summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Droplets className="h-4 w-4" />
                    <span>{formula.water_gallons} gal water</span>
                  </div>
                  {formula.ingredients.length > 0 && (
                    <div className="text-muted-foreground">
                      + {formula.ingredients.length} chemical{formula.ingredients.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      const text = `${formula.name}\n${formula.water_gallons} gal water\n${
                        formula.ingredients.map(i => `${i.amount} ${i.unit} ${getChemicalName(i.chemical_id)}`).join('\n')
                      }`;
                      navigator.clipboard.writeText(text);
                      toast.success('Formula copied!');
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDelete(formula.id); }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Beaker className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No formulas found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search' : 'Create quick mix formulas for your crew'}
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Formula
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
