import { ServiceMainCategory } from '@/types/service';

// Heavy Duty Truck & Equipment Service Categories
export const heavyDutyServiceCategories: ServiceMainCategory[] = [
  {
    id: 'hd-1',
    name: 'Engine Services',
    description: 'Heavy duty engine maintenance and repair',
    position: 1,
    subcategories: [
      {
        id: 'hd-1-1',
        name: 'Engine Maintenance',
        description: 'Regular engine maintenance services',
        category_id: 'hd-1',
        jobs: [
          { id: 'hd-1-1-1', name: 'Oil Change & Filter - Class 8', estimatedTime: 90, price: 350, subcategory_id: 'hd-1-1' },
          { id: 'hd-1-1-2', name: 'Fuel Filter Replacement', estimatedTime: 60, price: 180, subcategory_id: 'hd-1-1' },
          { id: 'hd-1-1-3', name: 'Air Filter Service', estimatedTime: 45, price: 120, subcategory_id: 'hd-1-1' },
          { id: 'hd-1-1-4', name: 'DEF System Service', estimatedTime: 60, price: 200, subcategory_id: 'hd-1-1' },
          { id: 'hd-1-1-5', name: 'Coolant System Flush', estimatedTime: 120, price: 450, subcategory_id: 'hd-1-1' }
        ]
      },
      {
        id: 'hd-1-2',
        name: 'Engine Repair',
        description: 'Major engine repair services',
        category_id: 'hd-1',
        jobs: [
          { id: 'hd-1-2-1', name: 'Turbocharger Replacement', estimatedTime: 480, price: 3500, subcategory_id: 'hd-1-2' },
          { id: 'hd-1-2-2', name: 'Injector Replacement', estimatedTime: 360, price: 2800, subcategory_id: 'hd-1-2' },
          { id: 'hd-1-2-3', name: 'EGR System Repair', estimatedTime: 300, price: 2200, subcategory_id: 'hd-1-2' },
          { id: 'hd-1-2-4', name: 'Head Gasket Replacement', estimatedTime: 600, price: 4500, subcategory_id: 'hd-1-2' },
          { id: 'hd-1-2-5', name: 'Engine Overhaul - In-Frame', estimatedTime: 2400, price: 12000, subcategory_id: 'hd-1-2' }
        ]
      }
    ]
  },
  {
    id: 'hd-2',
    name: 'Transmission & Drivetrain',
    description: 'Transmission and drivetrain services',
    position: 2,
    subcategories: [
      {
        id: 'hd-2-1',
        name: 'Transmission Service',
        description: 'Transmission maintenance and repair',
        category_id: 'hd-2',
        jobs: [
          { id: 'hd-2-1-1', name: 'Transmission Oil Change', estimatedTime: 120, price: 550, subcategory_id: 'hd-2-1' },
          { id: 'hd-2-1-2', name: 'Clutch Adjustment', estimatedTime: 90, price: 280, subcategory_id: 'hd-2-1' },
          { id: 'hd-2-1-3', name: 'Clutch Replacement', estimatedTime: 480, price: 3200, subcategory_id: 'hd-2-1' },
          { id: 'hd-2-1-4', name: 'Transmission Rebuild', estimatedTime: 1200, price: 8500, subcategory_id: 'hd-2-1' },
          { id: 'hd-2-1-5', name: 'Shift Linkage Repair', estimatedTime: 120, price: 380, subcategory_id: 'hd-2-1' }
        ]
      },
      {
        id: 'hd-2-2',
        name: 'Differential & Axle',
        description: 'Differential and axle services',
        category_id: 'hd-2',
        jobs: [
          { id: 'hd-2-2-1', name: 'Differential Oil Change', estimatedTime: 90, price: 320, subcategory_id: 'hd-2-2' },
          { id: 'hd-2-2-2', name: 'Wheel Bearing Service', estimatedTime: 180, price: 650, subcategory_id: 'hd-2-2' },
          { id: 'hd-2-2-3', name: 'Differential Rebuild', estimatedTime: 600, price: 4200, subcategory_id: 'hd-2-2' },
          { id: 'hd-2-2-4', name: 'Driveshaft U-Joint Replacement', estimatedTime: 240, price: 850, subcategory_id: 'hd-2-2' },
          { id: 'hd-2-2-5', name: 'Axle Seal Replacement', estimatedTime: 180, price: 520, subcategory_id: 'hd-2-2' }
        ]
      }
    ]
  },
  {
    id: 'hd-3',
    name: 'Air Brake Systems',
    description: 'Air brake maintenance and repair',
    position: 3,
    subcategories: [
      {
        id: 'hd-3-1',
        name: 'Brake Maintenance',
        description: 'Regular brake system maintenance',
        category_id: 'hd-3',
        jobs: [
          { id: 'hd-3-1-1', name: 'Air Brake Inspection', estimatedTime: 60, price: 185, subcategory_id: 'hd-3-1' },
          { id: 'hd-3-1-2', name: 'Brake Adjustment - All Axles', estimatedTime: 120, price: 350, subcategory_id: 'hd-3-1' },
          { id: 'hd-3-1-3', name: 'Air Dryer Service', estimatedTime: 90, price: 280, subcategory_id: 'hd-3-1' },
          { id: 'hd-3-1-4', name: 'Slack Adjuster Replacement', estimatedTime: 150, price: 480, subcategory_id: 'hd-3-1' },
          { id: 'hd-3-1-5', name: 'Air Compressor Service', estimatedTime: 180, price: 650, subcategory_id: 'hd-3-1' }
        ]
      },
      {
        id: 'hd-3-2',
        name: 'Brake Components',
        description: 'Brake component replacement',
        category_id: 'hd-3',
        jobs: [
          { id: 'hd-3-2-1', name: 'Brake Chamber Replacement', estimatedTime: 120, price: 420, subcategory_id: 'hd-3-2' },
          { id: 'hd-3-2-2', name: 'Brake Shoe & Drum Service', estimatedTime: 240, price: 950, subcategory_id: 'hd-3-2' },
          { id: 'hd-3-2-3', name: 'ABS Valve Replacement', estimatedTime: 180, price: 720, subcategory_id: 'hd-3-2' },
          { id: 'hd-3-2-4', name: 'Brake Line Repair', estimatedTime: 150, price: 380, subcategory_id: 'hd-3-2' },
          { id: 'hd-3-2-5', name: 'Parking Brake Service', estimatedTime: 120, price: 350, subcategory_id: 'hd-3-2' }
        ]
      }
    ]
  },
  {
    id: 'hd-4',
    name: 'Suspension & Steering',
    description: 'Heavy duty suspension and steering',
    position: 4,
    subcategories: [
      {
        id: 'hd-4-1',
        name: 'Suspension Repair',
        description: 'Suspension system services',
        category_id: 'hd-4',
        jobs: [
          { id: 'hd-4-1-1', name: 'Air Suspension Service', estimatedTime: 180, price: 680, subcategory_id: 'hd-4-1' },
          { id: 'hd-4-1-2', name: 'Leaf Spring Replacement', estimatedTime: 240, price: 850, subcategory_id: 'hd-4-1' },
          { id: 'hd-4-1-3', name: 'Shock Absorber Replacement', estimatedTime: 150, price: 520, subcategory_id: 'hd-4-1' },
          { id: 'hd-4-1-4', name: 'Spring Bushing Replacement', estimatedTime: 180, price: 480, subcategory_id: 'hd-4-1' },
          { id: 'hd-4-1-5', name: 'Torque Rod Replacement', estimatedTime: 150, price: 450, subcategory_id: 'hd-4-1' }
        ]
      },
      {
        id: 'hd-4-2',
        name: 'Steering System',
        description: 'Steering system services',
        category_id: 'hd-4',
        jobs: [
          { id: 'hd-4-2-1', name: 'Power Steering Pump Replacement', estimatedTime: 240, price: 950, subcategory_id: 'hd-4-2' },
          { id: 'hd-4-2-2', name: 'Steering Gear Box Repair', estimatedTime: 360, price: 1800, subcategory_id: 'hd-4-2' },
          { id: 'hd-4-2-3', name: 'Tie Rod End Replacement', estimatedTime: 120, price: 380, subcategory_id: 'hd-4-2' },
          { id: 'hd-4-2-4', name: 'Steering Column Service', estimatedTime: 180, price: 520, subcategory_id: 'hd-4-2' },
          { id: 'hd-4-2-5', name: 'Wheel Alignment - Heavy Duty', estimatedTime: 150, price: 280, subcategory_id: 'hd-4-2' }
        ]
      }
    ]
  },
  {
    id: 'hd-5',
    name: 'Electrical Systems',
    description: 'Heavy duty electrical services',
    position: 5,
    subcategories: [
      {
        id: 'hd-5-1',
        name: 'Battery & Charging',
        description: 'Battery and charging system',
        category_id: 'hd-5',
        jobs: [
          { id: 'hd-5-1-1', name: 'Battery Test & Service', estimatedTime: 45, price: 95, subcategory_id: 'hd-5-1' },
          { id: 'hd-5-1-2', name: 'Battery Replacement - Single', estimatedTime: 60, price: 420, subcategory_id: 'hd-5-1' },
          { id: 'hd-5-1-3', name: 'Alternator Replacement', estimatedTime: 180, price: 950, subcategory_id: 'hd-5-1' },
          { id: 'hd-5-1-4', name: 'Starter Motor Replacement', estimatedTime: 240, price: 1200, subcategory_id: 'hd-5-1' },
          { id: 'hd-5-1-5', name: 'Battery Cable Replacement', estimatedTime: 90, price: 280, subcategory_id: 'hd-5-1' }
        ]
      },
      {
        id: 'hd-5-2',
        name: 'Lighting & Wiring',
        description: 'Lighting and wiring services',
        category_id: 'hd-5',
        jobs: [
          { id: 'hd-5-2-1', name: 'Headlight Replacement', estimatedTime: 60, price: 180, subcategory_id: 'hd-5-2' },
          { id: 'hd-5-2-2', name: 'Marker Light Service', estimatedTime: 90, price: 220, subcategory_id: 'hd-5-2' },
          { id: 'hd-5-2-3', name: 'Wiring Harness Repair', estimatedTime: 240, price: 850, subcategory_id: 'hd-5-2' },
          { id: 'hd-5-2-4', name: 'Trailer Connector Service', estimatedTime: 60, price: 150, subcategory_id: 'hd-5-2' },
          { id: 'hd-5-2-5', name: 'Lighting System Upgrade', estimatedTime: 180, price: 680, subcategory_id: 'hd-5-2' }
        ]
      }
    ]
  },
  {
    id: 'hd-6',
    name: 'HVAC & Cab',
    description: 'Cab and climate control services',
    position: 6,
    subcategories: [
      {
        id: 'hd-6-1',
        name: 'Climate Control',
        description: 'AC and heating services',
        category_id: 'hd-6',
        jobs: [
          { id: 'hd-6-1-1', name: 'A/C System Recharge', estimatedTime: 90, price: 320, subcategory_id: 'hd-6-1' },
          { id: 'hd-6-1-2', name: 'A/C Compressor Replacement', estimatedTime: 360, price: 1800, subcategory_id: 'hd-6-1' },
          { id: 'hd-6-1-3', name: 'Heater Core Replacement', estimatedTime: 480, price: 2200, subcategory_id: 'hd-6-1' },
          { id: 'hd-6-1-4', name: 'Blower Motor Replacement', estimatedTime: 180, price: 520, subcategory_id: 'hd-6-1' },
          { id: 'hd-6-1-5', name: 'Climate Control Module Repair', estimatedTime: 240, price: 850, subcategory_id: 'hd-6-1' }
        ]
      },
      {
        id: 'hd-6-2',
        name: 'Cab Components',
        description: 'Cab component services',
        category_id: 'hd-6',
        jobs: [
          { id: 'hd-6-2-1', name: 'Seat Repair/Replacement', estimatedTime: 120, price: 680, subcategory_id: 'hd-6-2' },
          { id: 'hd-6-2-2', name: 'Door Latch Repair', estimatedTime: 90, price: 280, subcategory_id: 'hd-6-2' },
          { id: 'hd-6-2-3', name: 'Window Regulator Replacement', estimatedTime: 150, price: 420, subcategory_id: 'hd-6-2' },
          { id: 'hd-6-2-4', name: 'Mirror Replacement', estimatedTime: 60, price: 350, subcategory_id: 'hd-6-2' },
          { id: 'hd-6-2-5', name: 'Cab Air Suspension Service', estimatedTime: 180, price: 580, subcategory_id: 'hd-6-2' }
        ]
      }
    ]
  },
  {
    id: 'hd-7',
    name: 'DOT Inspections & PM',
    description: 'Inspections and preventive maintenance',
    position: 7,
    subcategories: [
      {
        id: 'hd-7-1',
        name: 'Inspections',
        description: 'DOT and safety inspections',
        category_id: 'hd-7',
        jobs: [
          { id: 'hd-7-1-1', name: 'DOT Annual Inspection', estimatedTime: 180, price: 450, subcategory_id: 'hd-7-1' },
          { id: 'hd-7-1-2', name: 'Pre-Trip Inspection', estimatedTime: 60, price: 125, subcategory_id: 'hd-7-1' },
          { id: 'hd-7-1-3', name: 'PM Level A (Basic)', estimatedTime: 240, price: 650, subcategory_id: 'hd-7-1' },
          { id: 'hd-7-1-4', name: 'PM Level B (Standard)', estimatedTime: 360, price: 1200, subcategory_id: 'hd-7-1' },
          { id: 'hd-7-1-5', name: 'PM Level C (Comprehensive)', estimatedTime: 480, price: 1800, subcategory_id: 'hd-7-1' }
        ]
      },
      {
        id: 'hd-7-2',
        name: 'Trailer Services',
        description: 'Trailer maintenance and repair',
        category_id: 'hd-7',
        jobs: [
          { id: 'hd-7-2-1', name: 'Trailer Brake Adjustment', estimatedTime: 120, price: 320, subcategory_id: 'hd-7-2' },
          { id: 'hd-7-2-2', name: 'Trailer Landing Gear Service', estimatedTime: 180, price: 480, subcategory_id: 'hd-7-2' },
          { id: 'hd-7-2-3', name: 'Trailer Floor Repair', estimatedTime: 360, price: 1500, subcategory_id: 'hd-7-2' },
          { id: 'hd-7-2-4', name: 'Kingpin Replacement', estimatedTime: 240, price: 950, subcategory_id: 'hd-7-2' },
          { id: 'hd-7-2-5', name: 'Trailer Light System Repair', estimatedTime: 120, price: 350, subcategory_id: 'hd-7-2' }
        ]
      }
    ]
  }
];

export const getHeavyDutyServiceCategories = () => heavyDutyServiceCategories;

export const searchHeavyDutyServices = (query: string) => {
  const lowercaseQuery = query.toLowerCase();
  return heavyDutyServiceCategories
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
