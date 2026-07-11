import React from 'react';
import { Badge } from '@/components/ui/badge';

interface BMIBadgeProps {
  bmi: number | null | undefined;
  size?: 'sm' | 'md';
}

function getBMICategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  if (bmi < 25) return { label: 'Normal', color: 'bg-green-100 text-green-800 border-green-200' };
  if (bmi < 30) return { label: 'Overweight', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  return { label: 'Obese', color: 'bg-red-100 text-red-800 border-red-200' };
}

export function BMIBadge({ bmi, size = 'sm' }: BMIBadgeProps) {
  if (!bmi) return null;
  const { label, color } = getBMICategory(bmi);
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <Badge variant="outline" className={`${color} ${textSize} font-medium border`}>
      BMI {bmi.toFixed(1)} · {label}
    </Badge>
  );
}

export function calculateBMI(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}
