export interface VoyageLog {
  id: string;
  shop_id: string;
  vessel_id: string | null;
  voyage_number: string;
  departure_datetime: string;
  arrival_datetime: string | null;
  voyage_status: 'in_progress' | 'completed' | 'cancelled';
  origin_location: string;
  destination_location: string;
  waypoints: VoyageWaypoint[];
  master_name: string;
  crew_members: CrewMember[];
  voyage_type: VoyageType | null;
  cargo_description: string | null;
  barge_name: string | null;
  cargo_weight: number | null;
  cargo_weight_unit: string;
  engine_hours_start: number | null;
  engine_hours_end: number | null;
  fuel_start: number | null;
  fuel_end: number | null;
  fuel_unit: string;
  weather_conditions: WeatherConditions;
  activity_log: ActivityLogEntry[];
  incidents: VoyageIncident[];
  has_incidents: boolean;
  pre_departure_completed: boolean;
  pre_departure_checklist: Record<string, boolean>;
  master_signature: string | null;
  confirmed_at: string | null;
  notes: string | null;
  entered_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  vessel?: {
    id: string;
    name: string;
    unit_number: string | null;
  };
}

export interface VoyageCommunicationLog {
  id: string;
  voyage_id: string;
  communication_time: string;
  channel: string | null;
  contact_station: string | null;
  call_type: CommunicationCallType | null;
  direction: 'inbound' | 'outbound' | null;
  message_summary: string | null;
  created_at: string;
}

export interface VoyageWaypoint {
  id: string;
  location: string;
  arrival_time?: string;
  departure_time?: string;
  notes?: string;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  profile_id?: string;
}

export interface WeatherConditions {
  wind_speed?: number;
  wind_direction?: string;
  visibility?: string;
  sea_state?: string;
  temperature?: number;
  precipitation?: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  type: ActivityType;
  description: string;
  location?: string;
}

export interface VoyageIncident {
  id: string;
  timestamp: string;
  type: IncidentType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolution?: string;
  reported_by?: string;
}

export type VoyageType = 'barge_move' | 'tow' | 'patrol' | 'transit' | 'charter' | 'maintenance' | 'other';
export type CommunicationCallType = 'check_in' | 'position_report' | 'traffic_advisory' | 'security_call' | 'pan_pan' | 'mayday' | 'weather_update' | 'other';
export type ActivityType = 'departure' | 'waypoint_arrival' | 'waypoint_departure' | 'incident' | 'weather_change' | 'crew_change' | 'equipment_issue' | 'arrival' | 'other';
export type IncidentType = 'mechanical' | 'weather' | 'near_miss' | 'delay' | 'safety' | 'cargo' | 'navigation' | 'other';

export const VOYAGE_TYPE_LABELS: Record<VoyageType, string> = {
  barge_move: 'Barge Move',
  tow: 'Tow',
  patrol: 'Patrol',
  transit: 'Transit',
  charter: 'Charter',
  maintenance: 'Maintenance',
  other: 'Other'
};

export const CALL_TYPE_LABELS: Record<CommunicationCallType, string> = {
  check_in: 'Check In',
  position_report: 'Position Report',
  traffic_advisory: 'Traffic Advisory',
  security_call: 'Security Call',
  pan_pan: 'PAN-PAN',
  mayday: 'MAYDAY',
  weather_update: 'Weather Update',
  other: 'Other'
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  departure: 'Departure',
  waypoint_arrival: 'Waypoint Arrival',
  waypoint_departure: 'Waypoint Departure',
  incident: 'Incident',
  weather_change: 'Weather Change',
  crew_change: 'Crew Change',
  equipment_issue: 'Equipment Issue',
  arrival: 'Arrival',
  other: 'Other'
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  mechanical: 'Mechanical',
  weather: 'Weather',
  near_miss: 'Near Miss',
  delay: 'Delay',
  safety: 'Safety',
  cargo: 'Cargo',
  navigation: 'Navigation',
  other: 'Other'
};
