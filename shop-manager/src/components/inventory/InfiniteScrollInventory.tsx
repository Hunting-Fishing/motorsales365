import React, { useEffect, useRef, useCallback } from 'react';
import { VirtualizedInventoryList } from './VirtualizedInventoryList';
import { InventoryGridView } from './InventoryGridView';
import { InventoryListView } from './InventoryListView';
import { useInfiniteInventory } from '@/hooks/inventory/useInfiniteInventory';
import { useInventoryView } from '@/contexts/InventoryViewContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { InventoryItemExtended } from '@/types/inventory';
import { useOptimisticUpdates } from '@/hooks/inventory/useOptimisticUpdates';

interface InfiniteScrollInventoryProps {
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
}

export function InfiniteScrollInventory({
  filters = {},
  sortBy = 'created_at',
  sortOrder = 'desc',
  pageSize = 50
}: InfiniteScrollInventoryProps) {
  const { viewMode } = useInventoryView();
  const { optimisticUpdate } = useOptimisticUpdates();
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    items,
    totalCount,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteInventory({
    pageSize,
    filters,
    sortBy,
    sortOrder
  });

  // Intersection observer for infinite scroll
  const lastItemRef = useCallback((node: HTMLDivElement) => {
    if (isLoading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px'
    });
    
    if (node) observerRef.current.observe(node);
  }, [isLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleUpdateItem = useCallback(async (
    id: string, 
    updates: Partial<InventoryItemExtended>
  ) => {
    return optimisticUpdate(id, updates);
  }, [optimisticUpdate]);

  const renderContent = () => {
    if (isLoading && items.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading inventory...</span>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No items found</p>
        </div>
      );
    }

    const content = (() => {
      switch (viewMode) {
        case 'cards':
        case 'grid':
          return <InventoryGridView items={items} onUpdateItem={handleUpdateItem} />;
        case 'list':
          return <InventoryListView items={items} onUpdateItem={handleUpdateItem} />;
        case 'table':
        default:
          return (
            <VirtualizedInventoryList 
              items={items} 
              onUpdateItem={handleUpdateItem}
              height={600}
              itemHeight={120}
            />
          );
      }
    })();

    return (
      <div className="space-y-4">
        {content}
        
        {/* Infinite scroll trigger */}
        <div ref={lastItemRef} className="h-4" />
        
        {/* Load more indicator */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading more items...</span>
          </div>
        )}
        
        {/* Manual load more button (fallback) */}
        {hasNextPage && !isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Button 
              variant="outline" 
              onClick={() => fetchNextPage()}
              className="hover:bg-primary/10"
            >
              Load More Items
            </Button>
          </div>
        )}
        
        {/* End indicator */}
        {!hasNextPage && items.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Showing all {totalCount} items
            </p>
          </div>
        )}
      </div>
    );
  };

  return renderContent();
}