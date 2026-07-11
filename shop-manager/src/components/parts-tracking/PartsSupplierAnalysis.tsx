import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface SupplierMetrics {
  name: string;
  totalParts: number;
  totalValue: number;
}

export function PartsSupplierAnalysis() {
  const [suppliers, setSuppliers] = useState<SupplierMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSupplierData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();

        if (!profile?.shop_id) return;

        // Get inventory items grouped by supplier
        const { data: items } = await supabase
          .from('inventory_items')
          .select('supplier, quantity, unit_price, cost_per_unit')
          .eq('shop_id', profile.shop_id);

        if (items) {
          const supplierMap = items.reduce((acc, item) => {
            const supplier = item.supplier || 'Unknown';
            if (!acc[supplier]) {
              acc[supplier] = {
                name: supplier,
                totalParts: 0,
                totalValue: 0,
              };
            }
            acc[supplier].totalParts += item.quantity || 0;
            acc[supplier].totalValue += (item.quantity || 0) * (item.cost_per_unit || item.unit_price || 0);
            return acc;
          }, {} as Record<string, SupplierMetrics>);

          const supplierMetrics = Object.values(supplierMap).sort((a, b) => b.totalValue - a.totalValue);
          setSuppliers(supplierMetrics);
        }
      } catch (error) {
        console.error('Error fetching supplier data:', error);
      }
      setIsLoading(false);
    };

    fetchSupplierData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Supplier Performance Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Supplier Performance Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No supplier data available. Add inventory items to see supplier analytics.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Supplier Performance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {suppliers.map((supplier, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">{supplier.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    {supplier.totalParts} parts
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Total Inventory Value:</span>
                  <p className="font-medium">{formatCurrency(supplier.totalValue)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
