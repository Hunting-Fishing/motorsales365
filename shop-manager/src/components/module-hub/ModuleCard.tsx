import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModuleRouteConfig } from '@/config/moduleRoutes';

interface ModuleCardProps {
  module: ModuleRouteConfig;
  hasAccess: boolean;
  isSubscribed: boolean;
  onViewPlans?: () => void;
}

export function ModuleCard({ 
  module, 
  hasAccess, 
  isSubscribed, 
  onViewPlans,
}: ModuleCardProps) {
  const navigate = useNavigate();
  const IconComponent = module.icon;

  const handleEnter = () => {
    if (hasAccess) {
      navigate(module.dashboardRoute);
    }
  };

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-md",
        hasAccess 
          ? "cursor-pointer hover:-translate-y-0.5" 
          : "opacity-75"
      )}
      onClick={hasAccess ? handleEnter : undefined}
    >
      {/* Gradient accent bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r",
        module.gradientFrom,
        module.gradientTo
      )} />

      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={cn(
            "w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center bg-gradient-to-br shadow-sm",
            module.gradientFrom,
            module.gradientTo
          )}>
            <IconComponent className="w-4 h-4 text-white" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground break-words leading-tight">
                {module.name}
              </h3>
              {hasAccess ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5 py-0">
                  <Check className="w-2.5 h-2.5 mr-0.5" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-[10px] px-1.5 py-0">
                  <Lock className="w-2.5 h-2.5 mr-0.5" />
                  Locked
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {module.description}
            </p>
          </div>
        </div>

        {/* Action */}
        <div className="mt-2">
          {hasAccess ? (
            <Button 
              size="sm"
              className={cn(
                "w-full h-7 text-xs bg-gradient-to-r",
                module.gradientFrom,
                module.gradientTo,
                "hover:opacity-90 transition-opacity"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleEnter();
              }}
            >
              Enter
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              className="w-full h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onViewPlans?.();
              }}
            >
              View Plans
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
