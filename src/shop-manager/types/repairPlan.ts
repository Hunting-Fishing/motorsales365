
import { Equipment } from "./equipment";

export type RepairPriority = "critical" | "high" | "medium" | "low";
export type RepairStatus = "draft" | "scheduled" | "in-progress" | "completed" | "cancelled";

export interface RepairTask {
  id: string;
  description: string;
  estimatedHours: number;
  completed: boolean;
  assignedTo?: string;
  notes?: string;
}

export interface RepairPlan {
  id: string;
  equipmentId: string;
  title: string;
  description: string;
  status: RepairStatus;
  priority: RepairPriority;
  createdAt: string;
  updatedAt: string;
  scheduledDate?: string;
  completedDate?: string;
  estimatedDuration: number;
  actualDuration?: number;
  tasks: RepairTask[];
  assignedTechnician?: string;
  partsRequired?: string[];
  costEstimate?: number;
  customerApproved?: boolean;
  notes?: string;
}

export interface RepairPlanFormValues {
  equipmentId: string;
  title: string;
  description: string;
  status: RepairStatus;
  priority: RepairPriority;
  scheduledDate?: Date;
  estimatedDuration: number;
  tasks: RepairTask[];
  assignedTechnician?: string;
  partsRequired?: string[];
  costEstimate?: number;
  customerApproved?: boolean;
  notes?: string;
}
