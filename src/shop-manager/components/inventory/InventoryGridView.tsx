import React, { useState } from 'react';
import { InventoryItemExtended } from '@/types/inventory';
import { InventoryCard } from './InventoryCard';
import { BulkActionsToolbar } from './BulkActionsToolbar';
import { useInventoryView } from '@/contexts/InventoryViewContext';
import { Button } from '@/components/ui/button';
import { CheckSquare, Square } from 'lucide-react';

interface InventoryGridViewProps {
  items: InventoryItemExtended[];
  onUpdateItem?: (id: string, updates: Partial<InventoryItemExtended>) => Promise<InventoryItemExtended>;
}

export function InventoryGridView({ items, onUpdateItem }: InventoryGridViewProps) {
  const { selectedItems, toggleItemSelection, clearSelection, setSelectedItems } = useInventoryView();
  const [showSelection, setShowSelection] = useState(false);

  const handleEdit = (item: InventoryItemExtended) => {
    console.log('Edit item:', item);
  };

  const handleDelete = (id: string) => {
    console.log('Delete item:', id);
  };

  const handleReorder = (id: string) => {
    console.log('Reorder item:', id);
  };

  const handleDuplicate = (item: InventoryItemExtended) => {
    console.log('Duplicate item:', item);
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      clearSelection();
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const isAllSelected = selectedItems.length === items.length && items.length > 0;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < items.length;

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSelection(!showSelection)}
            className={showSelection ? 'bg-primary/10 border-primary' : ''}
          >
            {showSelection ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
            {showSelection ? 'Exit Selection' : 'Select Items'}
          </Button>
          
          {showSelection && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              disabled={items.length === 0}
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
              {isPartiallySelected && ` (${selectedItems.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedItems.length}
        onClearSelection={clearSelection}
        onBulkEdit={() => console.log('Bulk edit')}
        onBulkDelete={() => console.log('Bulk delete')}
        onBulkExport={() => console.log('Bulk export')}
        onBulkReorder={() => console.log('Bulk reorder')}
        onBulkArchive={() => console.log('Bulk archive')}
        onBulkTag={() => console.log('Bulk tag')}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {items.map((item, index) => (
          <div 
            key={item.id} 
            className="animate-fade-in hover-scale"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <InventoryCard
              item={item}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReorder={handleReorder}
              onDuplicate={handleDuplicate}
              isSelected={selectedItems.includes(item.id)}
              onToggleSelect={toggleItemSelection}
              showSelection={showSelection}
              variant="default"
            />
          </div>
        ))}
      </div>
    </div>
  );
}