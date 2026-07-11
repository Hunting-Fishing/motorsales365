// Predefined component catalog for inspection templates
// These are standardized components that can be added to any inspection form

export interface ComponentDefinition {
  id: string;
  name: string;
  key: string;
  type: 'hour_meter' | 'fluid_level' | 'gyr_status' | 'checkbox' | 'number' | 'text';
  category: string;
  description?: string;
  unit?: string;
  linkedEquipmentType?: string;
}

export interface ComponentCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  components: ComponentDefinition[];
}

export const COMPONENT_CATALOG: ComponentCategory[] = [
  {
    id: 'engine_hours',
    name: 'Engine Hours',
    icon: 'Gauge',
    description: 'Track engine hour meters',
    components: [
      {
        id: 'port_engine_hours',
        name: 'Port Engine Hours',
        key: 'port_engine_hours',
        type: 'hour_meter',
        category: 'engine_hours',
        description: 'Port side engine hour meter reading',
        unit: 'hours',
        linkedEquipmentType: 'port_engine',
      },
      {
        id: 'starboard_engine_hours',
        name: 'Starboard Engine Hours',
        key: 'starboard_engine_hours',
        type: 'hour_meter',
        category: 'engine_hours',
        description: 'Starboard side engine hour meter reading',
        unit: 'hours',
        linkedEquipmentType: 'starboard_engine',
      },
      {
        id: 'main_engine_hours',
        name: 'Main Engine Hours',
        key: 'main_engine_hours',
        type: 'hour_meter',
        category: 'engine_hours',
        description: 'Main engine hour meter reading',
        unit: 'hours',
        linkedEquipmentType: 'main_engine',
      },
      {
        id: 'auxiliary_engine_hours',
        name: 'Auxiliary Engine Hours',
        key: 'auxiliary_engine_hours',
        type: 'hour_meter',
        category: 'engine_hours',
        description: 'Auxiliary engine hour meter reading',
        unit: 'hours',
        linkedEquipmentType: 'auxiliary_engine',
      },
    ],
  },
  {
    id: 'generator_hours',
    name: 'Generator Hours',
    icon: 'Zap',
    description: 'Track generator hour meters',
    components: [
      {
        id: 'main_generator_hours',
        name: 'Main Generator Hours',
        key: 'main_generator_hours',
        type: 'hour_meter',
        category: 'generator_hours',
        description: 'Main generator hour meter reading',
        unit: 'hours',
        linkedEquipmentType: 'generator',
      },
      {
        id: 'backup_generator_hours',
        name: 'Backup Generator Hours',
        key: 'backup_generator_hours',
        type: 'hour_meter',
        category: 'generator_hours',
        description: 'Backup generator hour meter reading',
        unit: 'hours',
        linkedEquipmentType: 'backup_generator',
      },
      {
        id: 'emergency_generator_hours',
        name: 'Emergency Generator Hours',
        key: 'emergency_generator_hours',
        type: 'hour_meter',
        category: 'generator_hours',
        description: 'Emergency generator hour meter reading',
        unit: 'hours',
        linkedEquipmentType: 'emergency_generator',
      },
    ],
  },
  {
    id: 'fluid_levels',
    name: 'Fluid Levels',
    icon: 'Droplets',
    description: 'Check fluid levels',
    components: [
      {
        id: 'engine_oil_level',
        name: 'Engine Oil Level',
        key: 'engine_oil_level',
        type: 'gyr_status',
        category: 'fluid_levels',
        description: 'Engine oil level check',
      },
      {
        id: 'transmission_fluid_level',
        name: 'Transmission Fluid Level',
        key: 'transmission_fluid_level',
        type: 'gyr_status',
        category: 'fluid_levels',
        description: 'Transmission fluid level check',
      },
      {
        id: 'hydraulic_fluid_level',
        name: 'Hydraulic Fluid Level',
        key: 'hydraulic_fluid_level',
        type: 'gyr_status',
        category: 'fluid_levels',
        description: 'Hydraulic fluid level check',
      },
      {
        id: 'coolant_level',
        name: 'Coolant Level',
        key: 'coolant_level',
        type: 'gyr_status',
        category: 'fluid_levels',
        description: 'Engine coolant level check',
      },
      {
        id: 'power_steering_fluid',
        name: 'Power Steering Fluid',
        key: 'power_steering_fluid',
        type: 'gyr_status',
        category: 'fluid_levels',
        description: 'Power steering fluid level check',
      },
    ],
  },
  {
    id: 'fuel',
    name: 'Fuel Levels',
    icon: 'Fuel',
    description: 'Track fuel tank levels',
    components: [
      {
        id: 'main_fuel_tank',
        name: 'Main Fuel Tank',
        key: 'main_fuel_tank',
        type: 'number',
        category: 'fuel',
        description: 'Main fuel tank level',
        unit: 'gallons',
      },
      {
        id: 'auxiliary_fuel_tank',
        name: 'Auxiliary Fuel Tank',
        key: 'auxiliary_fuel_tank',
        type: 'number',
        category: 'fuel',
        description: 'Auxiliary fuel tank level',
        unit: 'gallons',
      },
      {
        id: 'day_tank',
        name: 'Day Tank',
        key: 'day_tank',
        type: 'number',
        category: 'fuel',
        description: 'Day tank level',
        unit: 'gallons',
      },
    ],
  },
  {
    id: 'batteries',
    name: 'Batteries',
    icon: 'Battery',
    description: 'Check battery condition',
    components: [
      {
        id: 'starting_battery',
        name: 'Starting Battery',
        key: 'starting_battery',
        type: 'gyr_status',
        category: 'batteries',
        description: 'Starting battery condition',
      },
      {
        id: 'house_battery',
        name: 'House Battery',
        key: 'house_battery',
        type: 'gyr_status',
        category: 'batteries',
        description: 'House battery bank condition',
      },
      {
        id: 'emergency_battery',
        name: 'Emergency Battery',
        key: 'emergency_battery',
        type: 'gyr_status',
        category: 'batteries',
        description: 'Emergency battery condition',
      },
      {
        id: 'battery_voltage',
        name: 'Battery Voltage',
        key: 'battery_voltage',
        type: 'number',
        category: 'batteries',
        description: 'Battery voltage reading',
        unit: 'volts',
      },
    ],
  },
  {
    id: 'safety_equipment',
    name: 'Safety Equipment',
    icon: 'ShieldCheck',
    description: 'Verify safety equipment',
    components: [
      {
        id: 'fire_extinguisher',
        name: 'Fire Extinguisher',
        key: 'fire_extinguisher',
        type: 'gyr_status',
        category: 'safety_equipment',
        description: 'Fire extinguisher present and charged',
      },
      {
        id: 'first_aid_kit',
        name: 'First Aid Kit',
        key: 'first_aid_kit',
        type: 'gyr_status',
        category: 'safety_equipment',
        description: 'First aid kit present and stocked',
      },
      {
        id: 'life_jackets',
        name: 'Life Jackets',
        key: 'life_jackets',
        type: 'gyr_status',
        category: 'safety_equipment',
        description: 'Life jackets present and accessible',
      },
      {
        id: 'flares',
        name: 'Flares',
        key: 'flares',
        type: 'gyr_status',
        category: 'safety_equipment',
        description: 'Flares present and not expired',
      },
      {
        id: 'epirb',
        name: 'EPIRB',
        key: 'epirb',
        type: 'gyr_status',
        category: 'safety_equipment',
        description: 'EPIRB present and operational',
      },
      {
        id: 'life_raft',
        name: 'Life Raft',
        key: 'life_raft',
        type: 'gyr_status',
        category: 'safety_equipment',
        description: 'Life raft present and inspected',
      },
    ],
  },
  {
    id: 'navigation',
    name: 'Navigation Equipment',
    icon: 'Compass',
    description: 'Check navigation systems',
    components: [
      {
        id: 'gps',
        name: 'GPS',
        key: 'gps',
        type: 'gyr_status',
        category: 'navigation',
        description: 'GPS system operational',
      },
      {
        id: 'radar',
        name: 'Radar',
        key: 'radar',
        type: 'gyr_status',
        category: 'navigation',
        description: 'Radar system operational',
      },
      {
        id: 'vhf_radio',
        name: 'VHF Radio',
        key: 'vhf_radio',
        type: 'gyr_status',
        category: 'navigation',
        description: 'VHF radio operational',
      },
      {
        id: 'depth_finder',
        name: 'Depth Finder',
        key: 'depth_finder',
        type: 'gyr_status',
        category: 'navigation',
        description: 'Depth finder operational',
      },
      {
        id: 'compass',
        name: 'Compass',
        key: 'compass',
        type: 'gyr_status',
        category: 'navigation',
        description: 'Compass accurate and readable',
      },
    ],
  },
  {
    id: 'vehicle_systems',
    name: 'Vehicle Systems',
    icon: 'Car',
    description: 'Check vehicle components',
    components: [
      {
        id: 'odometer',
        name: 'Odometer Reading',
        key: 'odometer',
        type: 'hour_meter',
        category: 'vehicle_systems',
        description: 'Current odometer reading',
        unit: 'miles',
      },
      {
        id: 'tire_pressure_front',
        name: 'Front Tire Pressure',
        key: 'tire_pressure_front',
        type: 'number',
        category: 'vehicle_systems',
        description: 'Front tire pressure',
        unit: 'psi',
      },
      {
        id: 'tire_pressure_rear',
        name: 'Rear Tire Pressure',
        key: 'tire_pressure_rear',
        type: 'number',
        category: 'vehicle_systems',
        description: 'Rear tire pressure',
        unit: 'psi',
      },
      {
        id: 'brakes',
        name: 'Brakes',
        key: 'brakes',
        type: 'gyr_status',
        category: 'vehicle_systems',
        description: 'Brake system condition',
      },
      {
        id: 'lights',
        name: 'Lights',
        key: 'lights',
        type: 'gyr_status',
        category: 'vehicle_systems',
        description: 'All lights operational',
      },
      {
        id: 'horn',
        name: 'Horn',
        key: 'horn',
        type: 'gyr_status',
        category: 'vehicle_systems',
        description: 'Horn operational',
      },
    ],
  },
];

// Helper to get all components flat
export function getAllComponents(): ComponentDefinition[] {
  return COMPONENT_CATALOG.flatMap((category) => category.components);
}

// Helper to find component by ID
export function getComponentById(id: string): ComponentDefinition | undefined {
  return getAllComponents().find((c) => c.id === id);
}

// Helper to get category by ID
export function getCategoryById(id: string): ComponentCategory | undefined {
  return COMPONENT_CATALOG.find((c) => c.id === id);
}
