
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PartsAnalyticsDashboard } from '@/components/parts-tracking/PartsAnalyticsDashboard';
import { PartsInventoryOverview } from '@/components/parts-tracking/PartsInventoryOverview';
import { PartsRevenueAnalysis } from '@/components/parts-tracking/PartsRevenueAnalysis';
import { PartsTechnicianEfficiency } from '@/components/parts-tracking/PartsTechnicianEfficiency';
import { PartsWarrantyTracking } from '@/components/parts-tracking/PartsWarrantyTracking';
import { PartsSupplierAnalysis } from '@/components/parts-tracking/PartsSupplierAnalysis';
import { PartsSearchAndFilter } from '@/components/parts-tracking/PartsSearchAndFilter';
import { Package, TrendingUp, Users, Shield, Building, Search } from 'lucide-react';

export default function PartsTracking() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parts Tracking</h1>
          <p className="text-muted-foreground">
            Comprehensive parts management, analytics, and tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Live Data
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="technicians" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Technicians
          </TabsTrigger>
          <TabsTrigger value="warranty" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Warranty
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PartsInventoryOverview />
          <PartsSearchAndFilter />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <PartsAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <PartsRevenueAnalysis />
        </TabsContent>

        <TabsContent value="technicians" className="space-y-6">
          <PartsTechnicianEfficiency />
        </TabsContent>

        <TabsContent value="warranty" className="space-y-6">
          <PartsWarrantyTracking />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <PartsSupplierAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
