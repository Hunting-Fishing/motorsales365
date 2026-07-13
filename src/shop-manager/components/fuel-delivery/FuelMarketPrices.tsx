import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Fuel, TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink } from 'lucide-react';
import { useConfiguredFuelPrices, useRefreshFuelPrices, FuelMarketPrice } from '@/hooks/fuel-delivery/useFuelMarketPrices';
import { format, parseISO } from 'date-fns';

interface FuelMarketPricesProps {
  compact?: boolean;
  showRefresh?: boolean;
  className?: string;
}

export function FuelMarketPrices({ compact = false, showRefresh = true, className = '' }: FuelMarketPricesProps) {
  const { data: prices, isLoading, settings, city, province, customLabel, showOnPortal } = useConfiguredFuelPrices();
  const refreshMutation = useRefreshFuelPrices();

  // Group prices by fuel type and get latest
  const latestPrices = React.useMemo(() => {
    if (!prices || prices.length === 0) return {};
    
    const byType: Record<string, FuelMarketPrice> = {};
    for (const price of prices) {
      if (!byType[price.fuel_type]) {
        byType[price.fuel_type] = price;
      }
    }
    return byType;
  }, [prices]);

  const regularPrice = latestPrices['regular_gasoline'];
  const dieselPrice = latestPrices['diesel'];

  // Format price as dollars per litre
  const formatPrice = (centsPerLitre: number) => {
    return (centsPerLitre / 100).toFixed(3);
  };

  // Get price date
  const priceDate = regularPrice?.price_month 
    ? format(parseISO(regularPrice.price_month), 'MMMM yyyy')
    : 'N/A';

  const lastUpdated = regularPrice?.updated_at
    ? format(parseISO(regularPrice.updated_at), 'MMM d, yyyy')
    : null;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-sm">Market Prices</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {customLabel || city}, {province}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {regularPrice && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Regular</p>
                <p className="text-lg font-bold text-foreground">${formatPrice(regularPrice.price_cents_per_litre)}</p>
                <p className="text-xs text-muted-foreground">/L</p>
              </div>
            )}
            {dieselPrice && (
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Diesel</p>
                <p className="text-lg font-bold text-foreground">${formatPrice(dieselPrice.price_cents_per_litre)}</p>
                <p className="text-xs text-muted-foreground">/L</p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Source: Statistics Canada • {priceDate}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Fuel className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-base">Current Fuel Prices</CardTitle>
              <CardDescription className="text-xs">
                {customLabel ? `${customLabel} (${city} Market)` : `${city}, ${province}`} • {priceDate}
              </CardDescription>
            </div>
          </div>
          {showRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Regular Gasoline */}
        {regularPrice ? (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Fuel className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Regular Gasoline</p>
                <p className="text-xs text-muted-foreground">87 Octane</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-foreground">
                ${formatPrice(regularPrice.price_cents_per_litre)}
                <span className="text-sm font-normal text-muted-foreground">/L</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {regularPrice.price_cents_per_litre.toFixed(1)}¢/L
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted/50 rounded-lg text-center text-muted-foreground">
            No regular gasoline price available
          </div>
        )}

        {/* Diesel */}
        {dieselPrice ? (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Fuel className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-foreground">Diesel</p>
                <p className="text-xs text-muted-foreground">Ultra Low Sulfur</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-foreground">
                ${formatPrice(dieselPrice.price_cents_per_litre)}
                <span className="text-sm font-normal text-muted-foreground">/L</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {dieselPrice.price_cents_per_litre.toFixed(1)}¢/L
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-muted/50 rounded-lg text-center text-muted-foreground">
            No diesel price available
          </div>
        )}

        {/* Attribution */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            <span>Source: Statistics Canada</span>
          </div>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdated}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
