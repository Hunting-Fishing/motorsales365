
import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Clipboard, Clock } from 'lucide-react';
import { WorkOrderTemplate } from '@/types/workOrder';

interface WorkOrderTemplateItemProps {
  template: WorkOrderTemplate;
  onApply: (template: WorkOrderTemplate) => void;
}

export function WorkOrderTemplateItem({ template, onApply }: WorkOrderTemplateItemProps) {
  return (
    <Card className="hover:border-blue-300 transition-all">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium">{template.name}</h3>
          <div className="text-xs text-muted-foreground">
            {template.last_used && (
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Last used: {format(new Date(template.last_used), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">
          {template.description || 'No description'}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="text-xs bg-gray-100 rounded-full px-2 py-1">
            {template.status}
          </span>
          {template.priority && (
            <span className="text-xs bg-gray-100 rounded-full px-2 py-1">
              {template.priority} priority
            </span>
          )}
          {template.technician && (
            <span className="text-xs bg-gray-100 rounded-full px-2 py-1">
              Tech: {template.technician}
            </span>
          )}
          {template.inventory_items && template.inventory_items.length > 0 && (
            <span className="text-xs bg-gray-100 rounded-full px-2 py-1">
              {template.inventory_items.length} items
            </span>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="bg-gray-50 p-3 flex justify-end">
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onApply(template)}
        >
          <Clipboard className="h-3 w-3 mr-1" />
          Apply Template
        </Button>
      </CardFooter>
    </Card>
  );
}
