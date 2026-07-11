import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceMainCategory } from '@/types/service';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ServicesPriceReportProps {
  categories: ServiceMainCategory[];
}

export function ServicesPriceReport({ categories }: ServicesPriceReportProps) {
  const servicesWithPrice = useMemo(() => {
    return categories.flatMap(category =>
      category.subcategories.flatMap(subcategory =>
        subcategory.jobs.filter(job => job.price !== undefined && job.price !== null)
      )
    );
  }, [categories]);

  const averagePrice = useMemo(() => {
    if (servicesWithPrice.length === 0) return 0;
    const total = servicesWithPrice.reduce((sum, service) => sum + (service.price || 0), 0);
    return total / servicesWithPrice.length;
  }, [servicesWithPrice]);

  const priceDistribution = useMemo(() => {
    const distribution: { priceRange: string; count: number }[] = [];
    const rangeSize = 50;
  
    servicesWithPrice.forEach(service => {
      const price = service.price || 0;
      const rangeStart = Math.floor(price / rangeSize) * rangeSize;
      const rangeEnd = rangeStart + rangeSize;
      const priceRange = `$${rangeStart} - $${rangeEnd}`;
  
      let range = distribution.find(item => item.priceRange === priceRange);
      if (range) {
        range.count++;
      } else {
        distribution.push({ priceRange, count: 1 });
      }
    });
  
    // Sort by the numerical value of the range start
    distribution.sort((a, b) => {
      const aStart = parseInt(a.priceRange.split('-')[0].replace('$', ''), 10);
      const bStart = parseInt(b.priceRange.split('-')[0].replace('$', ''), 10);
      return aStart - bStart;
    });
  
    return distribution;
  }, [servicesWithPrice]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services Price Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Total Services with Price:</span>
            <Badge variant="secondary">{servicesWithPrice.length}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Average Price:</span>
            <Badge variant="secondary">${averagePrice.toFixed(2)}</Badge>
          </div>
        </div>

        <div>
          <h4>Price Distribution</h4>
          {priceDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">No price data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priceDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priceRange" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
