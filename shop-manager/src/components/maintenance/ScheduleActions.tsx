import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MoreVertical, Edit, Trash2, CheckCircle, History } from 'lucide-react';
import { VersionHistory } from './VersionHistory';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { recordMaintenanceActivity } from '@/services/maintenance/maintenanceActivityService';

interface ScheduleActionsProps {
  schedule: any;
  onEdit: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

export function ScheduleActions({ schedule, onEdit, onComplete, onDelete }: ScheduleActionsProps) {
  const { toast } = useToast();
  const { shopId } = useShopId();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showVersionHistory, setShowVersionHistory] = React.useState(false);

  const handleComplete = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('maintenance_schedules')
        .update({
          status: 'completed',
          last_maintenance_date: new Date().toISOString(),
        })
        .eq('id', schedule.id);

      if (error) throw error;

      // Record activity
      if (shopId) {
        await recordMaintenanceActivity(
          `Completed maintenance: ${schedule.title}`,
          shopId,
          user.user.id,
          user.user.user_metadata?.full_name || user.user.email || 'Unknown User',
          schedule.id,
          schedule.vehicle_id || schedule.equipment_id,
          {
            maintenance_type: schedule.maintenance_type,
            completed_date: new Date().toISOString(),
          }
        );
      }

      toast({
        title: 'Maintenance completed',
        description: 'Schedule has been marked as completed.',
      });

      onComplete();
    } catch (error) {
      console.error('Error completing schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark schedule as completed.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Record activity before deletion
      if (shopId) {
        await recordMaintenanceActivity(
          `Deleted maintenance schedule: ${schedule.title}`,
          shopId,
          user.user.id,
          user.user.user_metadata?.full_name || user.user.email || 'Unknown User',
          schedule.id,
          schedule.vehicle_id || schedule.equipment_id,
          {
            maintenance_type: schedule.maintenance_type,
            deleted_date: new Date().toISOString(),
          }
        );
      }

      const { error } = await supabase
        .from('maintenance_schedules')
        .delete()
        .eq('id', schedule.id);

      if (error) throw error;

      toast({
        title: 'Schedule deleted',
        description: 'Maintenance schedule has been deleted.',
      });

      onDelete();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
            <History className="h-4 w-4 mr-2" />
            Version History
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleComplete}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Complete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{schedule.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version History: {schedule.title}</DialogTitle>
          </DialogHeader>
          <VersionHistory 
            scheduleId={schedule.id} 
            onRestore={() => {
              setShowVersionHistory(false);
              onComplete();
            }} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
