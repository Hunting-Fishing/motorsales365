import { useState, useEffect, useCallback } from 'react';

export type UnitSystem = 'imperial' | 'metric';
export type VolumeUnit = 'gallons' | 'litres';
export type DistanceUnit = 'miles' | 'km';

interface WaterUnitPreferences {
  unitSystem: UnitSystem;
  volumeUnit: VolumeUnit;
}

const STORAGE_KEY = 'water-delivery-unit-preferences';

const DEFAULT_PREFERENCES: WaterUnitPreferences = {
  unitSystem: 'imperial',
  volumeUnit: 'gallons',
};

// Volume conversion constants
const GALLONS_TO_LITRES = 3.78541;
const LITRES_TO_GALLONS = 0.264172;

// Distance conversion constants
const MILES_TO_KM = 1.60934;
const KM_TO_MILES = 0.621371;

export function useWaterUnits() {
  const [preferences, setPreferences] = useState<WaterUnitPreferences>(() => {
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

  const convertFromGallons = useCallback((gallons: number): number => {
    if (preferences.unitSystem === 'metric') {
      return gallons * GALLONS_TO_LITRES;
    }
    return gallons;
  }, [preferences.unitSystem]);

  const convertToGallons = useCallback((value: number): number => {
    if (preferences.unitSystem === 'metric') {
      return value * LITRES_TO_GALLONS;
    }
    return value;
  }, [preferences.unitSystem]);

  const formatVolume = useCallback((gallons: number, decimals: number = 1): string => {
    const converted = convertFromGallons(gallons);
    const formatted = converted.toFixed(decimals);
    return `${formatted} ${preferences.unitSystem === 'metric' ? 'L' : 'gal'}`;
  }, [convertFromGallons, preferences.unitSystem]);

  const getUnitLabel = useCallback((short: boolean = true): string => {
    if (short) {
      return preferences.unitSystem === 'metric' ? 'L' : 'gal';
    }
    return preferences.unitSystem === 'metric' ? 'Litres' : 'Gallons';
  }, [preferences.unitSystem]);

  const getVolumeLabel = getUnitLabel;

  const getPriceLabel = useCallback((short: boolean = true): string => {
    if (short) {
      return preferences.unitSystem === 'metric' ? '/L' : '/gal';
    }
    return preferences.unitSystem === 'metric' ? 'per Litre' : 'per Gallon';
  }, [preferences.unitSystem]);

  // ==================== DISTANCE CONVERSIONS ====================

  const convertFromMiles = useCallback((miles: number): number => {
    if (preferences.unitSystem === 'metric') {
      return miles * MILES_TO_KM;
    }
    return miles;
  }, [preferences.unitSystem]);

  const convertToMiles = useCallback((value: number): number => {
    if (preferences.unitSystem === 'metric') {
      return value * KM_TO_MILES;
    }
    return value;
  }, [preferences.unitSystem]);

  const formatDistance = useCallback((miles: number, decimals: number = 1): string => {
    const converted = convertFromMiles(miles);
    const formatted = converted.toFixed(decimals);
    return `${formatted} ${preferences.unitSystem === 'metric' ? 'km' : 'mi'}`;
  }, [convertFromMiles, preferences.unitSystem]);

  const getDistanceLabel = useCallback((short: boolean = true): string => {
    if (short) {
      return preferences.unitSystem === 'metric' ? 'km' : 'mi';
    }
    return preferences.unitSystem === 'metric' ? 'Kilometers' : 'Miles';
  }, [preferences.unitSystem]);

  const getDistanceRateLabel = useCallback((short: boolean = true): string => {
    if (short) {
      return preferences.unitSystem === 'metric' ? '/km' : '/mi';
    }
    return preferences.unitSystem === 'metric' ? 'per Kilometer' : 'per Mile';
  }, [preferences.unitSystem]);

  const getTurfDistanceUnit = useCallback((): 'miles' | 'kilometers' => {
    return preferences.unitSystem === 'metric' ? 'kilometers' : 'miles';
  }, [preferences.unitSystem]);

  return {
    unitSystem: preferences.unitSystem,
    volumeUnit: preferences.volumeUnit,
    distanceUnit: (preferences.unitSystem === 'metric' ? 'km' : 'miles') as DistanceUnit,
    setUnitSystem,
    setVolumeUnit,
    isMetric: preferences.unitSystem === 'metric',
    
    convertFromGallons,
    convertToGallons,
    formatVolume,
    getUnitLabel,
    getVolumeLabel,
    getPriceLabel,
    
    convertFromMiles,
    convertToMiles,
    formatDistance,
    getDistanceLabel,
    getDistanceRateLabel,
    getTurfDistanceUnit,
  };
}
