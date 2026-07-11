import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Droplets, 
  Calendar, 
  DollarSign, 
  Truck,
  AlertTriangle,
  Plus,
  ClipboardList,
  Users,
  MapPin,
  Package,
  Receipt,
  Route,
  BarChart3,
  Container,
  Settings,
  Filter,
  Beaker,
  ShieldCheck,
  ThermometerSun
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function WaterDeliveryDashboard() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'water_delivery');
  const { getVolumeLabel, formatVolume } = useWaterUnits();

  // Fetch tanks with low levels
  const { data: lowLevelTanks } = useQuery({
    queryKey: ['water-delivery-low-tanks', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('water_delivery_tanks')
        .select('id, tank_number, current_level_percent')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .lt('current_level_percent', 25);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch filters due for replacement
  const { data: filtersDue } = useQuery({
    queryKey: ['water-delivery-filters-due', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const { data, error } = await supabase
        .from('water_delivery_equipment_filters')
        .select('id, filter_name, next_replacement_date')
        .eq('shop_id', shopId)
        .lt('next_replacement_date', thirtyDaysFromNow.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch tanks needing sanitization
  const { data: sanitizationDue } = useQuery({
    queryKey: ['water-delivery-sanitization-due', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const { data, error } = await supabase
        .from('water_delivery_tanks')
        .select('id, tank_number, last_sanitized_date')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .or(`last_sanitized_date.is.null,last_sanitized_date.lt.${threeMonthsAgo.toISOString()}`);
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const statCards = [
    {
      title: 'Pending Orders',
      value: 0,
      icon: ClipboardList,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      title: 'Scheduled',
      value: 0,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'In Transit',
      value: 0,
      icon: Truck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: `${getVolumeLabel(true)} Today`,
      value: formatVolume(0),
      icon: Droplets,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Droplets className="h-8 w-8 text-cyan-600" />
              {moduleInfo?.displayName || 'Water Delivery'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage water orders, deliveries, routes, and fleet
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/water-delivery/routes/new')}>
              <Route className="h-4 w-4 mr-2" />
              Plan Route
            </Button>
            <Button onClick={() => navigate('/water-delivery/orders/new')} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4 mb-8">
        <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => navigate('/water-delivery/orders')}>
          <ClipboardList className="h-6 w-6" />
          <span className="text-xs">Orders</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => navigate('/water-delivery/customers')}>
          <Users className="h-6 w-6" />
          <span className="text-xs">Customers</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-teal-500/30 hover:bg-teal-500/5" onClick={() => navigate('/water-delivery/tanks')}>
          <Container className="h-6 w-6 text-teal-500" />
          <span className="text-xs">Tanks</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-indigo-500/30 hover:bg-indigo-500/5" onClick={() => navigate('/water-delivery/tidy-tanks')}>
          <Package className="h-6 w-6 text-indigo-500" />
          <span className="text-xs">Tidy Tanks</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/5" onClick={() => navigate('/water-delivery/tank-fills')}>
          <Droplets className="h-6 w-6 text-cyan-500" />
          <span className="text-xs">Tank Fills</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-blue-500/30 hover:bg-blue-500/5" onClick={() => navigate('/water-delivery/equipment')}>
          <Settings className="h-6 w-6 text-blue-500" />
          <span className="text-xs">Equipment</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-purple-500/30 hover:bg-purple-500/5" onClick={() => navigate('/water-delivery/equipment-filters')}>
          <Filter className="h-6 w-6 text-purple-500" />
          <span className="text-xs">Filters</span>
        </Button>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4 mb-8">
        <Button variant="outline" className="h-24 flex flex-col gap-2" onClick={() => navigate('/water-delivery/locations')}>
          <MapPin className="h-6 w-6" />
          <span className="text-xs">Locations</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/5" onClick={() => navigate('/water-delivery/products')}>
          <Package className="h-6 w-6 text-cyan-500" />
          <span className="text-xs">Products</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-blue-500/30 hover:bg-blue-500/5" onClick={() => navigate('/water-delivery/trucks')}>
          <Truck className="h-6 w-6 text-blue-500" />
          <span className="text-xs">Trucks</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-green-500/30 hover:bg-green-500/5" onClick={() => navigate('/water-delivery/drivers')}>
          <Users className="h-6 w-6 text-green-500" />
          <span className="text-xs">Drivers</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-purple-500/30 hover:bg-purple-500/5" onClick={() => navigate('/water-delivery/routes')}>
          <Route className="h-6 w-6 text-purple-500" />
          <span className="text-xs">Routes</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-emerald-500/30 hover:bg-emerald-500/5" onClick={() => navigate('/water-delivery/invoices')}>
          <Receipt className="h-6 w-6 text-emerald-500" />
          <span className="text-xs">Invoices</span>
        </Button>
        <Button variant="outline" className="h-24 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/5" onClick={() => navigate('/water-delivery/inventory')}>
          <Package className="h-6 w-6 text-cyan-500" />
          <span className="text-xs">Inventory</span>
        </Button>
      </div>

      {/* Water Quality & Maintenance Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Low Level Tanks */}
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Level Tanks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">{lowLevelTanks?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Below 25% capacity</p>
            {(lowLevelTanks?.length || 0) > 0 && (
              <Button variant="link" className="p-0 h-auto mt-2" onClick={() => navigate('/water-delivery/tanks')}>
                View tanks →
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Filters Due */}
        <Card className="border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4 text-purple-500" />
              Filters Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">{filtersDue?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Replacement in 30 days</p>
            {(filtersDue?.length || 0) > 0 && (
              <Button variant="link" className="p-0 h-auto mt-2" onClick={() => navigate('/water-delivery/equipment-filters')}>
                View filters →
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Sanitization Due */}
        <Card className="border-teal-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-teal-500" />
              Sanitization Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-500">{sanitizationDue?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last sanitized 90+ days ago</p>
            {(sanitizationDue?.length || 0) > 0 && (
              <Button variant="link" className="p-0 h-auto mt-2" onClick={() => navigate('/water-delivery/tidy-tanks')}>
                View maintenance →
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent Water Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Droplets className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No water orders yet</p>
              <Button variant="link" onClick={() => navigate('/water-delivery/orders/new')}>
                Create your first water order
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Water Fleet Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-cyan-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-5 w-5 text-cyan-500" />
                  <span className="font-medium text-foreground">Water Trucks</span>
                </div>
                <p className="text-2xl font-bold text-cyan-500">0</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="font-medium text-foreground">Active Drivers</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">0</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
