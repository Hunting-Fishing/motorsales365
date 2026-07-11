import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { useFitnessScores } from '@/hooks/useFitnessTaxonomy';
import { cn } from '@/lib/utils';

interface FitnessProfileScoresProps {
  clientId: string;
  shopId: string;
}

const SCORE_DIMENSIONS = [
  { key: 'strength_affinity', label: 'Strength', emoji: '💪', color: 'hsl(var(--primary))' },
  { key: 'endurance_affinity', label: 'Endurance', emoji: '🏃', color: 'hsl(25, 95%, 53%)' },
  { key: 'aesthetics_affinity', label: 'Aesthetics', emoji: '✨', color: 'hsl(280, 65%, 60%)' },
  { key: 'competition_affinity', label: 'Competition', emoji: '🏆', color: 'hsl(45, 93%, 47%)' },
  { key: 'recovery_need', label: 'Recovery Need', emoji: '🧘', color: 'hsl(160, 60%, 45%)' },
  { key: 'beginner_support_need', label: 'Beginner Support', emoji: '🌱', color: 'hsl(120, 50%, 50%)' },
  { key: 'equipment_richness', label: 'Equipment', emoji: '🏋️', color: 'hsl(200, 70%, 50%)' },
  { key: 'coaching_intensity', label: 'Coaching Intensity', emoji: '📋', color: 'hsl(340, 65%, 55%)' },
];

export default function FitnessProfileScores({ clientId, shopId }: FitnessProfileScoresProps) {
  const { data: scores, isLoading } = useFitnessScores(clientId, shopId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!scores) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Complete the fitness intake to generate profile scores</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Fitness Profile Scores
        </CardTitle>
        <p className="text-xs text-muted-foreground">AI-computed affinity dimensions based on intake data</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {SCORE_DIMENSIONS.map(dim => {
          const value = Number((scores as any)[dim.key]) || 0;
          return (
            <div key={dim.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <span>{dim.emoji}</span>
                  {dim.label}
                </span>
                <span className="text-xs font-bold text-foreground">{Math.round(value)}</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(value, 100)}%`,
                    backgroundColor: dim.color,
                  }}
                />
              </div>
            </div>
          );
        })}
        {scores.computed_at && (
          <p className="text-[10px] text-muted-foreground text-right pt-2">
            Last computed: {new Date(scores.computed_at).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
