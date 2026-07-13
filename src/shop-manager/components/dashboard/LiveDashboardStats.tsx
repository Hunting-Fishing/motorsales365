
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Wrench, Package, Receipt } from 'lucide-react';

interface DashboardStats {
  totalCustomers: number;
  activeWorkOrders: number;
  inventoryItems: number;
  totalInvoices: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const [customersResult, workOrdersResult, inventoryResult, invoicesResult] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('work_orders').select('id', { count: 'exact', head: true }).neq('status', 'completed'),
    supabase.from('inventory_items').select('id', { count: 'exact', head: true }),
    supabase.from('invoices').select('id', { count: 'exact', head: true })
  ]);

  return {
    totalCustomers: customersResult.count || 0,
    activeWorkOrders: workOrdersResult.count || 0,
    inventoryItems: inventoryResult.count || 0,
    totalInvoices: invoicesResult.count || 0,
  };
}

export function LiveDashboardStats() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="pt-6 pb-4">
            <p className="text-red-600">Error loading dashboard statistics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Customers",
      value: stats?.totalCustomers || 0,
      icon: Users,
      description: "Registered customers"
    },
    {
      title: "Active Work Orders", 
      value: stats?.activeWorkOrders || 0,
      icon: Wrench,
      description: "In progress orders"
    },
    {
      title: "Inventory Items",
      value: stats?.inventoryItems || 0,
      icon: Package,
      description: "Items in stock"
    },
    {
      title: "Total Invoices",
      value: stats?.totalInvoices || 0,
      icon: Receipt,
      description: "Generated invoices"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
