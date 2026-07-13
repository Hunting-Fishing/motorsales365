import React from 'react';
import { CreditCard, Rocket, Calendar, HeartHandshake } from 'lucide-react';

const propositions = [
  { icon: CreditCard, text: 'No Credit Card Required' },
  { icon: Rocket, text: 'Setup in 5 Minutes' },
  { icon: Calendar, text: 'Free 14-Day Trial' },
  { icon: HeartHandshake, text: 'Cancel Anytime' },
];

export function ValuePropositions() {
  return (
    <div className="flex flex-wrap justify-center gap-2 md:gap-4 py-3 md:py-6">
      {propositions.map((prop) => (
        <div
          key={prop.text}
          className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-muted/60 border border-border"
        >
          <prop.icon className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-xs md:text-sm font-medium text-foreground whitespace-nowrap">
            {prop.text}
          </span>
        </div>
      ))}
    </div>
  );
}
