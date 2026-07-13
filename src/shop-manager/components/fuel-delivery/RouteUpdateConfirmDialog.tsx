import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Minus, Route } from 'lucide-react';
import { RouteUpdateSummary, formatDeliveryDays } from '@/services/fuelDelivery/RouteScheduleService';
import { format } from 'date-fns';

interface RouteUpdateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onSkip: () => void;
  summary: RouteUpdateSummary | null;
  newDeliveryDays: number[];
  entityName: string; // e.g., "Jordi Bailey" or "Main Farm Tank"
  entityType: 'customer' | 'location';
  isProcessing?: boolean;
}

export function RouteUpdateConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onSkip,
  summary,
  newDeliveryDays,
  entityName,
  entityType,
  isProcessing = false
}: RouteUpdateConfirmDialogProps) {
  if (!summary) return null;

  const hasChanges = summary.stopsToCreate > 0 || summary.stopsToRemove > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-orange-500" />
            Update Future Routes?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You changed the delivery schedule for <strong>{entityName}</strong> to{' '}
                <Badge variant="outline" className="font-mono">
                  {formatDeliveryDays(newDeliveryDays) || 'No days selected'}
                </Badge>
              </p>

              {hasChanges ? (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Route Changes:</p>
                  
                  {summary.stopsToCreate > 0 && (
                    <div className="flex items-start gap-2">
                      <Plus className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-foreground">
                          Add to {summary.stopsToCreate} route{summary.stopsToCreate > 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {summary.routesToAddTo.slice(0, 5).map(route => (
                            <Badge key={route.id} variant="secondary" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(route.route_date), 'MMM d')}
                            </Badge>
                          ))}
                          {summary.routesToAddTo.length > 5 && (
                            <Badge variant="secondary" className="text-xs">
                              +{summary.routesToAddTo.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {summary.stopsToRemove > 0 && (
                    <div className="flex items-start gap-2">
                      <Minus className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm text-foreground">
                          Remove from {summary.stopsToRemove} route{summary.stopsToRemove > 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {summary.routesToRemoveFrom.slice(0, 5).map(route => (
                            <Badge key={route.id} variant="outline" className="text-xs">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(route.route_date), 'MMM d')}
                            </Badge>
                          ))}
                          {summary.routesToRemoveFrom.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{summary.routesToRemoveFrom.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    No planned future routes will be affected by this change.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onSkip} disabled={isProcessing}>
            Keep Routes As-Is
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isProcessing || !hasChanges}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isProcessing ? 'Updating...' : 'Update Routes'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
