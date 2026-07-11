import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Camera, Clock, Star, History, Sparkles } from 'lucide-react';
import { useLogFood, useFoodLogs } from '@/hooks/useNutrition';
import MealPhotoUpload from './MealPhotoUpload';

interface Props {
  clientId: string;
  shopId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Breakfast', time: '7:00 AM' },
  { value: 'pre_workout', label: '💪 Pre-Workout', time: '9:00 AM' },
  { value: 'lunch', label: '☀️ Lunch', time: '12:00 PM' },
  { value: 'post_workout', label: '🔋 Post-Workout', time: '3:00 PM' },
  { value: 'dinner', label: '🌙 Dinner', time: '7:00 PM' },
  { value: 'snack', label: '🍎 Snack', time: '' },
];

// Common quick-add foods with pre-filled macros
const QUICK_FOODS = [
  { name: 'Chicken Breast (150g)', calories: 248, protein_g: 46.5, carbs_g: 0, fat_g: 5.4 },
  { name: 'Brown Rice (1 cup)', calories: 216, protein_g: 5, carbs_g: 45, fat_g: 1.8 },
  { name: 'Eggs (2 large)', calories: 156, protein_g: 12.6, carbs_g: 1.1, fat_g: 10.6 },
  { name: 'Greek Yogurt (200g)', calories: 130, protein_g: 22, carbs_g: 8, fat_g: 0.8 },
  { name: 'Banana (1 medium)', calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.4 },
  { name: 'Oatmeal (1 cup)', calories: 154, protein_g: 5.3, carbs_g: 27.4, fat_g: 2.6 },
  { name: 'Salmon Fillet (150g)', calories: 311, protein_g: 31.4, carbs_g: 0, fat_g: 19.9 },
  { name: 'Avocado (half)', calories: 120, protein_g: 1.5, carbs_g: 6, fat_g: 11 },
  { name: 'Protein Shake', calories: 160, protein_g: 30, carbs_g: 5, fat_g: 2 },
  { name: 'Sweet Potato (medium)', calories: 103, protein_g: 2.3, carbs_g: 24, fat_g: 0.1 },
];

export default function EnhancedFoodLogger({ clientId, shopId, open, onOpenChange }: Props) {
  const logFoodMutation = useLogFood(shopId);
  const { data: logs = [] } = useFoodLogs(clientId, shopId);
  const [photoUrl, setPhotoUrl] = useState('');
  const [servings, setServings] = useState(1);
  const [showRecent, setShowRecent] = useState(false);
  const [form, setForm] = useState({
    meal_type: 'lunch',
    food_name: '',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    notes: '',
  });

  // Get recent unique foods from logs
  const recentFoods = React.useMemo(() => {
    const seen = new Set<string>();
    return logs.filter((l: any) => {
      if (seen.has(l.food_name)) return false;
      seen.add(l.food_name);
      return true;
    }).slice(0, 8);
  }, [logs]);

  const adjustedMacros = {
    calories: Math.round(form.calories * servings),
    protein_g: Math.round(form.protein_g * servings * 10) / 10,
    carbs_g: Math.round(form.carbs_g * servings * 10) / 10,
    fat_g: Math.round(form.fat_g * servings * 10) / 10,
    fiber_g: Math.round(form.fiber_g * servings * 10) / 10,
  };

  const handleSubmit = () => {
    if (!form.food_name) return;
    logFoodMutation.mutate({
      client_id: clientId,
      log_date: new Date().toISOString().split('T')[0],
      meal_type: form.meal_type,
      food_name: form.food_name,
      servings,
      ...adjustedMacros,
      notes: form.notes,
      photo_url: photoUrl || null,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setForm({ meal_type: 'lunch', food_name: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, notes: '' });
    setServings(1);
    setPhotoUrl('');
    setShowRecent(false);
  };

  const applyQuickFood = (food: any) => {
    setForm(f => ({
      ...f,
      food_name: food.food_name || food.name,
      calories: food.calories || 0,
      protein_g: food.protein_g || 0,
      carbs_g: food.carbs_g || 0,
      fat_g: food.fat_g || 0,
      fiber_g: food.fiber_g || 0,
    }));
    setServings(1);
    setShowRecent(false);
  };

  const totalCal = adjustedMacros.calories;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Log Meal
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Meal Type Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            {MEAL_TYPES.map(mt => (
              <Button
                key={mt.value}
                variant={form.meal_type === mt.value ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-9"
                onClick={() => setForm(f => ({ ...f, meal_type: mt.value }))}
              >
                {mt.label}
              </Button>
            ))}
          </div>

          {/* Quick Foods / Recent toggle */}
          <div className="flex gap-2">
            <Button variant={!showRecent ? 'secondary' : 'ghost'} size="sm" className="text-xs flex-1" onClick={() => setShowRecent(false)}>
              <Star className="h-3 w-3 mr-1" />Quick Foods
            </Button>
            <Button variant={showRecent ? 'secondary' : 'ghost'} size="sm" className="text-xs flex-1" onClick={() => setShowRecent(true)}>
              <History className="h-3 w-3 mr-1" />Recent ({recentFoods.length})
            </Button>
          </div>

          {/* Quick/Recent Foods Grid */}
          <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
            {(showRecent ? recentFoods : QUICK_FOODS).map((food: any, i: number) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-[10px] h-auto py-1.5 px-2 justify-start text-left"
                onClick={() => applyQuickFood(food)}
              >
                <div className="truncate">
                  <p className="font-medium truncate">{food.food_name || food.name}</p>
                  <p className="text-muted-foreground">{food.calories}cal · P:{Math.round(food.protein_g || 0)}g</p>
                </div>
              </Button>
            ))}
          </div>

          {/* Food Name */}
          <div>
            <Label>Food Item</Label>
            <Input
              value={form.food_name}
              onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))}
              placeholder="e.g., Grilled chicken breast with rice"
            />
          </div>

          {/* Serving Size Slider */}
          <div>
            <Label className="flex items-center justify-between">
              <span>Servings</span>
              <span className="text-primary font-semibold">{servings}x</span>
            </Label>
            <Slider
              value={[servings]}
              onValueChange={v => setServings(v[0])}
              min={0.25}
              max={5}
              step={0.25}
              className="mt-2"
            />
          </div>

          {/* Macro Preview Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{adjustedMacros.calories}</p>
                  <p className="text-[10px] text-muted-foreground">Calories</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">{adjustedMacros.protein_g}g</p>
                  <p className="text-[10px] text-muted-foreground">Protein</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{adjustedMacros.carbs_g}g</p>
                  <p className="text-[10px] text-muted-foreground">Carbs</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-rose-600">{adjustedMacros.fat_g}g</p>
                  <p className="text-[10px] text-muted-foreground">Fat</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Macros */}
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Calories</Label><Input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: parseInt(e.target.value) || 0 }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Protein (g)</Label><Input type="number" value={form.protein_g} onChange={e => setForm(f => ({ ...f, protein_g: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Carbs (g)</Label><Input type="number" value={form.carbs_g} onChange={e => setForm(f => ({ ...f, carbs_g: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Fat (g)</Label><Input type="number" value={form.fat_g} onChange={e => setForm(f => ({ ...f, fat_g: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm" /></div>
          </div>

          {/* Photo Upload */}
          <div>
            <Label className="text-xs mb-1 block">Meal Photo</Label>
            <MealPhotoUpload clientId={clientId} onPhotoUploaded={setPhotoUrl} existingUrl={photoUrl} />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-16 text-sm" placeholder="Any additional notes..." />
          </div>

          {/* Submit */}
          <Button onClick={handleSubmit} disabled={!form.food_name || logFoodMutation.isPending} className="w-full h-11">
            {logFoodMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Log {form.food_name ? `"${form.food_name}"` : 'Meal'} {totalCal > 0 ? `· ${totalCal} cal` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
