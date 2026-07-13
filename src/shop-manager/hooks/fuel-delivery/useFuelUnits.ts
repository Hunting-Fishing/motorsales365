import { useState, useEffect, useCallback } from 'react';

export type UnitSystem = 'imperial' | 'metric';
export type VolumeUnit = 'gallons' | 'litres';
export type DistanceUnit = 'miles' | 'km';

interface FuelUnitPreferences {
  unitSystem: UnitSystem;
  volumeUnit: VolumeUnit;
}

const STORAGE_KEY = 'fuel-delivery-unit-preferences';

const DEFAULT_PREFERENCES: FuelUnitPreferences = {
  unitSystem: 'imperial',
  volumeUnit: 'gallons',
};

// Volume conversion constants
const GALLONS_TO_LITRES = 3.78541;
const LITRES_TO_GALLONS = 0.264172;

// Distance conversion constants
const MILES_TO_KM = 1.60934;
const KM_TO_MILES = 0.621371;

export function useFuelUnits() {
  const [preferences, setPreferences] = useState<FuelUnitPreferences>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_PREFERENCES;
      }
    }
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const setUnitSystem = useCallback((system: UnitSystem) => {
    setPreferences(prev => ({
      ...prev,
      unitSystem: system,
      volumeUnit: system === 'metric' ? 'litres' : 'gallons',
    }));
  }, []);

  const setVolumeUnit = useCallback((unit: VolumeUnit) => {
    setPreferences(prev => ({
      ...prev,
      volumeUnit: unit,
      unitSystem: unit === 'litres' ? 'metric' : 'imperial',
    }));
  }, []);

  // ==================== VOLUME CONVERSIONS ====================

  // Convert gallons to the current display unit
  const convertFromGallons = useCallback((gallons: number): number => {
    if (preferences.unitSystem === 'metric') {
      return gallons * GALLONS_TO_LITRES;
    }
    return gallons;
  }, [preferences.unitSystem]);

  // Convert from current display unit to gallons (for storage)
  const convertToGallons = useCallback((value: number): number => {
    if (preferences.unitSystem === 'metric') {
      return value * LITRES_TO_GALLONS;
    }
    return value;
  }, [preferences.unitSystem]);

  // Format a volume value with the appropriate unit label
  const formatVolume = useCallback((gallons: number, decimals: number = 1): string => {
    const converted = convertFromGallons(gallons);
    const formatted = converted.toFixed(decimals);
    return `${formatted} ${preferences.unitSystem === 'metric' ? 'L' : 'gal'}`;
  }, [convertFromGallons, preferences.unitSystem]);

  // Get the volume unit label
  const getUnitLabel = useCallback((short: boolean = true): string => {
    if (short) {
      return preferences.unitSystem === 'metric' ? 'L' : 'gal';
    }
    return preferences.unitSystem === 'metric' ? 'Litres' : 'Gallons';
  }, [preferences.unitSystem]);

  // Alias for getUnitLabel for clarity
  const getVolumeLabel = getUnitLabel;

  // Get price label (per litre or per gallon)
  const getPriceLabel = useCallback((short: boolean = true): string => {
    if (short) {
      return preferences.unitSystem === 'metric' ? '/L' : '/gal';
    }
    return preferences.unitSystem === 'metric' ? 'per Litre' : 'per Gallon';
  }, [preferences.unitSystem]);

  // ==================== DISTANCE CONVERSIONS ====================

  // Convert miles to the current display unit (km or miles)
  const convertFromMiles = useCallback((miles: number): number => {
    if (preferences.unitSystem === 'metric') {
      return miles * MILES_TO_KM;
    }
    return miles;
  }, [preferences.unitSystem]);

  // Convert from current display unit to miles (for storage)
  const convertToMiles = useCallback((value: number): number => {
    if (preferences.unitSystem === 'metric') {
      return value * KM_TO_MILES;
    }
    return value;
  }, [preferences.unitSystem]);

  // Format a distance value with the appropriate unit label
  const formatDistance = useCallback((miles: number, decimals: number = 1): string => {
    const converted = convertFromMiles(miles);
    const formatted = converted.toFixed(decimals);
    return `${formatted} ${preferences.unitSystem === 'metric' ? 'km' : 'mi'}`;
  }, [convertFromMiles, preferences.unitSystem]);

  // Get the distance unit label
  const getDistanceLabel = useCallback((short: boolean = true): string => {
    if (short) {
      return preferences.unitSystem === 'metric' ? 'km' : 'mi';
    }
    return preferences.unitSystem === 'metric' ? 'Kilometers' : 'Miles';
  }, [preferences.unitSystem]);

  // Get distance rate label (per km or per mile)
  const getDistanceRateLabel = useCallback((short: boolean = true): string => {
    if (short) {
      return preferences.unitSystem === 'metric' ? '/km' : '/mi';
    }
    return preferences.unitSystem === 'metric' ? 'per Kilometer' : 'per Mile';
  }, [preferences.unitSystem]);

  // Get the distance unit for turf.js
  const getTurfDistanceUnit = useCallback((): 'miles' | 'kilometers' => {
    return preferences.unitSystem === 'metric' ? 'kilometers' : 'miles';
  }, [preferences.unitSystem]);

  return {
    // Unit system
    unitSystem: preferences.unitSystem,
    volumeUnit: preferences.volumeUnit,
    distanceUnit: (preferences.unitSystem === 'metric' ? 'km' : 'miles') as DistanceUnit,
    setUnitSystem,
    setVolumeUnit,
    isMetric: preferences.unitSystem === 'metric',
    
    // Volume functions
    convertFromGallons,
    convertToGallons,
    formatVolume,
    getUnitLabel,
    getVolumeLabel,
    getPriceLabel,
    
    // Distance functions
    convertFromMiles,
    convertToMiles,
    formatDistance,
    getDistanceLabel,
    getDistanceRateLabel,
    getTurfDistanceUnit,
  };
}
