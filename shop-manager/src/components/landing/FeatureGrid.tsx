import React from 'react';
import { Users, ClipboardList, Calendar, CreditCard, UsersRound, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Customer Management',
    description: 'Track customer info, history, and preferences in one place'
  },
  {
    icon: ClipboardList,
    title: 'Work Order Tracking',
    description: 'Create, assign, and monitor jobs from start to finish'
  },
  {
    icon: Calendar,
    title: 'Scheduling',
    description: 'Book appointments and manage your team calendar'
  },
  {
    icon: CreditCard,
    title: 'Invoicing & Payments',
    description: 'Generate invoices and accept payments seamlessly'
  },
  {
    icon: UsersRound,
    title: 'Team Management',
    description: 'Assign roles, track hours, and manage permissions'
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reports',
    description: 'Gain insights with real-time dashboards and reports'
  }
];

export function FeatureGrid() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Run Your Business
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful features that work across all modules
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-4 p-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
