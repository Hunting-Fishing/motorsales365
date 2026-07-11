
import { z } from "zod";

export const workOrderFormSchema = z.object({
  // Customer information
  customerId: z.string().optional(),
  customer: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  
  // Vehicle information
  vehicleId: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  licensePlate: z.string().optional(),
  vin: z.string().optional(),
  odometer: z.string().optional(),
  
  // Work order details
  description: z.string().min(1, "Description is required"),
  status: z.enum([
    "pending", 
    "in-progress", 
    "on-hold", 
    "completed", 
    "cancelled",
    "body-shop",
    "mobile-service",
    "needs-road-test",
    "parts-requested",
    "parts-ordered",
    "parts-arrived",
    "customer-to-return",
    "rebooked",
    "foreman-signoff-waiting",
    "foreman-signoff-complete",
    "sublet",
    "waiting-customer-auth",
    "po-requested",
    "tech-support",
    "warranty",
    "internal-ro"
  ]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  
  // Assignment
  technician: z.string().optional(),
  technicianId: z.string().optional(),
  location: z.string().optional(),
  dueDate: z.string().optional(),
  
  // Additional information
  notes: z.string().optional(),
  
  // Expanded intake fields
  customerComplaint: z.string().optional(),
  complaintSource: z.enum(["Customer", "Fleet Manager", "Warranty Claim", "Insurance", "Other"]).default("Customer"),
  additionalInfo: z.string().optional(),
  requestedServices: z.array(z.string()).default([]),
  customerInstructions: z.string().optional(),
  authorizationLimit: z.number().default(0),
  preferredContactMethod: z.enum(["Phone", "Email", "Text", "In-Person"]).default("Phone"),
  urgencyLevel: z.enum(["Low", "Normal", "Urgent", "Emergency"]).default("Normal"),
  dropOffType: z.enum(["Walk-in", "Appointment", "Tow-in", "Night Drop"]).default("Walk-in"),
  diagnosticNotes: z.string().optional(),
  writeUpBy: z.string().optional(),
  writeUpTime: z.string().optional(),
  initialMileage: z.number().optional(),
  vehicleConditionNotes: z.string().optional(),
  attachments: z.array(z.string()).default([]),
  serviceTags: z.array(z.string()).default([]),
  customerWaiting: z.boolean().default(false),
  isWarranty: z.boolean().default(false),
  isRepeatIssue: z.boolean().default(false),
  linkedPriorWorkOrderId: z.string().optional(),
  
  // Inventory items - properly typed
  inventoryItems: z.array(z.object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    category: z.string(),
    quantity: z.number(),
    unit_price: z.number(),
    total: z.number(),
    notes: z.string().optional(),
    itemStatus: z.string().optional(),
    estimatedArrivalDate: z.string().optional(),
    supplierName: z.string().optional(),
    supplierOrderRef: z.string().optional(),
  })).default([]),
});

export type WorkOrderFormSchemaValues = z.infer<typeof workOrderFormSchema>;
