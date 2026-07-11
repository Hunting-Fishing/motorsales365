import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, LucideIcon } from 'lucide-react';

interface ComingSoonCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
}

export function ComingSoonCard({ name, description, icon: Icon }: ComingSoonCardProps) {
  return (
    <Card className="group relative overflow-hidden bg-muted/50 hover:bg-muted/80 transition-all duration-300">
      <Badge
        variant="secondary"
        className="absolute top-1 right-1 md:top-3 md:right-3 text-[8px] md:text-xs px-1 py-0 md:px-2.5 md:py-0.5 h-4 md:h-auto"
      >
        Soon
      </Badge>
      <CardContent className="p-2 md:pt-8 md:pb-6 md:px-6">
        <div className="w-7 h-7 md:w-14 md:h-14 rounded-md md:rounded-xl bg-muted flex items-center justify-center mb-1 md:mb-4 group-hover:bg-primary/10 transition-colors">
          <Icon className="h-3.5 w-3.5 md:h-7 md:w-7 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <h3 className="text-[11px] leading-4 md:text-xl font-semibold mb-0.5 md:mb-2 text-foreground/80 line-clamp-1">
          {name}
        </h3>
        <p className="hidden sm:block text-muted-foreground text-[10px] md:text-sm mb-2 md:mb-4 line-clamp-2">
          {description}
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-muted-foreground hover:text-primary h-6 md:h-9 px-2 md:px-3"
        >
          <Bell className="h-3 w-3 md:h-4 md:w-4" />
          <span className="hidden md:inline text-sm">Notify</span>
        </Button>
      </CardContent>
    </Card>
  );
}
