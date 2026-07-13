
import { useState, useEffect, useMemo } from "react";
import { ServiceReminder } from "@/types/reminder";
import { getAllReminders, getCustomerReminders, getVehicleReminders, getUpcomingReminders } from "@/services/reminderService";
import { toast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";

interface UseRemindersProps {
  customerId?: string;
  vehicleId?: string;
  limit?: number;
  statusFilter?: string;
  priorityFilter?: string;
  categoryId?: string;
  assignedTo?: string;
  isRecurring?: boolean;
  dateRange?: DateRange;
  tagIds?: string[];
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useReminders({ 
  customerId, 
  vehicleId, 
  limit, 
  statusFilter, 
  priorityFilter,
  categoryId,
  assignedTo,
  isRecurring,
  dateRange,
  tagIds,
  search,
  sortBy = 'dueDate',
  sortOrder = 'asc'
}: UseRemindersProps) {
  // Create a more optimized query key that only includes relevant parameters
  const queryKey = useMemo(() => {
    const keyParts = ['reminders'];
    
    if (customerId) keyParts.push(`customer-${customerId}`);
    if (vehicleId) keyParts.push(`vehicle-${vehicleId}`);
    if (limit) keyParts.push(`limit-${limit}`);
    if (statusFilter) keyParts.push(`status-${statusFilter}`);
    if (priorityFilter) keyParts.push(`priority-${priorityFilter}`);
    if (categoryId) keyParts.push(`category-${categoryId}`);
    if (assignedTo) keyParts.push(`assigned-${assignedTo}`);
    if (isRecurring !== undefined) keyParts.push(`recurring-${isRecurring}`);
    if (dateRange?.from) keyParts.push(`from-${dateRange.from.toISOString()}`);
    if (dateRange?.to) keyParts.push(`to-${dateRange.to?.toISOString() || dateRange.from.toISOString()}`);
    if (tagIds?.length) keyParts.push(`tags-${tagIds.join('-')}`);
    if (search) keyParts.push(`search-${search}`);
    keyParts.push(`sort-${sortBy}-${sortOrder}`);
    
    return keyParts;
  }, [
    customerId, vehicleId, limit, statusFilter, priorityFilter,
    categoryId, assignedTo, isRecurring, dateRange, tagIds, search,
    sortBy, sortOrder
  ]);

  const filters = {
    status: statusFilter,
    priority: priorityFilter,
    categoryId,
    assignedTo,
    isRecurring,
    dateRange,
    tagIds,
    search,
    sortBy,
    sortOrder: sortOrder as "asc" | "desc",
    limit
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        // Optimize the fetch strategy based on the provided filters
        let remindersData: ServiceReminder[];
        
        if (customerId) {
          // Pass the filters directly to the service function instead of filtering client-side
          remindersData = await getCustomerReminders(customerId, filters);
        } else if (vehicleId) {
          remindersData = await getVehicleReminders(vehicleId, filters);
        } else {
          if (limit && !filters.dateRange) {
            // When limit is specified without dateRange, use the "upcoming" endpoint
            remindersData = await getUpcomingReminders(limit, filters);
          } else {
            remindersData = await getAllReminders(filters);
          }
        }
        
        return remindersData;
      } catch (err) {
        console.error("Error loading reminders:", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 5, // Keep 5 minutes stale time as it seems appropriate
    placeholderData: (previousData) => previousData // Updated to React Query v5 syntax
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load service reminders.",
        variant: "destructive",
      });
    }
  }, [error]);

  return {
    reminders: data || [],
    loading: isLoading,
    updateReminder: refetch, // Simplified to just use refetch
    refetch,
  };
}
