import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Globe, Package, Droplets } from 'lucide-react';

interface BrandCardProps {
  name: string;
  website?: string;
  country?: string;
  category?: string;
  description?: string;
  isSponsor?: boolean;
  productCount?: number;
  onClick?: () => void;
}

const countryFlags: Record<string, string> = {
  USA: '🇺🇸',
  Canada: '🇨🇦',
  UK: '🇬🇧',
  Australia: '🇦🇺',
  Germany: '🇩🇪',
};

export function BrandCard({ name, website, country, category, description, isSponsor, productCount, onClick }: BrandCardProps) {
  const flag = country ? countryFlags[country] || '🌍' : null;
  const isOilBrand = category === 'essential_oils' || category === 'both';

  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-border/50"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              {isOilBrand ? <Droplets className="h-5 w-5 text-primary" /> : <Building2 className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground leading-tight">{name}</h3>
              {country && (
                <p className="text-xs text-muted-foreground">{flag} {country}</p>
              )}
            </div>
          </div>
          {isSponsor && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] shrink-0">
              Sponsor
            </Badge>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {category && (
            <Badge variant="outline" className="text-[10px]">
              {category === 'both' ? 'Supplements & Oils' : category === 'essential_oils' ? 'Essential Oils' : 'Supplements'}
            </Badge>
          )}
          {productCount != null && productCount > 0 && (
            <Badge variant="secondary" className="text-[10px] gap-0.5">
              <Package className="h-2.5 w-2.5" /> {productCount} products
            </Badge>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}

        {website && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Globe className="h-3 w-3" />
            <span className="truncate">{website.replace('https://', '').replace('http://', '')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
