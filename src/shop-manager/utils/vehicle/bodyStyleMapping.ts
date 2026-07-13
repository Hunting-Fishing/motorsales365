export type VehicleBodyStyle = 'sedan' | 'suv' | 'pickup' | 'coupe' | 'hatchback' | 'wagon' | 'convertible' | 'van';

export interface VehicleImages {
  front: string;
  back: string;
  top: string;
  side: string;
}

// Vehicle make/model to body style mapping
const vehicleBodyStyleMap: Record<string, Record<string, VehicleBodyStyle>> = {
  // Jeep models
  jeep: {
    compass: 'suv',
    wrangler: 'suv',
    cherokee: 'suv',
    'grand cherokee': 'suv',
    renegade: 'suv',
    gladiator: 'pickup',
  },
  
  // Toyota models
  toyota: {
    tacoma: 'pickup',
    tundra: 'pickup',
    '4runner': 'suv',
    highlander: 'suv',
    'rav4': 'suv',
    'land cruiser': 'suv',
    sequoia: 'suv',
    camry: 'sedan',
    corolla: 'sedan',
    prius: 'hatchback',
    sienna: 'van',
  },
  
  // Ford models
  ford: {
    'f-150': 'pickup',
    'f-250': 'pickup',
    'f-350': 'pickup',
    ranger: 'pickup',
    maverick: 'pickup',
    explorer: 'suv',
    expedition: 'suv',
    escape: 'suv',
    bronco: 'suv',
    'bronco sport': 'suv',
    mustang: 'coupe',
    fusion: 'sedan',
    fiesta: 'hatchback',
  },
  
  // Chevrolet models
  chevrolet: {
    silverado: 'pickup',
    colorado: 'pickup',
    tahoe: 'suv',
    suburban: 'suv',
    equinox: 'suv',
    traverse: 'suv',
    blazer: 'suv',
    malibu: 'sedan',
    impala: 'sedan',
    cruze: 'sedan',
    spark: 'hatchback',
  },
  
  // Honda models
  honda: {
    ridgeline: 'pickup',
    pilot: 'suv',
    'cr-v': 'suv',
    'hr-v': 'suv',
    passport: 'suv',
    accord: 'sedan',
    civic: 'sedan',
    fit: 'hatchback',
    odyssey: 'van',
  },
  
  // Nissan models
  nissan: {
    frontier: 'pickup',
    titan: 'pickup',
    pathfinder: 'suv',
    armada: 'suv',
    rogue: 'suv',
    murano: 'suv',
    kicks: 'suv',
    altima: 'sedan',
    sentra: 'sedan',
    versa: 'sedan',
  },
  
  // GMC models
  gmc: {
    sierra: 'pickup',
    canyon: 'pickup',
    yukon: 'suv',
    acadia: 'suv',
    terrain: 'suv',
    envoy: 'suv',
  },
  
  // Ram models
  ram: {
    '1500': 'pickup',
    '2500': 'pickup',
    '3500': 'pickup',
    'promaster': 'van',
  },
  
  // Subaru models
  subaru: {
    outback: 'wagon',
    forester: 'suv',
    ascent: 'suv',
    'crosstrek': 'suv',
    impreza: 'hatchback',
    legacy: 'sedan',
    brz: 'coupe',
  },
};

/**
 * Determines the body style of a vehicle based on make and model
 */
export function getVehicleBodyStyle(make: string, model: string): VehicleBodyStyle {
  const normalizedMake = make.toLowerCase().trim();
  const normalizedModel = model.toLowerCase().trim();
  
  const makeMap = vehicleBodyStyleMap[normalizedMake];
  if (makeMap && makeMap[normalizedModel]) {
    return makeMap[normalizedModel];
  }
  
  // Fallback logic based on common naming patterns
  const modelLower = normalizedModel;
  
  // Pickup truck patterns
  if (modelLower.includes('truck') || 
      modelLower.includes('f-') ||
      modelLower.includes('silverado') ||
      modelLower.includes('ram') ||
      modelLower.includes('tacoma') ||
      modelLower.includes('tundra') ||
      modelLower.includes('frontier') ||
      modelLower.includes('ranger')) {
    return 'pickup';
  }
  
  // SUV/Crossover patterns
  if (modelLower.includes('suv') ||
      modelLower.includes('explorer') ||
      modelLower.includes('tahoe') ||
      modelLower.includes('suburban') ||
      modelLower.includes('pilot') ||
      modelLower.includes('highlander') ||
      modelLower.includes('pathfinder') ||
      modelLower.includes('compass') ||
      modelLower.includes('cherokee') ||
      modelLower.includes('wrangler')) {
    return 'suv';
  }
  
  // Van patterns
  if (modelLower.includes('van') ||
      modelLower.includes('sienna') ||
      modelLower.includes('odyssey') ||
      modelLower.includes('caravan')) {
    return 'van';
  }
  
  // Coupe patterns
  if (modelLower.includes('coupe') ||
      modelLower.includes('mustang') ||
      modelLower.includes('camaro') ||
      modelLower.includes('corvette')) {
    return 'coupe';
  }
  
  // Hatchback patterns
  if (modelLower.includes('hatchback') ||
      modelLower.includes('golf') ||
      modelLower.includes('civic hatch') ||
      modelLower.includes('fit') ||
      modelLower.includes('prius')) {
    return 'hatchback';
  }
  
  // Default to sedan for unknown vehicles
  return 'sedan';
}

/**
 * Gets the appropriate vehicle images based on body style
 */
export function getVehicleImages(bodyStyle: VehicleBodyStyle): VehicleImages {
  switch (bodyStyle) {
    case 'suv':
      return {
        front: '/src/assets/vehicle-suv-front-view.jpg',
        back: '/src/assets/vehicle-suv-back-view.jpg',
        top: '/src/assets/vehicle-suv-top-view.jpg',
        side: '/src/assets/vehicle-suv-side-view.jpg',
      };
    
    case 'pickup':
      return {
        front: '/src/assets/vehicle-pickup-front-view.jpg',
        back: '/src/assets/vehicle-pickup-back-view.jpg',
        top: '/src/assets/vehicle-pickup-top-view.jpg',
        side: '/src/assets/vehicle-pickup-side-view.jpg',
      };
    
    case 'sedan':
    case 'coupe':
    case 'hatchback':
    case 'wagon':
    case 'convertible':
    case 'van':
    default:
      return {
        front: '/src/assets/vehicle-front-view.jpg',
        back: '/src/assets/vehicle-back-view.jpg',
        top: '/src/assets/vehicle-top-view.jpg',
        side: '/src/assets/vehicle-side-view.jpg',
      };
  }
}

/**
 * Gets vehicle images for a specific make and model
 */
export function getVehicleImagesByMakeModel(make: string, model: string): VehicleImages {
  const bodyStyle = getVehicleBodyStyle(make, model);
  return getVehicleImages(bodyStyle);
}