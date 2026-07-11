import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface ModuleCardProps {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  price?: string;
}

export function ModuleCard({ slug, name, description, icon: Icon, color, price }: ModuleCardProps) {
  return (
    <Card className="group relative overflow-hidden hover:shadow-md transition-shadow">
      <Badge className="absolute top-1 right-1 md:top-3 md:right-3 bg-primary text-primary-foreground hover:bg-primary/90 text-[8px] md:text-xs px-1 py-0 md:px-2.5 md:py-0.5 h-4 md:h-auto">
        Live
      </Badge>
      <CardContent className="p-2 md:pt-8 md:pb-6 md:px-6">
        <div
          className={`w-7 h-7 md:w-14 md:h-14 rounded-md md:rounded-xl flex items-center justify-center mb-1 md:mb-4 ${color}`}
        >
          <Icon className="h-3.5 w-3.5 md:h-7 md:w-7 text-white" />
        </div>

        <h3 className="text-[11px] leading-4 md:text-xl font-semibold mb-0.5 md:mb-2 line-clamp-2 min-h-[2rem] md:min-h-[3.5rem]">
          {name}
        </h3>

        <p className="hidden sm:block text-muted-foreground text-[10px] md:text-sm mb-2 md:mb-4 line-clamp-2">
          {description}
        </p>

        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] md:text-lg font-bold text-primary leading-none">{price}</span>
          <Button
            size="sm"
            variant="outline"
            asChild
            className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors h-6 md:h-9 px-2 md:px-3"
          >
            <Link to={`/modules/${slug}`} className="flex items-center gap-1 text-[10px] md:text-sm">
              <span className="hidden md:inline">View</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
