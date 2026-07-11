
import React from "react";
import { InventoryFilters } from "@/components/inventory/InventoryFilters";

interface InventoryFilterSectionProps {
  categories: string[];
  statuses: string[];
  suppliers: string[];
  locations: string[];
  categoryFilter: string[];
  statusFilter: string[];
  supplierFilter: string;
  locationFilter: string;
  setCategoryFilter: React.Dispatch<React.SetStateAction<string[]>>;
  setStatusFilter: React.Dispatch<React.SetStateAction<string[]>>;
  setSupplierFilter: React.Dispatch<React.SetStateAction<string>>;
  setLocationFilter: React.Dispatch<React.SetStateAction<string>>;
  onReset: () => void;
}

export function InventoryFilterSection({
  categories,
  statuses,
  suppliers,
  locations,
  categoryFilter,
  statusFilter,
  supplierFilter,
  locationFilter,
  setCategoryFilter,
  setStatusFilter,
  setSupplierFilter,
  setLocationFilter,
  onReset,
}: InventoryFilterSectionProps) {
  return (
    <div className="mb-6">
      <InventoryFilters
        categories={categories}
        statuses={statuses}
        suppliers={suppliers}
        locations={locations}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        supplierFilter={supplierFilter}
        locationFilter={locationFilter}
        setCategoryFilter={setCategoryFilter}
        setStatusFilter={setStatusFilter}
        setSupplierFilter={setSupplierFilter}
        setLocationFilter={setLocationFilter}
        onReset={onReset}
      />
    </div>
  );
}
