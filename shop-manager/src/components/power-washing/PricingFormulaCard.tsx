import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Copy, Trash2, DollarSign, Clock, Droplets } from 'lucide-react';
import type { PricingFormula } from '@/types/pricing-formula';
import { SURFACE_TYPES, APPLICATIONS, SH_SOURCE_CONCENTRATION } from '@/types/pricing-formula';

interface PricingFormulaCardProps {
  formula: PricingFormula;
  onEdit: (formula: PricingFormula) => void;
  onDuplicate: (formula: PricingFormula) => void;
  onDelete: (id: string) => void;
}

export function PricingFormulaCard({ formula, onEdit, onDuplicate, onDelete }: PricingFormulaCardProps) {
  const surfaceLabel = SURFACE_TYPES.find(s => s.value === formula.surface_type)?.label || formula.surface_type;
  const applicationLabel = APPLICATIONS.find(a => a.value === formula.application)?.label || formula.application;

  const getApplicationIcon = (app: string) => {
    switch (app) {
      case 'driveway':
      case 'sidewalk':
      case 'parking_lot':
      case 'patio':
        return '🅿️';
      case 'house_wash':
        return '🏠';
      case 'roof':
        return '🏠';
      case 'deck':
      case 'fence':
        return '🌲';
      case 'pool_deck':
        return '🏊';
      default:
        return '🧹';
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${!formula.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getApplicationIcon(formula.application)}</span>
            <div>
              <h3 className="font-semibold text-lg leading-tight">{formula.name}</h3>
              <p className="text-sm text-muted-foreground">{surfaceLabel}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(formula)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(formula)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(formula.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline">{applicationLabel}</Badge>
          <Badge variant="secondary" className="capitalize">{formula.category}</Badge>
          {!formula.is_active && <Badge variant="destructive">Inactive</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Price per sqft
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-green-50 dark:bg-green-950/30 rounded p-2 text-center">
              <div className="text-xs text-green-600 dark:text-green-400">Light</div>
              <div className="font-semibold">${formula.price_per_sqft_light.toFixed(2)}</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded p-2 text-center">
              <div className="text-xs text-yellow-600 dark:text-yellow-400">Medium</div>
              <div className="font-semibold">${formula.price_per_sqft_medium.toFixed(2)}</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded p-2 text-center">
              <div className="text-xs text-red-600 dark:text-red-400">Heavy</div>
              <div className="font-semibold">${formula.price_per_sqft_heavy.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Min: ${formula.minimum_charge.toFixed(0)}
          </div>
        </div>

        {/* Chemical Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Droplets className="h-4 w-4" />
              SH Concentration
            </div>
            <div className="flex gap-2">
              <span className="text-green-600">{formula.sh_concentration_light}%</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-yellow-600">{formula.sh_concentration_medium}%</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-red-600">{formula.sh_concentration_heavy}%</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            from {SH_SOURCE_CONCENTRATION}% stock
          </div>
        </div>

        {/* Labor Section */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            Time
          </div>
          <div>
            {formula.minutes_per_100sqft} min/100sqft + {formula.setup_minutes}m setup
          </div>
        </div>

        {formula.notes && (
          <p className="text-xs text-muted-foreground italic border-t pt-2 mt-2">
            {formula.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
