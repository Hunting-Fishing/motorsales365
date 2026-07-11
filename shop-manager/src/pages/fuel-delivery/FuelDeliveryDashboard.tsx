import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Fuel, 
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
  Droplets,
  Clock,
  Settings,
  Filter,
  Container
} from 'lucide-react';
import { useFuelDeliveryStats, useFuelDeliveryOrders } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerPortalQRCode } from '@/components/fuel-delivery/CustomerPortalQRCode';
import { FuelMarketPrices } from '@/components/fuel-delivery/FuelMarketPrices';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';

export default function FuelDeliveryDashboard() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');
  const { data: stats, isLoading: statsLoading } = useFuelDeliveryStats();
  const { data: recentOrders, isLoading: ordersLoading } = useFuelDeliveryOrders();
  const { getVolumeLabel, formatVolume } = useFuelUnits();

  const statCards = [
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: ClipboardList,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Scheduled',
      value: stats?.scheduledOrders || 0,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'In Transit',
      value: stats?.inTransitOrders || 0,
      icon: Truck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: `${getVolumeLabel(true)} Today`,
      value: formatVolume(stats?.gallonsDeliveredToday || 0),
      icon: Droplets,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  const alerts = [];
  if (stats?.lowInventory && stats.lowInventory > 0) {
    alerts.push({
      type: 'warning',
      message: `${stats.lowInventory} storage tank(s) running low`,
      action: () => navigate('/fuel-delivery/inventory'),
    });
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Fuel className="h-8 w-8 text-orange-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage fuel orders, deliveries, routes, and fleet
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/fuel-delivery/routes/new')}>
              <Route className="h-4 w-4 mr-2" />
              Plan Route
            </Button>
            <Button onClick={() => navigate('/fuel-delivery/orders/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                alert.type === 'critical' 
                  ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' 
                  : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
              }`}
              onClick={alert.action}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${alert.type === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                <span className="text-foreground">{alert.message}</span>
              </div>
              <Badge variant="outline" className={alert.type === 'critical' ? 'text-red-500 border-red-500' : 'text-amber-500 border-amber-500'}>
                Action Required
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  )}
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
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2"
          onClick={() => navigate('/fuel-delivery/orders')}
        >
          <ClipboardList className="h-6 w-6" />
          <span className="text-xs">Orders</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2"
          onClick={() => navigate('/fuel-delivery/customers')}
        >
          <Users className="h-6 w-6" />
          <span className="text-xs">Customers</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-teal-500/30 hover:bg-teal-500/5"
          onClick={() => navigate('/fuel-delivery/tanks')}
        >
          <Container className="h-6 w-6 text-teal-500" />
          <span className="text-xs">Tanks</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-indigo-500/30 hover:bg-indigo-500/5"
          onClick={() => navigate('/fuel-delivery/tidy-tanks')}
        >
          <Package className="h-6 w-6 text-indigo-500" />
          <span className="text-xs">Tidy Tanks</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-cyan-500/30 hover:bg-cyan-500/5"
          onClick={() => navigate('/fuel-delivery/tank-fills')}
        >
          <Droplets className="h-6 w-6 text-cyan-500" />
          <span className="text-xs">Tank Fills</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-blue-500/30 hover:bg-blue-500/5"
          onClick={() => navigate('/fuel-delivery/equipment')}
        >
          <Settings className="h-6 w-6 text-blue-500" />
          <span className="text-xs">Equipment</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-purple-500/30 hover:bg-purple-500/5"
          onClick={() => navigate('/fuel-delivery/equipment-filters')}
        >
          <Filter className="h-6 w-6 text-purple-500" />
          <span className="text-xs">Filters</span>
        </Button>
      </div>

      {/* Second Row - More Actions */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4 mb-8">
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2"
          onClick={() => navigate('/fuel-delivery/locations')}
        >
          <MapPin className="h-6 w-6" />
          <span className="text-xs">Locations</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-orange-500/30 hover:bg-orange-500/5"
          onClick={() => navigate('/fuel-delivery/products')}
        >
          <Package className="h-6 w-6 text-orange-500" />
          <span className="text-xs">Products</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-blue-500/30 hover:bg-blue-500/5"
          onClick={() => navigate('/fuel-delivery/trucks')}
        >
          <Truck className="h-6 w-6 text-blue-500" />
          <span className="text-xs">Trucks</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-green-500/30 hover:bg-green-500/5"
          onClick={() => navigate('/fuel-delivery/drivers')}
        >
          <Users className="h-6 w-6 text-green-500" />
          <span className="text-xs">Drivers</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-purple-500/30 hover:bg-purple-500/5"
          onClick={() => navigate('/fuel-delivery/routes')}
        >
          <Route className="h-6 w-6 text-purple-500" />
          <span className="text-xs">Routes</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-emerald-500/30 hover:bg-emerald-500/5"
          onClick={() => navigate('/fuel-delivery/invoices')}
        >
          <Receipt className="h-6 w-6 text-emerald-500" />
          <span className="text-xs">Invoices</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex flex-col gap-2 border-amber-500/30 hover:bg-amber-500/5"
          onClick={() => navigate('/fuel-delivery/inventory')}
        >
          <BarChart3 className="h-6 w-6 text-amber-500" />
          <span className="text-xs">Inventory</span>
        </Button>
      </div>


      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/fuel-delivery/orders')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate(`/fuel-delivery/orders/${order.id}`)}
                  >
                    <div>
                      <p className="font-medium text-foreground">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.fuel_delivery_customers?.company_name || order.fuel_delivery_customers?.contact_name} • {formatVolume(order.quantity_ordered)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        order.status === 'completed' ? 'default' : 
                        order.status === 'in_transit' ? 'secondary' : 
                        order.status === 'scheduled' ? 'outline' :
                        'outline'
                      }>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.fuel_delivery_products?.fuel_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Fuel className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No orders yet</p>
                <Button variant="link" onClick={() => navigate('/fuel-delivery/orders/new')}>
                  Create your first order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fleet Status */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Fleet Status</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/fuel-delivery/trucks')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-foreground">Available Trucks</span>
                </div>
                <p className="text-2xl font-bold text-green-500">{stats?.availableTrucks || 0}</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="font-medium text-foreground">Active Drivers</span>
                </div>
                <p className="text-2xl font-bold text-blue-500">{stats?.activeDrivers || 0}</p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-lg col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <span className="font-medium text-foreground">Revenue Today</span>
                </div>
                <p className="text-2xl font-bold text-emerald-500">${(stats?.revenueToday || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Portal QR Code */}
        {shopId && (
          <CustomerPortalQRCode 
            shopId={shopId}
            businessName={moduleInfo?.displayName || 'Fuel Delivery Service'}
          />
        )}

        {/* Market Fuel Prices */}
        <FuelMarketPrices />
      </div>
    </div>
  );
}
