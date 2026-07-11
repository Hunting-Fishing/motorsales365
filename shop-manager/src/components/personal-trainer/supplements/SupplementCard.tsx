import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pill, Star, Clock, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupplementCardProps {
  name: string;
  category: string;
  description?: string;
  recommendedDose?: string;
  benefits?: string[];
  isSponsored?: boolean;
  imageUrl?: string;
  price?: number;
  affiliateLink?: string;
  brandName?: string;
  amazonAsin?: string;
  affiliateTag?: string;
  bestTimeToTake?: string;
  productType?: string;
  onClick?: () => void;
}

const categoryColors: Record<string, string> = {
  vitamin: 'bg-amber-500/15 text-amber-700 border-amber-200',
  mineral: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
  amino_acid: 'bg-blue-500/15 text-blue-700 border-blue-200',
  protein: 'bg-rose-500/15 text-rose-700 border-rose-200',
  herb: 'bg-green-500/15 text-green-700 border-green-200',
  pre_workout: 'bg-orange-500/15 text-orange-700 border-orange-200',
  post_workout: 'bg-teal-500/15 text-teal-700 border-teal-200',
  fat_burner: 'bg-red-500/15 text-red-700 border-red-200',
  joint_support: 'bg-cyan-500/15 text-cyan-700 border-cyan-200',
  essential_oil: 'bg-purple-500/15 text-purple-700 border-purple-200',
  oil_blend: 'bg-violet-500/15 text-violet-700 border-violet-200',
  other: 'bg-slate-500/15 text-slate-700 border-slate-200',
};

const categoryLabels: Record<string, string> = {
  vitamin: 'Vitamin',
  mineral: 'Mineral',
  amino_acid: 'Amino Acid',
  protein: 'Protein',
  herb: 'Herb',
  pre_workout: 'Pre-Workout',
  post_workout: 'Post-Workout',
  fat_burner: 'Fat Burner',
  joint_support: 'Joint Support',
  essential_oil: 'Essential Oil',
  oil_blend: 'Oil Blend',
  other: 'Supplement',
};

export function SupplementCard({
  name, category, description, recommendedDose, benefits, isSponsored,
  imageUrl, price, affiliateLink, brandName, amazonAsin, affiliateTag, bestTimeToTake, productType, onClick
}: SupplementCardProps) {
  const isOil = productType === 'essential_oil' || productType === 'blend';
  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-border/50',
        isSponsored && 'ring-1 ring-amber-300/50'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              {isOil ? <Droplets className="h-4 w-4 text-primary" /> : <Pill className="h-4 w-4 text-primary" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground leading-tight">{name}</h3>
              {brandName && <p className="text-xs text-muted-foreground">{brandName}</p>}
            </div>
          </div>
          {isSponsored && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] shrink-0">
              <Star className="h-2.5 w-2.5 mr-0.5 fill-amber-500" /> Sponsored
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn('text-[10px]', categoryColors[category] || categoryColors.other)}>
            {categoryLabels[category] || category}
          </Badge>
          {bestTimeToTake && (
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <Clock className="h-2.5 w-2.5" /> {bestTimeToTake}
            </Badge>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}

        {recommendedDose && (
          <div className="text-xs">
            <span className="text-muted-foreground">Dose: </span>
            <span className="font-medium text-foreground">{recommendedDose}</span>
          </div>
        )}

        {benefits && benefits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {benefits.slice(0, 3).map(b => (
              <Badge key={b} variant="secondary" className="text-[10px] px-1.5 py-0">
                {b}
              </Badge>
            ))}
            {benefits.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{benefits.length - 3}
              </Badge>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}
