import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SponsorCardProps {
  name: string;
  logoUrl?: string;
  website?: string;
  tier: string;
  description?: string;
}

const tierConfig: Record<string, { color: string; bg: string; border: string }> = {
  platinum: { color: 'text-slate-700', bg: 'bg-gradient-to-br from-slate-100 to-slate-200', border: 'border-slate-300 ring-1 ring-slate-300/50' },
  gold: { color: 'text-amber-700', bg: 'bg-gradient-to-br from-amber-50 to-amber-100', border: 'border-amber-200 ring-1 ring-amber-200/50' },
  silver: { color: 'text-gray-600', bg: 'bg-gradient-to-br from-gray-50 to-gray-100', border: 'border-gray-200' },
  bronze: { color: 'text-orange-700', bg: 'bg-gradient-to-br from-orange-50 to-orange-100', border: 'border-orange-200' },
};

export function SponsorCard({ name, logoUrl, website, tier, description }: SponsorCardProps) {
  const config = tierConfig[tier] || tierConfig.bronze;

  return (
    <Card className={cn('transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5', config.border)}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', config.bg)}>
                <Award className={cn('h-6 w-6', config.color)} />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-sm text-foreground">{name}</h3>
              <Badge variant="outline" className={cn('text-[10px] capitalize', config.color)}>
                {tier}
              </Badge>
            </div>
          </div>
        </div>

        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}

        {website && (
          <a href={website} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline">
            Visit Website <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
