
import React from "react";
import { CustomersHeader } from "./list/CustomersHeader";
import { CustomerStatsCards } from "./stats/CustomerStatsCards";
import { CustomerFiltersPanel } from "./filters/CustomerFiltersPanel";
import { CustomerTable } from "./table/CustomerTable";
import { useCustomers } from "@/hooks/useCustomers";

/**
 * REFACTORED: Main customers page using existing real customer infrastructure
 * - Uses existing useCustomers hook with real Supabase data
 * - Integrates with existing customer service layer
 * - Maintains all existing functionality while fixing TypeScript errors
 * 
 * Uses 100% live data from Supabase with proper error handling
 */
export function CustomersPage() {
  console.log('🔄 CustomersPage: Rendering with existing customer infrastructure');
  
  // Use existing customer hook with enhanced functionality
  const { 
    customers,
    filteredCustomers,
    customerStats,
    loading, 
    error, 
    filters,
    handleFilterChange,
    clearFilters,
    refetch 
  } = useCustomers();

  if (error) {
    return (
      <div className="w-full p-6">
        <div className="text-center py-12">
          <p className="text-red-600 text-lg mb-4">Error loading customers</p>
          <p className="text-slate-500 mb-4">{error}</p>
          <button 
            onClick={() => refetch()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">
      <CustomersHeader />
      
      <CustomerStatsCards 
        customers={customers}
        customerStats={customerStats}
        isLoading={loading}
      />
      
      <CustomerFiltersPanel
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />
      
      <CustomerTable 
        customers={filteredCustomers}
        isLoading={loading}
      />
    </div>
  );
}
