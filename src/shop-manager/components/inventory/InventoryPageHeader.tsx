import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ViewModeToggle } from './ViewModeToggle';
import { InventoryStatsCards } from './InventoryStatsCards';
import { SmartInsightsPanel } from './SmartInsightsPanel';
import { ResponsiveBreakpointIndicator } from './ResponsiveBreakpointIndicator';
import { useInventoryView } from '@/contexts/InventoryViewContext';
import { useOptimizedInventoryItems } from '@/hooks/inventory/useOptimizedInventoryItems';
import { useOptimizedInventoryFilters } from '@/hooks/inventory/useOptimizedInventoryFilters';
import { AdvancedSearchInput } from './AdvancedSearchInput';
import { FilterPresetsManager } from './FilterPresetsManager';

export function InventoryPageHeader() {
  const navigate = useNavigate();
  const { viewMode, setViewMode, isFilterSidebarOpen, toggleFilterSidebar } = useInventoryView();
  const { inventoryStats } = useOptimizedInventoryItems();
  const { filteredItems, updateSearch, filters } = useOptimizedInventoryFilters();
  const [showInsights, setShowInsights] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Responsive Controls */}
      <ResponsiveBreakpointIndicator 
        currentViewMode={viewMode}
        onViewModeChange={setViewMode}
        isFilterOpen={isFilterSidebarOpen}
        onToggleFilter={toggleFilterSidebar}
      />

      {/* Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your inventory items, track stock levels, and monitor performance
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowInsights(!showInsights)}
            className="order-3 sm:order-1"
          >
            {showInsights ? 'Hide' : 'Show'} Insights
          </Button>

          <div className="flex gap-2 order-1 sm:order-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>

          <Button 
            onClick={() => navigate('/inventory/add')}
            className="order-2 sm:order-3"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <InventoryStatsCards 
        stats={inventoryStats}
        onLowStockClick={() => console.log('Filter to low stock')}
        onOutOfStockClick={() => console.log('Filter to out of stock')}
      />

      {/* Smart Insights Panel */}
      {showInsights && (
        <div className="animate-fade-in">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Smart Insights</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered insights and recommendations for your inventory
            </p>
          </div>
          <SmartInsightsPanel 
            items={filteredItems} 
            stats={inventoryStats}
          />
        </div>
      )}

      {/* Search and Filter Bar - Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <AdvancedSearchInput className="max-w-md" />
          <FilterPresetsManager 
            currentFilters={filters}
            onApplyPreset={(preset) => {
              updateSearch(preset.filters.search);
              // Apply other filters...
            }}
          />
          <Button
            variant={isFilterSidebarOpen ? "default" : "outline"}
            onClick={toggleFilterSidebar}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced
          </Button>
        </div>
        
        <ViewModeToggle />
      </div>
    </div>
  );
}