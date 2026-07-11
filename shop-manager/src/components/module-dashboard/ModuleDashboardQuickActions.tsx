import React from 'react';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  color?: string;
  borderColor?: string;
  hoverBg?: string;
}

interface ModuleDashboardQuickActionsProps {
  actions: QuickAction[];
}

export function ModuleDashboardQuickActions({ actions }: ModuleDashboardQuickActionsProps) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-4 mb-8">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="outline"
          className={`h-24 flex flex-col gap-2 ${action.borderColor || ''} ${action.hoverBg || ''}`}
          onClick={action.onClick}
        >
          <action.icon className={`h-6 w-6 ${action.color || ''}`} />
          <span className="text-xs">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
