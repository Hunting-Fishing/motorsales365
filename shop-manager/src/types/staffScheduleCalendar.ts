export type StaffCalendarViewType = 'month' | 'week' | 'day';

export type StaffEventType = 'shift' | 'vessel_assignment' | 'equipment_assignment' | 'vehicle_assignment';

export interface StaffScheduleEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: StaffEventType;
  employee: {
    id: string;
    name: string;
  };
  color: string;
  asset?: {
    id: string;
    name: string;
    type: 'vessel' | 'equipment' | 'vehicle';
  };
  status: string;
  notes?: string;
  isRecurring?: boolean;
}

export interface StaffCalendarFilters {
  employeeIds: string[];
  assetTypes: ('vessel' | 'equipment' | 'vehicle')[];
  assetIds: string[];
  statuses: string[];
  searchQuery: string;
}

export interface EmployeeOption {
  id: string;
  name: string;
  color: string;
}

export interface AssetOption {
  id: string;
  name: string;
  type: 'vessel' | 'equipment' | 'vehicle';
}

// Color palette for employees (auto-assigned)
export const EMPLOYEE_COLORS = [
  'hsl(221, 83%, 53%)',   // Blue
  'hsl(142, 71%, 45%)',   // Green
  'hsl(262, 83%, 58%)',   // Purple
  'hsl(25, 95%, 53%)',    // Orange
  'hsl(339, 82%, 51%)',   // Pink
  'hsl(47, 96%, 53%)',    // Yellow
  'hsl(173, 80%, 40%)',   // Teal
  'hsl(0, 84%, 60%)',     // Red
  'hsl(199, 89%, 48%)',   // Cyan
  'hsl(291, 64%, 42%)',   // Violet
];

// Asset type colors
export const ASSET_TYPE_COLORS = {
  vessel: 'hsl(221, 83%, 53%)',     // Blue
  equipment: 'hsl(142, 71%, 45%)',  // Green
  vehicle: 'hsl(47, 96%, 53%)',     // Yellow
};
