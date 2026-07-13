
// Comprehensive automotive service taxonomy for professional categorization
export interface ServiceTaxonomyEntry {
  keywords: string[];
  category: string;
  color: string;
  subcategories?: string[];
  relatedTerms?: string[];
  typicalLabor?: number; // hours
  complexity?: 'basic' | 'intermediate' | 'advanced';
}

export const AUTOMOTIVE_SERVICE_TAXONOMY: ServiceTaxonomyEntry[] = [
  // Engine Services
  {
    keywords: ['engine', 'motor', 'cylinder', 'piston', 'valve', 'camshaft', 'crankshaft', 'timing', 'compression'],
    category: 'Engine',
    color: 'bg-red-100 text-red-800 border-red-300',
    subcategories: ['Timing', 'Valvetrain', 'Internal Components'],
    relatedTerms: ['rebuild', 'overhaul', 'tune-up'],
    complexity: 'advanced'
  },
  // Oil & Lubrication
  {
    keywords: ['oil', 'lube', 'lubrication', 'filter', 'synthetic', 'conventional'],
    category: 'Oil & Lubrication',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    subcategories: ['Oil Changes', 'Filter Services'],
    typicalLabor: 0.5,
    complexity: 'basic'
  },
  // Brake System
  {
    keywords: ['brake', 'braking', 'pad', 'rotor', 'disc', 'drum', 'caliper', 'master cylinder', 'brake fluid'],
    category: 'Brakes',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    subcategories: ['Brake Pads', 'Rotors', 'Brake Lines', 'Brake Fluid'],
    complexity: 'intermediate'
  },
  // Suspension & Steering
  {
    keywords: ['suspension', 'shock', 'strut', 'spring', 'steering', 'alignment', 'wheel', 'bearing'],
    category: 'Suspension & Steering',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    subcategories: ['Shocks & Struts', 'Springs', 'Steering Components'],
    complexity: 'intermediate'
  },
  // Exhaust System
  {
    keywords: ['exhaust', 'muffler', 'catalytic', 'converter', 'tailpipe', 'emissions', 'pipe'],
    category: 'Exhaust',
    color: 'bg-amber-900 text-amber-100 border-amber-700',
    subcategories: ['Mufflers', 'Catalytic Converters', 'Exhaust Pipes'],
    complexity: 'intermediate'
  },
  // Cooling System
  {
    keywords: ['cooling', 'coolant', 'radiator', 'thermostat', 'water pump', 'hose', 'antifreeze'],
    category: 'Cooling',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    subcategories: ['Radiator', 'Water Pump', 'Thermostat', 'Coolant Service'],
    complexity: 'intermediate'
  },
  // Electrical System
  {
    keywords: ['electrical', 'battery', 'alternator', 'starter', 'wiring', 'fuse', 'light', 'ignition'],
    category: 'Electrical',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    subcategories: ['Battery', 'Charging System', 'Starting System', 'Lighting'],
    complexity: 'intermediate'
  },
  // Transmission
  {
    keywords: ['transmission', 'trans', 'gearbox', 'clutch', 'differential', 'driveline', 'axle'],
    category: 'Transmission',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    subcategories: ['Automatic', 'Manual', 'CVT', 'Differential'],
    complexity: 'advanced'
  },
  // Tires & Wheels
  {
    keywords: ['tire', 'wheel', 'rim', 'balance', 'rotation', 'mounting', 'tread'],
    category: 'Tires & Wheels',
    color: 'bg-slate-100 text-slate-800 border-slate-300',
    subcategories: ['Tire Installation', 'Wheel Balance', 'Tire Rotation'],
    complexity: 'basic'
  },
  // Air Conditioning
  {
    keywords: ['air conditioning', 'ac', 'hvac', 'compressor', 'refrigerant', 'condenser', 'evaporator'],
    category: 'Air Conditioning',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    subcategories: ['A/C Service', 'Compressor', 'Refrigerant'],
    complexity: 'intermediate'
  },
  // Fuel System
  {
    keywords: ['fuel', 'injector', 'pump', 'tank', 'carburetor', 'throttle', 'intake'],
    category: 'Fuel System',
    color: 'bg-green-100 text-green-800 border-green-300',
    subcategories: ['Fuel Injection', 'Fuel Pump', 'Fuel Filter'],
    complexity: 'intermediate'
  }
];

export const findServiceCategory = (serviceName: string): ServiceTaxonomyEntry | null => {
  const normalizedName = serviceName.toLowerCase();
  
  // First, try exact keyword matching
  for (const entry of AUTOMOTIVE_SERVICE_TAXONOMY) {
    if (entry.keywords.some(keyword => normalizedName.includes(keyword))) {
      return entry;
    }
  }
  
  // Then try related terms
  for (const entry of AUTOMOTIVE_SERVICE_TAXONOMY) {
    if (entry.relatedTerms?.some(term => normalizedName.includes(term))) {
      return entry;
    }
  }
  
  return null;
};

export const getDefaultColor = (): string => {
  return 'bg-gray-100 text-gray-800 border-gray-300';
};

export const getCategoryColor = (serviceName: string): string => {
  const category = findServiceCategory(serviceName);
  return category?.color || getDefaultColor();
};

export const getRecommendedCategory = (serviceName: string): string | null => {
  const category = findServiceCategory(serviceName);
  return category?.category || null;
};
