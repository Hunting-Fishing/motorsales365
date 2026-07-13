
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Car, Building, UserPlus } from "lucide-react";
import { Customer } from "@/types/customer";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerStatsCardsProps {
  customers: Customer[];
  customerStats?: {
    total: number;
    withVehicles: number;
    fleetCustomers: number;
    recentlyAdded: number;
  };
  isLoading: boolean;
}

export function CustomerStatsCards({ customers, customerStats, isLoading }: CustomerStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = customerStats || {
    total: customers.length,
    withVehicles: customers.filter(c => (c.vehicles?.length || 0) > 0).length,
    fleetCustomers: customers.filter(c => c.is_fleet === true).length,
    recentlyAdded: customers.filter(c => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(c.created_at) >= thirtyDaysAgo;
    }).length
  };

  const cards = [
    {
      title: "Total Customers",
      value: stats.total,
      description: "All registered customers",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "With Vehicles",
      value: stats.withVehicles,
      description: "Customers with registered vehicles",
      icon: Car,
      color: "text-green-600"
    },
    {
      title: "Fleet Customers",
      value: stats.fleetCustomers,
      description: "Business fleet customers",
      icon: Building,
      color: "text-purple-600"
    },
    {
      title: "Recently Added",
      value: stats.recentlyAdded,
      description: "Added in last 30 days",
      icon: UserPlus,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
              <p className="text-xs text-slate-500 mt-1">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
