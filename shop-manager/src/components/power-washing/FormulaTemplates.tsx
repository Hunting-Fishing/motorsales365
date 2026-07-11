import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileStack, Home, Building2, Droplets, Fence, Car, Trees } from 'lucide-react';
import type { PricingFormula } from '@/types/pricing-formula';
import type { FormulaChemical } from '@/hooks/power-washing/usePricingFormulas';

interface FormulaTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'residential' | 'commercial' | 'industrial';
  formula: Partial<PricingFormula>;
  chemicals: FormulaChemical[];
}

const PRESET_TEMPLATES: FormulaTemplate[] = [
  // Residential Templates
  {
    id: 'res-driveway',
    name: 'Residential Driveway',
    description: 'Standard concrete driveway - most common residential job',
    icon: <Car className="h-5 w-5" />,
    category: 'residential',
    formula: {
      name: 'Residential Driveway',
      surface_type: 'concrete',
      application: 'driveway',
      category: 'residential',
      price_per_sqft_light: 0.12,
      price_per_sqft_medium: 0.18,
      price_per_sqft_heavy: 0.25,
      minimum_charge: 125,
      sh_concentration_light: 1.0,
      sh_concentration_medium: 3.0,
      sh_concentration_heavy: 5.0,
      mix_coverage_sqft: 150,
      minutes_per_100sqft: 3,
      setup_minutes: 15,
      labor_rate_type: 'standard',
      notes: 'Standard residential driveway pricing',
    },
    chemicals: [
      {
        inventory_item_id: null,
        chemical_name: 'Sodium Hypochlorite (SH)',
        concentration_light: 1.0,
        concentration_medium: 3.0,
        concentration_heavy: 5.0,
        coverage_sqft_per_gallon: 150,
        is_primary: true,
        display_order: 0,
      },
    ],
  },
  {
    id: 'res-house-wash',
    name: 'House Wash - Vinyl Siding',
    description: 'Soft wash for vinyl/aluminum siding',
    icon: <Home className="h-5 w-5" />,
    category: 'residential',
    formula: {
      name: 'House Wash - Vinyl Siding',
      surface_type: 'vinyl',
      application: 'house_wash',
      category: 'residential',
      price_per_sqft_light: 0.15,
      price_per_sqft_medium: 0.22,
      price_per_sqft_heavy: 0.30,
      minimum_charge: 200,
      sh_concentration_light: 1.0,
      sh_concentration_medium: 2.0,
      sh_concentration_heavy: 3.0,
      mix_coverage_sqft: 200,
      minutes_per_100sqft: 2,
      setup_minutes: 20,
      labor_rate_type: 'standard',
      notes: 'Soft wash application for house siding',
    },
    chemicals: [
      {
        inventory_item_id: null,
        chemical_name: 'Sodium Hypochlorite (SH)',
        concentration_light: 1.0,
        concentration_medium: 2.0,
        concentration_heavy: 3.0,
        coverage_sqft_per_gallon: 200,
        is_primary: true,
        display_order: 0,
      },
      {
        inventory_item_id: null,
        chemical_name: 'Surfactant',
        concentration_light: 0.5,
        concentration_medium: 0.5,
        concentration_heavy: 0.5,
        coverage_sqft_per_gallon: 400,
        is_primary: false,
        display_order: 1,
      },
    ],
  },
  {
    id: 'res-roof',
    name: 'Roof Soft Wash',
    description: 'Asphalt shingle roof treatment',
    icon: <Home className="h-5 w-5" />,
    category: 'residential',
    formula: {
      name: 'Roof Soft Wash',
      surface_type: 'asphalt',
      application: 'roof',
      category: 'residential',
      price_per_sqft_light: 0.25,
      price_per_sqft_medium: 0.35,
      price_per_sqft_heavy: 0.45,
      minimum_charge: 350,
      sh_concentration_light: 3.0,
      sh_concentration_medium: 5.0,
      sh_concentration_heavy: 6.0,
      mix_coverage_sqft: 100,
      minutes_per_100sqft: 4,
      setup_minutes: 30,
      labor_rate_type: 'roof',
      notes: 'Soft wash for asphalt shingles - no pressure',
    },
    chemicals: [
      {
        inventory_item_id: null,
        chemical_name: 'Sodium Hypochlorite (SH)',
        concentration_light: 3.0,
        concentration_medium: 5.0,
        concentration_heavy: 6.0,
        coverage_sqft_per_gallon: 100,
        is_primary: true,
        display_order: 0,
      },
    ],
  },
  {
    id: 'res-deck',
    name: 'Wood Deck Cleaning',
    description: 'Wooden deck and patio surfaces',
    icon: <Trees className="h-5 w-5" />,
    category: 'residential',
    formula: {
      name: 'Wood Deck Cleaning',
      surface_type: 'wood',
      application: 'deck',
      category: 'residential',
      price_per_sqft_light: 0.50,
      price_per_sqft_medium: 0.75,
      price_per_sqft_heavy: 1.00,
      minimum_charge: 175,
      sh_concentration_light: 0.5,
      sh_concentration_medium: 1.0,
      sh_concentration_heavy: 1.5,
      mix_coverage_sqft: 100,
      minutes_per_100sqft: 5,
      setup_minutes: 20,
      labor_rate_type: 'standard',
      notes: 'Gentle cleaning for wood surfaces',
    },
    chemicals: [
      {
        inventory_item_id: null,
        chemical_name: 'Sodium Hypochlorite (SH)',
        concentration_light: 0.5,
        concentration_medium: 1.0,
        concentration_heavy: 1.5,
        coverage_sqft_per_gallon: 100,
        is_primary: true,
        display_order: 0,
      },
    ],
  },
  {
    id: 'res-fence',
    name: 'Fence Cleaning',
    description: 'Wood or vinyl fence surfaces',
    icon: <Fence className="h-5 w-5" />,
    category: 'residential',
    formula: {
      name: 'Fence Cleaning',
      surface_type: 'wood',
      application: 'fence',
      category: 'residential',
      price_per_sqft_light: 0.35,
      price_per_sqft_medium: 0.50,
      price_per_sqft_heavy: 0.65,
      minimum_charge: 150,
      sh_concentration_light: 1.0,
      sh_concentration_medium: 2.0,
      sh_concentration_heavy: 3.0,
      mix_coverage_sqft: 120,
      minutes_per_100sqft: 4,
      setup_minutes: 15,
      labor_rate_type: 'standard',
      notes: 'Fence cleaning - both sides priced separately',
    },
    chemicals: [
      {
        inventory_item_id: null,
        chemical_name: 'Sodium Hypochlorite (SH)',
        concentration_light: 1.0,
        concentration_medium: 2.0,
        concentration_heavy: 3.0,
        coverage_sqft_per_gallon: 120,
        is_primary: true,
        display_order: 0,
      },
    ],
  },
  {
    id: 'res-patio',
    name: 'Patio / Pool Deck',
    description: 'Concrete or stone patio and pool decks',
    icon: <Droplets className="h-5 w-5" />,
    category: 'residential',
    formula: {
      name: 'Patio / Pool Deck',
      surface_type: 'concrete',
      application: 'pool_deck',
      category: 'residential',
      price_per_sqft_light: 0.15,
      price_per_sqft_medium: 0.22,
      price_per_sqft_heavy: 0.30,
      minimum_charge: 150,
      sh_concentration_light: 1.0,
      sh_concentration_medium: 3.0,
      sh_concentration_heavy: 5.0,
      mix_coverage_sqft: 150,
      minutes_per_100sqft: 3,
      setup_minutes: 15,
      labor_rate_type: 'standard',
      notes: 'Pool deck and patio surfaces',
    },
    chemicals: [
      {
        inventory_item_id: null,
        chemical_name: 'Sodium Hypochlorite (SH)',
        concentration_light: 1.0,
        concentration_medium: 3.0,
        concentration_heavy: 5.0,
        coverage_sqft_per_gallon: 150,
        is_primary: true,
        display_order: 0,
      },
    ],
  },
  // Commercial Templates
  {
    id: 'com-parking',
    name: 'Commercial Parking Lot',
    description: 'Large concrete parking areas',
    icon: <Building2 className="h-5 w-5" />,
    category: 'commercial',
    formula: {
      name: 'Commercial Parking Lot',
      surface_type: 'concrete',
      application: 'parking_lot',
      category: 'commercial',
      price_per_sqft_light: 0.08,
      price_per_sqft_medium: 0.12,
      price_per_sqft_heavy: 0.18,
      minimum_charge: 500,
      sh_concentration_light: 2.0,
      sh_concentration_medium: 4.0,
      sh_concentration_heavy: 6.0,
      mix_coverage_sqft: 200,
      minutes_per_100sqft: 2,
      setup_minutes: 45,
      labor_rate_type: 'heavy_equipment',
      notes: 'Volume pricing for large commercial lots',
    },
    chemicals: [
      {
        inventory_item_id: null,
        chemical_name: 'Sodium Hypochlorite (SH)',
        concentration_light: 2.0,
        concentration_medium: 4.0,
        concentration_heavy: 6.0,
        coverage_sqft_per_gallon: 200,
        is_primary: true,
        display_order: 0,
      },
      {
        inventory_item_id: null,
        chemical_name: 'Degreaser',
        concentration_light: 1.0,
        concentration_medium: 2.0,
        concentration_heavy: 3.0,
        coverage_sqft_per_gallon: 300,
        is_primary: false,
        display_order: 1,
      },
    ],
  },
  {
    id: 'com-storefront',
    name: 'Commercial Storefront',
    description: 'Building exterior and sidewalks',
    icon: <Building2 className="h-5 w-5" />,
    category: 'commercial',
    formula: {
      name: 'Commercial Storefront',
      surface_type: 'concrete',
      application: 'sidewalk',
      category: 'commercial',
      price_per_sqft_light: 0.10,
      price_per_sqft_medium: 0.15,
      price_per_sqft_heavy: 0.22,
      minimum_charge: 300,
      sh_concentration_light: 2.0,
      sh_concentration_medium: 3.0,
      sh_concentration_heavy: 5.0,
      mix_coverage_sqft: 150,
      minutes_per_100sqft: 3,
      setup_minutes: 30,
      labor_rate_type: 'standard',
      notes: 'Storefront and sidewalk cleaning',
    },
    chemicals: [
      {
        inventory_item_id: null,
        chemical_name: 'Sodium Hypochlorite (SH)',
        concentration_light: 2.0,
        concentration_medium: 3.0,
        concentration_heavy: 5.0,
        coverage_sqft_per_gallon: 150,
        is_primary: true,
        display_order: 0,
      },
    ],
  },
  {
    id: 'com-building-wash',
    name: 'Commercial Building Wash',
    description: 'Multi-story building exterior',
    icon: <Building2 className="h-5 w-5" />,
    category: 'commercial',
    formula: {
      name: 'Commercial Building Wash',
      surface_type: 'stucco',
      application: 'house_wash',
      category: 'commercial',
      price_per_sqft_light: 0.12,
      price_per_sqft_medium: 0.18,
      price_per_sqft_heavy: 0.25,
      minimum_charge: 750,
      sh_concentration_light: 2.0,
      sh_concentration_medium: 3.0,
      sh_concentration_heavy: 4.0,
      mix_coverage_sqft: 175,
      minutes_per_100sqft: 2.5,
      setup_minutes: 45,
      labor_rate_type: 'standard',
      notes: 'Commercial building exterior soft wash',
    },
    chemicals: [
      {
        inventory_item_id: null,
        chemical_name: 'Sodium Hypochlorite (SH)',
        concentration_light: 2.0,
        concentration_medium: 3.0,
        concentration_heavy: 4.0,
        coverage_sqft_per_gallon: 175,
        is_primary: true,
        display_order: 0,
      },
      {
        inventory_item_id: null,
        chemical_name: 'Surfactant',
        concentration_light: 0.5,
        concentration_medium: 0.5,
        concentration_heavy: 0.5,
        coverage_sqft_per_gallon: 350,
        is_primary: false,
        display_order: 1,
      },
    ],
  },
];

interface FormulaTemplatesProps {
  onSelectTemplate: (formula: Partial<PricingFormula>, chemicals: FormulaChemical[]) => void;
}

export function FormulaTemplates({ onSelectTemplate }: FormulaTemplatesProps) {
  const [open, setOpen] = useState(false);

  const residentialTemplates = PRESET_TEMPLATES.filter(t => t.category === 'residential');
  const commercialTemplates = PRESET_TEMPLATES.filter(t => t.category === 'commercial');

  const handleSelect = (template: FormulaTemplate) => {
    onSelectTemplate(template.formula, template.chemicals);
    setOpen(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'residential':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'commercial':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'industrial':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileStack className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Formula Templates</DialogTitle>
          <DialogDescription>
            Start with a preset formula and customize it for your needs
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Residential */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Residential
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {residentialTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelect(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                            {template.icon}
                          </div>
                          <CardTitle className="text-sm font-medium">
                            {template.name}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs mb-2">
                        {template.description}
                      </CardDescription>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          ${template.formula.price_per_sqft_medium}/sqft
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Min ${template.formula.minimum_charge}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Commercial */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Commercial
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {commercialTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelect(template)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                            {template.icon}
                          </div>
                          <CardTitle className="text-sm font-medium">
                            {template.name}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-xs mb-2">
                        {template.description}
                      </CardDescription>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          ${template.formula.price_per_sqft_medium}/sqft
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Min ${template.formula.minimum_charge}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
