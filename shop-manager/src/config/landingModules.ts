import { LucideIcon } from 'lucide-react';
import {
  Anchor,
  Apple,
  Axe,
  Baby,
  Beef,
  Bike,
  Bird,
  Bone,
  BookOpen,
  Briefcase,
  Bug,
  Cake,
  Camera,
  Car,
  Cat,
  ChefHat,
  Church,
  Cigarette,
  CircleDot,
  Clover,
  Cog,
  Container,
  Coffee,
  Compass,
  Cookie,
  Crown,
  Dice1,
  Dog,
  Dumbbell,
  Droplets,
  Feather,
  Fish,
  Flame,
  Flower2,
  Fuel,
  Footprints,
  Gem,
  Gift,
  Grape,
  Guitar,
  Hammer,
  HandHeart,
  HardHat,
  HeartPulse,
  Home,
  IceCream,
  KeyRound,
  Leaf,
  Mic2,
  Mountain,
  Move,
  Music,
  PaintBucket,
  Palette,
  PartyPopper,
  PawPrint,
  Pen,
  Phone,
  Pizza,
  Plane,
  Power,
  Printer,
  Rat,
  Refrigerator,
  Ruler,
  Salad,
  Scale,
  Scissors,
  Shield,
  Ship,
  Shirt,
  ShoppingBag,
  Shovel,
  Snowflake,
  Sofa,
  Sparkles,
  Speaker,
  Sprout,
  Stethoscope,
  Store,
  Sun,
  Sword,
  Syringe,
  Target,
  Tent,
  Thermometer,
  Ticket,
  Tractor,
  Trees,
  Truck,
  Tv,
  Umbrella,
  Users,
  Utensils,
  Wallet,
  Waves,
  Wheat,
  Wine,
  Wrench,
  Zap,
} from 'lucide-react';

export type FeatureHighlight = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type UseCase = {
  title: string;
  description: string;
};

export type FAQ = {
  question: string;
  answer: string;
};

export type Stat = {
  value: string;
  label: string;
};

export type Benefit = {
  title: string;
  description: string;
  stat: string;
  icon: LucideIcon;
};

export type WorkflowStep = {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type ComparisonPoint = {
  without: string;
  with: string;
};

export type Testimonial = {
  quote: string;
  author: string;
  role: string;
  company: string;
};

export type PricingTier = {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlighted?: boolean;
};

export type TrustBadge = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type ModuleScreenshot = {
  src: string;
  alt: string;
};

export type LandingModule = {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  price?: string;
  available: boolean;
  coreFeatures: string[];
  extraFeatures: string[];
  // Extended content for detail pages
  tagline?: string;
  longDescription?: string;
  idealFor?: string[];
  featureHighlights?: FeatureHighlight[];
  useCases?: UseCase[];
  integrations?: string[];
  faqs?: FAQ[];
  // New enhanced fields
  stats?: Stat[];
  benefits?: Benefit[];
  workflowSteps?: WorkflowStep[];
  comparisonPoints?: ComparisonPoint[];
  testimonial?: Testimonial;
  pricingTiers?: PricingTier[];
  trustBadges?: TrustBadge[];
  screenshots?: ModuleScreenshot[];
};

export type LandingComingSoonModule = {
  name: string;
  description: string;
  icon: LucideIcon;
};

export type LandingComingSoonCategory = {
  category: string;
  description: string;
  modules: LandingComingSoonModule[];
};

export const LANDING_MODULES: LandingModule[] = [
  {
    slug: 'repair-shop',
    name: 'Repair Shop',
    description: 'Complete automotive service management with work orders, parts, and more',
    icon: Car,
    color: 'bg-blue-500',
    price: 'From $9/mo',
    available: true,
    tagline: 'Run your shop like a well-oiled machine',
    longDescription: `Transform your automotive repair business with a complete management system designed specifically for independent shops, multi-bay service centers, and mobile mechanics. From the moment a customer walks in to the final invoice, every step is streamlined and professional.

Our Repair Shop module handles the complexity of modern auto repair—tracking labor hours across multiple technicians, managing parts inventory with automatic reorder alerts, and maintaining complete vehicle service histories that build customer trust and loyalty.

Whether you're a solo mechanic or managing a team of technicians, you'll have the tools to increase efficiency, reduce paperwork, and focus on what you do best: fixing cars.`,
    idealFor: [
      'Independent repair shops',
      'Multi-bay service centers',
      'Mobile mechanics',
      'Fleet maintenance operations',
      'Specialty shops (transmission, exhaust, brakes)',
      'Quick lube & oil change centers',
    ],
    coreFeatures: [
      'Work orders with labor and parts',
      'Customer and vehicle history',
      'Estimates, invoices, and payments',
      'Scheduling and technician assignments',
    ],
    extraFeatures: [
      'Inventory forecasting and reorder alerts',
      'Digital inspection forms',
      'Service packages and pricing rules',
    ],
    // Capability highlights (honest, not fake stats)
    stats: [
      { value: 'Unlimited', label: 'Work Orders' },
      { value: 'Real-time', label: 'Status Tracking' },
      { value: 'Cloud', label: 'Secure Backup' },
      { value: 'Mobile', label: 'Ready' },
    ],
    benefits: [
      {
        title: 'Go Paperless',
        description: 'Eliminate paper work orders, handwritten notes, and filing cabinets. Everything is digital, searchable, and backed up.',
        stat: 'Digital-first workflow',
        icon: Briefcase,
      },
      {
        title: 'Capture More Revenue',
        description: 'Digital inspections with photos help customers understand recommended services, leading to higher approval rates.',
        stat: 'Visual upselling',
        icon: Wallet,
      },
      {
        title: 'Keep Customers Coming Back',
        description: 'Automated service reminders, professional communications, and a customer portal build lasting relationships.',
        stat: 'Automated follow-ups',
        icon: Users,
      },
      {
        title: 'Work Smarter',
        description: 'Streamlined workflows, instant parts lookup, and clear technician assignments reduce wasted time.',
        stat: 'Efficient operations',
        icon: Zap,
      },
    ],
    workflowSteps: [
      {
        step: 1,
        title: 'Customer Check-in',
        description: 'Quick intake with VIN decoder, instant service history lookup, and automated customer notifications.',
        icon: Users,
      },
      {
        step: 2,
        title: 'Create Estimate',
        description: 'Build detailed estimates from integrated labor guides and parts catalogs with real-time pricing.',
        icon: Briefcase,
      },
      {
        step: 3,
        title: 'Assign & Track',
        description: 'Dispatch to available technicians with bay assignments and real-time progress tracking.',
        icon: Target,
      },
      {
        step: 4,
        title: 'Digital Inspection',
        description: 'Tablet-friendly inspections with photos, condition notes, and upsell recommendations.',
        icon: Camera,
      },
      {
        step: 5,
        title: 'Customer Approval',
        description: 'Send estimates via text/email for instant customer approval with digital signatures.',
        icon: Phone,
      },
      {
        step: 6,
        title: 'Complete & Invoice',
        description: 'Finish work order, generate professional invoice, and collect payment all in one place.',
        icon: Wallet,
      },
    ],
    comparisonPoints: [
      {
        without: 'Paper work orders get lost or damaged',
        with: 'Digital work orders with real-time status tracking',
      },
      {
        without: 'Guessing at parts inventory levels',
        with: 'Automatic reorder alerts at threshold',
      },
      {
        without: 'Missed appointments and no-shows',
        with: 'SMS reminders help reduce no-shows',
      },
      {
        without: 'Hours spent on invoicing and billing',
        with: 'One-click invoicing from work orders',
      },
      {
        without: 'No visibility into tech productivity',
        with: 'Labor tracking and productivity reports',
      },
      {
        without: 'Customers calling for status updates',
        with: 'Self-service customer portal with live status',
      },
    ],
    pricingTiers: [
      {
        name: 'Starter',
        price: '$49',
        period: '/month',
        features: [
          '1 location',
          '2 users included',
          'Unlimited work orders',
          'Customer & vehicle management',
          'Basic reporting',
          'Email support',
        ],
      },
      {
        name: 'Professional',
        price: '$99',
        period: '/month',
        highlighted: true,
        features: [
          'Up to 3 locations',
          '10 users included',
          'Everything in Starter',
          'Digital inspections',
          'Customer portal',
          'Advanced analytics',
          'Priority support',
        ],
      },
      {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        features: [
          'Unlimited locations',
          'Unlimited users',
          'Everything in Professional',
          'API access',
          'Custom integrations',
          'Dedicated account manager',
          'On-site training',
        ],
      },
    ],
    trustBadges: [
      {
        title: 'Bank-Level Security',
        description: '256-bit SSL encryption protects all your data',
        icon: Shield,
      },
      {
        title: 'Daily Backups',
        description: 'Your data is backed up every day, automatically',
        icon: Cog,
      },
      {
        title: '99.9% Uptime',
        description: 'Enterprise-grade infrastructure you can rely on',
        icon: Zap,
      },
      {
        title: 'GDPR Ready',
        description: 'Compliant with international privacy standards',
        icon: Users,
      },
    ],
    featureHighlights: [
      {
        title: 'Work Order Management',
        description: 'Create, track, and complete repair orders with built-in labor time tracking, parts linkage, and status updates that keep your team aligned.',
        icon: Wrench,
      },
      {
        title: 'Digital Vehicle Inspections',
        description: 'Tablet-friendly inspection forms with photo capture, condition ratings, and instant customer approval workflows via text or email.',
        icon: Camera,
      },
      {
        title: 'Parts & Inventory',
        description: 'Real-time stock levels, automatic reorder alerts, vendor management, and cost tracking to maintain healthy margins.',
        icon: Cog,
      },
      {
        title: 'Scheduling & Dispatch',
        description: 'Visual calendar with technician assignments, bay management, appointment reminders, and SMS notifications for customers.',
        icon: Users,
      },
      {
        title: 'Customer Portal',
        description: 'Let customers view estimates, approve recommended services, track repair status, and pay invoices—all online.',
        icon: Phone,
      },
      {
        title: 'Reports & Analytics',
        description: 'Track revenue by service type, technician productivity, parts margins, customer retention, and identify growth opportunities.',
        icon: Target,
      },
    ],
    useCases: [
      {
        title: 'Walk-in Repairs',
        description: 'Quick intake, fast estimates, and seamless handoff to available technicians with real-time bay visibility.',
      },
      {
        title: 'Scheduled Maintenance',
        description: 'Automated service reminders, pre-scheduled appointments, and prepared parts ensure efficient turnarounds.',
      },
      {
        title: 'Fleet Contracts',
        description: 'Manage multiple vehicles per customer with scheduled PM intervals, consolidated billing, and fleet-specific pricing.',
      },
      {
        title: 'Warranty Work',
        description: 'Track warranty claims, parts returns, and maintain documentation required for manufacturer reimbursement.',
      },
    ],
    integrations: [
      'QuickBooks & accounting software',
      'Parts catalogs & ordering',
      'Payment processing',
      'SMS & email notifications',
      'VIN decoders',
      'Labor time guides',
    ],
    faqs: [
      {
        question: 'How long does setup take?',
        answer: 'Most shops are fully operational within 24 hours. Our guided setup walks you through importing customers, vehicles, and inventory. We also offer hands-on onboarding assistance.',
      },
      {
        question: 'Can I import my existing customer data?',
        answer: 'Yes! We support CSV imports from most shop management systems. Our team can also assist with data migration from legacy systems at no additional cost.',
      },
      {
        question: 'Is training included?',
        answer: 'Absolutely. All plans include access to video tutorials, documentation, and live chat support. Premium plans include one-on-one training sessions.',
      },
      {
        question: 'What hardware do I need?',
        answer: 'ShopCore works on any modern web browser—desktops, laptops, tablets, and smartphones. No special hardware required, though we recommend tablets for technicians doing inspections.',
      },
      {
        question: 'Can I manage multiple locations?',
        answer: 'Yes, our platform supports multi-location operations with centralized reporting, shared customer databases, and location-specific inventory.',
      },
      {
        question: 'What kind of support do you offer?',
        answer: 'We offer 24/7 email support on all plans, with live chat during business hours. Professional and Enterprise plans include priority phone support and dedicated account managers.',
      },
      {
        question: 'Is there a contract or can I cancel anytime?',
        answer: 'No long-term contracts required. You can upgrade, downgrade, or cancel your subscription at any time. We believe in earning your business every month.',
      },
      {
        question: 'Do you offer a free trial?',
        answer: 'Yes! Every plan includes a 14-day free trial with full access to all features. No credit card required to start.',
      },
    ],
    screenshots: [
      { src: '/screenshots/repair-shop-dashboard.png', alt: 'Repair Shop Dashboard - Work orders, parts, invoices' },
    ],
  },
  {
    slug: 'power-washing',
    name: 'Power Washing',
    description: 'Manage residential and commercial pressure washing jobs',
    icon: Droplets,
    color: 'bg-cyan-500',
    price: 'From $9/mo',
    available: true,
    coreFeatures: [
      'Job estimates and dispatch',
      'Route planning and scheduling',
      'Recurring services and subscriptions',
      'Photo capture and before/after',
    ],
    extraFeatures: [
      'Chemical mix calculators',
      'Weather-aware scheduling',
      'Customer portal for approvals',
    ],
    screenshots: [
      { src: '/screenshots/power-washing-dashboard.png', alt: 'Power Washing Dashboard - Jobs, quotes, equipment, routes' },
    ],
  },
  {
    slug: 'gunsmith',
    name: 'Gunsmith',
    description: 'Firearm repair, maintenance tracking, and FFL compliance',
    icon: Target,
    color: 'bg-amber-500',
    price: 'From $9/mo',
    available: true,
    coreFeatures: [
      'Firearm intake and work orders',
      'Compliance tracking and transfers',
      'Parts inventory and serialized items',
      'Quotes, invoices, and payments',
    ],
    extraFeatures: [
      'License expiration alerts',
      'Consignment tracking',
      'Appointment scheduling',
    ],
    screenshots: [
      { src: '/screenshots/gunsmith-dashboard.png', alt: 'Gunsmith Dashboard - Jobs, firearms, compliance, transfers' },
    ],
  },
  {
    slug: 'marine-services',
    name: 'Marine Services',
    description: 'Boat repair, maintenance, and marina service management',
    icon: Anchor,
    color: 'bg-teal-500',
    price: 'From $9/mo',
    available: true,
    coreFeatures: [
      'Vessel profiles and history',
      'Job tracking with parts and labor',
      'Scheduling and dock planning',
      'Quotes, invoices, and payments',
    ],
    extraFeatures: [
      'Seasonal maintenance reminders',
      'Warranty and inspection tracking',
      'Service checklists for crews',
    ],
    screenshots: [
      { src: '/screenshots/marine-services-dashboard.png', alt: 'Marine Services Dashboard - Vessels, dock scheduling, inspections' },
    ],
  },
  {
    slug: 'water-delivery',
    name: 'Water Delivery',
    description: 'Route optimization, tank monitoring, and customer subscriptions',
    icon: Droplets,
    color: 'bg-cyan-600',
    price: 'From $9/mo',
    available: true,
    coreFeatures: [
      'Route planning and optimization',
      'Tank level monitoring',
      'Recurring delivery subscriptions',
      'Driver app with GPS tracking',
    ],
    extraFeatures: [
      'Customer portal for orders',
      'Inventory and purchase tracking',
      'Invoice and payment management',
    ],
    screenshots: [
      { src: '/screenshots/water-delivery-dashboard.png', alt: 'Water Delivery Dashboard - Orders, tanks, routes, fleet' },
    ],
  },
  {
    slug: 'fuel-delivery',
    name: 'Fuel Delivery',
    description: 'Fleet fueling, tank management, and mobile delivery operations',
    icon: Fuel,
    color: 'bg-orange-500',
    price: 'From $9/mo',
    available: true,
    coreFeatures: [
      'Fleet and customer tank management',
      'Route optimization and scheduling',
      'Driver mobile app',
      'Real-time delivery tracking',
    ],
    extraFeatures: [
      'Equipment and filter tracking',
      'Tidy tank service management',
      'Quotes and invoicing',
    ],
    screenshots: [
      { src: '/screenshots/fuel-delivery-dashboard.png', alt: 'Fuel Delivery Dashboard - Orders, deliveries, routes, fleet' },
    ],
  },
  {
    slug: 'septic',
    name: 'Septic Services',
    description: 'Pumping schedules, tank management, inspections, and compliance tracking',
    icon: Container,
    color: 'bg-stone-500',
    price: 'From $9/mo',
    available: true,
    coreFeatures: [
      'Tank registry and pump-out scheduling',
      'Route optimization and driver app',
      'EPA/county compliance inspections',
      'Real-time service tracking',
    ],
    extraFeatures: [
      'System component tracking',
      'Quotes and invoicing',
      'Equipment management',
    ],
    screenshots: [
      { src: '/screenshots/septic-dashboard.png', alt: 'Septic Services Dashboard - Service orders, systems, routes' },
    ],
  },
  {
    slug: 'export-company',
    name: 'Export Company',
    description: 'Vehicle export operations, logistics, customs documentation, and compliance',
    icon: Ship,
    color: 'bg-emerald-500',
    price: 'From $9/mo',
    available: true,
    coreFeatures: [
      'Order management with VIN tracking',
      'Shipment & container tracking',
      'Route planning and driver dispatch',
      'Customs documentation management',
    ],
    extraFeatures: [
      'Warehouse and inventory management',
      'Quotes and invoicing',
      'Equipment tracking',
    ],
    screenshots: [
      { src: '/screenshots/export-dashboard.png', alt: 'Export Company Dashboard - Orders, logistics, compliance' },
    ],
  },
  {
    slug: 'personal-trainer',
    name: 'Personal Trainer & Gym',
    description: 'Complete fitness management platform with client CRM, workout programming, session scheduling, body metrics tracking, and medical condition management with ICD-10 integration.',
    icon: Dumbbell,
    color: 'bg-orange-500',
    price: 'From $9/mo',
    available: true,
    coreFeatures: [
      'Client management with medical profiles',
      'Workout program builder & AI generation',
      'Session scheduling & attendance tracking',
      'Body metrics & progress photo gallery',
    ],
    extraFeatures: [
      'ICD-10 medical condition tracking',
      'Client portal with self-service',
      'Package & billing management',
    ],
    screenshots: [
      { src: '/screenshots/personal-trainer-dashboard.png', alt: 'Personal Trainer Dashboard - Clients, sessions, programs, metrics' },
    ],
  },
  {
    slug: 'welding',
    name: 'Welding & Fabrication',
    description: 'Complete welding and fabrication business management with quoting, invoicing, inventory tracking, purchase orders, customer CRM, and project gallery.',
    icon: Flame,
    color: 'bg-orange-600',
    price: 'From $9/mo',
    available: true,
    coreFeatures: [
      'Quote & invoice management',
      'Inventory & purchase orders',
      'Customer CRM & scheduling',
      'Project gallery & portfolio',
    ],
    extraFeatures: [
      'Accounts payable tracking',
      'Sales pipeline management',
      'Labour rate configuration',
    ],
    screenshots: [
      { src: '/screenshots/welding-dashboard.png', alt: 'Welding Dashboard - Quotes, invoices, inventory, gallery' },
    ],
  },
  {
    slug: 'game-development',
    name: 'Game Development',
    description: 'Complete game design planning, narrative tools, economy simulation, and production pipeline',
    icon: Sword,
    color: 'bg-purple-600',
    price: 'From $9/mo',
    available: true,
    tagline: 'Plan, design, and ship your game — all in one place',
    longDescription: `GameForge is an all-in-one game development planning platform designed for indie studios, solo developers, and creative teams. From initial concept through production, manage every aspect of your game's design with interconnected visual tools.

Plan your game on infinite canvas boards, write branching dialogue trees, design item databases with economy balancing, track quests and raid encounters, build a living wiki of your game's lore, and generate AI art assets — all linked together in a unified workspace.

Whether you're building a mobile RPG or a AAA-scale MMO, GameForge scales with your ambition and keeps your entire team aligned.`,
    idealFor: [
      'Indie game studios',
      'Solo game developers',
      'Game design students',
      'Tabletop RPG designers',
      'Narrative designers & writers',
      'Game jam teams',
    ],
    coreFeatures: [
      'Visual canvas planning boards',
      'Character & story design tools',
      'Item database & economy simulation',
      'Quest & raid encounter designer',
    ],
    extraFeatures: [
      'AI asset generation',
      'Dialogue tree editor',
      'Game design document builder',
      'Playtest journal & feedback tracking',
    ],
    stats: [
      { value: 'Unlimited', label: 'Game Projects' },
      { value: '20+', label: 'Design Tools' },
      { value: 'AI', label: 'Asset Generation' },
      { value: 'Real-time', label: 'Collaboration' },
    ],
    benefits: [
      {
        title: 'Everything Connected',
        description: 'Characters link to quests, items link to loot tables, story beats link to dialogue — your entire game design is an interconnected web.',
        stat: 'Unified workspace',
        icon: Target,
      },
      {
        title: 'AI-Powered Creation',
        description: 'Generate concept art, item icons, and character portraits with built-in AI art tools. Iterate faster than ever.',
        stat: 'Built-in AI tools',
        icon: Sparkles,
      },
      {
        title: 'From Concept to Ship',
        description: 'Roadmap planning, milestone tracking, playtest journals, and GDD builder — manage your entire production pipeline.',
        stat: 'Full pipeline',
        icon: Briefcase,
      },
    ],
    pricingTiers: [
      {
        name: 'Starter',
        price: '$9',
        period: '/month',
        features: [
          'Up to 3 game projects',
          'Canvas planner & database',
          'Character & story tools',
          'Basic item database',
        ],
      },
      {
        name: 'Pro',
        price: '$29',
        period: '/month',
        highlighted: true,
        features: [
          'Unlimited projects',
          'All design tools',
          'AI asset generation',
          'Economy simulation',
          'Dialogue tree editor',
        ],
      },
      {
        name: 'Business',
        price: '$49',
        period: '/month',
        features: [
          'Everything in Pro',
          'Team collaboration',
          'API & webhooks',
          'Priority support',
          'Custom integrations',
        ],
      },
    ],
  },
];

export const LANDING_COMING_SOON_CATEGORIES: LandingComingSoonCategory[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // HOME & PROPERTY SERVICES (15 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Home & Property Services',
    description: 'Residential and commercial property maintenance',
    modules: [
      { name: 'HVAC Services', description: 'Heating, cooling, and ventilation with EPA 608 compliance', icon: Thermometer },
      { name: 'Pool & Spa Services', description: 'Chemical tracking, water testing, and route management', icon: Waves },
      { name: 'Plumbing Services', description: 'Residential and commercial plumbing with parts inventory', icon: Wrench },
      { name: 'Electrical Services', description: 'Electrical contracting with permit and inspection tracking', icon: Zap },
      { name: 'Roofing', description: 'Roof inspections, repairs, and project management', icon: HardHat },
      { name: 'Painting Services', description: 'Interior/exterior painting with estimating and crew dispatch', icon: PaintBucket },
      { name: 'Handyman Services', description: 'Multi-trade repairs with flexible pricing and scheduling', icon: Hammer },
      { name: 'Fencing', description: 'Fence installation, repair, and material estimating', icon: Home },
      { name: 'Landscaping', description: 'Lawn care, design, irrigation, and crew scheduling', icon: Trees },
      { name: 'Pest Control', description: 'Route optimization, chemical compliance, and treatment plans', icon: Bug },
      
      { name: 'Window Cleaning', description: 'Commercial and residential window and gutter cleaning', icon: Sparkles },
      { name: 'Garage Door Services', description: 'Installation, repair, and opener programming', icon: Cog },
      { name: 'Chimney Services', description: 'Cleaning, inspection, and masonry repair', icon: Flame },
      { name: 'Disaster Restoration', description: 'Water, fire, and mold damage remediation', icon: Shield },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AUTOMOTIVE & EQUIPMENT (12 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Automotive & Equipment',
    description: 'Vehicle and machinery service specialists',
    modules: [
      { name: 'Auto Detailing', description: 'Mobile and shop-based detailing with photo documentation', icon: Sparkles },
      { name: 'Towing Services', description: 'Dispatch management, fleet tracking, and impound operations', icon: Truck },
      { name: 'Motorcycle Services', description: 'Motorcycle and powersports repair with parts tracking', icon: Bike },
      { name: 'RV & Camper Services', description: 'Mobile and shop-based RV repair and winterization', icon: Truck },
      { name: 'Golf Cart Repair', description: 'Electric and gas cart service for courses and communities', icon: CircleDot },
      { name: 'Small Engine Repair', description: 'Mower, chainsaw, and outdoor power equipment service', icon: Cog },
      { name: 'Heavy Equipment', description: 'Construction and agricultural equipment maintenance', icon: Tractor },
      { name: 'Generator Services', description: 'Standby generator installation, service, and monitoring', icon: Power },
      { name: 'ATV/UTV Repair', description: 'Off-road vehicle service and parts management', icon: Car },
      { name: 'Snowmobile Services', description: 'Winter vehicle repair and seasonal maintenance', icon: Snowflake },
      { name: 'Bicycle Shop', description: 'Bike sales, repair, and custom builds', icon: Bike },
      { name: 'Classic Car Restoration', description: 'Vintage vehicle restoration and documentation', icon: Car },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SKILLED TRADES (8 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Skilled Trades',
    description: 'Specialized craftsmanship and technical services',
    modules: [
      
      { name: 'Locksmith', description: 'Emergency dispatch, key cutting logs, and mobile service', icon: KeyRound },
      { name: 'Appliance Repair', description: 'In-home service with parts tracking and warranty management', icon: Refrigerator },
      { name: 'Upholstery', description: 'Furniture and vehicle upholstery repair and restoration', icon: Sofa },
      { name: 'Glass & Mirror', description: 'Residential and auto glass installation and repair', icon: Sparkles },
      { name: 'Safe & Vault', description: 'Safe installation, moving, and combination changes', icon: Shield },
      { name: 'Clock Repair', description: 'Antique and modern clock restoration and service', icon: Cog },
      { name: 'Instrument Repair', description: 'Musical instrument repair and restoration', icon: Music },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // OUTDOOR & WILDLIFE (18 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Outdoor & Wildlife',
    description: 'Hunting, fishing, wildlife tours, and outdoor adventure services',
    modules: [
      { name: 'Guide & Outfitter', description: 'Trip booking, client management, and license tracking', icon: Compass },
      { name: 'Taxidermy', description: 'Specimen intake, project tracking, and client galleries', icon: Bird },
      { name: 'Tannery', description: 'Hide processing, inventory, and order management', icon: PawPrint },
      { name: 'Trapping Services', description: 'Trapline management, fur tracking, and harvest records', icon: Rat },
      { name: 'Hunting Preserve', description: 'Booking, game management, and membership tracking', icon: Target },
      { name: 'Fishing Charter', description: 'Trip scheduling, equipment tracking, and catch logs', icon: Fish },
      { name: 'Fly Fishing Guide', description: 'Trip booking, client management, gear recommendations, and catch logs', icon: Fish },
      { name: 'Deep Sea Fishing', description: 'Charter scheduling, tackle inventory, and trophy documentation', icon: Anchor },
      { name: 'Camping & Outpost', description: 'Cabin rentals, equipment checkout, and guest management', icon: Tent },
      { name: 'Wildlife Control', description: 'Nuisance animal removal, permits, and compliance', icon: Bug },
      { name: 'Forestry Services', description: 'Timber management, logging, and land clearing', icon: Axe },
      { name: 'Hunting Dog Training', description: 'Training programs, boarding, and progress tracking', icon: Dog },
      { name: 'Wilderness Survival', description: 'Course scheduling, certifications, and equipment rentals', icon: Mountain },
      { name: 'Wildlife Safari Tours', description: 'Tour booking, animal sightings log, and guide scheduling', icon: Bird },
      { name: 'Bird Watching Tours', description: 'Tour scheduling, species checklists, and expert guides', icon: Bird },
      { name: 'Whale Watching', description: 'Trip scheduling, weather monitoring, and sighting records', icon: Waves },
      { name: 'Eco Tourism', description: 'Sustainable tour management, conservation tracking, and education', icon: Leaf },
      { name: 'Photography Safari', description: 'Specialized photo tours, equipment rentals, and guide assignments', icon: Camera },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // AGRICULTURE & FARMING (12 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Agriculture & Farming',
    description: 'Farm operations, growing, and agricultural services',
    modules: [
      { name: 'Farm Operations', description: 'Crop planning, equipment tracking, and harvest management', icon: Wheat },
      { name: 'Greenhouse Management', description: 'Climate control, inventory, and growing schedules', icon: Sprout },
      { name: 'Gardening Services', description: 'Residential garden design, planting, and maintenance', icon: Flower2 },
      { name: 'Nursery & Plant Sales', description: 'Plant inventory, orders, and customer management', icon: Leaf },
      { name: 'Beekeeping & Apiary', description: 'Hive management, honey production, and pollination services', icon: Bug },
      { name: 'Hydroponics', description: 'Indoor growing systems, nutrient tracking, and harvests', icon: Droplets },
      { name: 'Mushroom Farming', description: 'Cultivation cycles, substrate tracking, and sales', icon: Clover },
      { name: 'Christmas Tree Farm', description: 'Tree inventory, lot sales, and seasonal operations', icon: Trees },
      { name: 'Vineyard & Winery', description: 'Grape production, wine making, and tasting room management', icon: Grape },
      { name: 'Orchard Management', description: 'Fruit tree care, harvest tracking, and sales', icon: Apple },
      { name: 'Hay & Feed Services', description: 'Hay production, delivery scheduling, and inventory', icon: Wheat },
      { name: 'Farm Equipment Rental', description: 'Equipment booking, maintenance, and billing', icon: Tractor },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FOOD & BEVERAGE (12 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Food & Beverage',
    description: 'Food production, service, and specialty operations',
    modules: [
      { name: 'Bakery', description: 'Order management, recipe tracking, and production scheduling', icon: Cake },
      { name: 'Food Truck', description: 'Location scheduling, menu management, and mobile POS', icon: Truck },
      { name: 'Catering Services', description: 'Event booking, menu planning, and staff coordination', icon: Utensils },
      { name: 'Coffee Roastery', description: 'Roast profiles, inventory, and wholesale management', icon: Coffee },
      { name: 'Butcher Shop', description: 'Meat processing, custom cuts, and order tracking', icon: Beef },
      { name: 'Cheese Making', description: 'Aging schedules, batch tracking, and sales', icon: Cookie },
      { name: 'Brewery & Distillery', description: 'Batch tracking, TTB compliance, and taproom management', icon: Wine },
      { name: 'Meal Prep Service', description: 'Subscription management, menu planning, and delivery', icon: Salad },
      { name: 'Ice Cream & Gelato', description: 'Flavor inventory, production batches, and seasonal menus', icon: IceCream },
      { name: 'Specialty Foods', description: 'Artisan product inventory and wholesale distribution', icon: ChefHat },
      { name: 'Pizza Shop', description: 'Order management, delivery tracking, and recipe costing', icon: Pizza },
      { name: 'Juice Bar & Smoothies', description: 'Ingredient inventory, recipe management, and POS', icon: Apple },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // FARMING & LIVESTOCK (10 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Farming & Livestock',
    description: 'Agricultural operations, animal husbandry, and farm management',
    modules: [
      { name: 'Livestock Management', description: 'Herd tracking, breeding records, health monitoring, and sales', icon: PawPrint },
      { name: 'Dairy Farm', description: 'Milk production tracking, herd health, and processing schedules', icon: Droplets },
      { name: 'Poultry Farm', description: 'Flock management, egg production, feed inventory, and processing', icon: Bird },
      { name: 'Cattle Ranch', description: 'Cattle tracking, pasture rotation, breeding, and market sales', icon: PawPrint },
      { name: 'Sheep & Goat Farm', description: 'Flock records, shearing schedules, milk production, and breeding', icon: PawPrint },
      { name: 'Horse Breeding', description: 'Breeding records, foal tracking, training logs, and sales', icon: PawPrint },
      { name: 'Pig Farm', description: 'Herd management, farrowing schedules, feed conversion, and sales', icon: PawPrint },
      { name: 'Beekeeping & Apiary', description: 'Hive management, honey production, queen tracking, and sales', icon: Bug },
      { name: 'Feed & Supply Store', description: 'Agricultural supply inventory, bulk orders, and delivery', icon: Wheat },
      { name: 'Farm Equipment Rental', description: 'Tractor and equipment booking, maintenance, and billing', icon: Tractor },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PET & ANIMAL SERVICES (12 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Pet & Animal Services',
    description: 'Pet care, training, and animal-related businesses',
    modules: [
      { name: 'Pet Store', description: 'Inventory management, live animal tracking, and customer loyalty', icon: Store },
      { name: 'Pet Grooming', description: 'Appointment scheduling, breed profiles, and grooming notes', icon: PawPrint },
      { name: 'Pet Boarding & Kennel', description: 'Reservation management, feeding schedules, and health tracking', icon: Dog },
      { name: 'Veterinary Clinic', description: 'Patient records, appointments, and prescription tracking', icon: Stethoscope },
      { name: 'Pet Training', description: 'Class scheduling, progress tracking, and certifications', icon: PawPrint },
      { name: 'Pet Sitting & Walking', description: 'Visit scheduling, GPS tracking, and client updates', icon: Footprints },
      { name: 'Aquarium Services', description: 'Tank maintenance, water testing, and livestock inventory', icon: Fish },
      { name: 'Horse Boarding & Training', description: 'Stall management, training programs, and billing', icon: PawPrint },
      { name: 'Farrier Services', description: 'Shoeing schedules, client tracking, and inventory', icon: Hammer },
      { name: 'Pet Photography', description: 'Session booking, gallery delivery, and print orders', icon: Camera },
      { name: 'Animal Rescue & Shelter', description: 'Intake, adoption, and foster management', icon: HandHeart },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // HEALTH & WELLNESS (14 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Health & Wellness',
    description: 'Healthcare, therapy, and wellness practitioners',
    modules: [
      { name: 'Massage Therapy', description: 'Appointment booking, SOAP notes, and package sales', icon: HandHeart },
      { name: 'Chiropractic', description: 'Patient management, treatment plans, and billing', icon: HeartPulse },
      { name: 'Physical Therapy', description: 'Exercise programs, progress tracking, and insurance billing', icon: Dumbbell },
      { name: 'Acupuncture', description: 'Treatment protocols, patient history, and scheduling', icon: Syringe },
      { name: 'Yoga & Pilates Studio', description: 'Class scheduling, memberships, and instructor management', icon: Sun },
      { name: 'Personal Training', description: 'Client programs, session tracking, and progress photos', icon: Dumbbell },
      { name: 'Nutrition Coaching', description: 'Meal plans, client tracking, and supplement sales', icon: Salad },
      { name: 'Med Spa', description: 'Treatment scheduling, consent forms, and product sales', icon: Sparkles },
      { name: 'Dental Practice', description: 'Patient scheduling, treatment plans, and insurance', icon: Stethoscope },
      { name: 'Optometry', description: 'Eye exams, prescription tracking, and frame inventory', icon: CircleDot },
      { name: 'Wellness Coaching', description: 'Goal tracking, habit monitoring, check-ins, and program sales', icon: HeartPulse },
      { name: 'Breathwork & Meditation', description: 'Class scheduling, retreat booking, and practitioner management', icon: Sun },
      { name: 'Functional Medicine', description: 'Advanced lab tracking, root cause protocols, and supplement stacks', icon: Stethoscope },
      { name: 'Float Therapy & Sensory', description: 'Pod booking, water quality logs, and membership management', icon: Waves },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // HOLISTIC & ALTERNATIVE MEDICINE (12 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Holistic & Alternative Medicine',
    description: 'Natural healing, energy work, and alternative therapies',
    modules: [
      { name: 'Essential Oils & Aromatherapy', description: 'Product inventory, custom blends, client profiles, and education tracking', icon: Droplets },
      { name: 'Holistic Medicine Practice', description: 'Patient intake, treatment protocols, remedy tracking, and HIPAA-compliant notes', icon: Leaf },
      { name: 'Naturopathic Clinic', description: 'Patient management, lab ordering, supplement dispensary, and treatment plans', icon: Sprout },
      { name: 'Herbalism & Botanical', description: 'Herb inventory, tincture batching, client consultations, and compliance', icon: Leaf },
      { name: 'Reiki & Energy Healing', description: 'Session booking, client notes, practitioner scheduling, and certifications', icon: Sun },
      { name: 'Homeopathy Practice', description: 'Remedy inventory, case management, potency tracking, and follow-ups', icon: Droplets },
      { name: 'Ayurvedic Services', description: 'Dosha assessments, treatment protocols, product sales, and meal planning', icon: Flower2 },
      { name: 'Crystal Healing & Metaphysical', description: 'Inventory management, session booking, and product sales', icon: Gem },
      { name: 'Sound & Vibrational Therapy', description: 'Session scheduling, instrument inventory, and treatment protocols', icon: Music },
      { name: 'Hypnotherapy', description: 'Client intake, session notes, program tracking, and recordings', icon: CircleDot },
      { name: 'Reflexology', description: 'Appointment booking, foot maps, treatment notes, and package sales', icon: Footprints },
      { name: 'Craniosacral Therapy', description: 'Session booking, treatment history, and practitioner notes', icon: HandHeart },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CREATIVE & ARTISAN (12 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Creative & Artisan',
    description: 'Handcrafted goods and creative service businesses',
    modules: [
      { name: 'Photography Studio', description: 'Session booking, gallery proofing, and print fulfillment', icon: Camera },
      { name: 'Jewelry Making', description: 'Custom orders, gemstone inventory, and repair tracking', icon: Gem },
      { name: 'Custom Furniture', description: 'Project quotes, material tracking, and delivery scheduling', icon: Sofa },
      { name: 'Pottery & Ceramics', description: 'Class scheduling, kiln bookings, and inventory', icon: Palette },
      { name: 'Leatherwork', description: 'Custom orders, material inventory, and pattern library', icon: Briefcase },
      { name: 'Candle Making', description: 'Batch tracking, fragrance inventory, and wholesale orders', icon: Flame },
      { name: 'Soap & Cosmetics', description: 'Recipe management, batch tracking, and compliance', icon: Sparkles },
      { name: 'Screen Printing', description: 'Order management, screen inventory, and production queue', icon: Shirt },
      { name: 'Embroidery & Monogramming', description: 'Design library, order tracking, and machine scheduling', icon: Scissors },
      { name: 'Sign Making', description: 'Custom quotes, material tracking, and installation scheduling', icon: Pen },
      { name: 'Herbal Product Making', description: 'Salve batches, ingredient sourcing, and labeling compliance', icon: Leaf },
      { name: 'Incense & Smudge Crafting', description: 'Batch tracking, ingredient inventory, and wholesale orders', icon: Flame },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // EVENTS & ENTERTAINMENT (10 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Events & Entertainment',
    description: 'Event planning, entertainment, and party services',
    modules: [
      { name: 'DJ Services', description: 'Booking, music library, and equipment tracking', icon: Music },
      { name: 'Wedding Planning', description: 'Vendor coordination, timeline management, and budgets', icon: Crown },
      { name: 'Party Rentals', description: 'Inventory management, delivery scheduling, and damage tracking', icon: PartyPopper },
      { name: 'Photo Booth', description: 'Event booking, prop inventory, and print packages', icon: Camera },
      { name: 'Live Entertainment', description: 'Artist booking, contracts, and performance scheduling', icon: Mic2 },
      { name: 'Sound & Lighting Rental', description: 'Equipment inventory, crew scheduling, and setup plans', icon: Speaker },
      { name: 'Bounce House Rental', description: 'Inventory, delivery routes, and safety checklists', icon: Baby },
      { name: 'Balloon & Decor', description: 'Order management, design mockups, and delivery', icon: Gift },
      { name: 'Videography', description: 'Project booking, editing workflow, and delivery', icon: Tv },
      { name: 'Event Venue', description: 'Space booking, catering coordination, and staff scheduling', icon: Home },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // CLEANING & MOVING (8 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Cleaning & Moving',
    description: 'Residential and commercial cleaning and relocation',
    modules: [
      { name: 'Housekeeping', description: 'Recurring schedules, team dispatch, and supply tracking', icon: Home },
      { name: 'Carpet Cleaning', description: 'Job scheduling, equipment tracking, and chemical logs', icon: Sparkles },
      { name: 'Junk Removal', description: 'Pickup scheduling, load pricing, and disposal tracking', icon: Truck },
      { name: 'Moving Services', description: 'Quote estimation, crew scheduling, and inventory lists', icon: Move },
      { name: 'Storage Facility', description: 'Unit management, access logs, and billing', icon: Home },
      { name: 'Mold Remediation', description: 'Testing, treatment protocols, and compliance documentation', icon: Shield },
      { name: 'Biohazard Cleanup', description: 'Safety protocols, disposal tracking, and certification', icon: Shield },
      { name: 'Laundry & Dry Cleaning', description: 'Order tracking, garment tagging, and delivery routes', icon: Shirt },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // SPECIALTY RETAIL (8 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Specialty Retail',
    description: 'Niche retail and resale businesses',
    modules: [
      { name: 'Antique Shop', description: 'Inventory with provenance, consignment, and appraisals', icon: Crown },
      { name: 'Pawn Shop', description: 'Loan tracking, inventory, and compliance reporting', icon: Scale },
      { name: 'Consignment Store', description: 'Consignor accounts, sales tracking, and payouts', icon: ShoppingBag },
      { name: 'Vape & Smoke Shop', description: 'Age verification, inventory, and compliance', icon: Cigarette },
      { name: 'Florist', description: 'Arrangement orders, delivery scheduling, and inventory', icon: Flower2 },
      { name: 'Gift Shop', description: 'Inventory, seasonal planning, and wholesale orders', icon: Gift },
      { name: 'Comic & Card Shop', description: 'Grading, collection management, and event scheduling', icon: Dice1 },
      { name: 'Music Store', description: 'Instrument inventory, rentals, and lesson scheduling', icon: Guitar },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PROFESSIONAL SERVICES (8 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Professional Services',
    description: 'Business, legal, and consulting services',
    modules: [
      { name: 'Notary Services', description: 'Appointment scheduling, document tracking, and mobile notary', icon: Pen },
      { name: 'Tax Preparation', description: 'Client management, document collection, and e-filing', icon: Wallet },
      { name: 'Bookkeeping', description: 'Client accounts, transaction categorization, and reporting', icon: BookOpen },
      { name: 'IT Services', description: 'Ticket management, asset tracking, and remote support', icon: Cog },
      { name: 'Tutoring Services', description: 'Session scheduling, progress tracking, and billing', icon: BookOpen },
      { name: 'Translation Services', description: 'Project management, linguist assignment, and delivery', icon: Feather },
      { name: 'Printing Services', description: 'Order management, proofing workflow, and production queue', icon: Printer },
      { name: 'Courier & Delivery', description: 'Route optimization, tracking, and proof of delivery', icon: Truck },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // RECREATION & FITNESS (8 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Recreation & Fitness',
    description: 'Sports, fitness, and entertainment venues',
    modules: [
      { name: 'Gym & Fitness Center', description: 'Membership management, class scheduling, and equipment maintenance', icon: Dumbbell },
      { name: 'Martial Arts Studio', description: 'Belt tracking, class management, and tournament registration', icon: Sword },
      { name: 'Dance Studio', description: 'Class scheduling, recital planning, and costume tracking', icon: Music },
      { name: 'Shooting Range', description: 'Lane booking, membership, and safety certifications', icon: Target },
      { name: 'Escape Room', description: 'Booking management, game scheduling, and team tracking', icon: KeyRound },
      { name: 'Bowling Alley', description: 'Lane reservations, league management, and POS', icon: CircleDot },
      { name: 'Mini Golf', description: 'Tee time booking, party packages, and maintenance', icon: CircleDot },
      { name: 'Go-Kart Track', description: 'Session booking, safety waivers, and race timing', icon: Car },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // PERSONAL SERVICES (8 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Personal Services',
    description: 'Individual care and specialty personal services',
    modules: [
      { name: 'Barber Shop', description: 'Appointment booking, walk-ins, and loyalty programs', icon: Scissors },
      { name: 'Nail Salon', description: 'Service scheduling, artist assignments, and retail sales', icon: Sparkles },
      { name: 'Seamstress & Alterations', description: 'Measurement tracking, order management, and fittings', icon: Scissors },
      { name: 'Shoe Repair', description: 'Repair tickets, material inventory, and pickup alerts', icon: Footprints },
      { name: 'Watch Repair', description: 'Service tickets, parts tracking, and authentication', icon: Cog },
      { name: 'Phone Repair', description: 'Intake, parts inventory, and warranty tracking', icon: Phone },
      { name: 'Computer Repair', description: 'Ticket management, diagnostics, and parts ordering', icon: Cog },
      { name: 'Funeral Services', description: 'Arrangement planning, scheduling, and family coordination', icon: Church },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // TRAVEL & TOURISM (6 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Travel & Tourism',
    description: 'Travel, hospitality, and tourism businesses',
    modules: [
      { name: 'Tour Operator', description: 'Trip scheduling, group management, and booking', icon: Compass },
      { name: 'Bed & Breakfast', description: 'Room reservations, guest management, and housekeeping', icon: Home },
      { name: 'Vacation Rentals', description: 'Property management, booking calendar, and cleaning dispatch', icon: Home },
      { name: 'Shuttle Service', description: 'Reservation management, driver scheduling, and routes', icon: Truck },
      { name: 'Travel Agency', description: 'Booking management, itinerary building, and vendor coordination', icon: Plane },
      { name: 'Adventure Tours', description: 'Activity booking, equipment tracking, and waivers', icon: Mountain },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // ADVENTURE & WATER SPORTS (8 modules)
  // ═══════════════════════════════════════════════════════════════════════
  {
    category: 'Adventure & Water Sports',
    description: 'Water-based activities, guided adventures, and outdoor experiences',
    modules: [
      { name: 'Scuba Diving', description: 'Dive certifications, equipment rentals, trip scheduling, and safety logs', icon: Waves },
      { name: 'Snorkeling Tours', description: 'Tour booking, equipment tracking, and marine life education', icon: Fish },
      { name: 'Kayak & Paddleboard Rental', description: 'Equipment inventory, rentals, guided tours, and waivers', icon: Anchor },
      { name: 'Surfing School', description: 'Lesson scheduling, instructor management, and board rentals', icon: Waves },
      { name: 'Jet Ski Rentals', description: 'Fleet management, rental booking, and safety certifications', icon: Waves },
      { name: 'White Water Rafting', description: 'Trip scheduling, guide assignments, and safety waivers', icon: Waves },
      { name: 'Sailing Charters', description: 'Vessel booking, crew scheduling, and trip management', icon: Anchor },
      { name: 'Parasailing & Watersports', description: 'Activity booking, equipment maintenance, and weather tracking', icon: Plane },
    ],
  },
];

// Flat list for backward compatibility
export const LANDING_COMING_SOON: LandingComingSoonModule[] = 
  LANDING_COMING_SOON_CATEGORIES.flatMap(cat => cat.modules);
