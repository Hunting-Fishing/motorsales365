import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, UserPlus, Fuel, CheckCircle, Building2, ChevronDown, MapPin, User, Lock, Package, Settings } from 'lucide-react';
import { geocodeAddress } from '@/utils/geocoding';
import { AddressAutocomplete, AddressResult } from '@/components/fuel-delivery/AddressAutocomplete';
import { FuelTypeSelect } from '@/components/fuel-delivery/FuelTypeSelect';
import { EquipmentList, EquipmentData } from '@/components/fuel-delivery-portal';
import { cn } from '@/lib/utils';

interface FormSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
}

export default function FuelDeliveryPortalRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    billingAddress: '',
    city: '',
    state: '',
    zip: '',
    preferredFuelType: '',
    deliveryInstructions: '',
  });
  
  const [addressCoordinates, setAddressCoordinates] = useState<[number, number] | null>(null);
  const [equipment, setEquipment] = useState<EquipmentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [shops, setShops] = useState<Array<{ id: string; name: string; displayName?: string }>>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [shopFromQR, setShopFromQR] = useState<{ id: string; name: string; displayName?: string } | null>(null);
  
  // Section expansion state
  const [sections, setSections] = useState<FormSection[]>([
    { id: 'account', title: 'Account Information', icon: Lock, isOpen: true },
    { id: 'personal', title: 'Personal Information', icon: User, isOpen: true },
    { id: 'address', title: 'Delivery Address', icon: MapPin, isOpen: true },
    { id: 'equipment', title: 'Equipment (Optional)', icon: Package, isOpen: false },
    { id: 'preferences', title: 'Preferences', icon: Settings, isOpen: false },
  ]);

  const toggleSection = (id: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, isOpen: !s.isOpen } : s));
  };

  // Load available shops with module display names
  useEffect(() => {
    const loadShops = async () => {
      // Get shops
      const { data: shopData } = await supabase
        .from('shops')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (!shopData || shopData.length === 0) return;

      // Get module display names for fuel-delivery module
      const { data: moduleData } = await supabase
        .from('shop_enabled_modules')
        .select(`
          shop_id,
          display_name,
          business_modules!inner(slug)
        `)
        .eq('business_modules.slug', 'fuel_delivery');

      // Map display names to shops
      const displayNameMap = new Map<string, string>();
      if (moduleData) {
        moduleData.forEach((m: any) => {
          if (m.display_name) {
            displayNameMap.set(m.shop_id, m.display_name);
          }
        });
      }

      const enrichedShops = shopData.map(shop => ({
        ...shop,
        displayName: displayNameMap.get(shop.id) || shop.name,
      }));

      setShops(enrichedShops);
      
      const shopParam = searchParams.get('shop');
      if (shopParam) {
        const matchingShop = enrichedShops.find(s => s.id === shopParam);
        if (matchingShop) {
          setSelectedShopId(matchingShop.id);
          setShopFromQR(matchingShop); // Track that this came from QR
        }
      } else if (enrichedShops.length === 1) {
        setSelectedShopId(enrichedShops[0].id);
      }
    };
    loadShops();
  }, [searchParams]);


  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: customer } = await supabase
          .from('fuel_delivery_customers')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        
        if (customer) {
          navigate('/fuel-delivery-portal/dashboard');
          return;
        }
      }
      setCheckingAuth(false);
    };

    checkExistingSession();
  }, [navigate]);

  const handleAddressSelect = (result: AddressResult) => {
    setFormData(prev => ({
      ...prev,
      billingAddress: result.address,
      city: result.context?.city || '',
      state: result.context?.state || '',
      zip: result.context?.postcode || '',
    }));
    setAddressCoordinates(result.coordinates);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your first and last name",
        variant: "destructive"
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    if (!selectedShopId) {
      toast({
        title: "Select a Business",
        description: "Please select the fuel delivery provider you want to register with.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      
      // Check if customer already exists with this email
      const { data: existingCustomer } = await supabase
        .from('fuel_delivery_customers')
        .select('id, user_id')
        .eq('email', formData.email.toLowerCase())
        .single();

      if (existingCustomer?.user_id) {
        toast({
          title: "Account Exists",
          description: "An account with this email already exists. Please sign in instead.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Create auth user
      const redirectUrl = `${window.location.origin}/fuel-delivery-portal/dashboard`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: fullName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            company: formData.companyName,
          }
        }
      });

      if (authError) throw authError;

      // Geocode the billing address if not already done
      let billingLat = addressCoordinates?.[1] ?? null;
      let billingLng = addressCoordinates?.[0] ?? null;
      
      if (!billingLat && formData.billingAddress) {
        const geocodeResult = await geocodeAddress(formData.billingAddress);
        if (geocodeResult) {
          billingLat = geocodeResult.latitude;
          billingLng = geocodeResult.longitude;
        }
      }

      // Build full address string
      const fullAddress = [
        formData.billingAddress,
        formData.city,
        formData.state,
        formData.zip
      ].filter(Boolean).join(', ');

      let customerId: string;

      if (existingCustomer) {
        // Link existing customer to new auth user
        const { error: updateError } = await supabase
          .from('fuel_delivery_customers')
          .update({ 
            user_id: authData.user?.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            billing_address: fullAddress || undefined,
            billing_latitude: billingLat,
            billing_longitude: billingLng,
            notes: formData.deliveryInstructions || undefined,
          })
          .eq('id', existingCustomer.id);

        if (updateError) throw updateError;
        customerId = existingCustomer.id;

        toast({
          title: "Account Linked!",
          description: "Your existing customer profile has been linked to your new account.",
        });
      } else {
        // Create new fuel delivery customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('fuel_delivery_customers')
          .insert([{
            shop_id: selectedShopId,
            user_id: authData.user?.id,
            company_name: formData.companyName || null,
            contact_name: fullName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email.toLowerCase(),
            phone: formData.phone || null,
            billing_address: fullAddress || null,
            billing_latitude: billingLat,
            billing_longitude: billingLng,
            preferred_fuel_type: formData.preferredFuelType || null,
            notes: formData.deliveryInstructions || null,
            status: 'active',
          }])
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;

        toast({
          title: "Registration Successful!",
          description: "Please check your email to verify your account.",
        });
      }

      // Create equipment records if any were added
      if (equipment.length > 0 && customerId) {
        const equipmentRecords = equipment.map(item => ({
          shop_id: selectedShopId,
          customer_id: customerId,
          equipment_type: item.equipment_type,
          name: item.name || null,
          vin: item.vin || null,
          year: item.year || null,
          make: item.make || null,
          model: item.model || null,
          fuel_type: item.fuel_type || null,
          license_plate: item.license_plate || null,
          color: item.color || null,
          tank_capacity_gallons: item.tank_capacity_gallons || null,
          location_notes: item.location_notes || null,
          notes: item.notes || null,
          is_active: true,
        }));

        const { error: equipmentError } = await supabase
          .from('fuel_delivery_customer_vehicles')
          .insert(equipmentRecords);

        if (equipmentError) {
          console.error('Equipment save error:', equipmentError);
          // Don't throw - registration succeeded, just equipment failed
        }
      }

      setRegistrationComplete(true);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
        <Card className="w-full max-w-md shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">
              Registration Complete!
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Please check your email to verify your account, then you can sign in.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              onClick={() => navigate('/fuel-delivery-portal/login')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Go to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const renderSection = (section: FormSection, content: React.ReactNode) => {
    const Icon = section.icon;
    return (
      <Collapsible
        key={section.id}
        open={section.isOpen}
        onOpenChange={() => toggleSection(section.id)}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between p-3 rounded-lg",
              "bg-muted/50 hover:bg-muted transition-colors",
              section.isOpen && "bg-muted"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">{section.title}</span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              section.isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          {content}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/fuel-delivery-portal" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Fuel className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Fuel Delivery Portal</span>
          </Link>
        </div>

        <Card className="shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="mx-auto w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-2">
              <UserPlus className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-xl font-bold">Create Account</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Register for fuel delivery services
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              {/* Business Selection */}
              {shopFromQR ? (
                // User came from QR code - show the business they're registering with
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary shrink-0" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Registering with </span>
                    <span className="font-medium text-foreground">{shopFromQR.displayName || shopFromQR.name}</span>
                  </div>
                </div>
              ) : shops.length > 1 ? (
                // Multiple shops and not from QR - show selector
                <div className="space-y-2">
                  <Label htmlFor="shop" className="text-sm">Select Provider *</Label>
                  <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose your fuel delivery provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map(shop => (
                        <SelectItem key={shop.id} value={shop.id}>
                          {shop.displayName || shop.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : shops.length === 1 ? (
                // Single shop - show confirmation
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Registering with </span>
                    <span className="font-medium text-foreground">{shops[0].displayName || shops[0].name}</span>
                  </div>
                </div>
              ) : null}

              {/* Account Section */}
              {renderSection(sections[0], (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm">Confirm *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </>
              ))}

              {/* Personal Info Section */}
              {renderSection(sections[1], (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Your Company (optional)"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </>
              ))}

              {/* Address Section */}
              {renderSection(sections[2], (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Address</Label>
                    <AddressAutocomplete
                      value={formData.billingAddress}
                      onChange={(address) => setFormData({ ...formData, billingAddress: address })}
                      onSelect={handleAddressSelect}
                      placeholder="Start typing your address..."
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm">City</Label>
                      <Input
                        id="city"
                        placeholder="City"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-sm">State</Label>
                      <Input
                        id="state"
                        placeholder="State"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zip" className="text-sm">ZIP</Label>
                      <Input
                        id="zip"
                        placeholder="12345"
                        value={formData.zip}
                        onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              ))}

              {/* Equipment Section */}
              {renderSection(sections[3], (
                <EquipmentList
                  equipment={equipment}
                  onChange={setEquipment}
                  disabled={loading}
                />
              ))}

              {/* Preferences Section */}
              {renderSection(sections[4], (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Preferred Fuel Type</Label>
                    <FuelTypeSelect
                      value={formData.preferredFuelType}
                      onChange={(value) => setFormData({ ...formData, preferredFuelType: value })}
                      placeholder="Select fuel type (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryInstructions" className="text-sm">Delivery Instructions</Label>
                    <Textarea
                      id="deliveryInstructions"
                      placeholder="Gate codes, preferred delivery times, special instructions..."
                      value={formData.deliveryInstructions}
                      onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                      rows={2}
                    />
                  </div>
                </>
              ))}
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4 pt-2">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link 
                  to="/fuel-delivery-portal/login" 
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Sign in here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
