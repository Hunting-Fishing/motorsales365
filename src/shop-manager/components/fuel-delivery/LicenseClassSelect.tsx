import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// License classifications by jurisdiction
// Canada uses Class 1-6 system (with some variations)
// US uses Class A, B, C system

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

const CANADIAN_PROVINCES = [
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
];

// US CDL Classes
const US_CDL_CLASSES = [
  { value: 'A', label: 'Class A - Combination vehicles (tractor-trailers)' },
  { value: 'B', label: 'Class B - Heavy straight vehicles' },
  { value: 'C', label: 'Class C - Small vehicles with hazmat/passengers' },
];

// Canadian license classes (general - most provinces use similar system)
const CANADIAN_LICENSE_CLASSES = [
  { value: '1', label: 'Class 1 - Semi-trailer trucks' },
  { value: '2', label: 'Class 2 - Buses (24+ passengers)' },
  { value: '3', label: 'Class 3 - Trucks with 3+ axles' },
  { value: '4', label: 'Class 4 - Buses, ambulances, taxis' },
  { value: '5', label: 'Class 5 - Standard vehicles, light trucks' },
  { value: '6', label: 'Class 6 - Motorcycles' },
];

// Quebec uses different naming
const QUEBEC_LICENSE_CLASSES = [
  { value: '1', label: 'Classe 1 - Tracteur routier' },
  { value: '2', label: 'Classe 2 - Autobus (24+ passagers)' },
  { value: '3', label: 'Classe 3 - Camion 3+ essieux' },
  { value: '4A', label: 'Classe 4A - Véhicules d\'urgence' },
  { value: '4B', label: 'Classe 4B - Minibus, taxi' },
  { value: '4C', label: 'Classe 4C - Taxi' },
  { value: '5', label: 'Classe 5 - Véhicule de promenade' },
  { value: '6A', label: 'Classe 6A - Motocyclette' },
];

interface LicenseClassSelectProps {
  value: string;
  onChange: (value: string) => void;
  stateProvince: string;
  placeholder?: string;
  disabled?: boolean;
}

export function LicenseClassSelect({
  value,
  onChange,
  stateProvince,
  placeholder = 'Select license class',
  disabled = false,
}: LicenseClassSelectProps) {
  const licenseClasses = useMemo(() => {
    const normalized = stateProvince?.toUpperCase().trim() || '';
    
    // Check if it's a US state
    if (US_STATES.includes(normalized)) {
      return US_CDL_CLASSES;
    }
    
    // Check if it's Quebec (different naming)
    if (normalized === 'QC' || normalized === 'QUEBEC') {
      return QUEBEC_LICENSE_CLASSES;
    }
    
    // Check if it's a Canadian province/territory
    if (CANADIAN_PROVINCES.includes(normalized)) {
      return CANADIAN_LICENSE_CLASSES;
    }
    
    // Default: show both systems for flexibility
    return [
      { value: 'header-us', label: '— USA CDL Classes —', disabled: true },
      ...US_CDL_CLASSES,
      { value: 'header-ca', label: '— Canadian License Classes —', disabled: true },
      ...CANADIAN_LICENSE_CLASSES,
    ];
  }, [stateProvince]);

  const jurisdiction = useMemo(() => {
    const normalized = stateProvince?.toUpperCase().trim() || '';
    if (US_STATES.includes(normalized)) return 'us';
    if (CANADIAN_PROVINCES.includes(normalized)) return 'ca';
    return 'unknown';
  }, [stateProvince]);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {jurisdiction === 'unknown' && !stateProvince && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            Enter state/province first for accurate options
          </div>
        )}
        {licenseClasses.map((cls, idx) => (
          cls.value.startsWith('header-') || cls.value === '' ? (
            <div key={idx} className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
              {cls.label}
            </div>
          ) : (
            <SelectItem key={cls.value} value={cls.value}>
              {cls.label}
            </SelectItem>
          )
        ))}
      </SelectContent>
    </Select>
  );
}

// Also export the jurisdiction detection for use elsewhere
export function getJurisdiction(stateProvince: string): 'us' | 'ca' | 'unknown' {
  const normalized = stateProvince?.toUpperCase().trim() || '';
  if (US_STATES.includes(normalized)) return 'us';
  if (CANADIAN_PROVINCES.includes(normalized)) return 'ca';
  return 'unknown';
}
