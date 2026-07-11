
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Camera, Flame, Target, TrendingDown, Zap, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MilestoneCardsProps {
  clientId: string;
  shopId: string;
  photoCount?: number;
  checkInCount?: number;
  metrics?: any[];
}

const MILESTONE_CONFIGS: Record<string, { icon: React.ElementType; gradient: string; label: string }> = {
  first_photo: { icon: Camera, gradient: 'from-pink-500 to-rose-500', label: '📸 First Photo!' },
  photo_10: { icon: Camera, gradient: 'from-violet-500 to-purple-500', label: '📸 10 Photos!' },
  weight_loss_5: { icon: TrendingDown, gradient: 'from-green-500 to-emerald-500', label: '🔥 5 lbs Down!' },
  weight_loss_10: { icon: TrendingDown, gradient: 'from-green-600 to-teal-500', label: '💪 10 lbs Down!' },
  checkin_streak_7: { icon: Flame, gradient: 'from-orange-500 to-amber-500', label: '🔥 7-Day Streak!' },
  checkin_streak_30: { icon: Flame, gradient: 'from-red-500 to-orange-500', label: '🔥 30-Day Streak!' },
  consistency: { icon: Target, gradient: 'from-blue-500 to-cyan-500', label: '🎯 Consistent!' },
  one_month: { icon: Award, gradient: 'from-indigo-500 to-violet-500', label: '📅 1 Month In!' },
  goal_reached: { icon: Trophy, gradient: 'from-yellow-500 to-amber-500', label: '🏆 Goal Reached!' },
};

const MOTIVATIONAL_QUOTES = [
  "Every rep counts. Every step matters. 💪",
  "You didn't come this far to only come this far!",
  "Progress, not perfection. 🌟",
  "The only bad workout is the one that didn't happen.",
  "One pound at a time. One day at a time. 🔥",
  "Your body can stand almost anything. It's your mind you have to convince.",
  "Champions are made when nobody is watching. 🏆",
];

export default function MilestoneCards({ clientId, shopId, photoCount = 0, checkInCount = 0, metrics = [] }: MilestoneCardsProps) {
  const { data: milestones = [] } = useQuery({
    queryKey: ['pt-milestones', clientId, shopId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_client_milestones')
        .select('*')
        .eq('client_id', clientId)
        .eq('shop_id', shopId)
        .order('achieved_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-detect milestones from current data
  const detectedMilestones: { type: string; value?: string }[] = [];

  if (photoCount >= 1) detectedMilestones.push({ type: 'first_photo' });
  if (photoCount >= 10) detectedMilestones.push({ type: 'photo_10' });
  if (checkInCount >= 7) detectedMilestones.push({ type: 'checkin_streak_7' });
  if (checkInCount >= 30) detectedMilestones.push({ type: 'checkin_streak_30' });

  // Weight loss detection from metrics
  if (metrics.length >= 2) {
    const first = metrics[metrics.length - 1];
    const latest = metrics[0];
    if (first?.weight_kg && latest?.weight_kg) {
      const lostKg = first.weight_kg - latest.weight_kg;
      const lostLbs = lostKg * 2.205;
      if (lostLbs >= 5) detectedMilestones.push({ type: 'weight_loss_5', value: `${lostLbs.toFixed(1)} lbs` });
      if (lostLbs >= 10) detectedMilestones.push({ type: 'weight_loss_10', value: `${lostLbs.toFixed(1)} lbs` });
    }
  }

  const allMilestones = [
    ...milestones.map((m: any) => ({ type: m.milestone_type, value: m.milestone_value, achieved_at: m.achieved_at, fromDb: true })),
    ...detectedMilestones.filter(d => !milestones.find((m: any) => m.milestone_type === d.type)).map(d => ({ ...d, fromDb: false })),
  ];

  const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

  if (allMilestones.length === 0 && photoCount === 0) {
    return (
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4 text-center">
          <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Start the Journey!</p>
          <p className="text-xs text-muted-foreground mt-1">Upload a progress photo to begin tracking milestones</p>
          <p className="text-xs text-muted-foreground mt-3 italic">"{randomQuote}"</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Motivational Banner */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/10 border-primary/20">
        <CardContent className="p-3 flex items-center gap-3">
          <Zap className="h-5 w-5 text-primary flex-shrink-0" />
          <p className="text-xs italic text-muted-foreground">"{randomQuote}"</p>
        </CardContent>
      </Card>

      {/* Milestone Badges */}
      {allMilestones.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allMilestones.map((m, i) => {
            const config = MILESTONE_CONFIGS[m.type] || MILESTONE_CONFIGS.consistency;
            const Icon = config.icon;
            return (
              <Card key={`${m.type}-${i}`} className="overflow-hidden">
                <div className={cn('bg-gradient-to-br p-3 text-white', config.gradient)}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-bold">{config.label}</span>
                  </div>
                  {m.value && <p className="text-[10px] mt-1 opacity-90">{m.value}</p>}
                  {m.achieved_at && (
                    <p className="text-[10px] mt-1 opacity-75">{format(new Date(m.achieved_at), 'MMM d, yyyy')}</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
