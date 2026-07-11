import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Loader2, Check, ChevronRight, ChevronLeft, Search, Sparkles, Target, Dumbbell, Heart, Zap, Footprints, Mountain, Trophy, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useFitnessCategories,
  useFitnessSubcategories,
  useFitnessGoals,
  useClientFitnessProfile,
  useSaveFitnessProfile,
  FitnessSubcategory,
} from '@/hooks/useFitnessTaxonomy';
import { useToast } from '@/hooks/use-toast';

const ICON_MAP: Record<string, React.ReactNode> = {
  Dumbbell: <Dumbbell className="h-5 w-5" />,
  Flame: <Zap className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  Footprints: <Footprints className="h-5 w-5" />,
  Bike: <Zap className="h-5 w-5" />,
  Waves: <Heart className="h-5 w-5" />,
  PersonStanding: <Target className="h-5 w-5" />,
  Swords: <Shield className="h-5 w-5" />,
  StretchHorizontal: <Heart className="h-5 w-5" />,
  Heart: <Heart className="h-5 w-5" />,
  Music: <Sparkles className="h-5 w-5" />,
  Mountain: <Mountain className="h-5 w-5" />,
  Trophy: <Trophy className="h-5 w-5" />,
  HeartPulse: <Heart className="h-5 w-5" />,
  TrendingDown: <Target className="h-5 w-5" />,
  Users: <Target className="h-5 w-5" />,
  ShieldCheck: <Shield className="h-5 w-5" />,
  Sparkles: <Sparkles className="h-5 w-5" />,
  Target: <Target className="h-5 w-5" />,
  Scale: <Target className="h-5 w-5" />,
};

const INTEREST_EXPERIENCE_LEVELS = [
  { value: 'curious', label: 'Curious', desc: "Haven't tried yet", emoji: '🔍' },
  { value: 'beginner', label: 'Beginner', desc: 'Just starting out', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Comfortable & consistent', emoji: '💪' },
  { value: 'advanced', label: 'Advanced', desc: 'Highly experienced', emoji: '🔥' },
  { value: 'competitive', label: 'Competitive', desc: 'Competition level', emoji: '🏆' },
];

const COMMITMENT_LEVELS = [
  { value: 'exploring', label: 'Just Exploring', desc: 'Browsing options, no commitment yet', emoji: '👀' },
  { value: 'starting_soon', label: 'Starting Soon', desc: 'Planning to begin in the next few weeks', emoji: '📅' },
  { value: 'already_active', label: 'Already Active', desc: 'Currently training regularly', emoji: '✅' },
  { value: 'serious_hobby', label: 'Serious Hobby', desc: 'Dedicated lifestyle commitment', emoji: '🎯' },
  { value: 'competitive_elite', label: 'Competitive / Elite', desc: 'Training at competition or professional level', emoji: '🏅' },
];

const EXPERIENCE_LEVELS = [
  { value: 'complete_beginner', label: 'Complete Beginner', desc: 'Never trained before' },
  { value: 'beginner', label: 'Beginner', desc: '0-6 months experience' },
  { value: 'intermediate', label: 'Intermediate', desc: '6 months - 2 years' },
  { value: 'advanced', label: 'Advanced', desc: '2-5+ years consistent' },
  { value: 'elite', label: 'Elite / Competitive', desc: 'Competition level' },
];

// ─── Spec-defined tag sets ────────────────────────────────────
const ENVIRONMENT_TAGS = [
  'Home', 'Garage gym', 'Commercial gym', 'Boutique studio',
  'Outdoors', 'Pool', 'Track', 'Trail',
];

const EQUIPMENT_TAGS = [
  'None', 'Dumbbells', 'Barbell', 'Machines', 'Bands',
  'Kettlebells', 'Cardio machines', 'Full gym access',
];

const SESSION_TAGS = [
  { value: '10-20', label: '10–20 min' },
  { value: '20-30', label: '20–30 min' },
  { value: '30-45', label: '30–45 min' },
  { value: '45-60', label: '45–60 min' },
  { value: '60+', label: '60+ min' },
];

const MOTIVATION_TAGS = [
  'Structured plan', 'Coaching/accountability', 'Competition',
  'Gamification', 'Community', 'Education',
  'Aesthetics', 'Performance', 'Habit-building',
];

const TRAINING_FREQUENCIES = [
  { value: '1-2', label: '1–2x / week' },
  { value: '3-4', label: '3–4x / week' },
  { value: '5-6', label: '5–6x / week' },
  { value: '7+', label: 'Daily / 7x' },
];

interface FitnessInterestIntakeProps {
  clientId: string;
  shopId: string;
  onComplete?: () => void;
  embedded?: boolean;
}

export default function FitnessInterestIntake({ clientId, shopId, onComplete, embedded = false }: FitnessInterestIntakeProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const totalSteps = 7;

  // Form state
  const [primaryInterests, setPrimaryInterests] = useState<string[]>([]);
  const [specificInterests, setSpecificInterests] = useState<string[]>([]);
  const [goalTags, setGoalTags] = useState<string[]>([]);
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [interestExperienceLevels, setInterestExperienceLevels] = useState<Record<string, string>>({});
  const [commitmentLevel, setCommitmentLevel] = useState('exploring');
  const [trainingEnvironment, setTrainingEnvironment] = useState<string[]>([]);
  const [equipmentAccess, setEquipmentAccess] = useState<string[]>([]);
  const [injuriesLimitations, setInjuriesLimitations] = useState('');
  const [motivationStyle, setMotivationStyle] = useState<string[]>([]);
  const [preferredSessionLength, setPreferredSessionLength] = useState('');
  const [trainingFrequency, setTrainingFrequency] = useState('');
  const [subSearch, setSubSearch] = useState('');

  // Data hooks
  const { data: categories = [], isLoading: loadingCats } = useFitnessCategories();
  const { data: subcategories = [], isLoading: loadingSubs } = useFitnessSubcategories(primaryInterests);
  const { data: goals = [], isLoading: loadingGoals } = useFitnessGoals();
  const { data: existingProfile } = useClientFitnessProfile(clientId, shopId);
  const saveMutation = useSaveFitnessProfile();

  // Pre-populate from existing profile
  useEffect(() => {
    if (existingProfile) {
      setPrimaryInterests(existingProfile.primary_interests || []);
      setSpecificInterests(existingProfile.specific_interests || []);
      setGoalTags(existingProfile.goal_tags || []);
      setExperienceLevel(existingProfile.experience_level || 'beginner');
      setInterestExperienceLevels(existingProfile.interest_experience_levels || {});
      setCommitmentLevel(existingProfile.commitment_level || 'exploring');
      setTrainingEnvironment(existingProfile.training_environment || []);
      setEquipmentAccess(existingProfile.equipment_access || []);
      setInjuriesLimitations(existingProfile.injuries_limitations || '');
      // motivation_style was a string, now multi-select
      const ms = existingProfile.motivation_style;
      if (ms) {
        setMotivationStyle(Array.isArray(ms) ? ms : [ms]);
      }
      setPreferredSessionLength(existingProfile.preferred_session_length || '');
      setTrainingFrequency(existingProfile.training_frequency || '');
    }
  }, [existingProfile]);

  const toggleInArray = (arr: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>, max?: number) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
    } else if (!max || arr.length < max) {
      setter([...arr, item]);
    }
  };

  const filteredSubcategories = subcategories.filter(s =>
    !subSearch || s.name.toLowerCase().includes(subSearch.toLowerCase())
  );

  const groupedSubs = filteredSubcategories.reduce<Record<string, FitnessSubcategory[]>>((acc, sub) => {
    if (!acc[sub.category_id]) acc[sub.category_id] = [];
    acc[sub.category_id].push(sub);
    return acc;
  }, {});

  const allSelectedInterestItems = [
    ...categories.filter(c => primaryInterests.includes(c.id)).map(c => ({ id: c.id, name: c.name.split(' / ')[0], type: 'category' as const })),
    ...subcategories.filter(s => specificInterests.includes(s.id)).map(s => ({ id: s.id, name: s.name, type: 'subcategory' as const })),
  ];

  const handleSave = async () => {
    try {
      // Resolve goal IDs to goal names for the normalized table
      const goalNames = goals.filter(g => goalTags.includes(g.id)).map(g => g.name);

      await saveMutation.mutateAsync({
        client_id: clientId,
        shop_id: shopId,
        primary_interests: primaryInterests,
        specific_interests: specificInterests,
        goal_tags: goalTags,
        experience_level: experienceLevel,
        interest_experience_levels: interestExperienceLevels,
        commitment_level: commitmentLevel,
        training_environment: trainingEnvironment,
        equipment_access: equipmentAccess,
        injuries_limitations: injuriesLimitations || null,
        motivation_style: motivationStyle.join(',') || null,
        preferred_session_length: preferredSessionLength || null,
        training_frequency: trainingFrequency || null,
        intake_completed: true,
        intake_completed_at: new Date().toISOString(),
        // Pass goal names for normalized write (via extra field)
        _goalNames: goalNames,
      } as any);
      toast({ title: 'Fitness Profile Saved', description: 'Your fitness interests have been recorded successfully.' });
      onComplete?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save fitness profile.', variant: 'destructive' });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return primaryInterests.length >= 1;
      case 2: return true;
      case 3: return goalTags.length >= 1;
      case 4: return allSelectedInterestItems.length === 0 || allSelectedInterestItems.every(i => interestExperienceLevels[i.id]);
      case 5: return !!commitmentLevel;
      case 6: return !!experienceLevel;
      case 7: return true;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: return renderStep1PrimaryIdentity();
      case 2: return renderStep2SpecificInterests();
      case 3: return renderStep3Goals();
      case 4: return renderStep4InterestExperience();
      case 5: return renderStep5Commitment();
      case 6: return renderStep6Profile();
      case 7: return renderStep7Summary();
      default: return null;
    }
  };

  // ─── Step 1: Primary Identity ─────────────────────────────────
  const renderStep1PrimaryIdentity = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">What type of training are you into?</h2>
        <p className="text-sm text-muted-foreground">Choose 1–3 primary identities that describe your fitness focus</p>
      </div>
      {loadingCats ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => {
            const selected = primaryInterests.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleInArray(primaryInterests, cat.id, setPrimaryInterests, 3)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left',
                  selected
                    ? 'border-primary bg-primary/10 shadow-md'
                    : 'border-border hover:border-primary/40 hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )} style={selected && cat.color ? { backgroundColor: cat.color } : {}}>
                  {ICON_MAP[cat.icon || ''] || <Sparkles className="h-5 w-5" />}
                </div>
                <div className="min-w-0">
                  <p className={cn('font-semibold text-sm truncate', selected ? 'text-primary' : 'text-foreground')}>
                    {cat.name.split(' / ')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                </div>
                {selected && <Check className="h-5 w-5 text-primary shrink-0 ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">{primaryInterests.length}/3 selected</p>
    </div>
  );

  // ─── Step 2: Specific Interests ───────────────────────────────
  const renderStep2SpecificInterests = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Get more specific</h2>
        <p className="text-sm text-muted-foreground">Select the subcategories that match your interests</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search interests..." value={subSearch} onChange={(e) => setSubSearch(e.target.value)} className="pl-9" />
      </div>
      {loadingSubs ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : primaryInterests.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Select primary interests first</p>
      ) : (
        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-1">
          {Object.entries(groupedSubs).map(([catId, subs]) => {
            const cat = categories.find(c => c.id === catId);
            return (
              <div key={catId}>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-muted" style={cat?.color ? { backgroundColor: cat.color + '20' } : {}}>
                    {ICON_MAP[cat?.icon || ''] || <Sparkles className="h-3 w-3" />}
                  </div>
                  {cat?.name.split(' / ')[0]}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {subs.map(sub => {
                    const selected = specificInterests.includes(sub.id);
                    return (
                      <Badge
                        key={sub.id}
                        variant={selected ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-all px-3 py-1.5 text-xs',
                          selected ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-muted'
                        )}
                        onClick={() => toggleInArray(specificInterests, sub.id, setSpecificInterests)}
                      >
                        {selected && <Check className="h-3 w-3 mr-1" />}
                        {sub.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">{specificInterests.length} interests selected</p>
    </div>
  );

  // ─── Step 3: Goals ────────────────────────────────────────────
  const renderStep3Goals = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">What are your goals?</h2>
        <p className="text-sm text-muted-foreground">Separate what you enjoy from what you want to achieve</p>
      </div>
      {loadingGoals ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {goals.map(goal => {
            const selected = goalTags.includes(goal.id);
            return (
              <button
                key={goal.id}
                onClick={() => toggleInArray(goalTags, goal.id, setGoalTags)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                  selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-muted/50'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {ICON_MAP[goal.icon || ''] || <Target className="h-4 w-4" />}
                </div>
                <span className={cn('font-medium text-sm', selected ? 'text-primary' : 'text-foreground')}>{goal.name}</span>
                {selected && <Check className="h-4 w-4 text-primary ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Step 4: Experience Level by Interest ─────────────────────
  const renderStep4InterestExperience = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Experience by Interest</h2>
        <p className="text-sm text-muted-foreground">Rate your experience level for each selected interest</p>
      </div>

      {allSelectedInterestItems.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Go back and select some interests first</p>
      ) : (
        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
          {allSelectedInterestItems.map(item => {
            const currentLevel = interestExperienceLevels[item.id] || '';
            return (
              <div key={item.id} className="p-4 rounded-xl border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={item.type === 'category' ? 'default' : 'secondary'} className="text-xs">
                    {item.type === 'category' ? 'Primary' : 'Specific'}
                  </Badge>
                  <p className="font-semibold text-sm text-foreground">{item.name}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_EXPERIENCE_LEVELS.map(lvl => (
                    <button
                      key={lvl.value}
                      onClick={() => setInterestExperienceLevels(prev => ({ ...prev, [item.id]: lvl.value }))}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                        currentLevel === lvl.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40 text-foreground hover:bg-muted/50'
                      )}
                    >
                      <span>{lvl.emoji}</span>
                      <span>{lvl.label}</span>
                      {currentLevel === lvl.value && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
                {currentLevel && (
                  <p className="text-xs text-muted-foreground">
                    {INTEREST_EXPERIENCE_LEVELS.find(l => l.value === currentLevel)?.desc}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {Object.keys(interestExperienceLevels).filter(k => allSelectedInterestItems.some(i => i.id === k)).length} / {allSelectedInterestItems.length} rated
      </p>
    </div>
  );

  // ─── Step 5: Commitment / Intent ──────────────────────────────
  const renderStep5Commitment = () => (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">How committed are you?</h2>
        <p className="text-sm text-muted-foreground">Tell us where you are in your fitness journey</p>
      </div>
      <div className="space-y-3">
        {COMMITMENT_LEVELS.map(lvl => (
          <button
            key={lvl.value}
            onClick={() => setCommitmentLevel(lvl.value)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
              commitmentLevel === lvl.value
                ? 'border-primary bg-primary/10 shadow-md'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
            )}
          >
            <span className="text-2xl">{lvl.emoji}</span>
            <div className="flex-1">
              <p className={cn('font-semibold text-sm', commitmentLevel === lvl.value ? 'text-primary' : 'text-foreground')}>
                {lvl.label}
              </p>
              <p className="text-xs text-muted-foreground">{lvl.desc}</p>
            </div>
            {commitmentLevel === lvl.value && <Check className="h-5 w-5 text-primary shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Step 6: Profile Details (updated tag sets) ───────────────
  const renderStep6Profile = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Tell us more about you</h2>
        <p className="text-sm text-muted-foreground">Help us personalize your experience</p>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Overall Experience Level</Label>
        <div className="grid grid-cols-1 gap-2">
          {EXPERIENCE_LEVELS.map(lvl => (
            <button
              key={lvl.value}
              onClick={() => setExperienceLevel(lvl.value)}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-all text-left',
                experienceLevel === lvl.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
              )}
            >
              <div>
                <p className="font-medium text-sm">{lvl.label}</p>
                <p className="text-xs text-muted-foreground">{lvl.desc}</p>
              </div>
              {experienceLevel === lvl.value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Training Environment</Label>
        <div className="flex flex-wrap gap-2">
          {ENVIRONMENT_TAGS.map(env => (
            <Badge
              key={env}
              variant={trainingEnvironment.includes(env) ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer px-3 py-1.5 text-xs transition-all',
                trainingEnvironment.includes(env) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              onClick={() => toggleInArray(trainingEnvironment, env, setTrainingEnvironment)}
            >
              {trainingEnvironment.includes(env) && <Check className="h-3 w-3 mr-1" />}
              {env}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Equipment Access</Label>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_TAGS.map(eq => (
            <Badge
              key={eq}
              variant={equipmentAccess.includes(eq) ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer px-3 py-1.5 text-xs transition-all',
                equipmentAccess.includes(eq) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              onClick={() => toggleInArray(equipmentAccess, eq, setEquipmentAccess)}
            >
              {equipmentAccess.includes(eq) && <Check className="h-3 w-3 mr-1" />}
              {eq}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-semibold">Session Length</Label>
          <div className="flex flex-wrap gap-2">
            {SESSION_TAGS.map(s => (
              <Badge
                key={s.value}
                variant={preferredSessionLength === s.value ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-3 py-1.5 text-xs transition-all',
                  preferredSessionLength === s.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
                onClick={() => setPreferredSessionLength(s.value)}
              >
                {preferredSessionLength === s.value && <Check className="h-3 w-3 mr-1" />}
                {s.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold">Training Frequency</Label>
          <div className="flex flex-wrap gap-2">
            {TRAINING_FREQUENCIES.map(f => (
              <Badge
                key={f.value}
                variant={trainingFrequency === f.value ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer px-3 py-1.5 text-xs transition-all',
                  trainingFrequency === f.value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                )}
                onClick={() => setTrainingFrequency(f.value)}
              >
                {trainingFrequency === f.value && <Check className="h-3 w-3 mr-1" />}
                {f.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Motivation Style <span className="text-muted-foreground font-normal">(select all that apply)</span></Label>
        <div className="flex flex-wrap gap-2">
          {MOTIVATION_TAGS.map(m => (
            <Badge
              key={m}
              variant={motivationStyle.includes(m) ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer px-3 py-1.5 text-xs transition-all',
                motivationStyle.includes(m) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
              onClick={() => toggleInArray(motivationStyle, m, setMotivationStyle)}
            >
              {motivationStyle.includes(m) && <Check className="h-3 w-3 mr-1" />}
              {m}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold">Injuries / Limitations</Label>
        <Textarea
          value={injuriesLimitations}
          onChange={(e) => setInjuriesLimitations(e.target.value)}
          placeholder="List any injuries, conditions, or physical limitations..."
          rows={3}
        />
      </div>
    </div>
  );

  // ─── Step 7: Summary ──────────────────────────────────────────
  const renderStep7Summary = () => {
    const selectedCats = categories.filter(c => primaryInterests.includes(c.id));
    const selectedSubs = subcategories.filter(s => specificInterests.includes(s.id));
    const selectedGoals = goals.filter(g => goalTags.includes(g.id));
    const expLabel = EXPERIENCE_LEVELS.find(e => e.value === experienceLevel)?.label || experienceLevel;
    const commitLabel = COMMITMENT_LEVELS.find(c => c.value === commitmentLevel);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">Your Fitness Profile</h2>
          <p className="text-sm text-muted-foreground">Review and confirm your selections</p>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Primary Interests</p>
            <div className="space-y-2">
              {selectedCats.map(c => {
                const expLvl = interestExperienceLevels[c.id];
                const expInfo = INTEREST_EXPERIENCE_LEVELS.find(l => l.value === expLvl);
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <Badge className="bg-primary text-primary-foreground text-xs">{c.name.split(' / ')[0]}</Badge>
                    {expInfo && <span className="text-xs text-muted-foreground">{expInfo.emoji} {expInfo.label}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedSubs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Specific Interests</p>
              <div className="space-y-2">
                {selectedSubs.map(s => {
                  const expLvl = interestExperienceLevels[s.id];
                  const expInfo = INTEREST_EXPERIENCE_LEVELS.find(l => l.value === expLvl);
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{s.name}</Badge>
                      {expInfo && <span className="text-xs text-muted-foreground">{expInfo.emoji} {expInfo.label}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <SummarySection title="Goals" items={selectedGoals.map(g => g.name)} color="bg-accent" />

          {commitLabel && (
            <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
              <span className="text-xl">{commitLabel.emoji}</span>
              <div>
                <p className="text-xs text-muted-foreground">Commitment Level</p>
                <p className="font-semibold text-sm text-foreground">{commitLabel.label}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Overall Experience" value={expLabel} />
            <SummaryCard label="Session Length" value={SESSION_TAGS.find(s => s.value === preferredSessionLength)?.label || '—'} />
            <SummaryCard label="Frequency" value={TRAINING_FREQUENCIES.find(f => f.value === trainingFrequency)?.label || '—'} />
          </div>

          {motivationStyle.length > 0 && <SummarySection title="Motivation Style" items={motivationStyle} color="bg-secondary" />}
          {trainingEnvironment.length > 0 && <SummarySection title="Environment" items={trainingEnvironment} color="bg-secondary" />}
          {equipmentAccess.length > 0 && <SummarySection title="Equipment" items={equipmentAccess} color="bg-secondary" />}
          {injuriesLimitations && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Injuries / Limitations</p>
              <p className="text-sm text-foreground">{injuriesLimitations}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const Wrapper = embedded ? 'div' : Card;
  const ContentWrapper = embedded ? 'div' : CardContent;

  return (
    <Wrapper className={cn(!embedded && 'max-w-2xl mx-auto shadow-xl border-0')}>
      <ContentWrapper className={cn(!embedded && 'p-6', 'space-y-6')}>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <Progress value={(step / totalSteps) * 100} className="h-2" />
        </div>

        {renderStep()}

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="gap-1 bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Profile
            </Button>
          )}
        </div>
      </ContentWrapper>
    </Wrapper>
  );
}

function SummarySection({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => (
          <Badge key={item} className={cn(color, 'text-xs px-2 py-0.5')}>{item}</Badge>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm text-foreground">{value}</p>
    </div>
  );
}
