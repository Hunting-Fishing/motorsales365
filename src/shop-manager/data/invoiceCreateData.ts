
import { useInvoiceData } from "@/hooks/useInvoiceData";
import { WorkOrder } from "@/types/workOrder";

// This file now re-exports the hook that fetches data from the database
export { useInvoiceData };

// All work orders should come from the database via hooks
export const sampleWorkOrders: WorkOrder[] = [];

// For backwards compatibility, but no mock data fallbacks
export const workOrders: WorkOrder[] = [];
