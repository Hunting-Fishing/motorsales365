
import React, { useState } from 'react';
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { InventoryItemExtended, AutoReorderSettings } from "@/types/inventory";
import ReorderDialog from './ReorderDialog';
import AutoReorderDialog from './AutoReorderDialog';
import { getStatusColorClass } from '@/utils/inventory/inventoryCalculations';
import AutoReorderStatus from './AutoReorderStatus';

interface AlertItemRowProps {
  item: InventoryItemExtended;
  reorderItem: (itemId: string, quantity: number) => Promise<void>;
  enableAutoReorder: (itemId: string, threshold: number, quantity: number) => Promise<void>;
  autoReorderSettings: Record<string, AutoReorderSettings>;
}

const AlertItemRow: React.FC<AlertItemRowProps> = ({ 
  item, 
  reorderItem, 
  enableAutoReorder,
  autoReorderSettings 
}) => {
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [showAutoReorderDialog, setShowAutoReorderDialog] = useState(false);
  const status = item.quantity <= 0 ? "Out of Stock" : "Low Stock";
  
  const hasAutoReorder = autoReorderSettings && 
    autoReorderSettings[item.id] && 
    autoReorderSettings[item.id].enabled;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{item.name}</div>
        <div className="text-xs text-muted-foreground">{item.sku}</div>
      </TableCell>
      <TableCell>{item.quantity}</TableCell>
      <TableCell>{item.reorder_point}</TableCell>
      <TableCell>
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColorClass(status)}`}>
          {status}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {hasAutoReorder && <AutoReorderStatus settings={autoReorderSettings[item.id]} />}
          
          <Button 
            onClick={() => setShowReorderDialog(true)}
            variant="outline" 
            size="sm"
            className="text-xs"
          >
            Reorder
          </Button>
          
          {!hasAutoReorder && (
            <Button
              onClick={() => setShowAutoReorderDialog(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Auto-Reorder
            </Button>
          )}
        </div>
        
        <ReorderDialog
          open={showReorderDialog}
          onClose={() => setShowReorderDialog(false)}
          item={item}
          onReorder={reorderItem}
        />
        
        <AutoReorderDialog
          open={showAutoReorderDialog}
          onClose={() => setShowAutoReorderDialog(false)}
          item={item}
          currentSettings={autoReorderSettings[item.id]}
          onSave={(threshold, quantity) => enableAutoReorder(item.id, threshold, quantity)}
        />
      </TableCell>
    </TableRow>
  );
};

export default AlertItemRow;
