
import React from "react";
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
import { Textarea } from "@/components/ui/textarea";

interface FlagActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: any;
  flagReason: string;
  onFlagReasonChange: (reason: string) => void;
  onSubmit: () => void;
}

export function FlagActivityDialog({
  open,
  onOpenChange,
  activity,
  flagReason,
  onFlagReasonChange,
  onSubmit,
}: FlagActivityDialogProps) {
  if (!activity) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Flag Activity</AlertDialogTitle>
          <AlertDialogDescription>
            Flag this activity for review. Please provide a reason why this activity requires attention.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-4">
          <p className="text-sm font-medium mb-2">Activity:</p>
          <p className="text-sm border p-2 rounded-md bg-slate-50">
            {activity?.description}
          </p>
          
          <p className="text-sm font-medium mt-4 mb-2">Reason for flagging:</p>
          <Textarea
            value={flagReason}
            onChange={(e) => onFlagReasonChange(e.target.value)}
            placeholder="Explain why this activity requires review..."
            className="resize-none"
          />
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onSubmit}
            disabled={!flagReason.trim()}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            Flag Activity
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
