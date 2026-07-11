import { ServiceMainCategory } from '@/types/service';

// Construction Equipment Service Categories
export const constructionServiceCategories: ServiceMainCategory[] = [
  {
    id: 'con-1',
    name: 'Excavator Services',
    description: 'Excavator maintenance and repair',
    position: 1,
    subcategories: [
      {
        id: 'con-1-1',
        name: 'Engine & Hydraulics',
        description: 'Engine and hydraulic systems',
        category_id: 'con-1',
        jobs: [
          { id: 'con-1-1-1', name: 'Engine Oil & Filter Service', estimatedTime: 120, price: 380, subcategory_id: 'con-1-1' },
          { id: 'con-1-1-2', name: 'Hydraulic Oil Change', estimatedTime: 180, price: 650, subcategory_id: 'con-1-1' },
          { id: 'con-1-1-3', name: 'Hydraulic Pump Replacement', estimatedTime: 480, price: 2800, subcategory_id: 'con-1-1' },
          { id: 'con-1-1-4', name: 'Control Valve Service', estimatedTime: 360, price: 1800, subcategory_id: 'con-1-1' },
          { id: 'con-1-1-5', name: 'Boom Cylinder Rebuild', estimatedTime: 420, price: 2200, subcategory_id: 'con-1-1' }
        ]
      },
      {
        id: 'con-1-2',
        name: 'Undercarriage',
        description: 'Track and undercarriage services',
        category_id: 'con-1',
        jobs: [
          { id: 'con-1-2-1', name: 'Track Adjustment', estimatedTime: 90, price: 220, subcategory_id: 'con-1-2' },
          { id: 'con-1-2-2', name: 'Track Link Replacement', estimatedTime: 360, price: 1500, subcategory_id: 'con-1-2' },
          { id: 'con-1-2-3', name: 'Roller Replacement', estimatedTime: 240, price: 850, subcategory_id: 'con-1-2' },
          { id: 'con-1-2-4', name: 'Sprocket Replacement', estimatedTime: 300, price: 1200, subcategory_id: 'con-1-2' },
          { id: 'con-1-2-5', name: 'Complete Undercarriage Rebuild', estimatedTime: 960, price: 8500, subcategory_id: 'con-1-2' }
        ]
      },
      {
        id: 'con-1-3',
        name: 'Bucket & Attachments',
        description: 'Bucket and attachment services',
        category_id: 'con-1',
        jobs: [
          { id: 'con-1-3-1', name: 'Bucket Tooth Replacement', estimatedTime: 60, price: 180, subcategory_id: 'con-1-3' },
          { id: 'con-1-3-2', name: 'Bucket Pin & Bushing Service', estimatedTime: 120, price: 420, subcategory_id: 'con-1-3' },
          { id: 'con-1-3-3', name: 'Quick Coupler Installation', estimatedTime: 180, price: 650, subcategory_id: 'con-1-3' },
          { id: 'con-1-3-4', name: 'Thumb Cylinder Repair', estimatedTime: 150, price: 480, subcategory_id: 'con-1-3' },
          { id: 'con-1-3-5', name: 'Grapple Service', estimatedTime: 120, price: 350, subcategory_id: 'con-1-3' }
        ]
      }
    ]
  },
  {
    id: 'con-2',
    name: 'Loader Services',
    description: 'Wheel loader and skid steer',
    position: 2,
    subcategories: [
      {
        id: 'con-2-1',
        name: 'Loader Maintenance',
        description: 'Loader preventive maintenance',
        category_id: 'con-2',
        jobs: [
          { id: 'con-2-1-1', name: 'PM Service - 250 Hours', estimatedTime: 180, price: 480, subcategory_id: 'con-2-1' },
          { id: 'con-2-1-2', name: 'PM Service - 500 Hours', estimatedTime: 300, price: 850, subcategory_id: 'con-2-1' },
          { id: 'con-2-1-3', name: 'Transmission Oil Service', estimatedTime: 150, price: 520, subcategory_id: 'con-2-1' },
          { id: 'con-2-1-4', name: 'Differential Service', estimatedTime: 120, price: 380, subcategory_id: 'con-2-1' },
          { id: 'con-2-1-5', name: 'Cooling System Service', estimatedTime: 90, price: 280, subcategory_id: 'con-2-1' }
        ]
      },
      {
        id: 'con-2-2',
        name: 'Loader Hydraulics',
        description: 'Hydraulic system services',
        category_id: 'con-2',
        jobs: [
          { id: 'con-2-2-1', name: 'Lift Cylinder Rebuild', estimatedTime: 360, price: 1800, subcategory_id: 'con-2-2' },
          { id: 'con-2-2-2', name: 'Tilt Cylinder Replacement', estimatedTime: 240, price: 950, subcategory_id: 'con-2-2' },
          { id: 'con-2-2-3', name: 'Hydraulic Filter Replacement', estimatedTime: 60, price: 150, subcategory_id: 'con-2-2' },
          { id: 'con-2-2-4', name: 'Auxiliary Hydraulic Service', estimatedTime: 120, price: 420, subcategory_id: 'con-2-2' },
          { id: 'con-2-2-5', name: 'Loader Arm Pin & Bushing', estimatedTime: 180, price: 650, subcategory_id: 'con-2-2' }
        ]
      }
    ]
  },
  {
    id: 'con-3',
    name: 'Dozer Services',
    description: 'Bulldozer maintenance and repair',
    position: 3,
    subcategories: [
      {
        id: 'con-3-1',
        name: 'Dozer Maintenance',
        description: 'Bulldozer service and maintenance',
        category_id: 'con-3',
        jobs: [
          { id: 'con-3-1-1', name: 'Engine & Hydraulic Service', estimatedTime: 240, price: 750, subcategory_id: 'con-3-1' },
          { id: 'con-3-1-2', name: 'Track Tension Adjustment', estimatedTime: 120, price: 280, subcategory_id: 'con-3-1' },
          { id: 'con-3-1-3', name: 'Final Drive Service', estimatedTime: 360, price: 1500, subcategory_id: 'con-3-1' },
          { id: 'con-3-1-4', name: 'Steering Clutch Adjustment', estimatedTime: 180, price: 520, subcategory_id: 'con-3-1' },
          { id: 'con-3-1-5', name: 'Blade Control System Service', estimatedTime: 150, price: 480, subcategory_id: 'con-3-1' }
        ]
      },
      {
        id: 'con-3-2',
        name: 'Blade & Ripper',
        description: 'Blade and ripper services',
        category_id: 'con-3',
        jobs: [
          { id: 'con-3-2-1', name: 'Blade Cutting Edge Replacement', estimatedTime: 180, price: 650, subcategory_id: 'con-3-2' },
          { id: 'con-3-2-2', name: 'Blade Cylinder Rebuild', estimatedTime: 420, price: 2200, subcategory_id: 'con-3-2' },
          { id: 'con-3-2-3', name: 'Ripper Shank Replacement', estimatedTime: 240, price: 850, subcategory_id: 'con-3-2' },
          { id: 'con-3-2-4', name: 'Ripper Tip Replacement', estimatedTime: 90, price: 280, subcategory_id: 'con-3-2' },
          { id: 'con-3-2-5', name: 'Push Frame Repair', estimatedTime: 360, price: 1500, subcategory_id: 'con-3-2' }
        ]
      }
    ]
  },
  {
    id: 'con-4',
    name: 'Compaction Equipment',
    description: 'Rollers and compactors',
    position: 4,
    subcategories: [
      {
        id: 'con-4-1',
        name: 'Roller Services',
        description: 'Roller maintenance and repair',
        category_id: 'con-4',
        jobs: [
          { id: 'con-4-1-1', name: 'Vibratory System Service', estimatedTime: 240, price: 850, subcategory_id: 'con-4-1' },
          { id: 'con-4-1-2', name: 'Drum Bearing Replacement', estimatedTime: 360, price: 1500, subcategory_id: 'con-4-1' },
          { id: 'con-4-1-3', name: 'Water System Service', estimatedTime: 90, price: 220, subcategory_id: 'con-4-1' },
          { id: 'con-4-1-4', name: 'Steering System Repair', estimatedTime: 180, price: 650, subcategory_id: 'con-4-1' },
          { id: 'con-4-1-5', name: 'Padfoot Shell Replacement', estimatedTime: 240, price: 950, subcategory_id: 'con-4-1' }
        ]
      },
      {
        id: 'con-4-2',
        name: 'Plate Compactors',
        description: 'Small compactor services',
        category_id: 'con-4',
        jobs: [
          { id: 'con-4-2-1', name: 'Engine Service', estimatedTime: 60, price: 150, subcategory_id: 'con-4-2' },
          { id: 'con-4-2-2', name: 'Exciter Bearing Service', estimatedTime: 120, price: 320, subcategory_id: 'con-4-2' },
          { id: 'con-4-2-3', name: 'Base Plate Replacement', estimatedTime: 90, price: 280, subcategory_id: 'con-4-2' },
          { id: 'con-4-2-4', name: 'Clutch Replacement', estimatedTime: 150, price: 420, subcategory_id: 'con-4-2' },
          { id: 'con-4-2-5', name: 'Handle & Control Service', estimatedTime: 60, price: 120, subcategory_id: 'con-4-2' }
        ]
      }
    ]
  },
  {
    id: 'con-5',
    name: 'Grader Services',
    description: 'Motor grader maintenance',
    position: 5,
    subcategories: [
      {
        id: 'con-5-1',
        name: 'Grader Maintenance',
        description: 'Motor grader service',
        category_id: 'con-5',
        jobs: [
          { id: 'con-5-1-1', name: 'Complete PM Service', estimatedTime: 360, price: 1200, subcategory_id: 'con-5-1' },
          { id: 'con-5-1-2', name: 'Circle Drive Service', estimatedTime: 240, price: 850, subcategory_id: 'con-5-1' },
          { id: 'con-5-1-3', name: 'Moldboard Hydraulics Service', estimatedTime: 300, price: 1500, subcategory_id: 'con-5-1' },
          { id: 'con-5-1-4', name: 'Articulation Bearing Service', estimatedTime: 420, price: 2200, subcategory_id: 'con-5-1' },
          { id: 'con-5-1-5', name: 'Scarifier Service', estimatedTime: 180, price: 650, subcategory_id: 'con-5-1' }
        ]
      },
      {
        id: 'con-5-2',
        name: 'Blade System',
        description: 'Moldboard and blade services',
        category_id: 'con-5',
        jobs: [
          { id: 'con-5-2-1', name: 'Blade Cutting Edge Replacement', estimatedTime: 180, price: 550, subcategory_id: 'con-5-2' },
          { id: 'con-5-2-2', name: 'Circle Gear Replacement', estimatedTime: 480, price: 2800, subcategory_id: 'con-5-2' },
          { id: 'con-5-2-3', name: 'Lift Cylinder Rebuild', estimatedTime: 360, price: 1800, subcategory_id: 'con-5-2' },
          { id: 'con-5-2-4', name: 'Side Shift Cylinder Service', estimatedTime: 240, price: 950, subcategory_id: 'con-5-2' },
          { id: 'con-5-2-5', name: 'Blade Angle Control Repair', estimatedTime: 150, price: 520, subcategory_id: 'con-5-2' }
        ]
      }
    ]
  },
  {
    id: 'con-6',
    name: 'Crane Services',
    description: 'Mobile crane maintenance',
    position: 6,
    subcategories: [
      {
        id: 'con-6-1',
        name: 'Crane Inspection',
        description: 'Crane safety and inspection',
        category_id: 'con-6',
        jobs: [
          { id: 'con-6-1-1', name: 'Annual Safety Inspection', estimatedTime: 360, price: 1200, subcategory_id: 'con-6-1' },
          { id: 'con-6-1-2', name: 'Load Test & Certification', estimatedTime: 480, price: 2500, subcategory_id: 'con-6-1' },
          { id: 'con-6-1-3', name: 'Wire Rope Inspection', estimatedTime: 120, price: 350, subcategory_id: 'con-6-1' },
          { id: 'con-6-1-4', name: 'Hook & Block Inspection', estimatedTime: 90, price: 220, subcategory_id: 'con-6-1' },
          { id: 'con-6-1-5', name: 'Outrigger System Inspection', estimatedTime: 150, price: 480, subcategory_id: 'con-6-1' }
        ]
      },
      {
        id: 'con-6-2',
        name: 'Crane Repair',
        description: 'Crane component repair',
        category_id: 'con-6',
        jobs: [
          { id: 'con-6-2-1', name: 'Wire Rope Replacement', estimatedTime: 240, price: 1500, subcategory_id: 'con-6-2' },
          { id: 'con-6-2-2', name: 'Boom Extension Cylinder Rebuild', estimatedTime: 480, price: 2800, subcategory_id: 'con-6-2' },
          { id: 'con-6-2-3', name: 'Swing Bearing Replacement', estimatedTime: 960, price: 8500, subcategory_id: 'con-6-2' },
          { id: 'con-6-2-4', name: 'Hoist Winch Service', estimatedTime: 360, price: 1800, subcategory_id: 'con-6-2' },
          { id: 'con-6-2-5', name: 'Load Moment Indicator Service', estimatedTime: 240, price: 950, subcategory_id: 'con-6-2' }
        ]
      }
    ]
  },
  {
    id: 'con-7',
    name: 'Aerial Equipment',
    description: 'Boom lifts and aerial platforms',
    position: 7,
    subcategories: [
      {
        id: 'con-7-1',
        name: 'Lift Inspection',
        description: 'Aerial lift safety inspection',
        category_id: 'con-7',
        jobs: [
          { id: 'con-7-1-1', name: 'Annual Safety Inspection', estimatedTime: 180, price: 450, subcategory_id: 'con-7-1' },
          { id: 'con-7-1-2', name: 'Quarterly PM Service', estimatedTime: 120, price: 320, subcategory_id: 'con-7-1' },
          { id: 'con-7-1-3', name: 'Load Test', estimatedTime: 240, price: 850, subcategory_id: 'con-7-1' },
          { id: 'con-7-1-4', name: 'Platform & Rail Inspection', estimatedTime: 90, price: 220, subcategory_id: 'con-7-1' },
          { id: 'con-7-1-5', name: 'Tilt & Motion Alarm Test', estimatedTime: 60, price: 150, subcategory_id: 'con-7-1' }
        ]
      },
      {
        id: 'con-7-2',
        name: 'Lift Repair',
        description: 'Aerial lift maintenance',
        category_id: 'con-7',
        jobs: [
          { id: 'con-7-2-1', name: 'Boom Cylinder Replacement', estimatedTime: 360, price: 1800, subcategory_id: 'con-7-2' },
          { id: 'con-7-2-2', name: 'Platform Control Repair', estimatedTime: 180, price: 650, subcategory_id: 'con-7-2' },
          { id: 'con-7-2-3', name: 'Emergency Lowering System Service', estimatedTime: 120, price: 420, subcategory_id: 'con-7-2' },
          { id: 'con-7-2-4', name: 'Turret Bearing Service', estimatedTime: 240, price: 950, subcategory_id: 'con-7-2' },
          { id: 'con-7-2-5', name: 'Battery System Service (Electric)', estimatedTime: 150, price: 480, subcategory_id: 'con-7-2' }
        ]
      }
    ]
  }
];

export const getConstructionServiceCategories = () => constructionServiceCategories;

export const searchConstructionServices = (query: string) => {
  const lowercaseQuery = query.toLowerCase();
  return constructionServiceCategories
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
