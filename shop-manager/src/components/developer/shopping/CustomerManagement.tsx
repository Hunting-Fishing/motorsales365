import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Users, 
  Search, 
  Eye, 
  Edit, 
  Filter,
  Download,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  ShoppingCart,
  DollarSign,
  Star,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  notes?: string;
  preferred_contact_method?: string;
  shop_id: string;
  loyalty_tier?: string;
  created_at: string;
  updated_at: string;
  loyalty?: {
    current_points: number;
    lifetime_points: number;
    lifetime_value: number;
    tier: string;
  };
  _count?: {
    orders: number;
    vehicles: number;
  };
  _sum?: {
    orders: {
      total_amount: number;
    };
  };
}

interface CustomerStats {
  total: number;
  new_this_month: number;
  active: number;
  vip: number;
  total_lifetime_value: number;
  average_order_value: number;
}

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({
    total: 0,
    new_this_month: 0,
    active: 0,
    vip: 0,
    total_lifetime_value: 0,
    average_order_value: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerNotes, setCustomerNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchCustomerStats();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          customer_loyalty(
            current_points,
            lifetime_points,
            lifetime_value,
            tier
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match Customer type (customer_loyalty is a single object, not array)
      const transformedData = data?.map(customer => ({
        ...customer,
        loyalty: Array.isArray(customer.customer_loyalty) 
          ? customer.customer_loyalty[0] 
          : customer.customer_loyalty,
        customer_loyalty: undefined // Remove to avoid type conflicts
      })) || [];
      
      setCustomers(transformedData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerStats = async () => {
    try {
      // Get total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Get new customers this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newThisMonth } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Get VIP customers (gold tier and above)
      const { count: vipCustomers } = await supabase
        .from('customer_loyalty')
        .select('*', { count: 'exact', head: true })
        .in('tier', ['gold', 'platinum', 'diamond']);

      // Get total lifetime value
      const { data: loyaltyData } = await supabase
        .from('customer_loyalty')
        .select('lifetime_value');

      const totalLifetimeValue = loyaltyData?.reduce((sum, record) => sum + (record.lifetime_value || 0), 0) || 0;

      setStats({
        total: totalCustomers || 0,
        new_this_month: newThisMonth || 0,
        active: totalCustomers || 0, // Assuming all customers are active for now
        vip: vipCustomers || 0,
        total_lifetime_value: totalLifetimeValue,
        average_order_value: totalLifetimeValue / Math.max(totalCustomers || 1, 1)
      });
    } catch (error) {
      console.error('Error fetching customer stats:', error);
    }
  };

  const fetchCustomerOrders = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:products(title)
          )
        `)
        .eq('user_id', customerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCustomerOrders(data || []);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
    }
  };

  const updateCustomerNotes = async (customerId: string, notes: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ 
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);

      if (error) throw error;

      toast.success('Customer notes updated successfully');
      fetchCustomers();
      
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer({ ...selectedCustomer, notes });
      }
    } catch (error) {
      console.error('Error updating customer notes:', error);
      toast.error('Failed to update customer notes');
    } finally {
      setUpdating(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm);
    
    const customerTier = customer.loyalty?.tier || 'bronze';
    const matchesTier = tierFilter === 'all' || customerTier === tierFilter;
    
    return matchesSearch && matchesTier;
  });

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'outline';
      case 'silver': return 'secondary';
      case 'gold': return 'default';
      case 'platinum': return 'default';
      case 'diamond': return 'default';
      default: return 'outline';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'text-amber-700';
      case 'silver': return 'text-slate-600';
      case 'gold': return 'text-yellow-600';
      case 'platinum': return 'text-purple-600';
      case 'diamond': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All registered customers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New This Month</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.new_this_month}</div>
            <p className="text-xs text-muted-foreground">New customers this month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Customers</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{stats.vip}</div>
            <p className="text-xs text-muted-foreground">Gold tier and above</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total CLV</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">${stats.total_lifetime_value.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Customer lifetime value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Management
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={fetchCustomers}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customers Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Lifetime Value</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const loyalty = customer.loyalty;
                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {customer.id.slice(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getTierBadgeVariant(loyalty?.tier || 'bronze')}
                          className={getTierColor(loyalty?.tier || 'bronze')}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {(loyalty?.tier || 'bronze').charAt(0).toUpperCase() + (loyalty?.tier || 'bronze').slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">${loyalty?.lifetime_value?.toFixed(2) || '0.00'}</div>
                          <div className="text-sm text-muted-foreground">
                            {loyalty?.current_points || 0} points
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setCustomerNotes(customer.notes || '');
                              fetchCustomerOrders(customer.id);
                              setShowCustomerDetail(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No customers match your search' : 'No customers found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Dialog open={showCustomerDetail} onOpenChange={setShowCustomerDetail}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedCustomer.first_name} {selectedCustomer.last_name}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                    {selectedCustomer.date_of_birth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Born: {format(new Date(selectedCustomer.date_of_birth), 'MMM dd, yyyy')}</span>
                      </div>
                    )}
                    <div>
                      <strong>Preferred Contact:</strong> {selectedCustomer.preferred_contact_method || 'Email'}
                    </div>
                    <div>
                      <strong>Member Since:</strong> {format(new Date(selectedCustomer.created_at), 'MMM dd, yyyy')}
                    </div>
                  </CardContent>
                </Card>

                {/* Loyalty Info */}
                {selectedCustomer.loyalty && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Loyalty Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Current Tier:</span>
                          <Badge variant={getTierBadgeVariant(selectedCustomer.loyalty?.tier || 'bronze')}>
                            <Star className="h-3 w-3 mr-1" />
                            {(selectedCustomer.loyalty?.tier || 'bronze').charAt(0).toUpperCase() + (selectedCustomer.loyalty?.tier || 'bronze').slice(1)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Current Points:</span>
                          <span className="font-medium">{selectedCustomer.loyalty?.current_points || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lifetime Points:</span>
                          <span className="font-medium">{selectedCustomer.loyalty?.lifetime_points || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lifetime Value:</span>
                          <span className="font-medium text-green-600">${(selectedCustomer.loyalty?.lifetime_value || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Customer Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      placeholder="Add notes about this customer..."
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      rows={4}
                    />
                    <Button
                      onClick={() => updateCustomerNotes(selectedCustomer.id, customerNotes)}
                      disabled={updating}
                      size="sm"
                    >
                      {updating ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Order History */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Recent Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {customerOrders.length > 0 ? (
                      <div className="space-y-3">
                        {customerOrders.map((order) => (
                          <div key={order.id} className="border rounded p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="font-medium">#{order.id.slice(0, 8)}...</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(order.created_at), 'MMM dd, yyyy')}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">${order.total_amount?.toFixed(2)}</div>
                        <Badge variant="outline">
                          {order.status}
                        </Badge>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {order.order_items?.length || 0} items
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No orders found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CustomerManagement;