import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNutritionProfile, useNutritionGoals, useFoodLogs, useHydrationLogs } from '@/hooks/useNutrition';
import { Flame, Target, Scale, TrendingUp, Award, Droplets, Activity } from 'lucide-react';

interface Props {
  client: { id: string; first_name: string; last_name: string; calorie_target?: number; protein_target_g?: number };
  shopId: string;
}

export default function ClientOverviewCard({ client, shopId }: Props) {
  const { data: profile } = useNutritionProfile(client.id, shopId);
  const { data: goals } = useNutritionGoals(client.id, shopId);
  const { data: logs = [] } = useFoodLogs(client.id, shopId);
  const { data: hydrationLogs = [] } = useHydrationLogs(client.id, shopId);

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter((l: any) => l.log_date === today);
  const todayCalories = todayLogs.reduce((s: number, l: any) => s + (l.calories || 0), 0);
  const todayProtein = todayLogs.reduce((s: number, l: any) => s + (l.protein_g || 0), 0);
  const todayHydration = (hydrationLogs as any[]).filter((l: any) => l.log_date === today)
    .reduce((s: number, l: any) => s + (l.amount_ml || 0), 0);

  // Streak calculation
  let streak = 0;
  const dates = [...new Set(logs.map((l: any) => l.log_date))].sort().reverse() as string[];
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (dates[i] === expected.toISOString().split('T')[0]) streak++;
    else break;
  }

  const calTarget = client.calorie_target || goals?.daily_calories || profile?.target_calories || 2000;
  const calPct = calTarget > 0 ? Math.min(100, Math.round((todayCalories / calTarget) * 100)) : 0;
  const initials = `${client.first_name?.[0] || ''}${client.last_name?.[0] || ''}`.toUpperCase();

  const dietaryStyle = profile?.dietary_style;
  const allergies = profile?.allergies as string[] | null;
  const currentWeight = profile?.weight_kg;
  const goalWeight = goals?.target_weight_kg;

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-14 w-14 border-2 border-primary/30">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{initials}</AvatarFallback>
          </Avatar>

          {/* Client Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-lg">{client.first_name} {client.last_name}</h2>
              {dietaryStyle && (
                <Badge variant="secondary" className="text-[10px] capitalize">{dietaryStyle}</Badge>
              )}
              {streak > 0 && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">
                  🔥 {streak} day streak
                </Badge>
              )}
            </div>

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-3 mt-2">
              {currentWeight && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Scale className="h-3 w-3" />
                  <span>{currentWeight}kg</span>
                  {goalWeight && <span className="text-primary">→ {goalWeight}kg</span>}
                </div>
              )}
              {goals?.primary_goal && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Target className="h-3 w-3" />
                  <span className="capitalize">{goals.primary_goal.replace(/_/g, ' ')}</span>
                </div>
              )}
              {goals?.activity_level && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  <span className="capitalize">{goals.activity_level}</span>
                </div>
              )}
            </div>

            {/* Allergies */}
            {allergies && allergies.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {allergies.slice(0, 4).map((a: string) => (
                  <Badge key={a} variant="destructive" className="text-[10px] py-0">{a}</Badge>
                ))}
                {allergies.length > 4 && (
                  <Badge variant="outline" className="text-[10px] py-0">+{allergies.length - 4}</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Today's quick metrics */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-background/60 rounded-lg p-2 text-center">
            <Flame className="h-4 w-4 mx-auto text-orange-500 mb-0.5" />
            <p className="text-sm font-bold">{todayCalories}</p>
            <p className="text-[10px] text-muted-foreground">{calPct}% of {calTarget}</p>
          </div>
          <div className="bg-background/60 rounded-lg p-2 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-blue-500 mb-0.5" />
            <p className="text-sm font-bold">{Math.round(todayProtein)}g</p>
            <p className="text-[10px] text-muted-foreground">Protein</p>
          </div>
          <div className="bg-background/60 rounded-lg p-2 text-center">
            <Droplets className="h-4 w-4 mx-auto text-cyan-500 mb-0.5" />
            <p className="text-sm font-bold">{todayHydration >= 1000 ? `${(todayHydration / 1000).toFixed(1)}L` : `${todayHydration}ml`}</p>
            <p className="text-[10px] text-muted-foreground">Hydration</p>
          </div>
          <div className="bg-background/60 rounded-lg p-2 text-center">
            <Award className="h-4 w-4 mx-auto text-amber-500 mb-0.5" />
            <p className="text-sm font-bold">{todayLogs.length}</p>
            <p className="text-[10px] text-muted-foreground">Meals today</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
