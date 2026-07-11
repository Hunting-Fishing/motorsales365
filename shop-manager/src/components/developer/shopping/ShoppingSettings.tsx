import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Store, 
  CreditCard, 
  Truck, 
  Calculator, 
  Mail,
  Globe,
  Shield,
  Save,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ShopSettings {
  shop_name: string;
  shop_description: string;
  shop_logo_url: string;
  shop_email: string;
  shop_phone: string;
  shop_address: string;
  currency: string;
  timezone: string;
  tax_rate: number;
  shipping_zones: any[];
  payment_methods: any[];
  email_notifications: boolean;
  order_auto_confirm: boolean;
  inventory_tracking: boolean;
  low_stock_threshold: number;
  allow_backorders: boolean;
  require_account_registration: boolean;
  guest_checkout_enabled: boolean;
  reviews_enabled: boolean;
  reviews_require_approval: boolean;
  wishlist_enabled: boolean;
  comparison_enabled: boolean;
  recommendations_enabled: boolean;
}

const ShoppingSettings: React.FC = () => {
  const [settings, setSettings] = useState<ShopSettings>({
    shop_name: '',
    shop_description: '',
    shop_logo_url: '',
    shop_email: '',
    shop_phone: '',
    shop_address: '',
    currency: 'USD',
    timezone: 'America/New_York',
    tax_rate: 0,
    shipping_zones: [],
    payment_methods: [],
    email_notifications: true,
    order_auto_confirm: false,
    inventory_tracking: true,
    low_stock_threshold: 5,
    allow_backorders: false,
    require_account_registration: false,
    guest_checkout_enabled: true,
    reviews_enabled: true,
    reviews_require_approval: true,
    wishlist_enabled: true,
    comparison_enabled: true,
    recommendations_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Get shop settings from company_settings table
      const { data, error } = await supabase
        .from('company_settings')
        .select('settings_key, settings_value')
        .in('settings_key', [
          'shop_name', 'shop_description', 'shop_logo_url', 'shop_email', 'shop_phone',
          'shop_address', 'currency', 'timezone', 'tax_rate', 'shipping_zones',
          'payment_methods', 'email_notifications', 'order_auto_confirm',
          'inventory_tracking', 'low_stock_threshold', 'allow_backorders',
          'require_account_registration', 'guest_checkout_enabled', 'reviews_enabled',
          'reviews_require_approval', 'wishlist_enabled', 'comparison_enabled',
          'recommendations_enabled'
        ]);

      if (error) throw error;

      const settingsMap = (data || []).reduce((acc, item) => {
        acc[item.settings_key] = item.settings_value;
        return acc;
      }, {} as any);

      setSettings({
        shop_name: settingsMap.shop_name || '',
        shop_description: settingsMap.shop_description || '',
        shop_logo_url: settingsMap.shop_logo_url || '',
        shop_email: settingsMap.shop_email || '',
        shop_phone: settingsMap.shop_phone || '',
        shop_address: settingsMap.shop_address || '',
        currency: settingsMap.currency || 'USD',
        timezone: settingsMap.timezone || 'America/New_York',
        tax_rate: settingsMap.tax_rate || 0,
        shipping_zones: settingsMap.shipping_zones || [],
        payment_methods: settingsMap.payment_methods || [],
        email_notifications: settingsMap.email_notifications !== false,
        order_auto_confirm: settingsMap.order_auto_confirm === true,
        inventory_tracking: settingsMap.inventory_tracking !== false,
        low_stock_threshold: settingsMap.low_stock_threshold || 5,
        allow_backorders: settingsMap.allow_backorders === true,
        require_account_registration: settingsMap.require_account_registration === true,
        guest_checkout_enabled: settingsMap.guest_checkout_enabled !== false,
        reviews_enabled: settingsMap.reviews_enabled !== false,
        reviews_require_approval: settingsMap.reviews_require_approval !== false,
        wishlist_enabled: settingsMap.wishlist_enabled !== false,
        comparison_enabled: settingsMap.comparison_enabled !== false,
        recommendations_enabled: settingsMap.recommendations_enabled !== false
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Get current shop_id (assuming first shop for demo)
      const { data: shops } = await supabase
        .from('shops')
        .select('id')
        .limit(1);

      const shopId = shops?.[0]?.id;
      if (!shopId) {
        throw new Error('No shop found');
      }

      // Save each setting
      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        shop_id: shopId,
        settings_key: key,
        settings_value: value
      }));

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('company_settings')
          .upsert(setting, { onConflict: 'shop_id,settings_key' });
        
        if (error) throw error;
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof ShopSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Shopping Settings
          </h2>
          <p className="text-muted-foreground">Configure your e-commerce store settings</p>
        </div>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="shipping">Shipping</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shop_name">Store Name</Label>
                  <Input
                    id="shop_name"
                    value={settings.shop_name}
                    onChange={(e) => updateSetting('shop_name', e.target.value)}
                    placeholder="Your Store Name"
                  />
                </div>
                <div>
                  <Label htmlFor="shop_email">Store Email</Label>
                  <Input
                    id="shop_email"
                    type="email"
                    value={settings.shop_email}
                    onChange={(e) => updateSetting('shop_email', e.target.value)}
                    placeholder="store@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="shop_phone">Store Phone</Label>
                  <Input
                    id="shop_phone"
                    value={settings.shop_phone}
                    onChange={(e) => updateSetting('shop_phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={settings.currency} onValueChange={(value) => updateSetting('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="shop_description">Store Description</Label>
                <Textarea
                  id="shop_description"
                  value={settings.shop_description}
                  onChange={(e) => updateSetting('shop_description', e.target.value)}
                  placeholder="Describe your store..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="shop_address">Store Address</Label>
                <Textarea
                  id="shop_address"
                  value={settings.shop_address}
                  onChange={(e) => updateSetting('shop_address', e.target.value)}
                  placeholder="123 Main St, City, State 12345"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="shop_logo_url">Logo URL</Label>
                <Input
                  id="shop_logo_url"
                  value={settings.shop_logo_url}
                  onChange={(e) => updateSetting('shop_logo_url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Guest Checkout</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to checkout without creating an account</p>
                </div>
                <Switch
                  checked={settings.guest_checkout_enabled}
                  onCheckedChange={(checked) => updateSetting('guest_checkout_enabled', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Account Registration</Label>
                  <p className="text-sm text-muted-foreground">Force customers to create an account before purchasing</p>
                </div>
                <Switch
                  checked={settings.require_account_registration}
                  onCheckedChange={(checked) => updateSetting('require_account_registration', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Accepted Payment Methods</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="credit_card" defaultChecked />
                    <Label htmlFor="credit_card">Credit/Debit Cards</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="paypal" defaultChecked />
                    <Label htmlFor="paypal">PayPal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="apple_pay" />
                    <Label htmlFor="apple_pay">Apple Pay</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="google_pay" />
                    <Label htmlFor="google_pay">Google Pay</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Shipping Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-yellow-800 font-medium">Shipping Zones</span>
                </div>
                <p className="text-yellow-700 mt-1">Configure shipping zones and rates in your shipping management system.</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label>Default Shipping Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select default shipping method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard Shipping</SelectItem>
                      <SelectItem value="express">Express Shipping</SelectItem>
                      <SelectItem value="overnight">Overnight Shipping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="free_shipping_threshold">Free Shipping Threshold</Label>
                  <Input
                    id="free_shipping_threshold"
                    type="number"
                    placeholder="100.00"
                    step="0.01"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Settings */}
        <TabsContent value="tax" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Tax Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">Unified Tax Management</span>
                </div>
                <p className="text-blue-700 mt-1">
                  E-commerce tax settings are now managed in Company Settings to ensure consistency across all modules.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => window.location.href = '/settings/company'}
                >
                  Configure Tax Settings
                </Button>
              </div>
              
              <div className="space-y-2 opacity-50">
                <Label>Legacy Tax Rate (Read-Only)</Label>
                <Input
                  type="number"
                  value={settings.tax_rate}
                  disabled
                  placeholder="8.25"
                />
                <p className="text-xs text-muted-foreground">
                  This setting is now managed in Company Settings for consistency across quotes, work orders, and e-commerce.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Settings */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Inventory Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Track Inventory</Label>
                  <p className="text-sm text-muted-foreground">Enable inventory tracking for products</p>
                </div>
                <Switch
                  checked={settings.inventory_tracking}
                  onCheckedChange={(checked) => updateSetting('inventory_tracking', checked)}
                />
              </div>
              
              <div>
                <Label htmlFor="low_stock_threshold">Low Stock Threshold</Label>
                <Input
                  id="low_stock_threshold"
                  type="number"
                  value={settings.low_stock_threshold}
                  onChange={(e) => updateSetting('low_stock_threshold', parseInt(e.target.value) || 0)}
                  placeholder="5"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Backorders</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to order out-of-stock items</p>
                </div>
                <Switch
                  checked={settings.allow_backorders}
                  onCheckedChange={(checked) => updateSetting('allow_backorders', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-confirm Orders</Label>
                  <p className="text-sm text-muted-foreground">Automatically confirm orders when placed</p>
                </div>
                <Switch
                  checked={settings.order_auto_confirm}
                  onCheckedChange={(checked) => updateSetting('order_auto_confirm', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Store Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Product Reviews</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to leave product reviews</p>
                </div>
                <Switch
                  checked={settings.reviews_enabled}
                  onCheckedChange={(checked) => updateSetting('reviews_enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Review Approval</Label>
                  <p className="text-sm text-muted-foreground">Require admin approval for reviews</p>
                </div>
                <Switch
                  checked={settings.reviews_require_approval}
                  onCheckedChange={(checked) => updateSetting('reviews_require_approval', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Wishlist</Label>
                  <p className="text-sm text-muted-foreground">Enable customer wishlists</p>
                </div>
                <Switch
                  checked={settings.wishlist_enabled}
                  onCheckedChange={(checked) => updateSetting('wishlist_enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Product Comparison</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to compare products</p>
                </div>
                <Switch
                  checked={settings.comparison_enabled}
                  onCheckedChange={(checked) => updateSetting('comparison_enabled', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Product Recommendations</Label>
                  <p className="text-sm text-muted-foreground">Show AI-powered product recommendations</p>
                </div>
                <Switch
                  checked={settings.recommendations_enabled}
                  onCheckedChange={(checked) => updateSetting('recommendations_enabled', checked)}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send email notifications for orders</p>
                </div>
                <Switch
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShoppingSettings;