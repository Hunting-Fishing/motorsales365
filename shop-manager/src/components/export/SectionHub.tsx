import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NavItem } from './exportNavData';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SectionHubProps {
  title: string;
  description?: string;
  items: NavItem[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export function SectionHub({ title, description, items, icon: Icon, color }: SectionHubProps) {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 text-muted-foreground hover:text-foreground gap-2"
          onClick={() => navigate('/export')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-xl bg-gradient-to-br shadow-lg', color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <button
            key={item.href}
            onClick={() => navigate(item.href)}
            className={cn(
              'group relative flex flex-col items-start gap-3 p-5 rounded-xl border border-border',
              'bg-card hover:bg-accent/50 transition-all duration-200',
              'hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5',
              'text-left'
            )}
          >
            <div className={cn('p-2.5 rounded-lg bg-gradient-to-br shadow-sm', item.color)}>
              <item.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
