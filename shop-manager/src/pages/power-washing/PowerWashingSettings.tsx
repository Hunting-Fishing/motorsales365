import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EstimateTemplatesTab } from '@/components/power-washing/EstimateTemplatesTab';
import { WeatherLocationAutocomplete, LocationResult } from '@/components/power-washing/WeatherLocationAutocomplete';
import { BusinessLocationCard } from '@/components/power-washing/BusinessLocationCard';
import { 
  Settings, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Beaker, 
  Bell,
  Save,
  Building,
  Droplets,
  Cloud,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { usePowerWashingWeather } from '@/hooks/power-washing/usePowerWashingWeather';
import { usePowerWashingSettings, PowerWashingSettingsData } from '@/hooks/power-washing/usePowerWashingSettings';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function PowerWashingSettings() {
  const navigate = useNavigate();
  const { shopId } = useShopId();
  const [activeTab, setActiveTab] = useState('general');
  
  // Settings persistence
  const { settings, isLoading, saveSettings, isSaving } = usePowerWashingSettings();
  
  // Local form state
  const [formData, setFormData] = useState<PowerWashingSettingsData>({});
  
  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);
  
  const { 
    location, 
    companyLocation,
    updateLocation, 
    isUpdatingLocation,
    useCompanyLocation,
    isResettingToCompany,
    hasCustomLocation,
  } = usePowerWashingWeather();
  
  const [weatherAddress, setWeatherAddress] = useState('');

  // Initialize with current location address
  useEffect(() => {
    if (location?.address) {
      setWeatherAddress(location.address);
    }
  }, [location?.address]);

  const handleLocationSelect = (result: LocationResult) => {
    updateLocation({
      latitude: result.coordinates[1],
      longitude: result.coordinates[0],
      address: result.placeName,
    });
  };

  const handleUseCompanyAddress = () => {
    if (companyLocation) {
      useCompanyLocation();
      setWeatherAddress(companyLocation.address || '');
    } else {
      toast.error('No company address configured');
    }
  };

  // Form field update helpers
  const updateField = <K extends keyof PowerWashingSettingsData>(
    field: K, 
    value: PowerWashingSettingsData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateServiceType = (type: keyof NonNullable<PowerWashingSettingsData['service_types']>, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      service_types: {
        house_washing: prev.service_types?.house_washing ?? true,
        driveway_cleaning: prev.service_types?.driveway_cleaning ?? true,
        deck_patio: prev.service_types?.deck_patio ?? true,
        roof_cleaning: prev.service_types?.roof_cleaning ?? true,
        gutter_cleaning: prev.service_types?.gutter_cleaning ?? false,
        [type]: checked,
      }
    }));
  };

  const handleSave = async () => {
    try {
      await saveSettings(formData);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <MobilePageContainer>
        <MobilePageHeader
          title="Settings"
          subtitle="Configure your power washing module"
          icon={<Settings className="h-6 w-6 md:h-8 md:w-8 text-cyan-600" />}
          onBack={() => navigate('/power-washing')}
        />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MobilePageContainer>
    );
  }

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Settings"
        subtitle="Configure your power washing module"
        icon={<Settings className="h-6 w-6 md:h-8 md:w-8 text-cyan-600" />}
        onBack={() => navigate('/power-washing')}
        actions={
          <Button onClick={handleSave} disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-700">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-7 gap-1 h-auto p-1">
          <TabsTrigger value="general" className="text-xs md:text-sm">General</TabsTrigger>
          <TabsTrigger value="service-areas" className="text-xs md:text-sm">Areas</TabsTrigger>
          <TabsTrigger value="scheduling" className="text-xs md:text-sm">Schedule</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs md:text-sm">Billing</TabsTrigger>
          <TabsTrigger value="chemicals" className="text-xs md:text-sm">Chemicals</TabsTrigger>
          <TabsTrigger value="templates" className="text-xs md:text-sm">Templates</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs md:text-sm">Alerts</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="mt-4 space-y-4">
          {/* Business Details first */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Details
              </CardTitle>
              <CardDescription>Basic business information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input 
                    id="business-name" 
                    placeholder="Your Power Washing Co."
                    value={formData.business_name || ''}
                    onChange={(e) => updateField('business_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-phone">Business Phone</Label>
                  <Input 
                    id="business-phone" 
                    placeholder="(555) 123-4567"
                    value={formData.business_phone || ''}
                    onChange={(e) => updateField('business_phone', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="license-number">License Number</Label>
                <Input 
                  id="license-number" 
                  placeholder="PWL-12345"
                  value={formData.license_number || ''}
                  onChange={(e) => updateField('license_number', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Business Location with Map - now under Business Details */}
          <BusinessLocationCard shopId={shopId} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5" />
                Default Service Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">House Washing</p>
                  <p className="text-sm text-muted-foreground">Exterior soft washing</p>
                </div>
                <Switch 
                  checked={formData.service_types?.house_washing ?? true}
                  onCheckedChange={(checked) => updateServiceType('house_washing', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Driveway Cleaning</p>
                  <p className="text-sm text-muted-foreground">Concrete & asphalt</p>
                </div>
                <Switch 
                  checked={formData.service_types?.driveway_cleaning ?? true}
                  onCheckedChange={(checked) => updateServiceType('driveway_cleaning', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Deck & Patio</p>
                  <p className="text-sm text-muted-foreground">Wood & composite</p>
                </div>
                <Switch 
                  checked={formData.service_types?.deck_patio ?? true}
                  onCheckedChange={(checked) => updateServiceType('deck_patio', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Roof Cleaning</p>
                  <p className="text-sm text-muted-foreground">Soft wash treatment</p>
                </div>
                <Switch 
                  checked={formData.service_types?.roof_cleaning ?? true}
                  onCheckedChange={(checked) => updateServiceType('roof_cleaning', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Gutter Cleaning</p>
                  <p className="text-sm text-muted-foreground">Brightening & cleaning</p>
                </div>
                <Switch 
                  checked={formData.service_types?.gutter_cleaning ?? false}
                  onCheckedChange={(checked) => updateServiceType('gutter_cleaning', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Areas */}
        <TabsContent value="service-areas" className="mt-4 space-y-4">
          {/* Weather Location Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Weather Location
              </CardTitle>
              <CardDescription>
                Set the location for weather forecasts. Drivers can set their own location if working away from office.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Search Location</Label>
                  {location?.source && (
                    <Badge variant={location.source === 'user' ? 'default' : location.source === 'company' ? 'secondary' : 'outline'}>
                      {location.source === 'user' ? 'Personal' : location.source === 'company' ? 'Company' : 'Default'}
                    </Badge>
                  )}
                </div>
                <WeatherLocationAutocomplete
                  value={weatherAddress}
                  onChange={setWeatherAddress}
                  onSelect={handleLocationSelect}
                  placeholder="Type a city name (e.g., Campbell River)..."
                  disabled={isUpdatingLocation}
                />
                {(isUpdatingLocation || isResettingToCompany) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating location...
                  </div>
                )}
              </div>

              {/* Current location display */}
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Current Location</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {location?.address || `${location?.latitude?.toFixed(4)}, ${location?.longitude?.toFixed(4)}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Use Company Address button */}
              {(hasCustomLocation || !companyLocation) && companyLocation && (
                <Button
                  variant="outline"
                  onClick={handleUseCompanyAddress}
                  disabled={isResettingToCompany || !companyLocation}
                  className="w-full"
                >
                  {isResettingToCompany ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  Use Company Address
                </Button>
              )}

              {companyLocation && (
                <p className="text-xs text-muted-foreground">
                  Company address: {companyLocation.address}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Service Area Configuration
              </CardTitle>
              <CardDescription>Define where you provide services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary-zip">Primary ZIP Codes (comma separated)</Label>
                <Input 
                  id="primary-zip" 
                  placeholder="12345, 12346, 12347"
                  value={formData.primary_zip_codes || ''}
                  onChange={(e) => updateField('primary_zip_codes', e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="service-radius">Service Radius (miles)</Label>
                  <Input 
                    id="service-radius" 
                    type="number" 
                    placeholder="25"
                    value={formData.service_radius || ''}
                    onChange={(e) => updateField('service_radius', parseFloat(e.target.value) || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="travel-fee">Travel Fee (per mile beyond radius)</Label>
                  <Input 
                    id="travel-fee" 
                    type="number" 
                    placeholder="2.50"
                    value={formData.travel_fee || ''}
                    onChange={(e) => updateField('travel_fee', parseFloat(e.target.value) || undefined)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Zone-Based Pricing</p>
                  <p className="text-sm text-muted-foreground">Different rates by area</p>
                </div>
                <Switch 
                  checked={formData.zone_based_pricing ?? false}
                  onCheckedChange={(checked) => updateField('zone_based_pricing', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduling */}
        <TabsContent value="scheduling" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduling Rules
              </CardTitle>
              <CardDescription>Configure job scheduling preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="default-duration">Default Job Duration (hours)</Label>
                  <Select 
                    value={formData.default_duration || '2'}
                    onValueChange={(value) => updateField('default_duration', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="3">3 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="8">Full day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-time">Minimum Lead Time (hours)</Label>
                  <Input 
                    id="lead-time" 
                    type="number" 
                    placeholder="24"
                    value={formData.minimum_lead_time || ''}
                    onChange={(e) => updateField('minimum_lead_time', parseInt(e.target.value) || undefined)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Default Start Time</Label>
                  <Input 
                    id="start-time" 
                    type="time" 
                    value={formData.default_start_time || '08:00'}
                    onChange={(e) => updateField('default_start_time', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">Default End Time</Label>
                  <Input 
                    id="end-time" 
                    type="time" 
                    value={formData.default_end_time || '17:00'}
                    onChange={(e) => updateField('default_end_time', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weather-Based Scheduling</p>
                  <p className="text-sm text-muted-foreground">Auto-suggest reschedules for rain</p>
                </div>
                <Switch 
                  checked={formData.weather_based_scheduling ?? true}
                  onCheckedChange={(checked) => updateField('weather_based_scheduling', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Weekend Jobs</p>
                  <p className="text-sm text-muted-foreground">Allow weekend scheduling</p>
                </div>
                <Switch 
                  checked={formData.weekend_jobs ?? true}
                  onCheckedChange={(checked) => updateField('weekend_jobs', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing */}
        <TabsContent value="billing" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing & Billing
              </CardTitle>
              <CardDescription>Configure rates and billing preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="labor-rate">Default Labor Rate ($/hour)</Label>
                  <Input 
                    id="labor-rate" 
                    type="number" 
                    placeholder="75.00"
                    value={formData.labor_rate || ''}
                    onChange={(e) => updateField('labor_rate', parseFloat(e.target.value) || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Sales Tax Rate (%)</Label>
                  <Input 
                    id="tax-rate" 
                    type="number" 
                    placeholder="8.25"
                    value={formData.tax_rate || ''}
                    onChange={(e) => updateField('tax_rate', parseFloat(e.target.value) || undefined)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min-charge">Minimum Service Charge ($)</Label>
                  <Input 
                    id="min-charge" 
                    type="number" 
                    placeholder="150.00"
                    value={formData.minimum_charge || ''}
                    onChange={(e) => updateField('minimum_charge', parseFloat(e.target.value) || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="env-fee">Environmental Fee ($)</Label>
                  <Input 
                    id="env-fee" 
                    type="number" 
                    placeholder="25.00"
                    value={formData.environmental_fee || ''}
                    onChange={(e) => updateField('environmental_fee', parseFloat(e.target.value) || undefined)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-Generate Invoices</p>
                  <p className="text-sm text-muted-foreground">Create invoice on job completion</p>
                </div>
                <Switch 
                  checked={formData.auto_generate_invoices ?? true}
                  onCheckedChange={(checked) => updateField('auto_generate_invoices', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Water Hookup Credit</p>
                  <p className="text-sm text-muted-foreground">Discount when customer provides water</p>
                </div>
                <Switch 
                  checked={formData.water_hookup_credit ?? false}
                  onCheckedChange={(checked) => updateField('water_hookup_credit', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chemicals */}
        <TabsContent value="chemicals" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Chemical Management
              </CardTitle>
              <CardDescription>Default chemical settings and safety</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bleach-ratio">Default Bleach Ratio (%)</Label>
                  <Input 
                    id="bleach-ratio" 
                    type="number" 
                    placeholder="3"
                    value={formData.default_bleach_ratio || ''}
                    onChange={(e) => updateField('default_bleach_ratio', parseFloat(e.target.value) || undefined)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surfactant-ratio">Default Surfactant (oz/gal)</Label>
                  <Input 
                    id="surfactant-ratio" 
                    type="number" 
                    placeholder="2"
                    value={formData.default_surfactant_ratio || ''}
                    onChange={(e) => updateField('default_surfactant_ratio', parseFloat(e.target.value) || undefined)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder-threshold">Low Stock Alert Threshold (%)</Label>
                <Input 
                  id="reorder-threshold" 
                  type="number" 
                  placeholder="20"
                  value={formData.low_stock_threshold || ''}
                  onChange={(e) => updateField('low_stock_threshold', parseInt(e.target.value) || undefined)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require SDS Documentation</p>
                  <p className="text-sm text-muted-foreground">Enforce safety data sheets for all chemicals</p>
                </div>
                <Switch 
                  checked={formData.require_sds ?? true}
                  onCheckedChange={(checked) => updateField('require_sds', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Track Chemical Usage</p>
                  <p className="text-sm text-muted-foreground">Log chemicals used per job</p>
                </div>
                <Switch 
                  checked={formData.track_chemical_usage ?? true}
                  onCheckedChange={(checked) => updateField('track_chemical_usage', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4">
          <EstimateTemplatesTab />
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure alerts and reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Customer Notifications</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Appointment Reminders</p>
                    <p className="text-sm text-muted-foreground">Send 24hr before service</p>
                  </div>
                  <Switch 
                    checked={formData.appointment_reminders ?? true}
                    onCheckedChange={(checked) => updateField('appointment_reminders', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">On-My-Way Notifications</p>
                    <p className="text-sm text-muted-foreground">Alert when crew departs</p>
                  </div>
                  <Switch 
                    checked={formData.on_my_way_notifications ?? true}
                    onCheckedChange={(checked) => updateField('on_my_way_notifications', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Job Complete Notifications</p>
                    <p className="text-sm text-muted-foreground">Send with before/after photos</p>
                  </div>
                  <Switch 
                    checked={formData.job_complete_notifications ?? true}
                    onCheckedChange={(checked) => updateField('job_complete_notifications', checked)}
                  />
                </div>
              </div>
              
              <div className="border-t pt-4 space-y-4">
                <p className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Team Alerts</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Quote Alerts</p>
                    <p className="text-sm text-muted-foreground">Notify on new quote requests</p>
                  </div>
                  <Switch 
                    checked={formData.new_quote_alerts ?? true}
                    onCheckedChange={(checked) => updateField('new_quote_alerts', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weather Warnings</p>
                    <p className="text-sm text-muted-foreground">Alert for rain in scheduled areas</p>
                  </div>
                  <Switch 
                    checked={formData.weather_warnings ?? true}
                    onCheckedChange={(checked) => updateField('weather_warnings', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Low Chemical Stock</p>
                    <p className="text-sm text-muted-foreground">Alert when inventory is low</p>
                  </div>
                  <Switch 
                    checked={formData.low_chemical_alerts ?? true}
                    onCheckedChange={(checked) => updateField('low_chemical_alerts', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MobilePageContainer>
  );
}
