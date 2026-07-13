
import { VinDecodeResult } from '@/types/vehicle';

/**
 * Basic VIN analysis when API is unavailable
 */
export const performFallbackVinAnalysis = (vin: string): VinDecodeResult => {
  console.log('Performing fallback VIN analysis for:', vin);
  
  // Extract year from VIN (10th character)
  const yearChar = vin.charAt(9);
  const year = getYearFromVinChar(yearChar);
  
  // Extract country from first character
  const countryChar = vin.charAt(0);
  const country = getCountryFromVinChar(countryChar);
  
  // Basic make detection from WMI (first 3 characters)
  const wmi = vin.substring(0, 3);
  const make = getMakeFromWMI(wmi);
  
  return {
    year,
    make,
    model: 'Unknown',
    country,
    transmission: null,
    fuel_type: null,
    engine: null,
    body_style: null,
    trim: null,
    gvwr: null,
  };
};

function getYearFromVinChar(char: string): number | null {
  const yearMap: { [key: string]: number } = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
    'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
    'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
    'Y': 2030, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
    '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009
  };
  
  return yearMap[char.toUpperCase()] || null;
}

function getCountryFromVinChar(char: string): string {
  const firstChar = char.toUpperCase();
  
  if (['1', '4', '5'].includes(firstChar)) return 'United States';
  if (['2'].includes(firstChar)) return 'Canada';
  if (['3'].includes(firstChar)) return 'Mexico';
  if (['J'].includes(firstChar)) return 'Japan';
  if (['K', 'L'].includes(firstChar)) return 'South Korea';
  if (['S', 'Z'].includes(firstChar)) return 'Europe';
  if (['V', 'W', 'X', 'Y', 'Z'].includes(firstChar)) return 'Europe';
  
  return 'Unknown';
}

function getMakeFromWMI(wmi: string): string {
  const wmiMap: { [key: string]: string } = {
    '1G1': 'Chevrolet', '1G6': 'Cadillac', '1GM': 'Pontiac', '1GC': 'Chevrolet',
    '1GB': 'Chevrolet', '1GK': 'GMC', '1GT': 'GMC', '1FA': 'Ford', '1FB': 'Ford',
    '1FC': 'Ford', '1FD': 'Ford', '1FM': 'Ford', '1FT': 'Ford', '1H': 'Honda',
    '1J': 'Jeep', '1L': 'Lincoln', '1M': 'Mercury', '1N': 'Nissan', '1VW': 'Volkswagen',
    '2G': 'Chevrolet', '2C': 'Chrysler', '2F': 'Ford', '2H': 'Honda', '2T': 'Toyota',
    '3F': 'Ford', '3G': 'Chevrolet', '3N': 'Nissan', '3VW': 'Volkswagen',
    '4F': 'Mazda', '4J': 'Mercedes-Benz', '4S': 'Subaru', '4T': 'Toyota', '4U': 'BMW',
    '5F': 'Honda', '5J': 'Honda', '5L': 'Lincoln', '5N': 'Nissan', '5T': 'Toyota',
    'JH': 'Honda', 'JM': 'Mazda', 'JN': 'Nissan', 'JT': 'Toyota', 'KM': 'Hyundai',
    'KN': 'Kia', 'SAL': 'Land Rover', 'SAJ': 'Jaguar', 'WAU': 'Audi', 'WBA': 'BMW',
    'WDB': 'Mercedes-Benz', 'WVW': 'Volkswagen', 'YV1': 'Volvo'
  };
  
  // Try exact match first
  if (wmiMap[wmi]) return wmiMap[wmi];
  
  // Try first two characters
  const twoChar = wmi.substring(0, 2);
  if (wmiMap[twoChar]) return wmiMap[twoChar];
  
  // Try first character patterns
  const firstChar = wmi.charAt(0);
  if (firstChar === '1') return 'Ford';
  if (firstChar === '2') return 'Chevrolet';
  if (firstChar === 'J') return 'Honda';
  if (firstChar === 'K') return 'Hyundai';
  if (firstChar === 'W') return 'BMW';
  
  return 'Unknown';
}
