import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Car, 
  Zap, 
  Settings, 
  Droplets, 
  Shield,
  Plus,
  Clock
} from 'lucide-react';

interface QuickActionTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  estimatedTime: string;
  basePrice: number;
  color: string;
}

interface WorkOrderQuickActionsProps {
  onCreateFromTemplate: (template: QuickActionTemplate) => void;
}

export function WorkOrderQuickActions({ onCreateFromTemplate }: WorkOrderQuickActionsProps) {
  const quickTemplates: QuickActionTemplate[] = [
    {
      id: 'oil-change',
      title: 'Oil Change',
      description: 'Standard oil and filter replacement',
      icon: Droplets,
      category: 'Maintenance',
      estimatedTime: '30 min',
      basePrice: 45,
      color: 'bg-blue-500'
    },
    {
      id: 'brake-inspection',
      title: 'Brake Inspection',
      description: 'Complete brake system check',
      icon: Shield,
      category: 'Safety',
      estimatedTime: '45 min',
      basePrice: 75,
      color: 'bg-red-500'
    },
    {
      id: 'tire-rotation',
      title: 'Tire Rotation',
      description: 'Rotate and balance all tires',
      icon: Car,
      category: 'Maintenance',
      estimatedTime: '60 min',
      basePrice: 60,
      color: 'bg-green-500'
    },
    {
      id: 'diagnostic',
      title: 'Diagnostic Scan',
      description: 'Computer diagnostic and troubleshooting',
      icon: Zap,
      category: 'Diagnostic',
      estimatedTime: '90 min',
      basePrice: 120,
      color: 'bg-yellow-500'
    },
    {
      id: 'tune-up',
      title: 'Engine Tune-up',
      description: 'Complete engine maintenance service',
      icon: Settings,
      category: 'Maintenance',
      estimatedTime: '120 min',
      basePrice: 200,
      color: 'bg-purple-500'
    },
    {
      id: 'general-repair',
      title: 'General Repair',
      description: 'Custom repair work order',
      icon: Wrench,
      category: 'Repair',
      estimatedTime: 'Variable',
      basePrice: 0,
      color: 'bg-gray-500'
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Maintenance': return 'bg-blue-100 text-blue-700';
      case 'Safety': return 'bg-red-100 text-red-700';
      case 'Diagnostic': return 'bg-yellow-100 text-yellow-700';
      case 'Repair': return 'bg-gray-100 text-gray-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickTemplates.map((template) => {
            const IconComponent = template.icon;
            return (
              <Card 
                key={template.id} 
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-2 hover:border-primary/20"
                onClick={() => onCreateFromTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${template.color} bg-opacity-10`}>
                      <IconComponent className={`w-5 h-5 ${template.color.replace('bg-', 'text-')}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 truncate">
                        {template.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className={`text-xs ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </Badge>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {template.estimatedTime}
                        </div>
                      </div>
                      
                      {template.basePrice > 0 && (
                        <div className="mt-2 text-sm font-semibold text-success">
                          Starting at ${template.basePrice}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}