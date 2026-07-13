import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Edit, 
  Download, 
  ShoppingCart, 
  Archive,
  Tag,
  X,
  CheckSquare
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkEdit?: () => void;
  onBulkDelete?: () => void;
  onBulkExport?: () => void;
  onBulkReorder?: () => void;
  onBulkArchive?: () => void;
  onBulkTag?: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkEdit,
  onBulkDelete,
  onBulkExport,
  onBulkReorder,
  onBulkArchive,
  onBulkTag
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg mb-6 animate-fade-in">
      <div className="flex items-center space-x-3">
        <CheckSquare className="h-5 w-5 text-primary" />
        <span className="font-medium text-primary">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {selectedCount}
        </Badge>
      </div>

      <div className="flex items-center space-x-2">
        {/* Quick Actions */}
        {onBulkEdit && (
          <Button variant="outline" size="sm" onClick={onBulkEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
        
        {onBulkExport && (
          <Button variant="outline" size="sm" onClick={onBulkExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}

        {/* More Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              More Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onBulkReorder && (
              <DropdownMenuItem onClick={onBulkReorder}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Bulk Reorder
              </DropdownMenuItem>
            )}
            {onBulkTag && (
              <DropdownMenuItem onClick={onBulkTag}>
                <Tag className="h-4 w-4 mr-2" />
                Add Tags
              </DropdownMenuItem>
            )}
            {onBulkArchive && (
              <DropdownMenuItem onClick={onBulkArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Items
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {onBulkDelete && (
              <DropdownMenuItem 
                onClick={onBulkDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear Selection */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClearSelection}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}