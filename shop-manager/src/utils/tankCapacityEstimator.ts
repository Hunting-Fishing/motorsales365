/**
 * Estimate tank capacity based on vehicle body style
 * Returns estimated capacity in gallons
 */
export const estimateTankCapacity = (bodyStyle: string | undefined): number => {
  if (!bodyStyle) return 15; // Default
  
  const style = bodyStyle.toLowerCase();
  
  // Trucks and large vehicles
  if (style.includes('pickup') || style.includes('truck')) {
    return 26;
  }
  
  // SUVs and crossovers
  if (style.includes('suv') || style.includes('sport utility') || style.includes('crossover')) {
    return 21;
  }
  
  // Vans
  if (style.includes('van') || style.includes('minivan')) {
    return 20;
  }
  
  // Wagons
  if (style.includes('wagon') || style.includes('estate')) {
    return 16;
  }
  
  // Sedans
  if (style.includes('sedan') || style.includes('saloon')) {
    return 14;
  }
  
  // Compact/Hatchback
  if (style.includes('hatch') || style.includes('compact') || style.includes('coupe')) {
    return 12;
  }
  
  // Convertibles
  if (style.includes('convertible') || style.includes('roadster')) {
    return 13;
  }
  
  return 15; // Default for unknown types
};

/**
 * Map vehicle fuel type from VIN decode to preferred fuel type value
 */
export const mapFuelTypeToPreference = (fuelType: string | undefined): string => {
  if (!fuelType) return '';
  
  const fuel = fuelType.toLowerCase();
  
  if (fuel.includes('diesel')) {
    return 'diesel';
  }
  
  if (fuel.includes('electric')) {
    return 'electric';
  }
  
  if (fuel.includes('hybrid')) {
    return 'hybrid';
  }
  
  if (fuel.includes('propane') || fuel.includes('lpg')) {
    return 'propane';
  }
  
  // Default to gasoline - will need octane selection
  if (fuel.includes('gasoline') || fuel.includes('gas') || fuel.includes('petrol') || fuel.includes('flex')) {
    return 'gasoline_87'; // Default to regular
  }
  
  return '';
};
