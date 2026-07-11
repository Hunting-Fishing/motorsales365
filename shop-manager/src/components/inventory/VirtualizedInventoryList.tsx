import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { InventoryItemExtended } from '@/types/inventory';
import { InventoryListItem } from './InventoryListItem';
import { Card } from '@/components/ui/card';

interface VirtualizedInventoryListProps {
  items: InventoryItemExtended[];
  onUpdateItem: (id: string, updates: Partial<InventoryItemExtended>) => Promise<InventoryItemExtended>;
  height?: number;
  itemHeight?: number;
}

interface ItemData {
  items: InventoryItemExtended[];
  onUpdateItem: (id: string, updates: Partial<InventoryItemExtended>) => Promise<InventoryItemExtended>;
}

const ListItemRenderer = React.memo(({ index, style, data }: { 
  index: number; 
  style: React.CSSProperties; 
  data: ItemData;
}) => {
  const { items, onUpdateItem } = data;
  const item = items[index];

  if (!item) return null;

  return (
    <div style={style} className="px-2 py-1">
      <InventoryListItem 
        item={item} 
        onUpdateItem={onUpdateItem}
      />
    </div>
  );
});

ListItemRenderer.displayName = 'ListItemRenderer';

export function VirtualizedInventoryList({ 
  items, 
  onUpdateItem, 
  height = 600,
  itemHeight = 120 
}: VirtualizedInventoryListProps) {
  const itemData = useMemo(() => ({
    items,
    onUpdateItem
  }), [items, onUpdateItem]);

  const getItemKey = useCallback((index: number) => {
    return items[index]?.id || index;
  }, [items]);

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No items to display</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <List
        height={height}
        width="100%"
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={itemData}
        itemKey={getItemKey}
        overscanCount={5}
        className="scrollbar-thin scrollbar-thumb-border scrollbar-track-background"
      >
        {ListItemRenderer}
      </List>
    </Card>
  );
}