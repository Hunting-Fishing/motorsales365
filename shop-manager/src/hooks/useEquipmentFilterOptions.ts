import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FilterOptions {
  equipmentTypes: string[];
  locations: string[];
  statuses: string[];
  engineTypes: string[];
  fuelTypes: string[];
  isLoading: boolean;
}

export function useEquipmentFilterOptions(): FilterOptions {
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [engineTypes, setEngineTypes] = useState<string[]>([]);
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch distinct equipment types
        const { data: typeData } = await supabase
          .from('equipment_assets')
          .select('equipment_type')
          .not('equipment_type', 'is', null);
        
        const uniqueTypes = [...new Set(typeData?.map(d => d.equipment_type).filter(v => Boolean(v) && String(v).trim() !== ''))] as string[];
        setEquipmentTypes(uniqueTypes.sort());

        // Fetch distinct locations
        const { data: locationData } = await supabase
          .from('equipment_assets')
          .select('location')
          .not('location', 'is', null);
        
        const uniqueLocations = [...new Set(locationData?.map(d => d.location).filter(v => Boolean(v) && String(v).trim() !== ''))] as string[];
        setLocations(uniqueLocations.sort());

        // Fetch distinct statuses
        const { data: statusData } = await supabase
          .from('equipment_assets')
          .select('status')
          .not('status', 'is', null);
        
        const uniqueStatuses = [...new Set(statusData?.map(d => d.status).filter(v => Boolean(v) && String(v).trim() !== ''))] as string[];
        setStatuses(uniqueStatuses.sort());

        // Fetch distinct engine types
        const { data: engineTypeData } = await supabase
          .from('engines')
          .select('engine_type')
          .not('engine_type', 'is', null);
        
        const uniqueEngineTypes = [...new Set(engineTypeData?.map(d => d.engine_type).filter(v => Boolean(v) && String(v).trim() !== ''))] as string[];
        setEngineTypes(uniqueEngineTypes.sort());

        // Fetch distinct fuel types
        const { data: fuelTypeData } = await supabase
          .from('engines')
          .select('fuel_type')
          .not('fuel_type', 'is', null);
        
        const uniqueFuelTypes = [...new Set(fuelTypeData?.map(d => d.fuel_type).filter(v => Boolean(v) && String(v).trim() !== ''))] as string[];
        setFuelTypes(uniqueFuelTypes.sort());

      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilterOptions();
  }, []);

  return {
    equipmentTypes,
    locations,
    statuses,
    engineTypes,
    fuelTypes,
    isLoading
  };
}

// Helper to format equipment type for display
export function formatEquipmentType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
