
import React from "react";
import { OptimizedInventoryTable } from "./OptimizedInventoryTable";
import { InfiniteScrollInventory } from "./InfiniteScrollInventory";
import { EmptyInventory } from "@sm/components/inventory/EmptyInventory";
import { InventoryContentSkeleton } from "./InventorySkeletons";
import { InventoryItemExtended } from "@sm/types/inventory";
import { useInventoryView } from "@sm/contexts/InventoryViewContext";
import { AdvancedFilterSidebar } from "./AdvancedFilterSidebar";
import { useOptimizedInventoryFilters } from "@sm/hooks/inventory/useOptimizedInventoryFilters";

interface InventoryContentProps {
  items: InventoryItemExtended[];
  onUpdateItem: (id: string, updates: Partial<InventoryItemExtended>) => Promise<InventoryItemExtended>;
  loading?: boolean;
}

export function InventoryContent({ items, onUpdateItem, loading = false }: InventoryContentProps) {
  const { viewMode, isFilterSidebarOpen, enableInfiniteScroll } = useInventoryView();
  const { filters } = useOptimizedInventoryFilters();

  const renderContent = () => {
    if (loading) {
      return <InventoryContentSkeleton />;
    }
    
    if (items.length === 0) {
      return <EmptyInventory />;
    }

    // Use infinite scroll for better performance with large datasets
    if (enableInfiniteScroll) {
      return (
        <div className="transition-all duration-300 ease-in-out animate-fade-in">
          <InfiniteScrollInventory 
            filters={filters}
            sortBy="created_at"
            sortOrder="desc"
            pageSize={50}
          />
        </div>
      );
    }

    // Fallback to original views for smaller datasets
    switch (viewMode) {
      case 'excel':
      case 'table':
      default:
        return (
          <div className="transition-all duration-300 ease-in-out animate-fade-in">
            <OptimizedInventoryTable items={items} />
          </div>
        );
    }
  };

  return (
    <div className="flex h-full">
      {isFilterSidebarOpen && (
        <div className="animate-slide-in-right">
          <AdvancedFilterSidebar />
        </div>
      )}
      <div className="flex-1 transition-all duration-300 ease-in-out">
        {renderContent()}
      </div>
    </div>
  );
}
