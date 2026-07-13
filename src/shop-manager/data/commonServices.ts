
// Define the type for service items
type ServiceItem = {
  name: string;
  services: string[];
};

export type ServiceCategory = {
  name: string;
  subcategories: ServiceItem[];
};

// Main service categories with their subcategories
export const serviceCategories: ServiceCategory[] = [
  {
    name: "ADJUST - DIAGNOSE - SYMPTOMS",
    subcategories: [
      {
        name: "Adjustments",
        services: [
          "Diagnostic Charges",
          "Check Outs",
          "Mileage Services",
          "Road Services & Towing"
        ]
      },
      {
        name: "Car Symptoms",
        services: [
          "Engine Performance",
          "Starting & Lights",
          "Noises & Comforts",
          "Vibrations & Leaks"
        ]
      }
    ]
  },
  {
    name: "BASIC MAINTENANCE",
    subcategories: [
      {
        name: "Regular Services",
        services: [
          "Lubrication & Filter",
          "Tune-Up & Maintenance",
          "Belts & Hoses",
          "Mileage Services",
          "Quick Job Combinations"
        ]
      },
      {
        name: "System Services",
        services: [
          "Battery - Starting & Charging",
          "Air Conditioning Services",
          "Cooling System Services",
          "Transmission Services"
        ]
      }
    ]
  },
  {
    name: "BRAKES & WHEELS",
    subcategories: [
      {
        name: "Brake Systems",
        services: [
          "Front Brake Services",
          "Rear Brake Services",
          "Anti Lock Controls",
          "Master Cylinder Services",
          "Emergency Brake"
        ]
      },
      {
        name: "Wheel Services",
        services: [
          "Tire & Wheel Services",
          "Alignment Services",
          "Hardware Installation",
          "Test & Adjust Services"
        ]
      }
    ]
  },
  {
    name: "COOLING SYSTEM & BELTS",
    subcategories: [
      {
        name: "Cooling Components",
        services: [
          "Radiator Service",
          "Thermostat Service",
          "Water Pump Service",
          "Fan & Fan Clutch"
        ]
      },
      {
        name: "System Services",
        services: [
          "Belt Replacement",
          "Hose Service",
          "Heater Service",
          "Electrical Fan Service"
        ]
      }
    ]
  },
  {
    name: "COMPUTERS & ELECTRONICS",
    subcategories: [
      {
        name: "Computer Systems",
        services: [
          "Control Modules",
          "Fuel Injection",
          "Body Control Module",
          "Sensors & Senders"
        ]
      },
      {
        name: "Electronic Components",
        services: [
          "Relays & Solenoids",
          "Switches",
          "Actuators",
          "Diagnostic Service"
        ]
      }
    ]
  },
  {
    name: "DRIVE TRAIN & AXLES",
    subcategories: [
      {
        name: "Drive Train",
        services: [
          "Clutch Service",
          "Drive Shaft Service",
          "U-Joint Service",
          "Transmission Service"
        ]
      },
      {
        name: "Axle Services",
        services: [
          "Front Axle Service",
          "Rear Axle Service",
          "Differential Service",
          "Suspension Service"
        ]
      }
    ]
  },
  {
    name: "ELECTRICAL & LIGHTS",
    subcategories: [
      {
        name: "Electrical Systems",
        services: [
          "Battery Service",
          "Starting System",
          "Charging System",
          "Wiring Service"
        ]
      },
      {
        name: "Lighting",
        services: [
          "Headlight Service",
          "Signal Light Service",
          "Interior Light Service",
          "Electrical Testing"
        ]
      }
    ]
  },
  {
    name: "ENGINE & VALVE TRAIN",
    subcategories: [
      {
        name: "Engine Services",
        services: [
          "Engine Overhaul",
          "Timing Chain Service",
          "Oil Pan Service",
          "Engine Mount Service"
        ]
      },
      {
        name: "Valve Train",
        services: [
          "Cylinder Head Service",
          "Valve Adjustment",
          "Gasket Service",
          "Filter Service"
        ]
      }
    ]
  },
  {
    name: "EXHAUST & EMISSIONS",
    subcategories: [
      {
        name: "Exhaust System",
        services: [
          "Exhaust Service",
          "Catalytic Converter",
          "Muffler Service",
          "Pipe Service"
        ]
      },
      {
        name: "Emissions",
        services: [
          "EGR System",
          "Air Management",
          "Evaporative System",
          "Emissions Testing"
        ]
      }
    ]
  },
  {
    name: "FRONT END & SUSPENSION",
    subcategories: [
      {
        name: "Front End",
        services: [
          "Ball Joint Service",
          "Control Arm Service",
          "Steering Service",
          "Alignment Service"
        ]
      },
      {
        name: "Suspension",
        services: [
          "Shock Service",
          "Strut Service",
          "Spring Service",
          "Stabilizer Service"
        ]
      }
    ]
  },
  {
    name: "FUEL SYSTEM & TUNE-UP",
    subcategories: [
      {
        name: "Fuel System",
        services: [
          "Fuel Pump Service",
          "Fuel Filter Service",
          "Fuel Line Service",
          "Fuel Injection Service"
        ]
      },
      {
        name: "Tune-Up Services",
        services: [
          "Complete Tune-Up",
          "Spark Plug Service",
          "Ignition Service",
          "CARBURETOR CONTROLS"
        ]
      }
    ]
  },
  {
    name: "HEATING & AIR CONDITIONING",
    subcategories: [
      {
        name: "AC Services",
        services: [
          "Compressor Service",
          "Condenser Service",
          "Evaporator Service",
          "Refrigerant Service"
        ]
      },
      {
        name: "Heating System",
        services: [
          "Heater Core Service",
          "Blower Motor Service",
          "Temperature Control",
          "Vent Service"
        ]
      }
    ]
  },
  {
    name: "MISCELLANEOUS & ACCESSORIES",
    subcategories: [
      {
        name: "Accessories",
        services: [
          "Cruise Control",
          "Audio System",
          "Alarm System",
          "Power Accessories"
        ]
      },
      {
        name: "Body Components",
        services: [
          "Door Service",
          "Window Service",
          "Mirror Service",
          "Wiper Service"
        ]
      }
    ]
  },
  {
    name: "STEERING & GAUGES",
    subcategories: [
      {
        name: "Steering Components",
        services: [
          "Steering Column",
          "Power Steering",
          "Rack & Pinion",
          "Steering Linkage"
        ]
      },
      {
        name: "Gauges & Controls",
        services: [
          "Dashboard Gauges",
          "Electronic Display",
          "Speedometer Service",
          "Control Switch Service"
        ]
      }
    ]
  },
  {
    name: "TRANSMISSION & TRANS-AXLE",
    subcategories: [
      {
        name: "Transmission",
        services: [
          "Automatic Transmission",
          "Manual Transmission",
          "Transmission Control",
          "Linkage Service"
        ]
      },
      {
        name: "Trans-Axle",
        services: [
          "Trans-Axle Service",
          "Clutch Service",
          "Control Service",
          "Diagnostic Service"
        ]
      }
    ]
  }
];
