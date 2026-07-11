import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export function BodyMetricsInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm space-y-3" align="start">
        <h4 className="font-semibold">About Body Metrics</h4>
        <p className="text-muted-foreground text-xs">
          Track body composition, measurements, and vitals over time to monitor client progress and health.
        </p>
        <div className="space-y-2">
          <h5 className="font-medium text-xs">BMI Categories (WHO)</h5>
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Underweight: &lt; 18.5</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400" /> Normal: 18.5–24.9</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Overweight: 25–29.9</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Obese: 30+</span>
          </div>
        </div>
        <div className="space-y-1">
          <h5 className="font-medium text-xs">Measurement Tips</h5>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
            <li>Weigh in the morning before eating</li>
            <li>Use the same scale each time</li>
            <li>Measure at the same body landmarks</li>
            <li>Take photos in consistent lighting</li>
          </ul>
        </div>
        <div className="space-y-1">
          <h5 className="font-medium text-xs">Supported Devices</h5>
          <p className="text-xs text-muted-foreground">Apple Health, Google Fit, Fitbit, and smart scales can sync data automatically.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
