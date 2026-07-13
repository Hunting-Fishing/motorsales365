
import { useState, useEffect } from 'react';
import { WorkOrder } from '@sm/types/workOrder';
import { WorkOrderJobLine } from '@sm/types/jobLine';
import { WorkOrderPart } from '@sm/types/workOrderPart';
import { TimeEntry } from '@sm/types/workOrder';
import { Customer } from '@sm/types/customer';
import { getWorkOrderById } from '@sm/services/workOrder';
import { getCustomerById } from '@sm/services/customer';
import { getWorkOrderJobLines } from '@sm/services/workOrder/jobLinesService';
import { getWorkOrderParts } from '@sm/services/workOrder/workOrderPartsService';
import { getWorkOrderTimeEntries } from '@sm/services/workOrder/workOrderQueryService';

export function useWorkOrderData(workOrderId: string) {
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [jobLines, setJobLines] = useState<WorkOrderJobLine[]>([]);
  const [allParts, setAllParts] = useState<WorkOrderPart[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    console.log('🔄 useWorkOrderData - Fetching data for work order:', workOrderId);
    
    if (!workOrderId || workOrderId === 'new' || workOrderId === 'create') {
      console.log('⚠️ No valid work order ID provided or creating new work order');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📊 Fetching work order details...');
      const wo = await getWorkOrderById(workOrderId);
      if (!wo) {
        setError("Work Order not found.");
        return;
      }
      setWorkOrder(wo);
      console.log('✅ Work order fetched:', wo);

      console.log('📋 Fetching job lines...');
      const lines = await getWorkOrderJobLines(workOrderId);
      setJobLines(lines);
      console.log('✅ Job lines fetched:', lines.length, 'items');

      console.log('🔧 Fetching parts...');
      const parts = await getWorkOrderParts(workOrderId);
      setAllParts(parts);
      console.log('✅ Parts fetched:', parts.length, 'items');

      console.log('⏱️ Fetching time entries...');
      const entries = await getWorkOrderTimeEntries(workOrderId);
      setTimeEntries(entries);
      console.log('✅ Time entries fetched:', entries.length, 'items');

      if (wo.customer_id) {
        console.log('👤 Fetching customer details...');
        const cust = await getCustomerById(wo.customer_id);
        setCustomer(cust);
        console.log('✅ Customer fetched:', cust);
      }
      
      console.log('✅ All data fetched successfully');
    } catch (err: any) {
      console.error('❌ Error fetching work order data:', err);
      setError(err.message || "Failed to load Work Order details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workOrderId]);

  const refreshData = async () => {
    console.log('🔄 useWorkOrderData - Refreshing all data...');
    await fetchData();
  };

  const refreshJobLines = async () => {
    console.log('🔄 useWorkOrderData - Refreshing job lines only...');
    if (!workOrderId || workOrderId === 'new' || workOrderId === 'create') return;
    
    try {
      const lines = await getWorkOrderJobLines(workOrderId);
      setJobLines(lines);
      console.log('✅ Job lines refreshed:', lines.length, 'items');
    } catch (err) {
      console.error('❌ Error refreshing job lines:', err);
    }
  };

  const updateJobLines = (updatedJobLines: WorkOrderJobLine[]) => {
    console.log('🔄 useWorkOrderData - Updating job lines in state:', updatedJobLines.length, 'items');
    setJobLines(updatedJobLines);
    
    // Also refresh from database to ensure consistency
    setTimeout(() => {
      console.log('🔄 Auto-refreshing job lines from database for consistency...');
      refreshJobLines();
    }, 500);
  };

  const addJobLines = (newJobLines: WorkOrderJobLine[]) => {
    console.log('➕ useWorkOrderData - Adding job lines to state:', newJobLines.length, 'items');
    setJobLines(prevJobLines => {
      const updatedLines = [...prevJobLines, ...newJobLines];
      console.log('📊 Total job lines after addition:', updatedLines.length);
      return updatedLines;
    });
    
    // Refresh from database to ensure consistency
    setTimeout(() => {
      console.log('🔄 Auto-refreshing job lines from database after addition...');
      refreshJobLines();
    }, 500);
  };

  const updateJobLine = (updatedJobLine: WorkOrderJobLine) => {
    console.log('🔧 useWorkOrderData - Updating single job line:', updatedJobLine.id);
    setJobLines(prevJobLines => 
      prevJobLines.map(line => 
        line.id === updatedJobLine.id ? updatedJobLine : line
      )
    );
    
    // Refresh from database to ensure consistency
    setTimeout(() => {
      console.log('🔄 Auto-refreshing job lines from database after update...');
      refreshJobLines();
    }, 500);
  };

  const removeJobLine = (jobLineId: string) => {
    console.log('🗑️ useWorkOrderData - Removing job line from state:', jobLineId);
    setJobLines(prevJobLines => 
      prevJobLines.filter(line => line.id !== jobLineId)
    );
    
    // Refresh from database to ensure consistency
    setTimeout(() => {
      console.log('🔄 Auto-refreshing job lines from database after removal...');
      refreshJobLines();
    }, 500);
  };

  const updateParts = (updatedParts: WorkOrderPart[]) => {
    console.log('🔄 useWorkOrderData - Updating parts in state:', updatedParts.length, 'items');
    setAllParts(updatedParts);
  };

  const updateTimeEntries = (updatedEntries: TimeEntry[]) => {
    console.log('🔄 useWorkOrderData - Updating time entries in state:', updatedEntries.length, 'items');
    setTimeEntries(updatedEntries);
  };

  return {
    workOrder,
    jobLines,
    allParts,
    timeEntries,
    customer,
    isLoading,
    error,
    updateJobLines,
    addJobLines,
    updateJobLine,
    removeJobLine,
    updateParts,
    updateTimeEntries,
    refreshData,
    refreshJobLines
  };
}
