
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { InventoryPageHeader } from '@/components/inventory/InventoryPageHeader';
import { InventoryContent } from '@/components/inventory/InventoryContent';
import { QuickActionsFloatingButton } from '@/components/inventory/QuickActionsFloatingButton';
import { EnhancedNavigation } from '@/components/inventory/EnhancedNavigation';
import { PerformanceIndicator } from '@/components/inventory/PerformanceOptimizations';
import { useOptimizedInventoryItems } from '@/hooks/inventory/useOptimizedInventoryItems';
import { useOptimizedInventoryFilters } from '@/hooks/inventory/useOptimizedInventoryFilters';
import { useMemoryOptimization } from '@/hooks/inventory/useMemoryOptimization';
import { InventoryLoadingState } from '@/components/inventory/InventoryLoadingState';
import { InventoryErrorState } from '@/components/inventory/InventoryErrorState';
import { InventoryViewProvider } from '@/contexts/InventoryViewContext';
import { ErrorBoundary } from '@/components/inventory/ErrorBoundary';
import { QueryOptimizer } from '@/components/inventory/QueryOptimizer';
import { BulkActionsBar } from '@/components/inventory/BulkActionsBar';
import { ImportExportDialog } from '@/components/inventory/ImportExportDialog';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { supabase } from '@/integrations/supabase/client';
import InventoryAdd from '@/pages/InventoryAdd';
import InventoryEdit from '@/pages/InventoryEdit';
import InventoryCategories from '@/pages/InventoryCategories';
import InventorySuppliers from '@/pages/InventorySuppliers';
import InventoryLocations from '@/pages/InventoryLocations';
import InventoryOrders from '@/pages/InventoryOrders';
import InventoryManager from '@/pages/InventoryManager';
import InventoryManagerNew from '@/pages/InventoryManagerNew';
import InventoryItemDetailsPage from '@/pages/InventoryItemDetails';
import InvoiceScan from '@/pages/InvoiceScan';

/**
 * IMPORTANT: This page uses optimized inventory functionality with centralized data management
 * Performance optimizations: consolidated data fetching, memoization, efficient caching
 * Includes: inventory list, creation, categories, suppliers, locations, etc.
 */
export default function Inventory() {
  const { items, loading, error, updateItem, inventoryStats, refetch } = useOptimizedInventoryItems();
  const { filteredItems } = useOptimizedInventoryFilters();
  const { toast } = useToast();
  const { shopId } = useShopId();
  
  // Initialize memory optimization for better performance
  useMemoryOptimization({
    maxCacheSize: 50,
    gcInterval: 3 * 60 * 1000, // 3 minutes
    enablePerformanceMonitoring: true
  });
  
  // Dialog states
  const [importExportOpen, setImportExportOpen] = React.useState(false);

  // Use filtered items for display logic
  const displayItems = filteredItems;

  // Bulk actions handlers
  const handleBulkEdit = (itemIds: string[]) => {
    console.log('Bulk edit for items:', itemIds);
    toast({
      title: "Bulk edit",
      description: `Opening bulk edit for ${itemIds.length} items`,
    });
  };

  const handleBulkDelete = async (itemIds: string[]) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .in('id', itemIds);
      
      if (error) throw error;
      
      toast({
        title: "Items deleted",
        description: `Successfully deleted ${itemIds.length} items`,
      });
      refetch();
    } catch (error) {
      console.error('Error deleting items:', error);
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive",
      });
    }
  };

  const handleBulkStatusChange = async (itemIds: string[], status: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ status })
        .in('id', itemIds);
      
      if (error) throw error;
      
      toast({
        title: "Status updated",
        description: `Updated status for ${itemIds.length} items to ${status}`,
      });
      refetch();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleExportSelected = async (itemIds: string[]) => {
    const selectedItems = items?.filter(item => itemIds.includes(item.id)) || [];
    if (selectedItems.length === 0) return;
    
    const csvContent = [
      ['Name', 'SKU', 'Category', 'Price', 'Quantity', 'Status'].join(','),
      ...selectedItems.map(item => [
        `"${item.name || ''}"`,
        `"${item.sku || ''}"`,
        `"${item.category || ''}"`,
        item.unit_price || 0,
        item.quantity || 0,
        `"${item.status || ''}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export complete",
      description: `Exported ${selectedItems.length} items`,
    });
  };

  // Import/Export handlers
  const handleImport = async (file: File, options: any) => {
    // Real import would parse CSV and insert into database
    toast({
      title: "Import started",
      description: "Processing file...",
    });
    
    try {
      const text = await file.text();
      const lines = text.split('\n').slice(1); // Skip header
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          const [name, sku, category, price, quantity] = line.split(',').map(s => s.replace(/"/g, '').trim());
          
          if (!name || !sku) {
            errors.push(`Row ${i + 2}: Missing name or SKU`);
            failed++;
            continue;
          }
          
          const { error } = await supabase.from('inventory_items').insert({
            name,
            sku,
            category: category || 'General',
            unit_price: parseFloat(price) || 0,
            quantity: parseInt(quantity) || 0,
            shop_id: shopId,
            supplier: 'Import',
            status: 'in_stock',
            reorder_point: 0
          });
          
          if (error) throw error;
          imported++;
        } catch {
          errors.push(`Row ${i + 2}: Import failed`);
          failed++;
        }
      }
      
      refetch();
      return { success: true, imported, failed, errors };
    } catch (error) {
      return { success: false, imported: 0, failed: 1, errors: ['File parsing failed'] };
    }
  };

  const handleExport = async (options: any) => {
    const exportItems = items || [];
    
    const csvContent = [
      ['Name', 'SKU', 'Category', 'Price', 'Quantity', 'Status', 'Reorder Point'].join(','),
      ...exportItems.map(item => [
        `"${item.name || ''}"`,
        `"${item.sku || ''}"`,
        `"${item.category || ''}"`,
        item.unit_price || 0,
        item.quantity || 0,
        `"${item.status || ''}"`,
        item.reorder_point || 0
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.${options.format || 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleQuickReorder = () => {
    console.log('Quick reorder triggered');
  };

  const handleBulkImport = () => {
    setImportExportOpen(true);
  };

  const handleGenerateReport = () => {
    console.log('Generate report triggered');
  };

  const handleScanBarcode = () => {
    console.log('Scan barcode triggered');
  };

  return (
    <ErrorBoundary>
      <InventoryViewProvider>
        <div className="relative">
          <Routes>
            <Route path="/" element={
              <div className="p-6 space-y-6">
                <EnhancedNavigation />
                <InventoryPageHeader />
                {loading ? (
                  <InventoryLoadingState />
                ) : error ? (
                  <InventoryErrorState error={error} onRetry={refetch} />
                ) : (
                  <InventoryContent items={displayItems} onUpdateItem={updateItem} loading={loading} />
                )}
              </div>
            } />
            <Route path="/add" element={<InventoryAdd />} />
            <Route path="/edit/:id" element={<InventoryEdit />} />
            <Route path="/categories" element={<InventoryCategories />} />
            <Route path="/suppliers" element={<InventorySuppliers />} />
            <Route path="/locations" element={<InventoryLocations />} />
            <Route path="/orders" element={<InventoryOrders />} />
            <Route path="/manager" element={<InventoryManagerNew />} />
            <Route path="/scan" element={<InvoiceScan />} />
            <Route path="/item/:id" element={<InventoryItemDetailsPage />} />
          </Routes>

          {/* Quick Actions Floating Button - Only on main inventory page */}
          <Routes>
            <Route path="/" element={
              <QuickActionsFloatingButton
                stats={inventoryStats}
                onQuickReorder={handleQuickReorder}
                onBulkImport={handleBulkImport}
                onGenerateReport={handleGenerateReport}
                onScanBarcode={handleScanBarcode}
              />
            } />
          </Routes>

          {/* Bulk Actions Bar */}
          <BulkActionsBar
            onBulkEdit={handleBulkEdit}
            onBulkDelete={handleBulkDelete}
            onBulkStatusChange={handleBulkStatusChange}
            onExportSelected={handleExportSelected}
          />

          {/* Import/Export Dialog */}
          <ImportExportDialog
            isOpen={importExportOpen}
            onClose={() => setImportExportOpen(false)}
            onImport={handleImport}
            onExport={handleExport}
          />

          {/* Performance Monitor - Development Only */}
          <PerformanceIndicator />
          <QueryOptimizer />
        </div>
      </InventoryViewProvider>
    </ErrorBoundary>
  );
}
