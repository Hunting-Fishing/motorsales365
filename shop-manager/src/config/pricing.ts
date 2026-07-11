export const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    price: 9,
    description: '50 work orders/mo, basic features',
    features: [
      '50 work orders per month',
      'Basic customer management',
      'Standard reporting',
      'Email support',
      'Mobile-friendly dashboard'
    ]
  },
  pro: {
    name: 'Pro',
    price: 15,
    description: 'Unlimited work orders, advanced features',
    popular: true,
    features: [
      'Unlimited work orders',
      'Advanced customer management',
      'Custom reporting',
      'Priority email support',
      'Team collaboration tools',
      'Inventory management'
    ]
  },
  business: {
    name: 'Business',
    price: 25,
    description: 'Unlimited everything, priority support',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'API access',
      'Priority phone support',
      'Custom integrations',
      'Dedicated account manager'
    ]
  }
} as const;

export const MODULES = [
  { id: 'repair-shop', name: 'Repair Shop', icon: 'Wrench', description: 'Auto repair & maintenance' },
  { id: 'power-washing', name: 'Power Washing', icon: 'Droplets', description: 'Pressure washing services' },
  { id: 'gunsmith', name: 'Gunsmith', icon: 'Target', description: 'Firearms repair & services' },
  { id: 'marine', name: 'Marine', icon: 'Anchor', description: 'Boat & marine services' },
  { id: 'water-delivery', name: 'Water Delivery', icon: 'Droplets', description: 'Water delivery services' },
  { id: 'fuel-delivery', name: 'Fuel Delivery', icon: 'Fuel', description: 'Fuel delivery services' },
  { id: 'septic', name: 'Septic Services', icon: 'Container', description: 'Septic pumping & inspections' },
  { id: 'export-company', name: 'Export Company', icon: 'Ship', description: 'Vehicle export & logistics' },
  { id: 'personal-trainer', name: 'Personal Trainer', icon: 'Dumbbell', description: 'Fitness & gym management' }
] as const;

export type TierKey = keyof typeof PRICING_TIERS;
export type ModuleId = typeof MODULES[number]['id'];
