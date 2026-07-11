import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Heart, Droplets, Dumbbell, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { BMIBadge } from './BMIBadge';

interface EnhancedMetricCardProps {
  metric: any;
  previousMetric?: any;
}

function TrendIndicator({ current, previous, inverse }: { current?: number; previous?: number; inverse?: boolean }) {
  if (!current || !previous) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.01) return <Minus className="h-3 w-3 text-muted-foreground" />;
  const isUp = diff > 0;
  const isGood = inverse ? !isUp : isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return <Icon className={`h-3 w-3 ${isGood ? 'text-green-500' : 'text-red-500'}`} />;
}

export function EnhancedMetricCard({ metric, previousMetric }: EnhancedMetricCardProps) {
  const m = metric;
  const prev = previousMetric;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-medium">{m.pt_clients?.first_name} {m.pt_clients?.last_name}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(m.recorded_date), 'MMM d, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            {m.source && m.source !== 'manual' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{m.source.replace('_', ' ')}</span>
            )}
            <BMIBadge bmi={m.bmi} />
          </div>
        </div>

        {/* Primary metrics */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-sm">
          {m.weight_kg && (
            <div className="flex items-start gap-1">
              <div>
                <span className="text-muted-foreground text-xs">Weight</span>
                <p className="font-medium">{m.weight_kg} kg</p>
              </div>
              <TrendIndicator current={m.weight_kg} previous={prev?.weight_kg} inverse />
            </div>
          )}
          {m.body_fat_percent && (
            <div className="flex items-start gap-1">
              <div>
                <span className="text-muted-foreground text-xs">Body Fat</span>
                <p className="font-medium">{m.body_fat_percent}%</p>
              </div>
              <TrendIndicator current={m.body_fat_percent} previous={prev?.body_fat_percent} inverse />
            </div>
          )}
          {m.muscle_mass_kg && (
            <div className="flex items-start gap-1">
              <Dumbbell className="h-3 w-3 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground text-xs">Muscle</span>
                <p className="font-medium">{m.muscle_mass_kg} kg</p>
              </div>
            </div>
          )}
          {m.chest_cm && <div><span className="text-muted-foreground text-xs">Chest</span><p className="font-medium">{m.chest_cm} cm</p></div>}
          {m.waist_cm && <div><span className="text-muted-foreground text-xs">Waist</span><p className="font-medium">{m.waist_cm} cm</p></div>}
        </div>

        {/* Vitals row */}
        {(m.resting_heart_rate || m.blood_pressure_systolic || m.water_percent) && (
          <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t text-xs">
            {m.resting_heart_rate && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-400" />
                <span className="text-muted-foreground">HR:</span>
                <span className="font-medium">{m.resting_heart_rate} bpm</span>
              </div>
            )}
            {m.blood_pressure_systolic && m.blood_pressure_diastolic && (
              <div className="flex items-center gap-1">
                <Activity className="h-3 w-3 text-orange-400" />
                <span className="text-muted-foreground">BP:</span>
                <span className="font-medium">{m.blood_pressure_systolic}/{m.blood_pressure_diastolic}</span>
              </div>
            )}
            {m.water_percent && (
              <div className="flex items-center gap-1">
                <Droplets className="h-3 w-3 text-blue-400" />
                <span className="text-muted-foreground">Water:</span>
                <span className="font-medium">{m.water_percent}%</span>
              </div>
            )}
            {m.bmr_calories && (
              <div>
                <span className="text-muted-foreground">BMR:</span>
                <span className="font-medium ml-1">{m.bmr_calories} cal</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
