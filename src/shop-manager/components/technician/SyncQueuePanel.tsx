import React, { useState } from 'react';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Trash2, 
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ClipboardCheck,
  Timer
} from 'lucide-react';
import { 
  useTechnicianOfflineStorage, 
  type OfflineQueueItem,
  type OfflineDataType 
} from '@/hooks/useTechnicianOfflineStorage';
import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SyncQueuePanelProps {
  trigger?: React.ReactNode;
}

const typeConfig: Record<OfflineDataType, { icon: React.ComponentType<any>; label: string; color: string }> = {
  task_update: { icon: ClipboardCheck, label: 'Task Update', color: 'text-blue-500' },
  hazard_report: { icon: AlertTriangle, label: 'Hazard Report', color: 'text-red-500' },
  inspection: { icon: ClipboardCheck, label: 'Inspection', color: 'text-green-500' },
  time_entry: { icon: Timer, label: 'Time Entry', color: 'text-purple-500' },
  photo_capture: { icon: Clock, label: 'Photo', color: 'text-orange-500' }
};

export function SyncQueuePanel({ trigger }: SyncQueuePanelProps) {
  const [open, setOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  
  const {
    pendingItems,
    conflicts,
    syncStatus,
    lastSyncTime,
    pendingCount,
    conflictCount,
    syncAll,
    resolveConflict,
    removeItem,
    clearSyncedItems
  } = useTechnicianOfflineStorage();
  
  const { isOffline } = usePWA();

  const handleSync = async () => {
    await syncAll();
  };

  const handleDeleteItem = async () => {
    if (deleteItemId) {
      await removeItem(deleteItemId);
      setDeleteItemId(null);
    }
  };

  const renderQueueItem = (item: OfflineQueueItem) => {
    const config = typeConfig[item.type];
    const Icon = config.icon;
    const hasConflict = item.conflict && !item.conflict.resolvedBy;
    const hasError = item.error && item.syncAttempts >= 3;

    return (
      <Card key={item.id} className={cn(
        "mb-2",
        hasConflict && "border-orange-500",
        hasError && "border-red-500",
        item.synced && "opacity-50"
      )}>
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{config.label}</span>
                  {item.synced && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {hasConflict && (
                    <Badge variant="outline" className="text-orange-500 border-orange-500 text-xs">
                      Conflict
                    </Badge>
                  )}
                  {hasError && (
                    <Badge variant="outline" className="text-red-500 border-red-500 text-xs">
                      Failed
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                </p>
                {item.syncAttempts > 0 && !item.synced && (
                  <p className="text-xs text-muted-foreground">
                    Attempts: {item.syncAttempts}/3
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              {hasConflict && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => resolveConflict(item.id, 'local')}
                  >
                    Keep Mine
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    onClick={() => resolveConflict(item.id, 'server')}
                  >
                    Use Server
                  </Button>
                </div>
              )}
              
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setDeleteItemId(item.id)}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" size="icon" className="relative">
              {isOffline ? (
                <CloudOff className="h-5 w-5" />
              ) : (
                <Cloud className="h-5 w-5" />
              )}
              {pendingCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {pendingCount}
                </Badge>
              )}
            </Button>
          )}
        </SheetTrigger>

        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {isOffline ? (
                <>
                  <CloudOff className="h-5 w-5 text-orange-500" />
                  Offline Mode
                </>
              ) : (
                <>
                  <Cloud className="h-5 w-5 text-green-500" />
                  Sync Queue
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {pendingCount} pending · {conflictCount} conflicts
              {lastSyncTime && (
                <span className="block text-xs mt-1">
                  Last sync: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
                </span>
              )}
            </SheetDescription>
          </SheetHeader>

          {/* Status Banner */}
          {isOffline && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CloudOff className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  You're offline
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Changes are saved locally and will sync when you're back online.
              </p>
            </div>
          )}

          {/* Sync Button */}
          <div className="mt-4 flex gap-2">
            <Button 
              className="flex-1"
              onClick={handleSync}
              disabled={isOffline || syncStatus === 'syncing' || pendingCount === 0}
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={clearSyncedItems}
              disabled={syncStatus === 'syncing'}
            >
              Clear Synced
            </Button>
          </div>

          {/* Conflicts Section */}
          {conflictCount > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="font-medium text-sm">Conflicts ({conflictCount})</span>
              </div>
              {conflicts.map(renderQueueItem)}
            </div>
          )}

          {/* Queue List */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Pending Items ({pendingCount})</span>
            </div>
            <ScrollArea className="h-[calc(100vh-350px)]">
              {pendingItems.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-muted-foreground">All synced!</p>
                </div>
              ) : (
                pendingItems.map(renderQueueItem)
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Queue Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this item from the sync queue. 
              If it hasn't been synced, the data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
