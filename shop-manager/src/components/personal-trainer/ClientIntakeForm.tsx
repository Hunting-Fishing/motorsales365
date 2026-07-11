import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Droplets, Utensils, AlertTriangle, User, Dumbbell, Heart, Phone, StickyNote, Search, X, HeartPulse, Sparkles, Info, ToggleLeft, ToggleRight, Pill } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HeightPicker, WeightPicker } from '@/components/personal-trainer/HeightWeightPicker';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFitnessGoals } from '@/hooks/useFitnessTaxonomy';
import { useICD10Search } from '@/hooks/useICD10Search';
import MultiSelectDialog from '@/components/nutrition/MultiSelectDialog';

const WORKOUT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ALL_EXERCISE_RESTRICTIONS = [
  'no_overhead', 'no_heavy_squats', 'no_running', 'no_twisting', 'avoid_impact',
  'no_jumping', 'no_heavy_deadlifts', 'no_bench_press', 'no_pull_ups',
  'limit_range_of_motion', 'no_contact_sports', 'no_prolonged_standing',
  'no_spinal_loading', 'no_lateral_movements', 'no_plyometrics',
  'low_intensity_only', 'seated_exercises_only', 'no_grip_heavy',
];

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

interface Trainer {
  id: string;
  first_name: string;
  last_name: string;
}

interface ClientIntakeFormProps {
  trainers: Trainer[];
  isPending: boolean;
  onSubmit: (payload: Record<string, any>) => void;
}

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  fitness_level: string;
  membership_type: string;
  date_of_birth: string;
  height_cm: string;
  weight_kg: string;
  body_fat_percent: string;
  join_date: string;
  calorie_target: string;
  protein_target_g: string;
  carb_target_g: string;
  fat_target_g: string;
  hydration_target_ml: string;
  supplement_notes: string;
  meal_guidance: string;
  notes: string;
  emergency_contact: string;
  emergency_phone: string;
  preferred_workout_days: string[];
  selectedGoals: string[];
  selectedRestrictions: string[];
  otherInjuries: string;
  selectedConditions: { code: string; name: string }[];
  dietaryStyles: string[];
  allergies: string[];
  intolerances: string[];
  selectedSupplements: string[];
}

const initialForm: FormState = {
  first_name: '', last_name: '', email: '', phone: '', gender: '',
  fitness_level: 'beginner', membership_type: 'standard',
  date_of_birth: '', height_cm: '', weight_kg: '', body_fat_percent: '',
  join_date: '',
  calorie_target: '', protein_target_g: '', carb_target_g: '', fat_target_g: '',
  hydration_target_ml: '', supplement_notes: '', meal_guidance: '',
  notes: '', emergency_contact: '', emergency_phone: '',
  preferred_workout_days: [],
  selectedGoals: [],
  selectedRestrictions: [],
  otherInjuries: '',
  selectedConditions: [],
  dietaryStyles: [],
  allergies: [],
  intolerances: [],
  selectedSupplements: [],
};

export default function ClientIntakeForm({ trainers, isPending, onSubmit }: ClientIntakeFormProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [assignTrainer, setAssignTrainer] = useState('none');
  const [conditionSearch, setConditionSearch] = useState('');
  const [icd10Search, setIcd10Search] = useState('');
  const [bodyFatOverride, setBodyFatOverride] = useState(false);

  const { data: fitnessGoals = [], isLoading: goalsLoading } = useFitnessGoals();

  const { data: catalog = [] } = useQuery({
    queryKey: ['pt-medical-catalog'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_medical_condition_catalog')
        .select('*')
        .order('category, name');
      if (error) throw error;
      return data || [];
    },
  });

  const { results: icd10Results } = useICD10Search(icd10Search);

  const [dietCategories, setDietCategories] = useState<Record<string, string[]>>({ ...INITIAL_DIETARY_STYLES });
  const [allergyCategories, setAllergyCategories] = useState<Record<string, string[]>>({ ...INITIAL_ALLERGY_OPTIONS });
  const [intoleranceCategories, setIntoleranceCategories] = useState<Record<string, string[]>>({ ...INITIAL_INTOLERANCE_OPTIONS });

  // Query supplements for the multi-select picker
  const { data: supplementsList = [] } = useQuery({
    queryKey: ['pt-supplements-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_supplements')
        .select('id, name, category')
        .order('category, name');
      if (error) throw error;
      return data || [];
    },
  });

  // Group supplements by category for the multi-select
  const supplementCategories = useMemo(() => {
    const cats: Record<string, string[]> = {};
    const categoryLabels: Record<string, string> = {
      vitamin: 'Vitamins', mineral: 'Minerals', amino_acid: 'Amino Acids',
      protein: 'Proteins', herb: 'Herbs', pre_workout: 'Pre-Workout',
      post_workout: 'Post-Workout', fat_burner: 'Fat Burners',
      joint_support: 'Joint Support', other: 'Other',
    };
    supplementsList.forEach((s: any) => {
      const label = categoryLabels[s.category] || 'Other';
      if (!cats[label]) cats[label] = [];
      cats[label].push(s.name);
    });
    return cats;
  }, [supplementsList]);

  // Auto-estimate body fat % from height, weight, gender, age
  const estimatedBodyFat = useMemo(() => {
    const h = parseFloat(form.height_cm);
    const w = parseFloat(form.weight_kg);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const heightM = h / 100;
    const bmi = w / (heightM * heightM);
    let age = 25;
    if (form.date_of_birth) {
      const dob = new Date(form.date_of_birth);
      const now = new Date();
      age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) age = 18;
    }
    const sexVal = form.gender === 'male' ? 1 : 0;
    const bf = (1.20 * bmi) + (0.23 * age) - (10.8 * sexVal) - 5.4;
    return Math.max(3, Math.min(60, Math.round(bf * 10) / 10));
  }, [form.height_cm, form.weight_kg, form.gender, form.date_of_birth]);

  const displayBodyFat = bodyFatOverride ? form.body_fat_percent : (estimatedBodyFat?.toString() || '');

  const set = (key: keyof FormState, value: any) => setForm(f => ({ ...f, [key]: value }));

  const toggleDay = (day: string) => {
    setForm(f => ({
      ...f,
      preferred_workout_days: f.preferred_workout_days.includes(day)
        ? f.preferred_workout_days.filter(d => d !== day)
        : [...f.preferred_workout_days, day],
    }));
  };

  const toggleGoal = (goalName: string) => {
    setForm(f => ({
      ...f,
      selectedGoals: f.selectedGoals.includes(goalName)
        ? f.selectedGoals.filter(g => g !== goalName)
        : [...f.selectedGoals, goalName],
    }));
  };

  const toggleRestriction = (r: string) => {
    setForm(f => ({
      ...f,
      selectedRestrictions: f.selectedRestrictions.includes(r)
        ? f.selectedRestrictions.filter(x => x !== r)
        : [...f.selectedRestrictions, r],
    }));
  };

  const addCondition = (code: string, name: string) => {
    if (form.selectedConditions.some(c => c.code === code)) return;
    setForm(f => ({
      ...f,
      selectedConditions: [...f.selectedConditions, { code, name }],
    }));
    setConditionSearch('');
    setIcd10Search('');
  };

  const removeCondition = (code: string) => {
    setForm(f => ({
      ...f,
      selectedConditions: f.selectedConditions.filter(c => c.code !== code),
    }));
  };

  const filteredCatalog = catalog.filter((c: any) => {
    if (!conditionSearch || conditionSearch.length < 2) return false;
    const matchSearch = c.name.toLowerCase().includes(conditionSearch.toLowerCase()) || c.code?.toLowerCase().includes(conditionSearch.toLowerCase());
    const notAlreadyAdded = !form.selectedConditions.some(ex => ex.code === c.code);
    return matchSearch && notAlreadyAdded;
  });

  const filteredIcd10 = icd10Results.filter(
    r => !form.selectedConditions.some(c => c.code === r.code) && !filteredCatalog.some((c: any) => c.code === r.code)
  );

  const handleSubmit = () => {
    const goalsStr = form.selectedGoals.length > 0 ? form.selectedGoals.join(', ') : null;
    const injuriesStr = [
      ...form.selectedRestrictions.map(r => r.replace(/_/g, ' ')),
      ...(form.otherInjuries ? [form.otherInjuries] : []),
    ].join(', ') || null;
    const conditionsStr = form.selectedConditions.length > 0
      ? form.selectedConditions.map(c => c.name).join(', ')
      : null;
    const foodHabitsData = {
      dietary_styles: form.dietaryStyles,
      allergies: form.allergies,
      intolerances: form.intolerances,
    };
    const foodHabitsStr = (form.dietaryStyles.length > 0 || form.allergies.length > 0 || form.intolerances.length > 0)
      ? JSON.stringify(foodHabitsData)
      : null;

    onSubmit({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email || null,
      phone: form.phone || null,
      gender: form.gender || null,
      fitness_level: form.fitness_level,
      goals: goalsStr,
      health_conditions: conditionsStr,
      membership_type: form.membership_type,
      date_of_birth: form.date_of_birth || null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      body_fat_percent: bodyFatOverride
        ? (form.body_fat_percent ? parseFloat(form.body_fat_percent) : null)
        : (estimatedBodyFat || null),
      injuries: injuriesStr,
      emergency_contact: form.emergency_contact || null,
      emergency_phone: form.emergency_phone || null,
      preferred_workout_days: form.preferred_workout_days.length > 0 ? form.preferred_workout_days : null,
      trainer_id: assignTrainer && assignTrainer !== 'none' ? assignTrainer : null,
      join_date: form.join_date || null,
      calorie_target: form.calorie_target ? parseInt(form.calorie_target) : null,
      protein_target_g: form.protein_target_g ? parseInt(form.protein_target_g) : null,
      carb_target_g: form.carb_target_g ? parseInt(form.carb_target_g) : null,
      fat_target_g: form.fat_target_g ? parseInt(form.fat_target_g) : null,
      hydration_target_ml: form.hydration_target_ml ? parseInt(form.hydration_target_ml) : null,
      food_habits: foodHabitsStr,
      supplement_notes: [
        ...(form.selectedSupplements.length > 0 ? [`Taking: ${form.selectedSupplements.join(', ')}`] : []),
        ...(form.supplement_notes ? [form.supplement_notes] : []),
      ].join('. ') || null,
      meal_guidance: form.meal_guidance || null,
      notes: form.notes || null,
    });
  };

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-4">
        <TabsTrigger value="profile" className="text-xs gap-1.5">
          <User className="h-3.5 w-3.5" />Profile
        </TabsTrigger>
        <TabsTrigger value="medical" className="text-xs gap-1.5">
          <HeartPulse className="h-3.5 w-3.5" />Medical
        </TabsTrigger>
        <TabsTrigger value="nutrition" className="text-xs gap-1.5">
          <Utensils className="h-3.5 w-3.5" />Nutrition
        </TabsTrigger>
        <TabsTrigger value="details" className="text-xs gap-1.5">
          <StickyNote className="h-3.5 w-3.5" />Details
        </TabsTrigger>
      </TabsList>

      {/* ─── Profile Tab ─── */}
      <TabsContent value="profile" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First Name *</Label><Input value={form.first_name} onChange={e => set('first_name', e.target.value)} /></div>
          <div><Label>Last Name *</Label><Input value={form.last_name} onChange={e => set('last_name', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} /></div>
          <div>
            <Label>Sex</Label>
            <Select value={form.gender} onValueChange={v => set('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <HeightPicker value={form.height_cm} onChange={v => set('height_cm', v)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <WeightPicker value={form.weight_kg} onChange={v => set('weight_kg', v)} />
          <div>
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Body Fat % {!bodyFatOverride && estimatedBodyFat ? '(est.)' : ''}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[220px] text-xs">
                    Estimated using BMI formula: (1.20×BMI) + (0.23×age) − (10.8×sex) − 5.4. Toggle to override manually.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <button
                type="button"
                className="ml-auto text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                onClick={() => {
                  setBodyFatOverride(!bodyFatOverride);
                  if (!bodyFatOverride && estimatedBodyFat) {
                    set('body_fat_percent', estimatedBodyFat.toString());
                  }
                }}
              >
                {bodyFatOverride ? <ToggleRight className="h-3.5 w-3.5 text-primary" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                {bodyFatOverride ? 'Auto' : 'Override'}
              </button>
            </div>
            <Input
              type="number"
              step="0.1"
              value={displayBodyFat}
              onChange={e => { if (bodyFatOverride) set('body_fat_percent', e.target.value); }}
              readOnly={!bodyFatOverride}
              placeholder={estimatedBodyFat ? `~${estimatedBodyFat}%` : 'Enter height & weight'}
              className={!bodyFatOverride ? 'bg-muted/50 cursor-default' : ''}
            />
          </div>
          <div>
            <Label>Fitness Level</Label>
            <Select value={form.fitness_level} onValueChange={v => set('fitness_level', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Membership & Training */}
        <div className="flex items-center gap-2 pt-3 pb-1 border-b border-border/50">
          <Dumbbell className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Membership & Training</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Membership Type</Label>
            <Select value={form.membership_type} onValueChange={v => set('membership_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Join Date</Label><Input type="date" value={form.join_date} onChange={e => set('join_date', e.target.value)} /></div>
        </div>
        {trainers.length > 0 && (
          <div>
            <Label>Assign Trainer</Label>
            <Select value={assignTrainer} onValueChange={setAssignTrainer}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {trainers.map(t => <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label>Preferred Workout Days</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {WORKOUT_DAYS.map(day => (
              <Button key={day} type="button" size="sm" variant={form.preferred_workout_days.includes(day) ? 'default' : 'outline'} className="text-xs h-7" onClick={() => toggleDay(day)}>
                {day.slice(0, 3)}
              </Button>
            ))}
          </div>
        </div>
      </TabsContent>

      {/* ─── Medical Tab ─── */}
      <TabsContent value="medical" className="space-y-4 mt-0">
        {/* Goals */}
        <div>
          <Label>Goals</Label>
          {goalsLoading ? (
            <p className="text-xs text-muted-foreground py-2">Loading goals...</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {fitnessGoals.map((goal: any) => {
                const isActive = form.selectedGoals.includes(goal.name);
                return (
                  <Badge
                    key={goal.id}
                    variant={isActive ? 'default' : 'outline'}
                    className="cursor-pointer text-xs px-2.5 py-1 transition-colors"
                    onClick={() => toggleGoal(goal.name)}
                  >
                    {goal.emoji && <span className="mr-1">{goal.emoji}</span>}
                    {goal.name}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        {/* Injuries / Restrictions */}
        <div>
          <Label>Injuries / Limitations</Label>
          <p className="text-[11px] text-muted-foreground mb-1.5">Tap to toggle restrictions. Active restrictions are highlighted.</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_EXERCISE_RESTRICTIONS.map(r => {
              const isActive = form.selectedRestrictions.includes(r);
              return (
                <Badge
                  key={r}
                  variant={isActive ? 'default' : 'outline'}
                  className={`cursor-pointer text-xs capitalize transition-colors ${isActive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'hover:bg-accent'}`}
                  onClick={() => toggleRestriction(r)}
                >
                  {r.replace(/_/g, ' ')}
                </Badge>
              );
            })}
          </div>
          <Input
            className="mt-2"
            placeholder="Other injuries not listed above..."
            value={form.otherInjuries}
            onChange={e => set('otherInjuries', e.target.value)}
          />
        </div>

        {/* Health Conditions — searchable catalog + ICD-10 */}
        <div>
          <Label>Medical Warnings / Health Conditions</Label>
          {form.selectedConditions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
              {form.selectedConditions.map(c => (
                <Badge key={c.code} variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => removeCondition(c.code)}>
                  {c.name}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conditions (e.g. diabetes, asthma, hypertension)..."
              className="pl-9"
              value={conditionSearch}
              onChange={e => {
                setConditionSearch(e.target.value);
                setIcd10Search(e.target.value);
              }}
            />
          </div>
          {conditionSearch.length >= 2 && (filteredCatalog.length > 0 || filteredIcd10.length > 0) && (
            <div className="border rounded-md mt-1 max-h-40 overflow-y-auto bg-popover">
              {filteredCatalog.map((c: any) => (
                <button
                  key={c.code}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                  onClick={() => addCondition(c.code, c.name)}
                >
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.code}</span>
                </button>
              ))}
              {filteredIcd10.length > 0 && filteredCatalog.length > 0 && (
                <div className="px-3 py-1 text-[10px] text-muted-foreground uppercase tracking-wider border-t">ICD-10 Results</div>
              )}
              {filteredIcd10.slice(0, 10).map(r => (
                <button
                  key={r.code}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                  onClick={() => addCondition(r.code, r.name)}
                >
                  <span>{r.name}</span>
                  <span className="text-xs text-muted-foreground">{r.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground italic flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
          Detailed medical conditions can be added from the client profile after creation.
        </p>
      </TabsContent>

      {/* ─── Nutrition Tab ─── */}
      <TabsContent value="nutrition" className="space-y-4 mt-0">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Calorie Target</Label><Input type="number" value={form.calorie_target} onChange={e => set('calorie_target', e.target.value)} placeholder="e.g. 2200" /></div>
          <div className="flex items-end gap-1">
            <Droplets className="h-4 w-4 text-primary mb-2.5 shrink-0" />
            <div className="flex-1"><Label>Hydration Target (ml)</Label><Input type="number" value={form.hydration_target_ml} onChange={e => set('hydration_target_ml', e.target.value)} placeholder="e.g. 3000" /></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Protein (g)</Label><Input type="number" value={form.protein_target_g} onChange={e => set('protein_target_g', e.target.value)} placeholder="150" /></div>
          <div><Label>Carbs (g)</Label><Input type="number" value={form.carb_target_g} onChange={e => set('carb_target_g', e.target.value)} placeholder="200" /></div>
          <div><Label>Fat (g)</Label><Input type="number" value={form.fat_target_g} onChange={e => set('fat_target_g', e.target.value)} placeholder="70" /></div>
        </div>

        <div>
          <Label className="mb-1.5 block">Dietary Style(s)</Label>
          <MultiSelectDialog
            label="Dietary Styles"
            options={[]}
            selected={form.dietaryStyles}
            onSelectionChange={v => set('dietaryStyles', v)}
            allowCustom
            customPlaceholder="Add custom diet..."
            categorized={dietCategories}
            onAddCustomToCategory={(cat, val) => setDietCategories(prev => ({ ...prev, [cat]: [...(prev[cat] || []), val] }))}
          />
        </div>

        <div>
          <Label className="mb-1.5 block">Allergies</Label>
          <MultiSelectDialog
            label="Allergies"
            options={[]}
            selected={form.allergies}
            onSelectionChange={v => set('allergies', v)}
            allowCustom
            customPlaceholder="Add custom allergy..."
            categorized={allergyCategories}
            onAddCustomToCategory={(cat, val) => setAllergyCategories(prev => ({ ...prev, [cat]: [...(prev[cat] || []), val] }))}
          />
        </div>

        <div>
          <Label className="mb-1.5 block">Intolerances</Label>
          <MultiSelectDialog
            label="Intolerances"
            options={[]}
            selected={form.intolerances}
            onSelectionChange={v => set('intolerances', v)}
            allowCustom
            customPlaceholder="Add custom intolerance..."
            categorized={intoleranceCategories}
            onAddCustomToCategory={(cat, val) => setIntoleranceCategories(prev => ({ ...prev, [cat]: [...(prev[cat] || []), val] }))}
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Pill className="h-4 w-4 text-primary" />
            <Label>Supplements & Vitamins</Label>
          </div>
          <MultiSelectDialog
            label="Supplements"
            options={[]}
            selected={form.selectedSupplements}
            onSelectionChange={v => set('selectedSupplements', v)}
            allowCustom
            customPlaceholder="Add custom supplement..."
            categorized={supplementCategories}
          />
        </div>
        <div><Label>Additional Supplement Notes</Label><Textarea value={form.supplement_notes} onChange={e => set('supplement_notes', e.target.value)} placeholder="Any extra notes about supplements, dosages, timing..." className="min-h-[50px]" /></div>
        <div><Label>Meal Guidance</Label><Textarea value={form.meal_guidance} onChange={e => set('meal_guidance', e.target.value)} placeholder="5 meals/day, high protein breakfast..." /></div>
      </TabsContent>

      {/* ─── Details Tab ─── */}
      <TabsContent value="details" className="space-y-4 mt-0">
        <div className="flex items-center gap-2 pb-1 border-b border-border/50">
          <Phone className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Emergency Contact</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Contact Name</Label><Input value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} /></div>
          <div><Label>Contact Phone</Label><Input value={form.emergency_phone} onChange={e => set('emergency_phone', e.target.value)} /></div>
        </div>

        <div className="flex items-center gap-2 pt-3 pb-1 border-b border-border/50">
          <StickyNote className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Additional Notes</p>
        </div>
        <div><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes about this client..." className="min-h-[60px]" /></div>

        <Button className="w-full" disabled={!form.first_name || !form.last_name || isPending} onClick={handleSubmit}>
          {isPending ? 'Adding...' : 'Add Client'}
        </Button>
      </TabsContent>
    </Tabs>
  );
}