
import { useState, useEffect, useCallback } from "react";
import { InventoryItemExtended } from "@/types/inventory";
import { getInventoryItems } from "@/services/inventory/crudService";
import { calculateTotalValue, countLowStockItems, countOutOfStockItems } from "@/services/inventory/utils";
import { exportToCSV } from "@/utils/export";
import { toast } from "sonner";

interface UseInventoryProps {
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  supplierFilter: string;
  locationFilter: string;
}

export const useInventory = ({
  searchQuery,
  categoryFilter,
  statusFilter,
  supplierFilter,
  locationFilter,
}: UseInventoryProps) => {
  const [items, setItems] = useState<InventoryItemExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Fetch only real inventory data from database
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      console.log('Fetching real inventory data from database...');
      const data = await getInventoryItems();
      console.log(`Fetched ${data.length} real inventory items from database`);
      
      // Ensure we only show items that exist in the database
      if (data.length === 0) {
        console.log('No real inventory items found in database');
        setItems([]);
      } else {
        setItems(data);
      }
    } catch (err) {
      console.error("Error fetching real inventory data:", err);
      setError("Failed to load inventory items from database");
      setItems([]); // Clear any existing data on error
      toast.error("Failed to load inventory items from database");
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load real inventory data on component mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  
  // Get unique values from real data only - return empty arrays if no data
  const categories = items.length > 0 ? [...new Set(items.map(item => item.category))].filter(Boolean).sort() : [];
  const statuses = items.length > 0 ? [...new Set(items.map(item => item.status))].filter(Boolean).sort() : [];
  const suppliers = items.length > 0 ? [...new Set(items.map(item => item.supplier))].filter(Boolean).sort() : [];
  const locations = items.length > 0 ? [...new Set(items.map(item => item.location))].filter(Boolean).sort() : [];
  
  // Filter real data based on search and filter criteria
  const filteredItems = items.filter((item) => {
    // Search filter
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Category filter
    const categoryArray = categoryFilter.split(',').filter(Boolean);
    const matchesCategory = !categoryFilter || 
      categoryArray.length === 0 || 
      categoryArray.includes(item.category);
    
    // Status filter
    const statusArray = statusFilter.split(',').filter(Boolean);
    const matchesStatus = !statusFilter || 
      statusArray.length === 0 || 
      statusArray.includes(item.status);
    
    // Supplier filter
    const matchesSupplier = !supplierFilter || 
      item.supplier === supplierFilter;
    
    // Location filter
    const matchesLocation = !locationFilter || 
      item.location === locationFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesSupplier && matchesLocation;
  });
  
  // Calculate statistics from real data only
  const lowStockCount = items.length > 0 ? countLowStockItems(items) : 0;
  const outOfStockCount = items.length > 0 ? countOutOfStockItems(items) : 0;
  const totalValue = items.length > 0 ? calculateTotalValue(items) : 0;
  
  // Export real data only
  const handleExport = useCallback(() => {
    try {
      if (filteredItems.length === 0) {
        toast.info("No inventory items to export");
        return;
      }
      
      const exportData = filteredItems.map((item) => ({
        Name: item.name,
        SKU: item.sku,
        Category: item.category,
        Quantity: item.quantity,
        'Unit Price': item.unit_price,
        'Reorder Point': item.reorder_point,
        Supplier: item.supplier,
        Status: item.status,
        Location: item.location,
        'Last Updated': new Date(item.updated_at).toLocaleDateString()
      }));
      
      exportToCSV(exportData, `inventory-export-${new Date().toISOString().split('T')[0]}`);
      toast.success(`Exported ${exportData.length} inventory items successfully`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export inventory data");
    }
  }, [filteredItems]);
  
  return {
    items,
    filteredItems,
    loading,
    error,
    categories,
    statuses,
    suppliers,
    locations,
    lowStockCount,
    outOfStockCount,
    totalValue,
    handleExport,
    refreshItems: fetchItems,
    filteredItemsCount: filteredItems.length
  };
};
