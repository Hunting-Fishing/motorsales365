import React from 'react';
import { CalendarDays, ClipboardList, ReceiptText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const highlights = [
  {
    icon: ClipboardList,
    title: 'Run work orders end-to-end',
    description: 'Create jobs, assign staff, track status, and keep history organized.',
  },
  {
    icon: CalendarDays,
    title: 'Schedule without the chaos',
    description: 'Book appointments, manage availability, and reduce no-shows.',
  },
  {
    icon: ReceiptText,
    title: 'Invoice & get paid faster',
    description: 'Send invoices, track balances, and keep cash flow visible.',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-10 md:py-16">
      <div className="text-center mb-6 md:mb-10">
        <h3 className="text-xl md:text-3xl font-bold mb-2">Built for Real Operations</h3>
        <p className="text-muted-foreground text-sm md:text-base">
          Everything you need to run a service business—without juggling tools.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {highlights.map((item) => (
          <Card key={item.title} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-semibold mb-1">{item.title}</h4>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
