// Planner Types

export type PlannerView = 'calendar' | 'kanban' | 'timeline' | 'whiteboard' | 'capacity';

export type BoardType = 'kanban' | 'whiteboard' | 'timeline';

export type ItemType = 'note' | 'task' | 'work_order' | 'assignment' | 'milestone';

export type SwimlaneResourceType = 'employee' | 'vessel' | 'equipment' | 'bay';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface PlannerBoardItem {
  id: string;
  shop_id: string;
  board_type: BoardType;
  item_type: ItemType;
  title: string;
  content?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  color?: string;
  column_id?: string;
  row_id?: string;
  swimlane_resource_type?: SwimlaneResourceType;
  swimlane_resource_id?: string;
  
  // Linked entities
  work_order_id?: string;
  employee_id?: string;
  equipment_id?: string;
  vehicle_id?: string;
  customer_id?: string;
  inventory_item_id?: string;
  
  // Dates
  start_date?: string;
  end_date?: string;
  duration_hours?: number;
  
  // Dependencies
  depends_on?: string[];
  
  priority?: Priority;
  status?: ItemStatus;
  z_index?: number;
  is_locked?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  
  // Joined data
  work_order?: {
    id: string;
    title?: string;
    status?: string;
    customer?: { first_name?: string; last_name?: string; company_name?: string };
  };
  employee?: {
    id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  equipment?: {
    id: string;
    name?: string;
    equipment_type?: string;
  };
}

export interface PlannerBoardColumn {
  id: string;
  shop_id: string;
  board_id: string;
  column_key: string;
  column_name: string;
  column_order: number;
  color?: string;
  wip_limit?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PlannerSwimlane {
  id: string;
  shop_id: string;
  board_id: string;
  resource_type: SwimlaneResourceType;
  resource_id?: string;
  resource_name?: string;
  display_order: number;
  is_collapsed?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PlannerPreferences {
  id: string;
  user_id: string;
  shop_id: string;
  default_view: PlannerView;
  timeline_zoom: 'day' | 'week' | 'month';
  show_weekends: boolean;
  swimlane_mode: SwimlaneResourceType;
  kanban_columns_visible?: string[];
  created_at?: string;
  updated_at?: string;
}

// Resource types for capacity planning
export interface ResourceCapacity {
  id: string;
  name: string;
  type: SwimlaneResourceType;
  totalHours: number;
  scheduledHours: number;
  availableHours: number;
  utilizationPercent: number;
  avatar?: string;
  status?: 'available' | 'busy' | 'overloaded';
}

// Timeline types
export interface TimelineTask {
  id: string;
  title: string;
  resourceId: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  progress?: number;
  dependsOn?: string[];
  priority?: Priority;
  status?: ItemStatus;
}

export interface TimelineResource {
  id: string;
  name: string;
  type: SwimlaneResourceType;
  avatar?: string;
  tasks: TimelineTask[];
}

// Kanban types
export interface KanbanColumn {
  id: string;
  key: string;
  title: string;
  color: string;
  order: number;
  wipLimit?: number;
  items: PlannerBoardItem[];
}

export interface KanbanSwimlane {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: SwimlaneResourceType;
  resourceAvatar?: string;
  isCollapsed: boolean;
  columns: { [columnKey: string]: PlannerBoardItem[] };
}

// Whiteboard types
export interface WhiteboardNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color: string;
  zIndex: number;
  isLocked: boolean;
}

export interface WhiteboardConnection {
  id: string;
  fromId: string;
  toId: string;
  color?: string;
}
