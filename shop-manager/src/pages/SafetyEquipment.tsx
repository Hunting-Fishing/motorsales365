import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { EquipmentList } from '@/components/equipment/EquipmentList';
import { AddEquipmentDialog } from '@/components/equipment/AddEquipmentDialog';
import { useEquipmentByAssetClass } from '@/hooks/useEquipmentByAssetClass';
import { useEquipmentCategories } from '@/hooks/useEquipmentCategories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SafetyEquipment() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const { equipment, stats, isLoading, refetch } = useEquipmentByAssetClass('safety');
  const { categories } = useEquipmentCategories();

  // Filter categories to only show safety-related ones
  const safetyCategories = useMemo(() => {
    return categories.filter(c => 
      c.name.toLowerCase().includes('safety') ||
      c.name.toLowerCase().includes('fire') ||
      c.name.toLowerCase().includes('emergency') ||
      c.name.toLowerCase().includes('life')
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Filter equipment by category
  const filteredEquipment = useMemo(() => {
    if (categoryFilter === 'all') return equipment;
    return equipment.filter(item => (item as any).category_id === categoryFilter);
  }, [equipment, categoryFilter]);

  // Calculate stats for filtered equipment
  const displayStats = useMemo(() => {
    if (categoryFilter === 'all') return stats;
    return {
      total: filteredEquipment.length,
      operational: filteredEquipment.filter(item => item.status === 'operational').length,
      needsMaintenance: filteredEquipment.filter(item => item.status === 'maintenance').length,
      outOfService: filteredEquipment.filter(item => item.status === 'down' || item.status === 'retired' || item.status === 'out_of_service').length
    };
  }, [filteredEquipment, categoryFilter, stats]);

  // Count items needing certification/expiry attention
  const expiringCount = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return equipment.filter(item => {
      const nextService = (item as any).next_service_date;
      if (!nextService) return false;
      const serviceDate = new Date(nextService);
      return serviceDate <= thirtyDaysFromNow && serviceDate >= now;
    }).length;
  }, [equipment]);

  return (
    <>
      <Helmet>
        <title>Safety Equipment | All Business 365</title>
        <meta name="description" content="Manage safety equipment including fire extinguishers, first aid kits, emergency equipment, and life-saving devices." />
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Safety Equipment</h1>
            <p className="text-muted-foreground">
              Manage fire extinguishers, first aid kits, and emergency equipment
            </p>
          </div>
          <AddEquipmentDialog 
            open={dialogOpen} 
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setTimeout(() => refetch(), 300);
              }
            }}
          />
        </div>

        {/* Category Filter */}
        {safetyCategories.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">Category:</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Safety Equipment</SelectItem>
                      {safetyCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {categoryFilter !== 'all' && (
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Safety Items</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : displayStats.total}</div>
              <p className="text-xs text-muted-foreground">
                Safety equipment items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliant</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : displayStats.operational}</div>
              <p className="text-xs text-muted-foreground">
                Up to date
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : expiringCount}</div>
              <p className="text-xs text-muted-foreground">
                Within 30 days
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : displayStats.needsMaintenance + displayStats.outOfService}</div>
              <p className="text-xs text-muted-foreground">
                Service or replacement required
              </p>
            </CardContent>
          </Card>
        </div>

        <EquipmentList equipment={filteredEquipment} loading={isLoading} onUpdate={refetch} />
      </div>
    </>
  );
}
