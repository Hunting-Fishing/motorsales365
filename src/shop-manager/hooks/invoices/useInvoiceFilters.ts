
import { useState, useCallback } from 'react';
import { Invoice } from '@/types/invoice';

export const useInvoiceFilters = (initialInvoices: Invoice[] = []) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [createdByFilter, setCreatedByFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredInvoices = useCallback(() => {
    return initialInvoices.filter(invoice => {
      // Filter by status
      if (statusFilter !== 'all' && invoice.status !== statusFilter) {
        return false;
      }

      // Filter by search term (check invoice ID or customer name)
      if (search && !invoice.id.toLowerCase().includes(search.toLowerCase()) && 
          !invoice.customer.toLowerCase().includes(search.toLowerCase()) &&
          !(invoice.created_by && invoice.created_by.toLowerCase().includes(search.toLowerCase()))) {
        return false;
      }

      // Filter by work order id if applicable
      if (invoice.work_order_id && invoice.work_order_id.includes(search)) {
        return true;
      }

      // Filter by created by
      if (createdByFilter !== 'all' && invoice.created_by !== createdByFilter) {
        return false;
      }

      // Filter by date (this would need date range processing logic)
      if (dateFilter !== 'all') {
        // Example date filter implementation
        const due_date = new Date(invoice.due_date);
        const currentDate = new Date();
        
        if (dateFilter === 'thisWeek') {
          const startOfWeek = new Date();
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
          const endOfWeek = new Date();
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          return due_date >= startOfWeek && due_date <= endOfWeek;
        }
        // Add other date filter conditions as needed
      }

      return true;
    });
  }, [initialInvoices, statusFilter, search, dateFilter, createdByFilter]);

  return {
    filteredInvoices: filteredInvoices(),
    statusFilter,
    setStatusFilter,
    dateFilter, 
    setDateFilter,
    search,
    setSearch,
    createdByFilter,
    setCreatedByFilter
  };
};
