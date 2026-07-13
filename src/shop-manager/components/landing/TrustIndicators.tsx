import React from 'react';
import { Shield, Zap, HeadphonesIcon, Cloud } from 'lucide-react';

const indicators = [
  { icon: Zap, label: 'Fast Setup', sublabel: 'Get started in minutes' },
  { icon: Shield, label: 'Secure', sublabel: 'Enterprise-grade security' },
  { icon: HeadphonesIcon, label: 'Support', sublabel: 'Help when you need it' },
  { icon: Cloud, label: 'Cloud-Based', sublabel: 'Access from anywhere' },
];

export function TrustIndicators() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 py-6 md:py-10">
      {indicators.map((item, index) => (
        <div
          key={index}
          className="flex flex-col items-center text-center p-2 md:p-4 rounded-xl bg-muted/50"
        >
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center mb-1.5 md:mb-2">
            <item.icon className="h-4 w-4 md:h-6 md:w-6 text-primary" />
          </div>
          <span className="text-sm md:text-lg font-semibold text-foreground">{item.label}</span>
          <span className="text-[10px] md:text-sm text-muted-foreground">{item.sublabel}</span>
        </div>
      ))}
    </div>
  );
}
