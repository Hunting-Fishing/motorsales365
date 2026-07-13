
// Marine service hierarchy types and utilities
import { ServiceMainCategory } from '@/types/service';

// Comprehensive marine service categories
export const marineServiceCategories: ServiceMainCategory[] = [
  {
    id: 'marine-1',
    name: 'Engine Service & Repair',
    description: 'Outboard, inboard, and sterndrive engine services',
    position: 1,
    subcategories: [
      {
        id: 'marine-1-1',
        name: 'Outboard Engine Service',
        jobs: [
          { id: 'marine-1-1-1', name: '100 Hour Service', estimatedTime: 180, price: 350 },
          { id: 'marine-1-1-2', name: 'Annual Service', estimatedTime: 240, price: 450 },
          { id: 'marine-1-1-3', name: 'Winterization Service', estimatedTime: 120, price: 250 },
          { id: 'marine-1-1-4', name: 'Spring Commissioning', estimatedTime: 150, price: 300 },
          { id: 'marine-1-1-5', name: 'Spark Plug Replacement', estimatedTime: 60, price: 120 },
          { id: 'marine-1-1-6', name: 'Lower Unit Service', estimatedTime: 90, price: 180 }
        ]
      },
      {
        id: 'marine-1-2',
        name: 'Inboard Engine Service',
        jobs: [
          { id: 'marine-1-2-1', name: 'Oil Change & Filter', estimatedTime: 90, price: 200 },
          { id: 'marine-1-2-2', name: 'Cooling System Service', estimatedTime: 120, price: 280 },
          { id: 'marine-1-2-3', name: 'Impeller Replacement', estimatedTime: 90, price: 180 },
          { id: 'marine-1-2-4', name: 'Timing Belt Replacement', estimatedTime: 300, price: 850 },
          { id: 'marine-1-2-5', name: 'Valve Adjustment', estimatedTime: 180, price: 400 }
        ]
      },
      {
        id: 'marine-1-3',
        name: 'Sterndrive Service',
        jobs: [
          { id: 'marine-1-3-1', name: 'Bellows Replacement', estimatedTime: 240, price: 650 },
          { id: 'marine-1-3-2', name: 'Gimbal Bearing Replacement', estimatedTime: 300, price: 800 },
          { id: 'marine-1-3-3', name: 'U-Joint Replacement', estimatedTime: 180, price: 450 },
          { id: 'marine-1-3-4', name: 'Gear Lube Service', estimatedTime: 60, price: 120 }
        ]
      },
      {
        id: 'marine-1-4',
        name: 'Fuel System',
        jobs: [
          { id: 'marine-1-4-1', name: 'Fuel Filter Replacement', estimatedTime: 45, price: 95 },
          { id: 'marine-1-4-2', name: 'Fuel Pump Replacement', estimatedTime: 120, price: 350 },
          { id: 'marine-1-4-3', name: 'Carburetor Rebuild', estimatedTime: 180, price: 450 },
          { id: 'marine-1-4-4', name: 'Fuel Injector Service', estimatedTime: 150, price: 380 },
          { id: 'marine-1-4-5', name: 'Fuel Line Replacement', estimatedTime: 90, price: 220 }
        ]
      }
    ]
  },
  {
    id: 'marine-2',
    name: 'Propulsion & Steering',
    description: 'Propeller, steering, and drive system services',
    position: 2,
    subcategories: [
      {
        id: 'marine-2-1',
        name: 'Propeller Services',
        jobs: [
          { id: 'marine-2-1-1', name: 'Propeller Repair', estimatedTime: 120, price: 180 },
          { id: 'marine-2-1-2', name: 'Propeller Balancing', estimatedTime: 60, price: 95 },
          { id: 'marine-2-1-3', name: 'Prop Installation', estimatedTime: 45, price: 75 },
          { id: 'marine-2-1-4', name: 'Prop Shaft Seal Replacement', estimatedTime: 180, price: 420 }
        ]
      },
      {
        id: 'marine-2-2',
        name: 'Steering System',
        jobs: [
          { id: 'marine-2-2-1', name: 'Hydraulic Steering Service', estimatedTime: 120, price: 280 },
          { id: 'marine-2-2-2', name: 'Steering Cable Replacement', estimatedTime: 150, price: 350 },
          { id: 'marine-2-2-3', name: 'Power Steering Pump Replacement', estimatedTime: 180, price: 450 },
          { id: 'marine-2-2-4', name: 'Helm Replacement', estimatedTime: 90, price: 220 }
        ]
      },
      {
        id: 'marine-2-3',
        name: 'Trim & Tilt',
        jobs: [
          { id: 'marine-2-3-1', name: 'Trim/Tilt Motor Replacement', estimatedTime: 120, price: 380 },
          { id: 'marine-2-3-2', name: 'Hydraulic Cylinder Service', estimatedTime: 180, price: 480 },
          { id: 'marine-2-3-3', name: 'Trim Sender Replacement', estimatedTime: 60, price: 150 }
        ]
      }
    ]
  },
  {
    id: 'marine-3',
    name: 'Electrical Systems',
    description: 'Battery, charging, and electrical component services',
    position: 3,
    subcategories: [
      {
        id: 'marine-3-1',
        name: 'Battery & Charging',
        jobs: [
          { id: 'marine-3-1-1', name: 'Battery Test & Service', estimatedTime: 30, price: 65 },
          { id: 'marine-3-1-2', name: 'Battery Replacement', estimatedTime: 45, price: 95 },
          { id: 'marine-3-1-3', name: 'Alternator Replacement', estimatedTime: 120, price: 350 },
          { id: 'marine-3-1-4', name: 'Voltage Regulator Replacement', estimatedTime: 90, price: 220 },
          { id: 'marine-3-1-5', name: 'Battery Isolator Installation', estimatedTime: 120, price: 280 }
        ]
      },
      {
        id: 'marine-3-2',
        name: 'Ignition System',
        jobs: [
          { id: 'marine-3-2-1', name: 'Ignition Switch Replacement', estimatedTime: 60, price: 150 },
          { id: 'marine-3-2-2', name: 'Starter Motor Replacement', estimatedTime: 150, price: 420 },
          { id: 'marine-3-2-3', name: 'Ignition Coil Replacement', estimatedTime: 90, price: 220 },
          { id: 'marine-3-2-4', name: 'Kill Switch Replacement', estimatedTime: 45, price: 95 }
        ]
      },
      {
        id: 'marine-3-3',
        name: 'Electronics',
        jobs: [
          { id: 'marine-3-3-1', name: 'GPS/Chart Plotter Installation', estimatedTime: 180, price: 380 },
          { id: 'marine-3-3-2', name: 'Fishfinder Installation', estimatedTime: 120, price: 250 },
          { id: 'marine-3-3-3', name: 'VHF Radio Installation', estimatedTime: 90, price: 220 },
          { id: 'marine-3-3-4', name: 'Gauge Replacement', estimatedTime: 60, price: 150 },
          { id: 'marine-3-3-5', name: 'Wiring Harness Repair', estimatedTime: 150, price: 350 }
        ]
      }
    ]
  },
  {
    id: 'marine-4',
    name: 'Hull & Structural',
    description: 'Fiberglass repair, gel coat, and structural services',
    position: 4,
    subcategories: [
      {
        id: 'marine-4-1',
        name: 'Fiberglass Repair',
        jobs: [
          { id: 'marine-4-1-1', name: 'Minor Fiberglass Repair', estimatedTime: 180, price: 350 },
          { id: 'marine-4-1-2', name: 'Major Hull Repair', estimatedTime: 480, price: 1200 },
          { id: 'marine-4-1-3', name: 'Blister Repair', estimatedTime: 240, price: 650 },
          { id: 'marine-4-1-4', name: 'Transom Repair', estimatedTime: 360, price: 950 }
        ]
      },
      {
        id: 'marine-4-2',
        name: 'Gel Coat & Paint',
        jobs: [
          { id: 'marine-4-2-1', name: 'Gel Coat Repair', estimatedTime: 240, price: 580 },
          { id: 'marine-4-2-2', name: 'Bottom Paint', estimatedTime: 300, price: 750 },
          { id: 'marine-4-2-3', name: 'Hull Buffing & Wax', estimatedTime: 180, price: 350 },
          { id: 'marine-4-2-4', name: 'Non-Skid Restoration', estimatedTime: 240, price: 650 }
        ]
      },
      {
        id: 'marine-4-3',
        name: 'Through-Hull Fittings',
        jobs: [
          { id: 'marine-4-3-1', name: 'Through-Hull Installation', estimatedTime: 120, price: 280 },
          { id: 'marine-4-3-2', name: 'Seacock Replacement', estimatedTime: 90, price: 220 },
          { id: 'marine-4-3-3', name: 'Transducer Installation', estimatedTime: 60, price: 150 }
        ]
      }
    ]
  },
  {
    id: 'marine-5',
    name: 'Plumbing & Systems',
    description: 'Freshwater, wastewater, and bilge systems',
    position: 5,
    subcategories: [
      {
        id: 'marine-5-1',
        name: 'Bilge Systems',
        jobs: [
          { id: 'marine-5-1-1', name: 'Bilge Pump Replacement', estimatedTime: 90, price: 180 },
          { id: 'marine-5-1-2', name: 'Bilge Float Switch Replacement', estimatedTime: 45, price: 95 },
          { id: 'marine-5-1-3', name: 'High Water Alarm Installation', estimatedTime: 60, price: 150 }
        ]
      },
      {
        id: 'marine-5-2',
        name: 'Freshwater System',
        jobs: [
          { id: 'marine-5-2-1', name: 'Water Pump Replacement', estimatedTime: 90, price: 220 },
          { id: 'marine-5-2-2', name: 'Water Heater Service', estimatedTime: 120, price: 280 },
          { id: 'marine-5-2-3', name: 'Tank Cleaning', estimatedTime: 180, price: 380 },
          { id: 'marine-5-2-4', name: 'Water System Sanitization', estimatedTime: 90, price: 150 }
        ]
      },
      {
        id: 'marine-5-3',
        name: 'Waste System',
        jobs: [
          { id: 'marine-5-3-1', name: 'Head Service', estimatedTime: 120, price: 250 },
          { id: 'marine-5-3-2', name: 'Holding Tank Pump-Out', estimatedTime: 45, price: 85 },
          { id: 'marine-5-3-3', name: 'Macerator Pump Replacement', estimatedTime: 90, price: 220 }
        ]
      },
      {
        id: 'marine-5-4',
        name: 'Live Well Systems',
        jobs: [
          { id: 'marine-5-4-1', name: 'Live Well Pump Replacement', estimatedTime: 90, price: 180 },
          { id: 'marine-5-4-2', name: 'Aerator Service', estimatedTime: 60, price: 120 },
          { id: 'marine-5-4-3', name: 'Overflow Valve Replacement', estimatedTime: 45, price: 95 }
        ]
      }
    ]
  },
  {
    id: 'marine-6',
    name: 'Trailer Service',
    description: 'Boat trailer maintenance and repair',
    position: 6,
    subcategories: [
      {
        id: 'marine-6-1',
        name: 'Wheel & Tire',
        jobs: [
          { id: 'marine-6-1-1', name: 'Bearing Pack & Seal', estimatedTime: 90, price: 150 },
          { id: 'marine-6-1-2', name: 'Tire Replacement', estimatedTime: 45, price: 95 },
          { id: 'marine-6-1-3', name: 'Brake Service', estimatedTime: 120, price: 280 },
          { id: 'marine-6-1-4', name: 'Wheel Bearing Replacement', estimatedTime: 120, price: 220 }
        ]
      },
      {
        id: 'marine-6-2',
        name: 'Trailer Components',
        jobs: [
          { id: 'marine-6-2-1', name: 'Winch Replacement', estimatedTime: 60, price: 150 },
          { id: 'marine-6-2-2', name: 'Light Wiring Repair', estimatedTime: 90, price: 180 },
          { id: 'marine-6-2-3', name: 'Bunk Board Replacement', estimatedTime: 120, price: 250 },
          { id: 'marine-6-2-4', name: 'Roller Replacement', estimatedTime: 90, price: 180 },
          { id: 'marine-6-2-5', name: 'Trailer Jack Replacement', estimatedTime: 60, price: 120 }
        ]
      }
    ]
  },
  {
    id: 'marine-7',
    name: 'Safety & Accessories',
    description: 'Safety equipment and marine accessories',
    position: 7,
    subcategories: [
      {
        id: 'marine-7-1',
        name: 'Safety Equipment',
        jobs: [
          { id: 'marine-7-1-1', name: 'Fire Extinguisher Inspection', estimatedTime: 15, price: 35 },
          { id: 'marine-7-1-2', name: 'Life Jacket Inspection', estimatedTime: 30, price: 50 },
          { id: 'marine-7-1-3', name: 'Flare Kit Replacement', estimatedTime: 15, price: 45 },
          { id: 'marine-7-1-4', name: 'Safety Equipment Package', estimatedTime: 60, price: 150 }
        ]
      },
      {
        id: 'marine-7-2',
        name: 'Canvas & Upholstery',
        jobs: [
          { id: 'marine-7-2-1', name: 'Canvas Repair', estimatedTime: 120, price: 250 },
          { id: 'marine-7-2-2', name: 'Seat Reupholstery', estimatedTime: 180, price: 450 },
          { id: 'marine-7-2-3', name: 'Bimini Top Installation', estimatedTime: 90, price: 220 },
          { id: 'marine-7-2-4', name: 'Mooring Cover Installation', estimatedTime: 60, price: 150 }
        ]
      },
      {
        id: 'marine-7-3',
        name: 'Anchor & Mooring',
        jobs: [
          { id: 'marine-7-3-1', name: 'Anchor Windlass Service', estimatedTime: 120, price: 280 },
          { id: 'marine-7-3-2', name: 'Anchor Line Replacement', estimatedTime: 45, price: 95 },
          { id: 'marine-7-3-3', name: 'Cleat Installation', estimatedTime: 60, price: 120 }
        ]
      }
    ]
  },
  {
    id: 'marine-8',
    name: 'Diagnostics & Inspection',
    description: 'Pre-purchase surveys and diagnostic services',
    position: 8,
    subcategories: [
      {
        id: 'marine-8-1',
        name: 'Inspections',
        jobs: [
          { id: 'marine-8-1-1', name: 'Pre-Purchase Survey', estimatedTime: 240, price: 650 },
          { id: 'marine-8-1-2', name: 'Annual Safety Inspection', estimatedTime: 120, price: 250 },
          { id: 'marine-8-1-3', name: 'Insurance Survey', estimatedTime: 180, price: 450 },
          { id: 'marine-8-1-4', name: 'Sea Trial', estimatedTime: 120, price: 280 }
        ]
      },
      {
        id: 'marine-8-2',
        name: 'Diagnostics',
        jobs: [
          { id: 'marine-8-2-1', name: 'Engine Diagnostics', estimatedTime: 90, price: 180 },
          { id: 'marine-8-2-2', name: 'Electrical System Diagnostics', estimatedTime: 120, price: 220 },
          { id: 'marine-8-2-3', name: 'Compression Test', estimatedTime: 60, price: 120 },
          { id: 'marine-8-2-4', name: 'Fuel System Diagnostics', estimatedTime: 90, price: 180 }
        ]
      }
    ]
  }
];

export const getMarineServiceCategories = () => marineServiceCategories;

export const getMarineServiceJobs = () => {
  return marineServiceCategories.flatMap(category => 
    category.subcategories.flatMap(subcategory => subcategory.jobs)
  );
};

export const searchMarineServices = (query: string): ServiceMainCategory[] => {
  const lowerQuery = query.toLowerCase();
  
  return marineServiceCategories
    .map(category => ({
      ...category,
      subcategories: category.subcategories
        .map(subcategory => ({
          ...subcategory,
          jobs: subcategory.jobs.filter(job => 
            job.name.toLowerCase().includes(lowerQuery) ||
            (job.description?.toLowerCase().includes(lowerQuery) ?? false)
          )
        }))
        .filter(subcategory => subcategory.jobs.length > 0)
    }))
    .filter(category => category.subcategories.length > 0);
};
