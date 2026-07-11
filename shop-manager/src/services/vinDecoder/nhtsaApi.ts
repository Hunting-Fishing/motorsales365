
import { VinDecodeResult } from '@/types/vehicle';

/**
 * NHTSA VIN decoding API integration
 */
export const decodeVinWithNHTSA = async (vin: string): Promise<VinDecodeResult | null> => {
  console.log('Attempting VIN decode with NHTSA API for:', vin);
  
  const response = await fetch(
    `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`NHTSA API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.Results && Array.isArray(data.Results)) {
    const results = data.Results;
    
    const getValueByVariable = (variableId: number): string => {
      const result = results.find(r => r.VariableId === variableId);
      return result?.Value || '';
    };

    return {
      year: parseInt(getValueByVariable(29)) || null,
      make: getValueByVariable(26) || null,
      model: getValueByVariable(28) || null,
      transmission: getValueByVariable(37) || null,
      fuel_type: getValueByVariable(24) || null,
      engine: getValueByVariable(13) || null,
      body_style: getValueByVariable(5) || null,
      country: getValueByVariable(27) || null,
      trim: getValueByVariable(109) || null,
      gvwr: getValueByVariable(25) || null,
    };
  }
  
  throw new Error('Invalid response format from NHTSA API');
};
