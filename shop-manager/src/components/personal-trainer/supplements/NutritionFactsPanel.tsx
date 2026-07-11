import React from 'react';
import { Progress } from '@/components/ui/progress';

interface NutrientInfo {
  amount: string;
  dv: number | null;
}

interface NutritionFactsPanelProps {
  nutritionFacts: Record<string, NutrientInfo>;
  servingSize?: string;
}

const nutrientLabels: Record<string, string> = {
  vitamin_a: 'Vitamin A',
  vitamin_c: 'Vitamin C',
  vitamin_d3: 'Vitamin D3',
  vitamin_d: 'Vitamin D',
  vitamin_e: 'Vitamin E',
  vitamin_k2: 'Vitamin K2',
  vitamin_k: 'Vitamin K',
  thiamin_b1: 'Thiamin (B1)',
  riboflavin_b2: 'Riboflavin (B2)',
  niacin_b3: 'Niacin (B3)',
  vitamin_b6: 'Vitamin B6',
  folate: 'Folate',
  vitamin_b12: 'Vitamin B12',
  biotin: 'Biotin',
  calcium: 'Calcium',
  iron: 'Iron',
  magnesium: 'Magnesium',
  zinc: 'Zinc',
  selenium: 'Selenium',
  chromium: 'Chromium',
  potassium: 'Potassium',
  manganese: 'Manganese',
  copper: 'Copper',
  epa: 'EPA (Omega-3)',
  dha: 'DHA (Omega-3)',
  other_omega_3: 'Other Omega-3',
  astaxanthin: 'Astaxanthin',
  coenzyme_q10: 'CoQ10',
  alpha_lipoic_acid: 'Alpha-Lipoic Acid',
  acetyl_l_carnitine: 'Acetyl L-Carnitine',
  resveratrol: 'Resveratrol',
  baicalin: 'Baicalin',
  boswellic_acids: 'Boswellic Acids',
};

function formatLabel(key: string): string {
  return nutrientLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function NutritionFactsPanel({ nutritionFacts, servingSize }: NutritionFactsPanelProps) {
  if (!nutritionFacts || Object.keys(nutritionFacts).length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">No nutrition data available.</p>;
  }

  const entries = Object.entries(nutritionFacts);

  return (
    <div className="border-2 border-foreground rounded-lg p-4 space-y-2">
      <h3 className="text-lg font-black text-foreground border-b-[6px] border-foreground pb-1">
        Nutrition Facts
      </h3>
      {servingSize && (
        <p className="text-xs text-muted-foreground pb-1 border-b border-border">
          Serving Size: {servingSize}
        </p>
      )}

      <div className="space-y-0">
        <div className="flex justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1 border-b border-border">
          <span>Nutrient</span>
          <div className="flex gap-8">
            <span>Amount</span>
            <span className="w-12 text-right">% DV</span>
          </div>
        </div>

        {entries.map(([key, info]) => {
          const nutrient = info as NutrientInfo;
          const dvPercent = nutrient.dv;
          const cappedProgress = dvPercent ? Math.min(dvPercent, 100) : 0;

          return (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-b-0">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground truncate">{formatLabel(key)}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground w-16 text-right">{nutrient.amount}</span>
                <div className="w-16">
                  {dvPercent != null ? (
                    <Progress value={cappedProgress} className="h-1.5" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground w-14 text-right">
                  {dvPercent != null ? `${dvPercent}%` : '†'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-muted-foreground pt-1 border-t border-foreground">
        † Daily Value not established. % Daily Values based on a 2,000 calorie diet.
      </p>
    </div>
  );
}
