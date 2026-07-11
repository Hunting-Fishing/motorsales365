import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getScheduleVersions, restoreScheduleVersion } from '@/services/maintenance/versionService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { History, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
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
} from '@/components/ui/alert-dialog';

interface VersionHistoryProps {
  scheduleId: string;
  onRestore?: () => void;
}

export function VersionHistory({ scheduleId, onRestore }: VersionHistoryProps) {
  const { toast } = useToast();
  const { shopId } = useShopId();
  const [restoreVersionId, setRestoreVersionId] = React.useState<string | null>(null);

  const { data: versions, isLoading, refetch } = useQuery({
    queryKey: ['schedule-versions', scheduleId],
    queryFn: () => getScheduleVersions(scheduleId),
    enabled: !!scheduleId,
  });

  const handleRestore = async () => {
    if (!restoreVersionId || !shopId) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const success = await restoreScheduleVersion(
      scheduleId,
      restoreVersionId,
      user.user.id,
      user.user.user_metadata?.full_name || user.user.email || 'Unknown User',
      shopId
    );

    if (success) {
      toast({
        title: 'Version restored',
        description: 'Schedule has been restored to the selected version.',
      });
      refetch();
      onRestore?.();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to restore version.',
        variant: 'destructive',
      });
    }

    setRestoreVersionId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <History className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No version history available
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {versions.map((version, index) => (
          <Card key={version.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={index === 0 ? 'default' : 'secondary'}>
                      Version {version.version_number}
                    </Badge>
                    {index === 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    Changed by: {version.changed_by_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(version.created_at), 'MMM dd, yyyy • h:mm a')}
                  </p>
                  {version.change_reason && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Reason: {version.change_reason}
                    </p>
                  )}
                </div>
                {index !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRestoreVersionId(version.id)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!restoreVersionId} onOpenChange={() => setRestoreVersionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this version? The current version will be saved before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>
              Restore Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
