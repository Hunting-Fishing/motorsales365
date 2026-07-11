
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Dumbbell, Clock, Calendar, Loader2, Copy } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PRESET_CATEGORIES = [
  'All', 'PPL', 'Upper/Lower', 'Full Body', 'Bro Split', '5x5', 'CrossFit',
  'HIIT', 'Bodybuilding', 'Powerlifting', 'Calisthenics', 'Sport-Specific',
  'Rehab/Mobility', 'Endurance', 'Functional', 'Olympic Lifting',
];

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  intermediate: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  advanced: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  elite: 'bg-red-500/10 text-red-600 border-red-500/20',
};

interface PresetProgramLibraryProps {
  shopId: string;
  onCloned?: () => void;
}

export default function PresetProgramLibrary({ shopId, onCloned }: PresetProgramLibraryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['pt-preset-programs'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('pt_workout_programs')
        .select('*')
        .eq('is_preset', true)
        .order('preset_category', { ascending: true });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return presets.filter((p: any) => {
      if (category !== 'All' && p.preset_category !== category) return false;
      if (difficultyFilter !== 'all' && p.difficulty !== difficultyFilter) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && 
          !p.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [presets, category, difficultyFilter, search]);

  const cloneProgram = useMutation({
    mutationFn: async (preset: any) => {
      const { id, created_at, updated_at, is_preset, preset_category, ...rest } = preset;
      const { error } = await (supabase as any).from('pt_workout_programs').insert({
        ...rest,
        shop_id: shopId,
        is_preset: false,
        preset_category: null,
        is_template: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-programs'] });
      toast({ title: 'Program cloned to your library!' });
      onCloned?.();
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search presets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {PRESET_CATEGORIES.map(cat => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? 'default' : 'outline'}
              className="shrink-0 text-xs"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </ScrollArea>

      {isLoading ? (
        <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No presets match your filters</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 max-h-[50vh] overflow-y-auto pr-1">
          {filtered.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1.5">
                  <h4 className="font-semibold text-sm leading-tight">{p.name}</h4>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${difficultyColors[p.difficulty] || ''}`}>
                    {p.difficulty}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{p.duration_weeks}w</span>
                  <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{p.days_per_week}d/wk</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.session_duration_minutes}min</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {(p.workout_style || []).map((s: string) => (
                    <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {s.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.training_platform}</Badge>
                </div>
                {p.goal && <p className="text-[11px] text-muted-foreground mb-3">Goal: {p.goal}</p>}
                <Button
                  size="sm"
                  className="w-full"
                  variant="outline"
                  disabled={cloneProgram.isPending}
                  onClick={() => cloneProgram.mutate(p)}
                >
                  <Copy className="h-3 w-3 mr-1.5" />Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
