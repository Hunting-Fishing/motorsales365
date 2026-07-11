import { toast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export class ToastManager {
  static success(title: string, description?: string) {
    toast({
      title,
      description,
      duration: 5000,
      className: 'border-green-200 bg-green-50 text-green-900',
      action: (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ),
    });
  }

  static error(title: string, description?: string) {
    toast({
      title,
      description,
      duration: 8000,
      variant: 'destructive',
      action: (
        <AlertCircle className="h-5 w-5 text-red-600" />
      ),
    });
  }

  static warning(title: string, description?: string) {
    toast({
      title,
      description,
      duration: 6000,
      className: 'border-yellow-200 bg-yellow-50 text-yellow-900',
      action: (
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
      ),
    });
  }

  static info(title: string, description?: string) {
    toast({
      title,
      description,
      duration: 5000,
      className: 'border-blue-200 bg-blue-50 text-blue-900',
      action: (
        <Info className="h-5 w-5 text-blue-600" />
      ),
    });
  }

  // Inventory-specific toast methods
  static itemAdded(itemName: string) {
    this.success('Item Added', `${itemName} has been successfully added to inventory.`);
  }

  static itemUpdated(itemName: string) {
    this.success('Item Updated', `${itemName} has been successfully updated.`);
  }

  static itemDeleted(itemName: string) {
    this.success('Item Deleted', `${itemName} has been removed from inventory.`);
  }

  static bulkActionCompleted(action: string, count: number, errors?: number) {
    if (errors && errors > 0) {
      this.warning(
        `${action} Completed with Warnings`,
        `${count} items processed, ${errors} error${errors !== 1 ? 's' : ''} occurred.`
      );
    } else {
      this.success(
        `${action} Completed`,
        `Successfully processed ${count} item${count !== 1 ? 's' : ''}.`
      );
    }
  }

  static lowStockAlert(itemName: string, quantity: number) {
    this.warning(
      'Low Stock Alert',
      `${itemName} is running low (${quantity} units remaining).`
    );
  }

  static reorderSuggestion(itemName: string) {
    this.info(
      'Reorder Suggestion',
      `Consider reordering ${itemName} to maintain optimal stock levels.`
    );
  }

  static importProgress(completed: number, total: number) {
    this.info(
      'Import in Progress',
      `Processing ${completed} of ${total} items...`
    );
  }

  static exportReady(filename: string) {
    this.success(
      'Export Ready',
      `${filename} has been generated and is ready for download.`
    );
  }
}