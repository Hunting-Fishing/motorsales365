import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, Fuel, ArrowLeft, User, Save, LogOut 
} from 'lucide-react';
import { geocodeAddress } from '@/utils/geocoding';

interface CustomerData {
  id: string;
  company_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  billing_address: string | null;
  preferred_fuel_type: string | null;
  notes: string | null;
}

export default function FuelDeliveryPortalAccount() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    billingAddress: '',
    preferredFuelType: '',
    notes: '',
  });

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      const { data: customerData, error } = await supabase
        .from('fuel_delivery_customers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !customerData) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      setCustomer(customerData);
      setFormData({
        companyName: customerData.company_name || '',
        contactName: customerData.contact_name || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        billingAddress: customerData.billing_address || '',
        preferredFuelType: customerData.preferred_fuel_type || '',
        notes: customerData.notes || '',
      });
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customer) return;

    setSaving(true);

    try {
      // Geocode address if changed
      let billingLat = null;
      let billingLng = null;
      if (formData.billingAddress && formData.billingAddress !== customer.billing_address) {
        const geocodeResult = await geocodeAddress(formData.billingAddress);
        if (geocodeResult) {
          billingLat = geocodeResult.latitude;
          billingLng = geocodeResult.longitude;
        }
      }

      const updateData: any = {
        company_name: formData.companyName || null,
        contact_name: formData.contactName,
        phone: formData.phone || null,
        billing_address: formData.billingAddress || null,
        preferred_fuel_type: formData.preferredFuelType || null,
        notes: formData.notes || null,
      };

      if (billingLat && billingLng) {
        updateData.billing_latitude = billingLat;
        updateData.billing_longitude = billingLng;
      }

      const { error } = await supabase
        .from('fuel_delivery_customers')
        .update(updateData)
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your account settings have been saved.",
      });

      loadCustomerData();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/fuel-delivery-portal/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/fuel-delivery-portal/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Fuel className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">My Account</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your account details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Your Company (optional)"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  placeholder="John Doe"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingAddress">Billing Address</Label>
                <Textarea
                  id="billingAddress"
                  placeholder="123 Main St, City, State ZIP"
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredFuelType">Preferred Fuel Type</Label>
                <Select 
                  value={formData.preferredFuelType} 
                  onValueChange={(value) => setFormData({ ...formData, preferredFuelType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preferred fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasoline_87">Gasoline 87</SelectItem>
                    <SelectItem value="gasoline_89">Gasoline 89</SelectItem>
                    <SelectItem value="gasoline_91">Gasoline 91</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="heating_oil">Heating Oil</SelectItem>
                    <SelectItem value="propane">Propane</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Delivery Notes / Instructions</Label>
                <Textarea
                  id="notes"
                  placeholder="Default delivery instructions, gate codes, preferred times..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Sign Out Card */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-lg">Sign Out</CardTitle>
              <CardDescription>
                Sign out of your account on this device
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
