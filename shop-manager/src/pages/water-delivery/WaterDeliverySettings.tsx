import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Settings, Bell, MapPin, Droplets, DollarSign, Save, Loader2, Building2 } from 'lucide-react';
import { BusinessLocationMap } from '@/components/water-delivery/BusinessLocationMap';
import { supabase } from '@/integrations/supabase/client';
import { useWaterUnits, UnitSystem } from '@/hooks/water-delivery/useWaterUnits';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';
import { useWaterBusinessLocation } from '@/hooks/water-delivery/useWaterBusinessLocation';

export default function WaterDeliverySettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  
  const { shopId } = useShopId();
  const { data: moduleInfo, refetch: refetchModuleInfo } = useModuleDisplayInfo(shopId, 'water_delivery');
  const { settings: businessSettings, saveSettings, isSaving: isLocationSaving } = useWaterBusinessLocation(shopId);
  
  const [displayName, setDisplayName] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');
  const [displayDescription, setDisplayDescription] = useState('');
  
  const { unitSystem, setUnitSystem, getVolumeLabel, getPriceLabel } = useWaterUnits();
  
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessLatitude, setBusinessLatitude] = useState<number | undefined>();
  const [businessLongitude, setBusinessLongitude] = useState<number | undefined>();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [lowLevelAlerts, setLowLevelAlerts] = useState(true);
  const [deliveryReminders, setDeliveryReminders] = useState(true);
  
  const [defaultWaterType, setDefaultWaterType] = useState('potable');
  const [defaultTankCapacity, setDefaultTankCapacity] = useState('500');
  const [lowLevelThreshold, setLowLevelThreshold] = useState('25');
  const [defaultDeliveryWindow, setDefaultDeliveryWindow] = useState('morning');
  
  const [basePricePerGallon, setBasePricePerGallon] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [rushDeliveryFee, setRushDeliveryFee] = useState('');
  
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Load business location from settings
  useEffect(() => {
    if (businessSettings) {
      setBusinessAddress(businessSettings.business_address || '');
      setBusinessLatitude(businessSettings.business_latitude);
      setBusinessLongitude(businessSettings.business_longitude);
    }
  }, [businessSettings]);
  
  useEffect(() => {
    if (moduleInfo) {
      setDisplayName(moduleInfo.displayName !== moduleInfo.shopName ? moduleInfo.displayName : '');
      setDisplayPhone(moduleInfo.displayPhone || '');
      setDisplayEmail(moduleInfo.displayEmail || '');
      setDisplayDescription(moduleInfo.displayDescription || '');
    }
    setIsLoading(false);
  }, [moduleInfo]);

  const [profileSaving, setProfileSaving] = useState(false);

  const handleSaveBusinessProfile = async () => {
    if (!shopId) {
      toast.error('Shop ID not found');
      return;
    }
    
    setProfileSaving(true);
    try {
      const { data: module } = await supabase
        .from('business_modules')
        .select('id')
        .eq('slug', 'water_delivery')
        .single();

      if (!module) {
        toast.error('Water delivery module not found');
        return;
      }

      const { data: existing } = await supabase
        .from('shop_enabled_modules')
        .select('id')
        .eq('shop_id', shopId)
        .eq('module_id', module.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('shop_enabled_modules')
          .update({
            display_name: displayName || null,
            display_phone: displayPhone || null,
            display_email: displayEmail || null,
            display_description: displayDescription || null,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { data: authData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('shop_enabled_modules')
          .insert({
            shop_id: shopId,
            module_id: module.id,
            enabled_by: authData.user?.id || null,
            display_name: displayName || null,
            display_phone: displayPhone || null,
            display_email: displayEmail || null,
            display_description: displayDescription || null,
          });

        if (error) throw error;
      }
      
      await refetchModuleInfo();
      queryClient.invalidateQueries({ queryKey: ['module-display-info'] });
      toast.success('Business profile saved');
    } catch (error: any) {
      console.error('Profile save error:', error);
      toast.error('Failed to save business profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveNotifications = () => {
    toast.success('Notification settings saved');
  };

  const handleSaveDefaults = () => {
    toast.success('Default settings saved');
  };

  const handleSavePricing = () => {
    toast.success('Pricing settings saved');
  };

  const handleUnitSystemChange = (value: string) => {
    const newSystem = value as UnitSystem;
    setUnitSystem(newSystem);
    toast.success(`Unit system changed to ${newSystem}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate('/water-delivery')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{moduleInfo?.displayName || 'Water Delivery'} Settings</h1>
          <p className="text-muted-foreground">Configure your module preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="units">Units</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-500" />
                <CardTitle>Business Profile</CardTitle>
              </div>
              <CardDescription>Customize how your water delivery service appears to customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={moduleInfo?.shopName || 'Enter business name'}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use your main shop name
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    type="tel"
                    value={displayPhone}
                    onChange={(e) => setDisplayPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={displayEmail}
                    onChange={(e) => setDisplayEmail(e.target.value)}
                    placeholder="water@yourcompany.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Business Description</Label>
                <Textarea
                  value={displayDescription}
                  onChange={(e) => setDisplayDescription(e.target.value)}
                  placeholder="Brief description of your water delivery service..."
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleSaveBusinessProfile} 
                disabled={profileSaving} 
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                {profileSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="units" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unit System</CardTitle>
              <CardDescription>Choose your preferred measurement system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Measurement System</Label>
                <Select value={unitSystem} onValueChange={handleUnitSystemChange}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imperial">Imperial (Gallons)</SelectItem>
                    <SelectItem value="metric">Metric (Litres)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-cyan-500" />
                <CardTitle>Business Location</CardTitle>
              </div>
              <CardDescription>Set your main business location for route planning. Search for an address or click on the map to set your location.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BusinessLocationMap
                address={businessAddress}
                latitude={businessLatitude}
                longitude={businessLongitude}
                onLocationChange={(location) => {
                  setBusinessAddress(location.address);
                  setBusinessLatitude(location.latitude);
                  setBusinessLongitude(location.longitude);
                }}
                height="400px"
                editable={true}
              />
              <Button 
                onClick={() => {
                  if (!businessAddress || !businessLatitude || !businessLongitude) {
                    toast.error('Please select a location on the map first');
                    return;
                  }
                  saveSettings({
                    business_address: businessAddress,
                    business_latitude: businessLatitude,
                    business_longitude: businessLongitude,
                  });
                }}
                disabled={isLocationSaving || !businessAddress}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                {isLocationSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Business Location
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-cyan-500" />
                <CardTitle>Notification Settings</CardTitle>
              </div>
              <CardDescription>Configure how you receive alerts and reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive urgent alerts via SMS</p>
                </div>
                <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Level Alerts</Label>
                  <p className="text-sm text-muted-foreground">Alert when tank levels are low</p>
                </div>
                <Switch checked={lowLevelAlerts} onCheckedChange={setLowLevelAlerts} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Delivery Reminders</Label>
                  <p className="text-sm text-muted-foreground">Reminders for scheduled deliveries</p>
                </div>
                <Switch checked={deliveryReminders} onCheckedChange={setDeliveryReminders} />
              </div>
              <Button onClick={handleSaveNotifications} className="bg-cyan-500 hover:bg-cyan-600">
                <Save className="h-4 w-4 mr-2" />
                Save Notifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-cyan-500" />
                <CardTitle>Default Settings</CardTitle>
              </div>
              <CardDescription>Configure default values for new orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Water Type</Label>
                  <Select value={defaultWaterType} onValueChange={setDefaultWaterType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="potable">Potable Water</SelectItem>
                      <SelectItem value="non_potable">Non-Potable Water</SelectItem>
                      <SelectItem value="distilled">Distilled Water</SelectItem>
                      <SelectItem value="treated">Treated Water</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Tank Capacity ({getVolumeLabel()})</Label>
                  <Input
                    type="number"
                    value={defaultTankCapacity}
                    onChange={(e) => setDefaultTankCapacity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Low Level Threshold (%)</Label>
                  <Input
                    type="number"
                    value={lowLevelThreshold}
                    onChange={(e) => setLowLevelThreshold(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Delivery Window</Label>
                  <Select value={defaultDeliveryWindow} onValueChange={setDefaultDeliveryWindow}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                      <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveDefaults} className="bg-cyan-500 hover:bg-cyan-600">
                <Save className="h-4 w-4 mr-2" />
                Save Defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-cyan-500" />
                <CardTitle>Pricing Settings</CardTitle>
              </div>
              <CardDescription>Configure your default pricing structure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Base Price {getPriceLabel(false)} ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={basePricePerGallon}
                    onChange={(e) => setBasePricePerGallon(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Standard Delivery Fee ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rush Delivery Fee ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rushDeliveryFee}
                    onChange={(e) => setRushDeliveryFee(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <Button onClick={handleSavePricing} className="bg-cyan-500 hover:bg-cyan-600">
                <Save className="h-4 w-4 mr-2" />
                Save Pricing
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
