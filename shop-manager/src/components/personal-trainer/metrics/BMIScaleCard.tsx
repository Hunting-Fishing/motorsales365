import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BMIScaleCardProps {
  currentBMI?: number | null;
}

const BMI_RANGES = [
  { label: 'Underweight', min: 0, max: 18.5, color: 'bg-blue-400' },
  { label: 'Normal', min: 18.5, max: 25, color: 'bg-green-400' },
  { label: 'Overweight', min: 25, max: 30, color: 'bg-yellow-400' },
  { label: 'Obese', min: 30, max: 40, color: 'bg-red-400' },
];

export function BMIScaleCard({ currentBMI }: BMIScaleCardProps) {
  const markerPosition = currentBMI
    ? Math.min(Math.max(((currentBMI - 10) / 30) * 100, 0), 100)
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">BMI Scale Reference</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <div className="flex h-4 rounded-full overflow-hidden">
            <div className="w-[28%] bg-blue-400" />
            <div className="w-[22%] bg-green-400" />
            <div className="w-[17%] bg-yellow-400" />
            <div className="w-[33%] bg-red-400" />
          </div>
          {markerPosition !== null && (
            <div
              className="absolute -top-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-foreground transition-all"
              style={{ left: `calc(${markerPosition}% - 6px)` }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>10</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>40</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-xs">
          {BMI_RANGES.map(r => (
            <div key={r.label} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${r.color}`} />
              <span className="text-muted-foreground">{r.label}</span>
            </div>
          ))}
        </div>
        {currentBMI && (
          <p className="text-sm font-medium text-center">
            Current: <span className="text-primary">{currentBMI.toFixed(1)}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
