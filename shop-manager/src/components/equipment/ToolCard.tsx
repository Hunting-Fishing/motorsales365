import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ClipboardList, Wrench, Calendar } from 'lucide-react';
import { ToolWarrantyBadge, getWarrantyDaysRemaining } from './ToolWarrantyBadge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ToolCardProps {
  tool: any;
  onEdit: (tool: any) => void;
  onDelete: () => void;
  onCheckout?: (tool: any) => void;
  onMaintenance?: (tool: any) => void;
}

export function ToolCard({ tool, onEdit, onDelete, onCheckout, onMaintenance }: ToolCardProps) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('tools').delete().eq('id', tool.id);
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Tool deleted successfully',
      });
      onDelete();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'in_use': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'maintenance': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      case 'retired': return 'bg-gray-500/10 text-gray-700 border-gray-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'good': return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'fair': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'poor': return 'bg-red-500/10 text-red-700 border-red-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{tool.name}</h3>
            {tool.category && (
              <p className="text-sm text-muted-foreground">{tool.category}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge className={getStatusColor(tool.status)}>
              {tool.status?.replace('_', ' ')}
            </Badge>
            {tool.condition && (
              <Badge className={getConditionColor(tool.condition)} variant="outline">
                {tool.condition}
              </Badge>
            )}
            <ToolWarrantyBadge warrantyExpiry={tool.warranty_expiry} />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {tool.serial_number && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serial:</span>
              <span className="font-mono">{tool.serial_number}</span>
            </div>
          )}
          {tool.location && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Location:</span>
              <span>{tool.location}</span>
            </div>
          )}
          {tool.warranty_expiry && (() => {
            const daysRemaining = getWarrantyDaysRemaining(tool.warranty_expiry);
            if (daysRemaining !== null) {
              return (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Warranty:
                  </span>
                  <span className={daysRemaining < 0 ? 'text-red-600' : daysRemaining <= 30 ? 'text-yellow-600 font-semibold' : ''}>
                    {daysRemaining < 0 
                      ? `Expired ${Math.abs(daysRemaining)} days ago`
                      : `${daysRemaining} days remaining`
                    }
                  </span>
                </div>
              );
            }
            return null;
          })()}
          {tool.purchase_price && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Value:</span>
              <span className="font-semibold">${tool.purchase_price.toLocaleString()}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-4 border-t">
        <Button variant="outline" size="sm" onClick={() => onEdit(tool)} className="flex-1">
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        {tool.status === 'available' && onCheckout && (
          <Button variant="outline" size="sm" onClick={() => onCheckout(tool)}>
            <ClipboardList className="h-4 w-4 mr-1" />
            Checkout
          </Button>
        )}
        {onMaintenance && (
          <Button variant="outline" size="sm" onClick={() => onMaintenance(tool)}>
            <Wrench className="h-4 w-4 mr-1" />
            Maintain
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Tool</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{tool.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
