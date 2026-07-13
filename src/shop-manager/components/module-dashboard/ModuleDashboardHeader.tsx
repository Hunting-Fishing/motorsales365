import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface ActionButton {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'outline';
}

interface ModuleDashboardHeaderProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  actions?: ActionButton[];
}

export function ModuleDashboardHeader({
  icon: Icon,
  iconColor = 'text-primary',
  title,
  description,
  actions = [],
}: ModuleDashboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Icon className={`h-8 w-8 ${iconColor}`} />
            {title}
          </h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        {actions.length > 0 && (
          <div className="flex gap-3">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || (index === actions.length - 1 ? 'default' : 'outline')}
                onClick={action.onClick}
              >
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
