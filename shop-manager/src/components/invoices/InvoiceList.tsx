
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { InvoiceListTable } from "./InvoiceListTable";
import { InvoiceFiltersDropdown } from "./InvoiceFiltersDropdown";
import { InvoiceListExportMenu } from "./InvoiceListExportMenu";
import { Invoice, InvoiceFilters } from "@/types/invoice";

interface InvoiceListProps {
  invoices: Invoice[];
  isLoading: boolean;
  error: Error | null;
}

export function InvoiceList({ invoices, isLoading, error }: InvoiceListProps) {
  const [filters, setFilters] = useState<InvoiceFilters>({
    status: 'all',
    dateRange: 'all',
    search: '',
    customer: 'all'
  });

  const [filteredInvoices, setFilteredInvoices] = useState(invoices);

  const handleFilterChange = (newFilters: InvoiceFilters) => {
    setFilters(newFilters);
    // Apply filters logic here
    const filtered = invoices.filter(invoice => {
      if (newFilters.status !== 'all' && invoice.status !== newFilters.status) {
        return false;
      }
      if (newFilters.search && !invoice.customer.toLowerCase().includes(newFilters.search.toLowerCase())) {
        return false;
      }
      return true;
    });
    setFilteredInvoices(filtered);
  };

  const handleApplyFilters = (appliedFilters: InvoiceFilters) => {
    handleFilterChange(appliedFilters);
  };

  const handleResetFilters = () => {
    const resetFilters: InvoiceFilters = {
      status: 'all',
      dateRange: 'all',
      search: '',
      customer: 'all'
    };
    setFilters(resetFilters);
    setFilteredInvoices(invoices);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage and track your invoices
          </p>
        </div>
        <div className="flex gap-2">
          <InvoiceListExportMenu invoices={filteredInvoices} />
          <InvoiceFiltersDropdown 
            filters={filters}
            onFilterChange={handleFilterChange}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
          />
          <Button asChild>
            <Link to="/invoices/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceListTable invoices={filteredInvoices} />
        </CardContent>
      </Card>
    </div>
  );
}
