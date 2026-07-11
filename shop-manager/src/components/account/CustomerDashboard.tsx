import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, MapPin, CreditCard, Gift, Package, MessageSquare } from 'lucide-react';
import { getCustomerProfile } from '@/services/customerProfileService';
import { getLoyaltyPoints } from '@/services/loyaltyService';
import { CustomerProfile, LoyaltyPoints } from '@/types/phase3';
import { getAllOrders } from '@/services/orderService';
import { Order } from '@/types/order';
import { ProfileTab } from './ProfileTab';
import { AddressTab } from './AddressTab';
import { PaymentMethodsTab } from './PaymentMethodsTab';
import { LoyaltyTab } from './LoyaltyTab';
import { OrderHistoryTab } from './OrderHistoryTab';
import { SupportTab } from './SupportTab';

export const CustomerDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<LoyaltyPoints | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const [profileData, loyaltyData, ordersData] = await Promise.all([
        getCustomerProfile(user.id),
        getLoyaltyPoints(user.id),
        getAllOrders().then(orders => orders.filter(o => o.user_id === user.id).slice(0, 5))
      ]);

      setProfile(profileData);
      setLoyaltyPoints(loyaltyData);
      setRecentOrders(ordersData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-r from-slate-900 to-slate-700 text-white';
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black';
      case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-500 text-black';
      default: return 'bg-gradient-to-r from-amber-600 to-amber-800 text-white';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {profile?.first_name || user?.email?.split('@')[0] || 'Customer'}!
          </h1>
          <p className="text-muted-foreground">Manage your account and view your activity</p>
        </div>
        {loyaltyPoints && (
          <Badge className={`px-4 py-2 text-sm font-semibold ${getTierColor(loyaltyPoints.tier)}`}>
            {loyaltyPoints.tier.toUpperCase()} MEMBER
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loyaltyPoints?.points_balance || 0}</div>
            <p className="text-xs text-muted-foreground">
              {loyaltyPoints?.tier || 'Bronze'} tier member
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              {recentOrders.filter(order => order.status === 'pending').length} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground">
              Member since {new Date(profile?.created_at || user?.created_at || '').getFullYear()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Preview */}
      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Your latest purchases and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.slice(0, 3).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${order.total_amount.toFixed(2)}</p>
                    <Badge variant={order.status === 'delivered' ? 'success' : 'secondary'}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Addresses
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Loyalty
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab profile={profile} userId={user?.id || ''} onProfileUpdate={setProfile} />
        </TabsContent>

        <TabsContent value="addresses">
          <AddressTab userId={user?.id || ''} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentMethodsTab userId={user?.id || ''} />
        </TabsContent>

        <TabsContent value="loyalty">
          <LoyaltyTab loyaltyPoints={loyaltyPoints} userId={user?.id || ''} />
        </TabsContent>

        <TabsContent value="orders">
          <OrderHistoryTab userId={user?.id || ''} />
        </TabsContent>

        <TabsContent value="support">
          <SupportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};