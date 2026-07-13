import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, XCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { DeficiencyDialog } from './DeficiencyDialog';

export type GYRStatus = 1 | 2 | 3; // 1=Red, 2=Yellow, 3=Green

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  fileName: string;
}

export interface DeficiencyData {
  reason: string;
  mediaItems: MediaItem[];
}

interface GYRSelectorWithDeficiencyProps {
  value: GYRStatus;
  onChange: (value: GYRStatus, deficiencyData?: DeficiencyData) => void;
  disabled?: boolean;
  itemName: string;
  deficiencyData?: DeficiencyData;
}

export function GYRSelectorWithDeficiency({ 
  value, 
  onChange, 
  disabled,
  itemName,
  deficiencyData,
}: GYRSelectorWithDeficiencyProps) {
  const [pendingStatus, setPendingStatus] = useState<1 | 2 | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleStatusClick = (newStatus: GYRStatus) => {
    if (disabled) return;

    if (newStatus === 3) {
      // Green - clear any deficiency and set status directly
      onChange(3, undefined);
    } else {
      // Yellow (2) or Red (1) - open dialog for reason/media
      setPendingStatus(newStatus);
      setDialogOpen(true);
    }
  };

  const handleDeficiencySave = (data: DeficiencyData) => {
    if (pendingStatus) {
      onChange(pendingStatus, data);
      setDialogOpen(false);
      setPendingStatus(null);
    }
  };

  const handleDialogCancel = () => {
    setDialogOpen(false);
    setPendingStatus(null);
  };

  const hasDeficiencyData = deficiencyData && (deficiencyData.reason || deficiencyData.mediaItems.length > 0);

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {/* Green/OK Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleStatusClick(3)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
              "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
              value === 3
                ? "bg-green-500 text-white border-green-600 shadow-md"
                : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>OK</span>
          </button>
          
          {/* Yellow/Attention Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleStatusClick(2)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
              "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
              value === 2
                ? "bg-yellow-500 text-white border-yellow-600 shadow-md"
                : "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 dark:hover:bg-yellow-900",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Attention</span>
          </button>
          
          {/* Red/Urgent Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleStatusClick(1)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all",
              "border-2 focus:outline-none focus:ring-2 focus:ring-offset-2",
              value === 1
                ? "bg-red-500 text-white border-red-600 shadow-md"
                : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <XCircle className="h-4 w-4" />
            <span>Urgent</span>
          </button>
        </div>

        {/* Deficiency indicator */}
        {value !== 3 && hasDeficiencyData && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span className="truncate max-w-[200px]">{deficiencyData.reason}</span>
            {deficiencyData.mediaItems.length > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {deficiencyData.mediaItems.length}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setPendingStatus(value as 1 | 2);
                setDialogOpen(true);
              }}
              className="text-primary hover:underline ml-1"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Deficiency Dialog */}
      {pendingStatus && (
        <DeficiencyDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          itemName={itemName}
          status={pendingStatus}
          initialData={deficiencyData}
          onSave={handleDeficiencySave}
          onCancel={handleDialogCancel}
        />
      )}
    </>
  );
}
