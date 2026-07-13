import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Target } from 'lucide-react';
import { useNutritionGoals, useSaveNutritionGoals } from '@/hooks/useNutrition';

const GOAL_TYPES = [
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'recomposition', label: 'Body Recomposition' },
  { value: 'endurance', label: 'Endurance Performance' },
  { value: 'strength', label: 'Strength Performance' },
  { value: 'general_health', label: 'General Health' },
  { value: 'recovery', label: 'Recovery & Rehab' },
];

const ACTIVITY_MULTIPLIERS = [
  { value: '1.2', label: 'Sedentary (1.2x)' },
  { value: '1.375', label: 'Light Active (1.375x)' },
  { value: '1.55', label: 'Moderate Active (1.55x)' },
  { value: '1.725', label: 'Very Active (1.725x)' },
  { value: '1.9', label: 'Extra Active (1.9x)' },
];

interface Props {
  clientId: string;
  shopId: string;
}

export default function GoalSetup({ clientId, shopId }: Props) {
  const { data: existing, isLoading } = useNutritionGoals(clientId, shopId);
  const saveMutation = useSaveNutritionGoals(shopId);
  const [form, setForm] = useState<any>(null);

  React.useEffect(() => {
    if (existing && !form) setForm(existing);
  }, [existing]);

  const currentForm = form || {
    goal_type: 'general_health',
    target_calories: 2000,
    target_protein_g: 150,
    target_carbs_g: 200,
    target_fat_g: 65,
    target_fiber_g: 30,
    target_water_ml: 2500,
    calorie_method: 'manual',
    activity_multiplier: 1.55,
  };

  const handleSave = () => {
    saveMutation.mutate({ ...currentForm, client_id: clientId });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Nutrition Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label>Goal Type</Label>
          <Select value={currentForm.goal_type} onValueChange={v => setForm({ ...currentForm, goal_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {GOAL_TYPES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Activity Level</Label>
          <Select value={String(currentForm.activity_multiplier)} onValueChange={v => setForm({ ...currentForm, activity_multiplier: parseFloat(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIVITY_MULTIPLIERS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Daily Calories</Label>
            <Input type="number" value={currentForm.target_calories} onChange={e => setForm({ ...currentForm, target_calories: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Protein (g)</Label>
            <Input type="number" value={currentForm.target_protein_g} onChange={e => setForm({ ...currentForm, target_protein_g: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Carbs (g)</Label>
            <Input type="number" value={currentForm.target_carbs_g} onChange={e => setForm({ ...currentForm, target_carbs_g: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Fat (g)</Label>
            <Input type="number" value={currentForm.target_fat_g} onChange={e => setForm({ ...currentForm, target_fat_g: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Fiber (g)</Label>
            <Input type="number" value={currentForm.target_fiber_g} onChange={e => setForm({ ...currentForm, target_fiber_g: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Water (ml)</Label>
            <Input type="number" value={currentForm.target_water_ml} onChange={e => setForm({ ...currentForm, target_water_ml: parseInt(e.target.value) || 0 })} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Goals
        </Button>
      </CardContent>
    </Card>
  );
}
