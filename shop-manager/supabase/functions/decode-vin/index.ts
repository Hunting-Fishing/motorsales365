
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VinDecodeResult {
  year: string | number | null;
  make: string | null;
  model: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  engine?: string | null;
  body_style?: string | null;
  country?: string | null;
  trim?: string | null;
  gvwr?: string | null;
  color?: string | null;
  drive_type?: string | null;
}

// Enhanced VIN analysis when API is unavailable
const performFallbackVinAnalysis = (vin: string): VinDecodeResult => {
  console.log('Performing enhanced fallback VIN analysis for:', vin);
  
  // Extract year from VIN (10th character)
  const yearChar = vin.charAt(9);
  const year = getYearFromVinChar(yearChar);
  
  // Extract country from first character
  const countryChar = vin.charAt(0);
  const country = getCountryFromVinChar(countryChar);
  
  // Enhanced make detection from WMI (first 3 characters)
  const wmi = vin.substring(0, 3);
  const make = getMakeFromWMI(wmi);
  
  // Try to extract more info from VIN structure
  const model = getModelFromVin(vin, make);
  
  return {
    year,
    make,
    model,
    country,
    transmission: null,
    fuel_type: null,
    engine: null,
    body_style: null,
    trim: null,
    gvwr: null,
    color: null,
    drive_type: null,
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
  if (['V', 'W', 'X', 'Y'].includes(firstChar)) return 'Europe';
  
  return 'Unknown';
}

function getMakeFromWMI(wmi: string): string {
  const wmiMap: { [key: string]: string } = {
    // General Motors
    '1G1': 'Chevrolet', '1G6': 'Cadillac', '1GM': 'Pontiac', '1GC': 'Chevrolet',
    '1GB': 'Chevrolet', '1GK': 'GMC', '1GT': 'GMC', '2G1': 'Chevrolet',
    '2GN': 'Chevrolet', // Equinox WMI
    
    // Ford
    '1FA': 'Ford', '1FB': 'Ford', '1FC': 'Ford', '1FD': 'Ford', 
    '1FM': 'Ford', '1FT': 'Ford', '2FA': 'Ford', '3FA': 'Ford',
    
    // Honda
    '1H': 'Honda', '2H': 'Honda', '5J': 'Honda', 'JH': 'Honda',
    
    // Toyota
    '4T': 'Toyota', '5T': 'Toyota', 'JT': 'Toyota', '2T': 'Toyota',
    
    // Nissan
    '1N': 'Nissan', '3N': 'Nissan', '5N': 'Nissan', 'JN': 'Nissan',
    
    // European brands
    'WAU': 'Audi', 'WBA': 'BMW', 'WDB': 'Mercedes-Benz', 'WVW': 'Volkswagen',
    'YV1': 'Volvo', 'SAL': 'Land Rover', 'SAJ': 'Jaguar',
    
    // Hyundai/Kia
    'KM': 'Hyundai', 'KN': 'Kia', 'KMA': 'Hyundai', 'KNA': 'Kia',
    
    // Chrysler/Jeep
    '1C': 'Chrysler', '1J': 'Jeep', '2C': 'Chrysler',
    
    // Mazda
    '4F': 'Mazda', 'JM': 'Mazda',
    
    // Subaru
    '4S': 'Subaru', 'JF': 'Subaru',
    
    // Mitsubishi
    'JA': 'Mitsubishi', '4A': 'Mitsubishi',
  };
  
  // Try exact 3-character match first
  if (wmiMap[wmi]) return wmiMap[wmi];
  
  // Try first two characters
  const twoChar = wmi.substring(0, 2);
  if (wmiMap[twoChar]) return wmiMap[twoChar];
  
  // Try first character patterns for broader matching
  const firstChar = wmi.charAt(0);
  if (firstChar === '1') {
    // US manufacturers
    if (wmi.includes('G')) return 'General Motors';
    if (wmi.includes('F')) return 'Ford';
    return 'Unknown US Make';
  }
  if (firstChar === '2') return 'General Motors'; // Often GM Canada
  if (firstChar === 'J') return 'Japanese Make';
  if (firstChar === 'K') return 'Korean Make';
  if (firstChar === 'W') return 'German Make';
  
  return 'Unknown';
}

function getModelFromVin(vin: string, make: string): string {
  // For specific VIN pattern matching
  const wmi = vin.substring(0, 3);
  const vds = vin.substring(3, 9); // Vehicle descriptor section
  
  // Chevrolet Equinox patterns
  if ((make === 'Chevrolet' || make === 'General Motors') && wmi === '2GN') {
    return 'Equinox';
  }
  
  // Add more specific model detection patterns here as needed
  return 'Unknown';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vin } = await req.json();
    console.log('Decoding VIN:', vin);
    
    if (!vin || vin.length !== 17) {
      return new Response(
        JSON.stringify({ error: 'Invalid VIN format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let result: VinDecodeResult | null = null;

    // Try NHTSA API first
    try {
      console.log('Attempting NHTSA API call...');
      const nhtsaResponse = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'VIN-Decoder-Service/1.0'
          },
        }
      );

      if (!nhtsaResponse.ok) {
        throw new Error(`NHTSA API error: ${nhtsaResponse.status}`);
      }

      const data = await nhtsaResponse.json();
      console.log('NHTSA API response received');
      
      if (data.Results && Array.isArray(data.Results)) {
        const results = data.Results;
        
        const getValueByVariable = (variableId: number): string => {
          const result = results.find((r: any) => r.VariableId === variableId);
          return result?.Value || '';
        };

        // Map NHTSA variable IDs to vehicle data
        const year = getValueByVariable(29);
        const make = getValueByVariable(26);
        const model = getValueByVariable(28);
        const transmission = getValueByVariable(37);
        const fuel_type = getValueByVariable(24);
        const engine = getValueByVariable(13);
        const body_style = getValueByVariable(5);
        const country = getValueByVariable(27);
        const trim = getValueByVariable(109);
        const gvwr = getValueByVariable(25);
        const drive_type = getValueByVariable(15);

        result = {
          year: year ? parseInt(year) : null,
          make: make || null,
          model: model || null,
          transmission: transmission || null,
          fuel_type: fuel_type || null,
          engine: engine || null,
          body_style: body_style || null,
          country: country || null,
          trim: trim || null,
          gvwr: gvwr || null,
          color: null, // NHTSA doesn't provide color
          drive_type: drive_type || null,
        };

        console.log('NHTSA decode successful:', result);
      }
    } catch (nhtsaError) {
      console.log('NHTSA API failed:', nhtsaError.message);
      // Continue to fallback
    }

    // If NHTSA failed or returned no useful data, use fallback analysis
    if (!result || (!result.make && !result.model && !result.year)) {
      console.log('Using fallback VIN analysis');
      result = performFallbackVinAnalysis(vin);
      console.log('Fallback analysis result:', result);
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('VIN decode error:', error);
    
    // Return a minimal fallback result instead of an error
    try {
      const { vin: errorVin } = await req.clone().json().catch(() => ({ vin: '' }));
      if (errorVin && errorVin.length === 17) {
        const fallbackResult = performFallbackVinAnalysis(errorVin);
        console.log('Emergency fallback result:', fallbackResult);
        return new Response(
          JSON.stringify(fallbackResult),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } catch (fallbackError) {
      console.error('Fallback analysis failed:', fallbackError);
    }
    
    return new Response(
      JSON.stringify({ error: error.message || 'VIN decode failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
