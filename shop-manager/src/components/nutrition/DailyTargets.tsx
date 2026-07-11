import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDailyTargets } from '@/hooks/useNutrition';
import { Loader2, Flame, Beef, Wheat, Droplets } from 'lucide-react';

interface Props {
  clientId: string;
  shopId: string;
  dayType?: string;
  todayIntake?: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
}

function MacroRing({ label, current, target, icon: Icon, color }: { label: string; current: number; target: number; icon: any; color: string }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
          <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold">{Math.round(current)} / {Math.round(target)}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function DailyTargets({ clientId, shopId, dayType = 'moderate', todayIntake }: Props) {
  const { data: targets, isLoading } = useDailyTargets(clientId, shopId, dayType);
  const intake = todayIntake || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

  if (isLoading) return <Card><CardContent className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></CardContent></Card>;
  if (!targets) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Today's Targets</span>
          <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-muted rounded-full">{targets.day_type_label}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          <MacroRing label="Calories" current={intake.calories} target={targets.calories} icon={Flame} color="hsl(var(--chart-1))" />
          <MacroRing label="Protein" current={intake.protein_g} target={targets.protein_g} icon={Beef} color="hsl(var(--chart-2))" />
          <MacroRing label="Carbs" current={intake.carbs_g} target={targets.carbs_g} icon={Wheat} color="hsl(var(--chart-4))" />
          <MacroRing label="Fat" current={intake.fat_g} target={targets.fat_g} icon={Droplets} color="hsl(var(--chart-5))" />
        </div>
      </CardContent>
    </Card>
  );
}
