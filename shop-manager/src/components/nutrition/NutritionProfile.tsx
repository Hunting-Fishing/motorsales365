import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, Loader2, User, HeartPulse } from 'lucide-react';
import { useNutritionProfile, useSaveNutritionProfile } from '@/hooks/useNutrition';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MultiSelectDialog from './MultiSelectDialog';

const INITIAL_DIETARY_STYLES: Record<string, string[]> = {
  'Popular': ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'flexitarian'],
  'Low-Carb / High-Fat': ['keto', 'paleo', 'carnivore', 'atkins', 'low_carb'],
  'Cultural & Regional': ['mediterranean', 'nordic', 'japanese', 'indian_vegetarian', 'middle_eastern', 'african_heritage'],
  'Health-Focused': ['whole30', 'anti_inflammatory', 'dash', 'fodmap_friendly', 'autoimmune_protocol', 'diabetic_friendly', 'heart_healthy'],
  'Plant-Forward': ['raw_vegan', 'fruitarian', 'macrobiotic', 'whole_food_plant_based'],
  'Performance': ['high_protein', 'zone_diet', 'iifym', 'intermittent_fasting', 'carb_cycling'],
  'Other': ['halal', 'kosher', 'organic_only', 'clean_eating'],
};

const INITIAL_ALLERGY_OPTIONS: Record<string, string[]> = {
  'Common (Top 9)': ['milk', 'eggs', 'peanuts', 'tree_nuts', 'wheat', 'soy', 'fish', 'shellfish', 'sesame'],
  'Grains & Gluten': ['gluten', 'barley', 'rye', 'oats', 'corn'],
  'Fruits & Vegetables': ['banana', 'avocado', 'kiwi', 'mango', 'strawberry', 'tomato', 'celery', 'bell_pepper'],
  'Seeds & Legumes': ['mustard', 'sunflower_seeds', 'flaxseed', 'lentils', 'chickpeas', 'lupin'],
  'Animal Products': ['red_meat', 'poultry', 'gelatin'],
  'Other': ['sulfites', 'msg', 'food_coloring', 'latex_related', 'nickel_related'],
};

const INITIAL_INTOLERANCE_OPTIONS: Record<string, string[]> = {
  'Common': ['lactose', 'gluten_sensitivity', 'fructose', 'histamine', 'caffeine'],
  'Digestive': ['fodmap', 'sorbitol', 'mannitol', 'xylitol', 'fructan', 'galactan'],
  'Additives': ['sulfites', 'salicylates', 'amines', 'msg_sensitivity', 'artificial_sweeteners', 'food_preservatives'],
  'Other': ['alcohol', 'nightshades', 'oxalates', 'lectins', 'tyramine'],
};

const INTOLERANCE_OPTIONS_CATEGORIZED: Record<string, string[]> = {
  'Common': ['lactose', 'gluten_sensitivity', 'fructose', 'histamine', 'caffeine'],
  'Digestive': ['fodmap', 'sorbitol', 'mannitol', 'xylitol', 'fructan', 'galactan'],
  'Additives': ['sulfites', 'salicylates', 'amines', 'msg_sensitivity', 'artificial_sweeteners', 'food_preservatives'],
  'Other': ['alcohol', 'nightshades', 'oxalates', 'lectins', 'tyramine'],
};

const BUDGET_LEVELS = [
  { value: 'very_tight', label: '💸 Very Tight — Dollar store & basics only' },
  { value: 'budget', label: '🪙 Budget — Affordable staples, store brands' },
  { value: 'moderate', label: '💵 Moderate — Mix of value & quality' },
  { value: 'comfortable', label: '💰 Comfortable — Quality ingredients, some organic' },
  { value: 'premium', label: '🥇 Premium — Organic, specialty, high-end' },
  { value: 'no_limit', label: '✨ No Limit — Best available, no restrictions' },
];

const COOKING_LEVELS = [
  { value: 'none', label: '🚫 None — I don\'t cook at all' },
  { value: 'microwave_only', label: '📦 Microwave Only — Heat & eat' },
  { value: 'beginner', label: '🔰 Beginner — Basic recipes, simple meals' },
  { value: 'developing', label: '📖 Developing — Following recipes, gaining confidence' },
  { value: 'intermediate', label: '🍳 Intermediate — Comfortable with most techniques' },
  { value: 'advanced', label: '👨‍🍳 Advanced — Complex recipes, meal prep pro' },
  { value: 'expert', label: '⭐ Expert — Professional-level skills' },
];

interface Props {
  clientId: string;
  shopId: string;
}

export default function NutritionProfile({ clientId, shopId }: Props) {
  const { data: existing, isLoading } = useNutritionProfile(clientId, shopId);
  const saveMutation = useSaveNutritionProfile(shopId);
  const [form, setForm] = useState<any>(null);
  const [dietCategories, setDietCategories] = useState<Record<string, string[]>>({ ...INITIAL_DIETARY_STYLES });
  const [allergyCategories, setAllergyCategories] = useState<Record<string, string[]>>({ ...INITIAL_ALLERGY_OPTIONS });
  const [intoleranceCategories, setIntoleranceCategories] = useState<Record<string, string[]>>({ ...INITIAL_INTOLERANCE_OPTIONS });

  // Fetch medical dietary implications (must be before any early return)
  const { data: medicalDietaryImplications = [] } = useQuery({
    queryKey: ['pt-medical-dietary', clientId, shopId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('pt_client_medical_conditions')
        .select('condition_name, dietary_implications')
        .eq('client_id', clientId)
        .eq('shop_id', shopId)
        .in('status', ['active', 'chronic']);
      if (!data) return [];
      const implications: { condition: string; implication: string }[] = [];
      for (const cond of data) {
        for (const imp of (cond.dietary_implications || [])) {
          implications.push({ condition: cond.condition_name, implication: imp });
        }
      }
      return implications;
    },
    enabled: !!clientId && !!shopId,
  });

  React.useEffect(() => {
    if (existing && !form) {
      setForm(existing);
    }
  }, [existing]);

  const currentForm = form || {
    dietary_style: 'omnivore',
    allergies: [],
    intolerances: [],
    disliked_foods: [],
    digestive_notes: '',
    budget_level: 'moderate',
    cooking_level: 'intermediate',
    supplement_usage: [],
    meal_frequency: 3,
    snack_frequency: 1,
    hydration_goal_ml: 2500,
    custom_diet_suggestion: '',
  };

  const addToCategory = (
    setter: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
  ) => (category: string, value: string) => {
    setter(prev => ({
      ...prev,
      [category]: prev[category] ? [...prev[category], value] : [value],
    }));
  };

  const handleSave = () => {
    saveMutation.mutate({ ...currentForm, client_id: clientId });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Nutrition Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Medical Dietary Implications */}
        {medicalDietaryImplications.length > 0 && (
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className="h-4 w-4 text-amber-600" />
              <Label className="text-sm font-medium text-amber-800 dark:text-amber-200">Medical Dietary Considerations</Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {medicalDietaryImplications.map((item: any, i: number) => (
                <Badge key={i} variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">
                  {item.implication.replace(/_/g, ' ')} <span className="text-[10px] ml-1 opacity-70">({item.condition})</span>
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5">Auto-derived from client's medical conditions</p>
          </div>
        )}
        {/* Dietary Styles — Multi-select dialog */}
        <div>
          <Label className="mb-1.5 block">Dietary Style(s)</Label>
          <MultiSelectDialog
            label="Dietary Styles"
            options={[]}
            categorized={dietCategories}
            selected={Array.isArray(currentForm.dietary_style) ? currentForm.dietary_style : currentForm.dietary_style ? [currentForm.dietary_style] : []}
            onSelectionChange={v => setForm({ ...currentForm, dietary_style: v })}
            allowCustom
            customPlaceholder="Suggest a diet..."
            onAddCustomToCategory={addToCategory(setDietCategories)}
          />
        </div>

        {/* Allergies — Multi-select dialog */}
        <div>
          <Label className="mb-1.5 block">Allergies</Label>
          <MultiSelectDialog
            label="Allergies"
            options={[]}
            categorized={allergyCategories}
            selected={currentForm.allergies || []}
            onSelectionChange={v => setForm({ ...currentForm, allergies: v })}
            allowCustom
            customPlaceholder="Add custom allergy..."
            onAddCustomToCategory={addToCategory(setAllergyCategories)}
          />
        </div>

        {/* Intolerances — Multi-select dialog */}
        <div>
          <Label className="mb-1.5 block">Intolerances</Label>
          <MultiSelectDialog
            label="Intolerances"
            options={[]}
            categorized={intoleranceCategories}
            selected={currentForm.intolerances || []}
            onSelectionChange={v => setForm({ ...currentForm, intolerances: v })}
            allowCustom
            customPlaceholder="Add custom intolerance..."
            onAddCustomToCategory={addToCategory(setIntoleranceCategories)}
          />
        </div>

        {/* Disliked Foods */}
        <div>
          <Label className="mb-1.5 block">Disliked Foods</Label>
          <MultiSelectDialog
            label="Disliked Foods"
            options={['broccoli', 'brussels_sprouts', 'liver', 'tofu', 'mushrooms', 'olives', 'anchovies', 'blue_cheese', 'cilantro', 'beets', 'eggplant', 'okra', 'turnips', 'sardines', 'cottage_cheese']}
            selected={currentForm.disliked_foods || []}
            onSelectionChange={v => setForm({ ...currentForm, disliked_foods: v })}
            allowCustom
            customPlaceholder="Add disliked food..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Budget Level */}
          <div>
            <Label className="mb-1.5 block">Budget Level</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={currentForm.budget_level}
              onChange={e => setForm({ ...currentForm, budget_level: e.target.value })}
            >
              {BUDGET_LEVELS.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          {/* Cooking Level */}
          <div>
            <Label className="mb-1.5 block">Cooking Level</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={currentForm.cooking_level}
              onChange={e => setForm({ ...currentForm, cooking_level: e.target.value })}
            >
              {COOKING_LEVELS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Meals/Day</Label>
            <Input type="number" min={1} max={8} value={currentForm.meal_frequency} onChange={e => setForm({ ...currentForm, meal_frequency: parseInt(e.target.value) || 3 })} />
          </div>
          <div>
            <Label>Snacks/Day</Label>
            <Input type="number" min={0} max={5} value={currentForm.snack_frequency} onChange={e => setForm({ ...currentForm, snack_frequency: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <Label>Water (ml)</Label>
            <Input type="number" min={500} max={5000} step={250} value={currentForm.hydration_goal_ml} onChange={e => setForm({ ...currentForm, hydration_goal_ml: parseInt(e.target.value) || 2500 })} />
          </div>
        </div>

        <div>
          <Label>Digestive Notes</Label>
          <Textarea value={currentForm.digestive_notes || ''} onChange={e => setForm({ ...currentForm, digestive_notes: e.target.value })} placeholder="Any digestive issues, preferences, or notes..." rows={2} />
        </div>

        <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Profile
        </Button>
      </CardContent>
    </Card>
  );
}
