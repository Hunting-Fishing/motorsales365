// Incident Types - matching database schema
export type IncidentType = 
  | 'injury' 
  | 'near_miss'
  | 'property_damage'
  | 'chemical_exposure' 
  | 'slip_trip_fall' 
  | 'equipment_failure' 
  | 'vehicle_incident'
  | 'fire'
  | 'lifting_injury'
  | 'ev_battery_hazard'
  | 'high_pressure_injection'
  | 'other';

// Training types for safety acknowledgments
export type TrainingType = 
  | 'hazard_communication'
  | 'ppe'
  | 'fire_safety'
  | 'equipment_operation'
  | 'emergency_procedures'
  | 'lockout_tagout'
  | 'confined_space'
  | 'whmis'
  | 'forklift'
  | 'first_aid'
  | 'other';

export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical';
export type InvestigationStatus = 'open' | 'under_investigation' | 'resolved' | 'closed';
export type InjuredPersonType = 'employee' | 'contractor' | 'visitor' | 'customer';

export interface SafetyIncident {
  id: string;
  shop_id: string;
  reported_by: string;
  incident_date: string;
  incident_time: string | null;
  incident_type: IncidentType;
  severity: IncidentSeverity;
  location: string;
  title: string;
  description: string;
  equipment_id: string | null;
  vehicle_id: string | null;
  injured_person_name: string | null;
  injured_person_type: InjuredPersonType | null;
  injury_details: string | null;
  medical_treatment_required: boolean;
  medical_treatment_description: string | null;
  witnesses: string[];
  photos: string[];
  osha_reportable: boolean;
  osha_report_number: string | null;
  investigation_status: InvestigationStatus;
  root_cause: string | null;
  corrective_actions: string | null;
  preventive_measures: string | null;
  assigned_investigator: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InspectionShift = 'morning' | 'afternoon' | 'night';
export type FloorCondition = 'good' | 'fair' | 'poor' | 'hazardous';
export type ToolsCondition = 'good' | 'fair' | 'poor';
export type InspectionOverallStatus = 'pass' | 'pass_with_issues' | 'fail';

export interface ChecklistItem {
  checked: boolean;
  status: 'ok' | 'warning' | 'fail' | 'na';
  notes: string;
}

export interface DailyShopInspection {
  id: string;
  shop_id: string;
  inspection_date: string;
  inspector_id: string;
  inspector_name: string;
  shift: InspectionShift | null;
  checklist_items: Record<string, ChecklistItem>;
  fire_extinguishers_ok: boolean | null;
  emergency_exits_clear: boolean | null;
  first_aid_kit_stocked: boolean | null;
  spill_kit_available: boolean | null;
  ventilation_working: boolean | null;
  floor_condition: FloorCondition | null;
  lighting_adequate: boolean | null;
  ppe_available: boolean | null;
  tools_condition: ToolsCondition | null;
  hazards_identified: string[];
  corrective_actions_needed: string | null;
  overall_status: InspectionOverallStatus;
  notes: string | null;
  inspector_signature: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export type DVIRInspectionType = 'pre_trip' | 'post_trip' | 'roadside';

export interface DVIRReport {
  id: string;
  shop_id: string;
  vehicle_id: string;
  inspection_type: DVIRInspectionType;
  inspection_date: string;
  inspection_time: string;
  odometer_reading: number | null;
  driver_id: string;
  driver_name: string;
  brakes_ok: boolean;
  lights_ok: boolean;
  tires_ok: boolean;
  mirrors_ok: boolean;
  horn_ok: boolean;
  windshield_ok: boolean;
  wipers_ok: boolean;
  steering_ok: boolean;
  emergency_equipment_ok: boolean;
  fluid_levels_ok: boolean;
  exhaust_ok: boolean;
  coupling_devices_ok: boolean | null;
  cargo_securement_ok: boolean | null;
  defects_found: boolean;
  defects_description: string | null;
  defect_photos: string[];
  vehicle_safe_to_operate: boolean;
  mechanic_review_required: boolean;
  mechanic_reviewed_by: string | null;
  mechanic_review_date: string | null;
  mechanic_notes: string | null;
  repairs_completed: boolean | null;
  repairs_description: string | null;
  driver_signature: string;
  mechanic_signature: string | null;
  created_at: string;
  updated_at: string;
}

export type SafetyDocumentType = 
  | 'sds' 
  | 'policy'
  | 'procedure' 
  | 'training_material'
  | 'inspection_form'
  | 'permit'
  | 'certification'
  | 'manual'
  | 'emergency_plan'
  | 'torque_spec'
  | 'wiring_diagram'
  | 'working_at_height'
  | 'ev_safety'
  | 'other';

export interface SafetyDocument {
  id: string;
  shop_id: string;
  document_type: SafetyDocumentType;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  chemical_name: string | null;
  manufacturer: string | null;
  hazard_classification: string[];
  storage_location: string | null;
  version: string;
  revision_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  is_active: boolean;
  requires_acknowledgment: boolean;
  department: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export type LiftInspectionType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type LiftEquipmentType = 
  | 'two_post_lift' 
  | 'four_post_lift' 
  | 'scissor_lift' 
  | 'in_ground_lift'
  | 'mobile_column' 
  | 'engine_hoist' 
  | 'transmission_jack' 
  | 'other';

export interface LiftHoistInspection {
  id: string;
  shop_id: string;
  equipment_id: string | null;
  equipment_name: string;
  equipment_type: LiftEquipmentType;
  serial_number: string | null;
  location: string | null;
  inspection_type: LiftInspectionType;
  inspection_date: string;
  inspector_id: string;
  inspector_name: string;
  checklist_items: Record<string, ChecklistItem>;
  structural_integrity_ok: boolean | null;
  hydraulic_system_ok: boolean | null;
  safety_locks_ok: boolean | null;
  controls_ok: boolean | null;
  cables_chains_ok: boolean | null;
  capacity_label_visible: boolean | null;
  floor_anchors_ok: boolean | null;
  lubrication_ok: boolean | null;
  safe_for_use: boolean;
  deficiencies_found: string[];
  corrective_actions: string | null;
  next_inspection_date: string | null;
  locked_out: boolean;
  lockout_reason: string | null;
  lockout_date: string | null;
  lockout_by: string | null;
  inspector_signature: string | null;
  photos: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Dashboard Stats
export interface SafetyDashboardStats {
  openIncidents: number;
  criticalIncidents: number;
  todayInspectionsCompleted: number;
  todayInspectionsTotal: number;
  expiringCertificates: number;
  expiredCertificates: number;
  unsafeEquipment: number;
  pendingDVIRs: number;
}

// Label mappings for display
export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  injury: 'Injury',
  near_miss: 'Near Miss',
  property_damage: 'Property Damage',
  chemical_exposure: 'Chemical Exposure',
  slip_trip_fall: 'Slip/Trip/Fall',
  equipment_failure: 'Equipment Failure',
  vehicle_incident: 'Vehicle Incident',
  fire: 'Fire',
  lifting_injury: 'Lifting Injury',
  ev_battery_hazard: 'EV Battery Hazard',
  high_pressure_injection: 'High Pressure Injection',
  other: 'Other'
};

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  hazard_communication: 'Hazard Communication (HazCom)',
  ppe: 'Personal Protective Equipment',
  fire_safety: 'Fire Safety',
  equipment_operation: 'Equipment Operation',
  emergency_procedures: 'Emergency Procedures',
  lockout_tagout: 'Lockout/Tagout (LOTO)',
  confined_space: 'Confined Space Entry',
  whmis: 'WHMIS (Hazardous Materials)',
  forklift: 'Forklift Operation',
  first_aid: 'First Aid/CPR',
  other: 'Other'
};

// Safety schedule types
export interface SafetySchedule {
  id: string;
  shop_id: string;
  schedule_name: string;
  schedule_type: string;
  inspection_type?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'hours_based';
  is_enabled: boolean;
  last_completed_date?: string;
  next_due_date: string;
  assigned_to?: string;
  reminder_days_before: number;
  notes?: string;
  vehicle_id?: string;
  equipment_id?: string;
  mileage_interval?: number;
  hours_interval?: number;
  last_mileage?: number;
  next_mileage?: number;
  created_at: string;
  updated_at: string;
}

// Inspection assignment for staff accountability
export interface InspectionAssignment {
  id: string;
  shop_id: string;
  staff_id: string;
  schedule_id?: string;
  inspection_type: string;
  shift?: 'morning' | 'afternoon' | 'night';
  assignment_date: string;
  is_completed: boolean;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Training acknowledgment
export interface TrainingAcknowledgment {
  id: string;
  shop_id: string;
  staff_id: string;
  document_id?: string;
  training_topic: string;
  training_type: TrainingType;
  acknowledged_at: string;
  expiry_date?: string;
  signature?: string;
  notes?: string;
  created_at: string;
}

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  serious: 'Serious',
  critical: 'Critical'
};

export const STATUS_LABELS: Record<InvestigationStatus, string> = {
  open: 'Open',
  under_investigation: 'Under Investigation',
  resolved: 'Resolved',
  closed: 'Closed'
};

export const INJURED_PERSON_TYPE_LABELS: Record<InjuredPersonType, string> = {
  employee: 'Employee',
  contractor: 'Contractor',
  visitor: 'Visitor',
  customer: 'Customer'
};
