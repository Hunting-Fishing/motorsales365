
/**
 * VIN validation utilities
 */
export const validateVin = (vin: string): boolean => {
  if (!vin || vin.length !== 17) {
    return false;
  }
  
  // Basic VIN validation - no I, O, Q characters allowed
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/i;
  return vinRegex.test(vin);
};

export const formatVin = (vin: string): string => {
  if (!vin) return '';
  return vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
};

export const getVinValidationError = (vin: string): string | null => {
  if (!vin) return 'VIN is required';
  if (vin.length !== 17) return 'VIN must be exactly 17 characters';
  if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return 'VIN contains invalid characters';
  return null;
};
