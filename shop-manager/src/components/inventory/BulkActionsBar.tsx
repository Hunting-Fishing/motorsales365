import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useInventoryView } from '@/contexts/InventoryViewContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Edit3, 
  Archive, 
  CheckCircle,
  X,
  Download,
  Upload
} from 'lucide-react';
import { ConfirmationDialog } from './ConfirmationDialog';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  onBulkEdit: (itemIds: string[]) => void;
  onBulkDelete: (itemIds: string[]) => void;
  onBulkStatusChange: (itemIds: string[], status: string) => void;
  onExportSelected: (itemIds: string[]) => void;
}

export function BulkActionsBar({ 
  onBulkEdit, 
  onBulkDelete, 
  onBulkStatusChange,
  onExportSelected 
}: BulkActionsBarProps) {
  const { selectedItems, clearSelection } = useInventoryView();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const selectedCount = selectedItems.length;

  if (selectedCount === 0) return null;

  const handleBulkDelete = () => {
    onBulkDelete(selectedItems);
    clearSelection();
    setShowDeleteDialog(false);
    toast({
      title: "Items deleted",
      description: `Successfully deleted ${selectedCount} items`,
    });
  };

  const handleStatusChange = (status: string) => {
    onBulkStatusChange(selectedItems, status);
    clearSelection();
    toast({
      title: "Status updated",
      description: `Updated status for ${selectedCount} items`,
    });
  };

  const handleBulkEdit = () => {
    onBulkEdit(selectedItems);
    toast({
      title: "Bulk edit opened",
      description: `Editing ${selectedCount} items`,
    });
  };

  const handleExport = () => {
    onExportSelected(selectedItems);
    toast({
      title: "Export started",
      description: `Exporting ${selectedCount} items`,
    });
  };

  return (
    <>
      <div className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50",
        "bg-card border border-border rounded-lg shadow-lg",
        "p-4 flex items-center gap-3",
        "animate-slide-in-right"
      )}>
        <Badge variant="secondary" className="text-sm">
          {selectedCount} selected
        </Badge>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkEdit}
            className="gap-2"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('active')}
            className="gap-2 text-green-600 hover:text-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            Activate
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('inactive')}
            className="gap-2 text-yellow-600 hover:text-yellow-700"
          >
            <Archive className="h-4 w-4" />
            Archive
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete Items"
        description={`Are you sure you want to delete ${selectedCount} items? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        type="delete"
        itemCount={selectedCount}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}