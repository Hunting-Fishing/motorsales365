
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, X } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PresetProgramLibrary from './PresetProgramLibrary';
import ReactMarkdown from 'react-markdown';

const WORKOUT_STYLES = [
  'Push/Pull/Legs', 'Upper/Lower', 'Full Body', 'Bro Split', 'CrossFit/WOD',
  'HIIT/Circuit', 'Powerlifting', 'Olympic Lifting', 'Bodybuilding',
  'Calisthenics', 'Functional', 'Sport-Specific', 'Endurance',
  'Flexibility/Mobility', 'Rehabilitation',
];

const TRAINING_PLATFORMS = ['Gym', 'Home', 'Outdoor', 'Hotel/Travel', 'Minimal Equipment', 'Hybrid'];

const TARGET_MUSCLES = ['Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Legs', 'Glutes', 'Full Body'];

const DIFFICULTIES = [
  { value: 'absolute_beginner', label: 'Absolute Beginner' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'elite', label: 'Elite' },
];

const GOALS = [
  'Fat Loss', 'Muscle Gain', 'Strength', 'Endurance', 'Recomp',
  'Sport Performance', 'Rehab', 'General Fitness',
];

const SESSION_DURATIONS = [30, 45, 60, 75, 90];

interface ProgramCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
}

function MultiChipSelect({ options, selected, onChange, label }: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  label: string;
}) {
  const toggle = (item: string) => {
    onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  };
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {options.map(opt => (
          <Badge
            key={opt}
            variant={selected.includes(opt) ? 'default' : 'outline'}
            className="cursor-pointer text-xs px-2 py-1 transition-colors"
            onClick={() => toggle(opt)}
          >
            {opt}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function ProgramCreatorDialog({ open, onOpenChange, shopId }: ProgramCreatorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('manual');

  // Manual form state
  const [form, setForm] = useState({
    name: '', description: '', duration_weeks: 4, difficulty: 'intermediate',
    goal: 'General Fitness', workout_style: [] as string[], training_platform: 'Gym',
    target_muscles: [] as string[], days_per_week: 4, session_duration_minutes: 60,
    limitations: '', is_template: false,
  });

  // AI state
  const [aiForm, setAiForm] = useState({
    workout_style: [] as string[], training_platform: 'Gym',
    target_muscles: [] as string[], difficulty: 'intermediate',
    days_per_week: 4, session_duration_minutes: 60, goal: 'General Fitness',
    limitations: '', client_id: '',
  });
  const [clientMedicalConditions, setClientMedicalConditions] = useState<any[]>([]);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-clients-ai', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients')
        .select('id, first_name, last_name')
        .eq('shop_id', shopId).eq('membership_status', 'active').order('first_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const createProgram = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const styleMap: Record<string, string> = {
        'Push/Pull/Legs': 'push_pull_legs', 'Upper/Lower': 'upper_lower',
        'Full Body': 'full_body', 'Bro Split': 'bro_split', 'CrossFit/WOD': 'crossfit_wod',
        'HIIT/Circuit': 'hiit_circuit', 'Powerlifting': 'powerlifting',
        'Olympic Lifting': 'olympic_lifting', 'Bodybuilding': 'bodybuilding',
        'Calisthenics': 'calisthenics', 'Functional': 'functional',
        'Sport-Specific': 'sport_specific', 'Endurance': 'endurance',
        'Flexibility/Mobility': 'flexibility_mobility', 'Rehabilitation': 'rehabilitation',
      };
      const { error } = await (supabase as any).from('pt_workout_programs').insert({
        name: form.name,
        description: form.description,
        duration_weeks: form.duration_weeks,
        difficulty: form.difficulty,
        goal: form.goal,
        workout_style: form.workout_style.map(s => styleMap[s] || s.toLowerCase().replace(/\//g, '_')),
        training_platform: form.training_platform.toLowerCase().replace(/\//g, '_'),
        target_muscles: form.target_muscles.map(m => m.toLowerCase().replace(/ /g, '_')),
        days_per_week: form.days_per_week,
        session_duration_minutes: form.session_duration_minutes,
        limitations: form.limitations || null,
        is_template: form.is_template,
        shop_id: shopId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-programs'] });
      toast({ title: 'Program created!' });
      onOpenChange(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Fetch medical conditions when a client is selected
  const selectedClientId = aiForm.client_id && aiForm.client_id !== 'none' ? aiForm.client_id : null;
  
  useQuery({
    queryKey: ['pt-client-medical-for-program', selectedClientId, shopId],
    queryFn: async () => {
      if (!selectedClientId || !shopId) return [];
      const { data } = await (supabase as any).from('pt_client_medical_conditions')
        .select('condition_name, category, severity, status, exercise_restrictions, dietary_implications')
        .eq('client_id', selectedClientId)
        .eq('shop_id', shopId)
        .in('status', ['active', 'chronic']);
      setClientMedicalConditions(data || []);
      return data || [];
    },
    enabled: !!selectedClientId && !!shopId,
  });

  const generateWithAI = async () => {
    setAiGenerating(true);
    setAiResult(null);
    try {
      // Build structured medical context
      const medicalContext = clientMedicalConditions.length > 0
        ? clientMedicalConditions.map((c: any) => ({
            name: c.condition_name,
            category: c.category,
            severity: c.severity,
            restrictions: c.exercise_restrictions || [],
            dietary: c.dietary_implications || [],
          }))
        : undefined;

      const { data, error } = await supabase.functions.invoke('pt-ai-assistant', {
        body: {
          action: 'generate_program_template',
          shopId,
          clientId: selectedClientId || undefined,
          context: {
            workout_style: aiForm.workout_style,
            training_platform: aiForm.training_platform,
            target_muscles: aiForm.target_muscles,
            difficulty: aiForm.difficulty,
            days_per_week: aiForm.days_per_week,
            session_duration_minutes: aiForm.session_duration_minutes,
            goal: aiForm.goal,
            limitations: aiForm.limitations,
            medical_conditions: medicalContext,
          },
        },
      });
      if (error) throw error;
      setAiResult(data.content);
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    } finally {
      setAiGenerating(false);
    }
  };

  const saveAiProgram = useMutation({
    mutationFn: async () => {
      if (!shopId || !aiResult) throw new Error('Missing data');
      const styleMap: Record<string, string> = {
        'Push/Pull/Legs': 'push_pull_legs', 'Upper/Lower': 'upper_lower',
        'Full Body': 'full_body', 'Bro Split': 'bro_split', 'CrossFit/WOD': 'crossfit_wod',
        'HIIT/Circuit': 'hiit_circuit', 'Powerlifting': 'powerlifting',
        'Olympic Lifting': 'olympic_lifting', 'Bodybuilding': 'bodybuilding',
        'Calisthenics': 'calisthenics', 'Functional': 'functional',
        'Sport-Specific': 'sport_specific', 'Endurance': 'endurance',
        'Flexibility/Mobility': 'flexibility_mobility', 'Rehabilitation': 'rehabilitation',
      };
      const programName = `AI: ${aiForm.goal} - ${aiForm.workout_style.join(', ') || 'Custom'}`;
      const { error } = await (supabase as any).from('pt_workout_programs').insert({
        name: programName,
        description: aiResult.substring(0, 500),
        duration_weeks: Math.ceil(aiForm.days_per_week > 0 ? 8 : 4),
        difficulty: aiForm.difficulty,
        goal: aiForm.goal,
        workout_style: aiForm.workout_style.map(s => styleMap[s] || s.toLowerCase()),
        training_platform: aiForm.training_platform.toLowerCase(),
        target_muscles: aiForm.target_muscles.map(m => m.toLowerCase()),
        days_per_week: aiForm.days_per_week,
        session_duration_minutes: aiForm.session_duration_minutes,
        limitations: aiForm.limitations || null,
        shop_id: shopId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-programs'] });
      toast({ title: 'AI Program saved!' });
      onOpenChange(false);
      setAiResult(null);
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const resetForm = () => {
    setForm({
      name: '', description: '', duration_weeks: 4, difficulty: 'intermediate',
      goal: 'General Fitness', workout_style: [], training_platform: 'Gym',
      target_muscles: [], days_per_week: 4, session_duration_minutes: 60,
      limitations: '', is_template: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Workout Program</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual">Manual</TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />AI Generate
            </TabsTrigger>
            <TabsTrigger value="presets">Browse Presets</TabsTrigger>
          </TabsList>

          {/* MANUAL TAB */}
          <TabsContent value="manual" className="mt-4">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                <div>
                  <Label>Program Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. 12-Week Shred" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                </div>

                <MultiChipSelect label="Workout Style" options={WORKOUT_STYLES} selected={form.workout_style} onChange={v => setForm(f => ({ ...f, workout_style: v }))} />
                <MultiChipSelect label="Target Muscles" options={TARGET_MUSCLES} selected={form.target_muscles} onChange={v => setForm(f => ({ ...f, target_muscles: v }))} />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Training Platform</Label>
                    <Select value={form.training_platform} onValueChange={v => setForm(f => ({ ...f, training_platform: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TRAINING_PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Difficulty</Label>
                    <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Duration (weeks)</Label>
                    <Input type="number" value={form.duration_weeks} onChange={e => setForm(f => ({ ...f, duration_weeks: parseInt(e.target.value) || 4 }))} />
                  </div>
                  <div>
                    <Label>Days/Week</Label>
                    <Select value={String(form.days_per_week)} onValueChange={v => setForm(f => ({ ...f, days_per_week: parseInt(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Session (min)</Label>
                    <Select value={String(form.session_duration_minutes)} onValueChange={v => setForm(f => ({ ...f, session_duration_minutes: parseInt(v) }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SESSION_DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Goal</Label>
                  <Select value={form.goal} onValueChange={v => setForm(f => ({ ...f, goal: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Limitations / Notes</Label>
                  <Textarea value={form.limitations} onChange={e => setForm(f => ({ ...f, limitations: e.target.value }))} rows={2} placeholder="e.g. Bad left knee, no overhead pressing" />
                </div>

                <Button className="w-full" disabled={!form.name || createProgram.isPending} onClick={() => createProgram.mutate()}>
                  {createProgram.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : 'Create Program'}
                </Button>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* AI TAB */}
          <TabsContent value="ai" className="mt-4">
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4">
                {!aiResult ? (
                  <>
                    <MultiChipSelect label="Workout Style" options={WORKOUT_STYLES} selected={aiForm.workout_style} onChange={v => setAiForm(f => ({ ...f, workout_style: v }))} />
                    <MultiChipSelect label="Target Muscles" options={TARGET_MUSCLES} selected={aiForm.target_muscles} onChange={v => setAiForm(f => ({ ...f, target_muscles: v }))} />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Training Platform</Label>
                        <Select value={aiForm.training_platform} onValueChange={v => setAiForm(f => ({ ...f, training_platform: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TRAINING_PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Difficulty</Label>
                        <Select value={aiForm.difficulty} onValueChange={v => setAiForm(f => ({ ...f, difficulty: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Days/Week</Label>
                        <Select value={String(aiForm.days_per_week)} onValueChange={v => setAiForm(f => ({ ...f, days_per_week: parseInt(v) }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7].map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Session (min)</Label>
                        <Select value={String(aiForm.session_duration_minutes)} onValueChange={v => setAiForm(f => ({ ...f, session_duration_minutes: parseInt(v) }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {SESSION_DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Goal</Label>
                        <Select value={aiForm.goal} onValueChange={v => setAiForm(f => ({ ...f, goal: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {GOALS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Client (optional - for personalized program)</Label>
                      <Select value={aiForm.client_id} onValueChange={v => setAiForm(f => ({ ...f, client_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="No client (generic program)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No client (generic)</SelectItem>
                          {clients.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Medical conditions from selected client */}
                    {clientMedicalConditions.length > 0 && (
                      <div>
                        <Label className="text-sm">Client Medical Conditions</Label>
                        <div className="flex flex-wrap gap-1 mt-1.5 p-2 bg-muted/50 rounded-md">
                          {clientMedicalConditions.map((c: any, i: number) => (
                            <Badge key={i} variant={c.severity === 'severe' ? 'destructive' : c.severity === 'moderate' ? 'default' : 'secondary'} className="text-xs">
                              {c.condition_name} ({c.severity})
                            </Badge>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">These conditions will be sent to AI for safe program generation.</p>
                      </div>
                    )}

                    <div>
                      <Label>Additional Limitations / Notes</Label>
                      <Textarea value={aiForm.limitations} onChange={e => setAiForm(f => ({ ...f, limitations: e.target.value }))} rows={2} placeholder="Any extra notes beyond medical conditions..." />
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                      disabled={aiGenerating || aiForm.workout_style.length === 0}
                      onClick={generateWithAI}
                    >
                      {aiGenerating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating Program...</> : <><Sparkles className="h-4 w-4 mr-2" />Generate with AI</>}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">AI Generated Program</h3>
                      <Button size="sm" variant="ghost" onClick={() => setAiResult(null)}>
                        <X className="h-4 w-4 mr-1" />Start Over
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 text-sm prose prose-sm max-w-none">
                      <ReactMarkdown>{aiResult}</ReactMarkdown>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setAiResult(null)}>Regenerate</Button>
                      <Button className="flex-1" disabled={saveAiProgram.isPending} onClick={() => saveAiProgram.mutate()}>
                        {saveAiProgram.isPending ? 'Saving...' : 'Save Program'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* PRESETS TAB */}
          <TabsContent value="presets" className="mt-4">
            <PresetProgramLibrary shopId={shopId} onCloned={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
