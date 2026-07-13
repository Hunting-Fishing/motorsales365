import { ServiceMainCategory } from '@/types/service';

// Agricultural Equipment Service Categories
export const agriculturalServiceCategories: ServiceMainCategory[] = [
  {
    id: 'ag-1',
    name: 'Tractor Services',
    description: 'Tractor maintenance and repair',
    position: 1,
    subcategories: [
      {
        id: 'ag-1-1',
        name: 'Engine & Fuel Systems',
        description: 'Tractor engine services',
        category_id: 'ag-1',
        jobs: [
          { id: 'ag-1-1-1', name: 'Oil Change & Filter Service', estimatedTime: 90, price: 285, subcategory_id: 'ag-1-1' },
          { id: 'ag-1-1-2', name: 'Fuel System Cleaning', estimatedTime: 120, price: 420, subcategory_id: 'ag-1-1' },
          { id: 'ag-1-1-3', name: 'Air Filter Replacement', estimatedTime: 30, price: 85, subcategory_id: 'ag-1-1' },
          { id: 'ag-1-1-4', name: 'Injector Service', estimatedTime: 240, price: 950, subcategory_id: 'ag-1-1' },
          { id: 'ag-1-1-5', name: 'Turbocharger Rebuild', estimatedTime: 480, price: 2800, subcategory_id: 'ag-1-1' }
        ]
      },
      {
        id: 'ag-1-2',
        name: 'Hydraulic Systems',
        description: 'Hydraulic maintenance and repair',
        category_id: 'ag-1',
        jobs: [
          { id: 'ag-1-2-1', name: 'Hydraulic Oil Change', estimatedTime: 120, price: 380, subcategory_id: 'ag-1-2' },
          { id: 'ag-1-2-2', name: 'Hydraulic Pump Repair', estimatedTime: 360, price: 1800, subcategory_id: 'ag-1-2' },
          { id: 'ag-1-2-3', name: 'Hydraulic Cylinder Rebuild', estimatedTime: 240, price: 850, subcategory_id: 'ag-1-2' },
          { id: 'ag-1-2-4', name: 'Hydraulic Hose Replacement', estimatedTime: 60, price: 220, subcategory_id: 'ag-1-2' },
          { id: 'ag-1-2-5', name: 'Three-Point Hitch Repair', estimatedTime: 180, price: 520, subcategory_id: 'ag-1-2' }
        ]
      },
      {
        id: 'ag-1-3',
        name: 'Transmission & PTO',
        description: 'Transmission and power take-off',
        category_id: 'ag-1',
        jobs: [
          { id: 'ag-1-3-1', name: 'Transmission Oil Service', estimatedTime: 90, price: 320, subcategory_id: 'ag-1-3' },
          { id: 'ag-1-3-2', name: 'Clutch Adjustment', estimatedTime: 60, price: 180, subcategory_id: 'ag-1-3' },
          { id: 'ag-1-3-3', name: 'PTO Shaft Repair', estimatedTime: 120, price: 420, subcategory_id: 'ag-1-3' },
          { id: 'ag-1-3-4', name: 'Transmission Rebuild', estimatedTime: 960, price: 6500, subcategory_id: 'ag-1-3' },
          { id: 'ag-1-3-5', name: 'Final Drive Service', estimatedTime: 240, price: 750, subcategory_id: 'ag-1-3' }
        ]
      }
    ]
  },
  {
    id: 'ag-2',
    name: 'Harvest Equipment',
    description: 'Combine and harvest equipment',
    position: 2,
    subcategories: [
      {
        id: 'ag-2-1',
        name: 'Combine Maintenance',
        description: 'Combine harvester services',
        category_id: 'ag-2',
        jobs: [
          { id: 'ag-2-1-1', name: 'Pre-Season Inspection', estimatedTime: 240, price: 650, subcategory_id: 'ag-2-1' },
          { id: 'ag-2-1-2', name: 'Header Drive Service', estimatedTime: 180, price: 520, subcategory_id: 'ag-2-1' },
          { id: 'ag-2-1-3', name: 'Feeder House Chain Replacement', estimatedTime: 360, price: 1500, subcategory_id: 'ag-2-1' },
          { id: 'ag-2-1-4', name: 'Rotor & Cage Inspection', estimatedTime: 300, price: 850, subcategory_id: 'ag-2-1' },
          { id: 'ag-2-1-5', name: 'Cleaning Shoe Adjustment', estimatedTime: 120, price: 350, subcategory_id: 'ag-2-1' }
        ]
      },
      {
        id: 'ag-2-2',
        name: 'Header Services',
        description: 'Combine header maintenance',
        category_id: 'ag-2',
        jobs: [
          { id: 'ag-2-2-1', name: 'Sickle Bar Replacement', estimatedTime: 180, price: 680, subcategory_id: 'ag-2-2' },
          { id: 'ag-2-2-2', name: 'Reel Bat Service', estimatedTime: 120, price: 420, subcategory_id: 'ag-2-2' },
          { id: 'ag-2-2-3', name: 'Knife Section Replacement', estimatedTime: 90, price: 280, subcategory_id: 'ag-2-2' },
          { id: 'ag-2-2-4', name: 'Header Float System Repair', estimatedTime: 150, price: 480, subcategory_id: 'ag-2-2' },
          { id: 'ag-2-2-5', name: 'Corn Head Rebuild', estimatedTime: 480, price: 2500, subcategory_id: 'ag-2-2' }
        ]
      }
    ]
  },
  {
    id: 'ag-3',
    name: 'Planting Equipment',
    description: 'Planters and seeders',
    position: 3,
    subcategories: [
      {
        id: 'ag-3-1',
        name: 'Planter Services',
        description: 'Planter maintenance and setup',
        category_id: 'ag-3',
        jobs: [
          { id: 'ag-3-1-1', name: 'Planter Calibration', estimatedTime: 180, price: 420, subcategory_id: 'ag-3-1' },
          { id: 'ag-3-1-2', name: 'Row Unit Rebuild', estimatedTime: 360, price: 1200, subcategory_id: 'ag-3-1' },
          { id: 'ag-3-1-3', name: 'Seed Meter Service', estimatedTime: 90, price: 280, subcategory_id: 'ag-3-1' },
          { id: 'ag-3-1-4', name: 'Closing Wheel Replacement', estimatedTime: 120, price: 350, subcategory_id: 'ag-3-1' },
          { id: 'ag-3-1-5', name: 'Monitor System Calibration', estimatedTime: 150, price: 380, subcategory_id: 'ag-3-1' }
        ]
      },
      {
        id: 'ag-3-2',
        name: 'Drill & Seeder Services',
        description: 'Grain drill and seeder maintenance',
        category_id: 'ag-3',
        jobs: [
          { id: 'ag-3-2-1', name: 'Drill Calibration', estimatedTime: 120, price: 320, subcategory_id: 'ag-3-2' },
          { id: 'ag-3-2-2', name: 'Seed Tube Replacement', estimatedTime: 90, price: 250, subcategory_id: 'ag-3-2' },
          { id: 'ag-3-2-3', name: 'Drive Chain Service', estimatedTime: 60, price: 180, subcategory_id: 'ag-3-2' },
          { id: 'ag-3-2-4', name: 'Disc Opener Replacement', estimatedTime: 180, price: 520, subcategory_id: 'ag-3-2' },
          { id: 'ag-3-2-5', name: 'Air Seeder Tank Cleaning', estimatedTime: 120, price: 280, subcategory_id: 'ag-3-2' }
        ]
      }
    ]
  },
  {
    id: 'ag-4',
    name: 'Tillage Equipment',
    description: 'Tillage and soil preparation',
    position: 4,
    subcategories: [
      {
        id: 'ag-4-1',
        name: 'Plow Services',
        description: 'Plow maintenance and repair',
        category_id: 'ag-4',
        jobs: [
          { id: 'ag-4-1-1', name: 'Plow Share Replacement', estimatedTime: 120, price: 350, subcategory_id: 'ag-4-1' },
          { id: 'ag-4-1-2', name: 'Moldboard Adjustment', estimatedTime: 60, price: 150, subcategory_id: 'ag-4-1' },
          { id: 'ag-4-1-3', name: 'Trip Beam Service', estimatedTime: 90, price: 280, subcategory_id: 'ag-4-1' },
          { id: 'ag-4-1-4', name: 'Shin Replacement', estimatedTime: 150, price: 420, subcategory_id: 'ag-4-1' },
          { id: 'ag-4-1-5', name: 'Hydraulic Reset Repair', estimatedTime: 180, price: 520, subcategory_id: 'ag-4-1' }
        ]
      },
      {
        id: 'ag-4-2',
        name: 'Disc & Cultivator',
        description: 'Disc and cultivator services',
        category_id: 'ag-4',
        jobs: [
          { id: 'ag-4-2-1', name: 'Disc Blade Replacement', estimatedTime: 240, price: 680, subcategory_id: 'ag-4-2' },
          { id: 'ag-4-2-2', name: 'Bearing & Seal Service', estimatedTime: 120, price: 350, subcategory_id: 'ag-4-2' },
          { id: 'ag-4-2-3', name: 'Gang Bolt Replacement', estimatedTime: 90, price: 220, subcategory_id: 'ag-4-2' },
          { id: 'ag-4-2-4', name: 'Cultivator Sweep Replacement', estimatedTime: 150, price: 420, subcategory_id: 'ag-4-2' },
          { id: 'ag-4-2-5', name: 'Spring Trip Assembly Repair', estimatedTime: 120, price: 320, subcategory_id: 'ag-4-2' }
        ]
      }
    ]
  },
  {
    id: 'ag-5',
    name: 'Sprayer Services',
    description: 'Sprayer maintenance and calibration',
    position: 5,
    subcategories: [
      {
        id: 'ag-5-1',
        name: 'Sprayer Maintenance',
        description: 'Sprayer system services',
        category_id: 'ag-5',
        jobs: [
          { id: 'ag-5-1-1', name: 'Sprayer Calibration', estimatedTime: 120, price: 320, subcategory_id: 'ag-5-1' },
          { id: 'ag-5-1-2', name: 'Pump Service', estimatedTime: 180, price: 520, subcategory_id: 'ag-5-1' },
          { id: 'ag-5-1-3', name: 'Nozzle Body Replacement', estimatedTime: 60, price: 180, subcategory_id: 'ag-5-1' },
          { id: 'ag-5-1-4', name: 'Boom Section Repair', estimatedTime: 240, price: 750, subcategory_id: 'ag-5-1' },
          { id: 'ag-5-1-5', name: 'Rate Controller Calibration', estimatedTime: 90, price: 280, subcategory_id: 'ag-5-1' }
        ]
      },
      {
        id: 'ag-5-2',
        name: 'Boom Services',
        description: 'Boom maintenance and repair',
        category_id: 'ag-5',
        jobs: [
          { id: 'ag-5-2-1', name: 'Boom Fold Cylinder Service', estimatedTime: 150, price: 480, subcategory_id: 'ag-5-2' },
          { id: 'ag-5-2-2', name: 'Breakaway Section Repair', estimatedTime: 120, price: 350, subcategory_id: 'ag-5-2' },
          { id: 'ag-5-2-3', name: 'Boom Height Control Service', estimatedTime: 90, price: 280, subcategory_id: 'ag-5-2' },
          { id: 'ag-5-2-4', name: 'Hose & Plumbing Replacement', estimatedTime: 180, price: 520, subcategory_id: 'ag-5-2' },
          { id: 'ag-5-2-5', name: 'Boom End Nozzle Service', estimatedTime: 60, price: 150, subcategory_id: 'ag-5-2' }
        ]
      }
    ]
  },
  {
    id: 'ag-6',
    name: 'Hay Equipment',
    description: 'Hay and forage equipment',
    position: 6,
    subcategories: [
      {
        id: 'ag-6-1',
        name: 'Baler Services',
        description: 'Baler maintenance and repair',
        category_id: 'ag-6',
        jobs: [
          { id: 'ag-6-1-1', name: 'Baler Inspection & Service', estimatedTime: 180, price: 450, subcategory_id: 'ag-6-1' },
          { id: 'ag-6-1-2', name: 'Twine Tension Adjustment', estimatedTime: 60, price: 120, subcategory_id: 'ag-6-1' },
          { id: 'ag-6-1-3', name: 'Plunger Bearing Service', estimatedTime: 240, price: 680, subcategory_id: 'ag-6-1' },
          { id: 'ag-6-1-4', name: 'Knotter Service & Timing', estimatedTime: 150, price: 420, subcategory_id: 'ag-6-1' },
          { id: 'ag-6-1-5', name: 'Bale Chamber Repair', estimatedTime: 360, price: 1200, subcategory_id: 'ag-6-1' }
        ]
      },
      {
        id: 'ag-6-2',
        name: 'Mower & Tedder',
        description: 'Mower and tedder services',
        category_id: 'ag-6',
        jobs: [
          { id: 'ag-6-2-1', name: 'Disc Mower Blade Replacement', estimatedTime: 120, price: 350, subcategory_id: 'ag-6-2' },
          { id: 'ag-6-2-2', name: 'Disc Mower Gearbox Service', estimatedTime: 180, price: 520, subcategory_id: 'ag-6-2' },
          { id: 'ag-6-2-3', name: 'Cutterbar Knife Replacement', estimatedTime: 90, price: 280, subcategory_id: 'ag-6-2' },
          { id: 'ag-6-2-4', name: 'Tedder Tine Replacement', estimatedTime: 120, price: 320, subcategory_id: 'ag-6-2' },
          { id: 'ag-6-2-5', name: 'Conditioner Roll Service', estimatedTime: 240, price: 750, subcategory_id: 'ag-6-2' }
        ]
      }
    ]
  },
  {
    id: 'ag-7',
    name: 'Precision Agriculture',
    description: 'GPS and precision farming systems',
    position: 7,
    subcategories: [
      {
        id: 'ag-7-1',
        name: 'GPS & Auto-Steer',
        description: 'GPS guidance systems',
        category_id: 'ag-7',
        jobs: [
          { id: 'ag-7-1-1', name: 'GPS Receiver Installation', estimatedTime: 180, price: 420, subcategory_id: 'ag-7-1' },
          { id: 'ag-7-1-2', name: 'Auto-Steer Calibration', estimatedTime: 120, price: 320, subcategory_id: 'ag-7-1' },
          { id: 'ag-7-1-3', name: 'Display Terminal Setup', estimatedTime: 90, price: 220, subcategory_id: 'ag-7-1' },
          { id: 'ag-7-1-4', name: 'Steering Valve Service', estimatedTime: 150, price: 380, subcategory_id: 'ag-7-1' },
          { id: 'ag-7-1-5', name: 'Subscription Activation & Support', estimatedTime: 60, price: 150, subcategory_id: 'ag-7-1' }
        ]
      },
      {
        id: 'ag-7-2',
        name: 'Yield Monitoring',
        description: 'Yield monitoring systems',
        category_id: 'ag-7',
        jobs: [
          { id: 'ag-7-2-1', name: 'Yield Monitor Calibration', estimatedTime: 120, price: 280, subcategory_id: 'ag-7-2' },
          { id: 'ag-7-2-2', name: 'Moisture Sensor Service', estimatedTime: 90, price: 220, subcategory_id: 'ag-7-2' },
          { id: 'ag-7-2-3', name: 'Mass Flow Sensor Repair', estimatedTime: 150, price: 420, subcategory_id: 'ag-7-2' },
          { id: 'ag-7-2-4', name: 'Data Transfer Setup', estimatedTime: 60, price: 120, subcategory_id: 'ag-7-2' },
          { id: 'ag-7-2-5', name: 'Variable Rate System Setup', estimatedTime: 180, price: 480, subcategory_id: 'ag-7-2' }
        ]
      }
    ]
  }
];

export const getAgriculturalServiceCategories = () => agriculturalServiceCategories;

export const searchAgriculturalServices = (query: string) => {
  const lowercaseQuery = query.toLowerCase();
  return agriculturalServiceCategories
    .map(category => ({
      ...category,
      subcategories: category.subcategories
        .map(subcategory => ({
          ...subcategory,
          jobs: subcategory.jobs.filter(job =>
            job.name.toLowerCase().includes(lowercaseQuery) ||
            job.description?.toLowerCase().includes(lowercaseQuery)
          )
        }))
        .filter(subcategory => subcategory.jobs.length > 0)
    }))
    .filter(category => category.subcategories.length > 0);
};
