
import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { clearAllInventoryItems } from '@/services/inventory/crudService';
import { toast } from 'sonner';
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
} from "@/components/ui/alert-dialog";

interface ClearInventoryButtonProps {
  onCleared?: () => void;
}

export function ClearInventoryButton({ onCleared }: ClearInventoryButtonProps) {
  const handleClearInventory = async () => {
    try {
      await clearAllInventoryItems();
      toast.success('All inventory items have been cleared from the database');
      onCleared?.();
    } catch (error) {
      console.error('Error clearing inventory:', error);
      toast.error('Failed to clear inventory items');
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear All Inventory Data</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete ALL inventory items from your database. 
            This action cannot be undone. Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClearInventory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Clear All Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
