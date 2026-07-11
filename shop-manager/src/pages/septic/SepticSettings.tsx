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
import { ArrowLeft, Settings, Bell, MapPin, Container, DollarSign, Save, Loader2, Building2, Truck, Shield, ClipboardCheck, Users, HardHat } from 'lucide-react';
import SystemRegulationsTab from '@/components/septic/settings/SystemRegulationsTab';
import InspectionFormBuilderTab from '@/components/septic/settings/InspectionFormBuilderTab';
import EmployeeCertDashboard from '@/components/septic/settings/EmployeeCertDashboard';
import SepticAssetsTab from '@/components/septic/settings/SepticAssetsTab';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

export default function SepticSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);

  const { shopId } = useShopId();
  const { data: moduleInfo, refetch: refetchModuleInfo } = useModuleDisplayInfo(shopId, 'septic');

  // Profile
  const [displayName, setDisplayName] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');
  const [displayDescription, setDisplayDescription] = useState('');

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [serviceReminders, setServiceReminders] = useState(true);
  const [complianceAlerts, setComplianceAlerts] = useState(true);
  const [tankLevelAlerts, setTankLevelAlerts] = useState(true);

  // Defaults
  const [defaultServiceType, setDefaultServiceType] = useState('pumping');
  const [defaultTankCapacity, setDefaultTankCapacity] = useState('1000');
  const [pumpingIntervalMonths, setPumpingIntervalMonths] = useState('36');
  const [defaultServiceWindow, setDefaultServiceWindow] = useState('morning');

  // Pricing
  const [basePumpingRate, setBasePumpingRate] = useState('');
  const [perGallonRate, setPerGallonRate] = useState('');
  const [emergencyFee, setEmergencyFee] = useState('');
  const [inspectionFee, setInspectionFee] = useState('');

  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (moduleInfo) {
      setDisplayName(moduleInfo.displayName !== moduleInfo.shopName ? moduleInfo.displayName : '');
      setDisplayPhone(moduleInfo.displayPhone || '');
      setDisplayEmail(moduleInfo.displayEmail || '');
      setDisplayDescription(moduleInfo.displayDescription || '');
    }
    setIsLoading(false);
  }, [moduleInfo]);

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
        .eq('slug', 'septic')
        .single();

      if (!module) {
        toast.error('Septic module not found');
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/septic')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
          <Settings className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{moduleInfo?.displayName || 'Septic Services'} Settings</h1>
          <p className="text-muted-foreground">Configure your septic module preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="regulations">System Regulations</TabsTrigger>
            <TabsTrigger value="inspections">Inspection Forms</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* ── Profile Tab ─────────────────────────────── */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <CardTitle>Business Profile</CardTitle>
              </div>
              <CardDescription>Customize how your septic service appears to customers.</CardDescription>
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
                    placeholder="septic@yourcompany.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Business Description</Label>
                <Textarea
                  value={displayDescription}
                  onChange={(e) => setDisplayDescription(e.target.value)}
                  placeholder="Brief description of your septic services..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleSaveBusinessProfile}
                disabled={profileSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {profileSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── System Regulations Tab ──────────────────── */}
        <TabsContent value="regulations">
          <SystemRegulationsTab />
        </TabsContent>

        {/* ── Inspection Forms Tab ───────────────────── */}
        <TabsContent value="inspections">
          <InspectionFormBuilderTab />
        </TabsContent>

        {/* ── Notifications Tab ───────────────────────── */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-emerald-600" />
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
                  <Label>Service Reminders</Label>
                  <p className="text-sm text-muted-foreground">Reminders for upcoming scheduled services</p>
                </div>
                <Switch checked={serviceReminders} onCheckedChange={setServiceReminders} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compliance Alerts</Label>
                  <p className="text-sm text-muted-foreground">Alerts for inspection deadlines and permits</p>
                </div>
                <Switch checked={complianceAlerts} onCheckedChange={setComplianceAlerts} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tank Level Alerts</Label>
                  <p className="text-sm text-muted-foreground">Alert when tank capacity is near full</p>
                </div>
                <Switch checked={tankLevelAlerts} onCheckedChange={setTankLevelAlerts} />
              </div>
              <Button onClick={handleSaveNotifications} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="h-4 w-4 mr-2" />
                Save Notifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Defaults Tab ────────────────────────────── */}
        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                <CardTitle>Default Settings</CardTitle>
              </div>
              <CardDescription>Configure default values for new service orders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Service Type</Label>
                  <Select value={defaultServiceType} onValueChange={setDefaultServiceType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pumping">Pumping</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="installation">Installation</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default Tank Capacity (gallons)</Label>
                  <Input
                    type="number"
                    value={defaultTankCapacity}
                    onChange={(e) => setDefaultTankCapacity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pumping Interval (months)</Label>
                  <Input
                    type="number"
                    value={pumpingIntervalMonths}
                    onChange={(e) => setPumpingIntervalMonths(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default reminder cycle for residential customers
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Default Service Window</Label>
                  <Select value={defaultServiceWindow} onValueChange={setDefaultServiceWindow}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (8 AM - 12 PM)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                      <SelectItem value="full_day">Full Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSaveDefaults} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="h-4 w-4 mr-2" />
                Save Defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Pricing Tab ─────────────────────────────── */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <CardTitle>Pricing Defaults</CardTitle>
              </div>
              <CardDescription>Set base pricing for septic services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Pumping Rate ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={basePumpingRate}
                    onChange={(e) => setBasePumpingRate(e.target.value)}
                    placeholder="350.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Flat rate for standard tank pumping
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Per Gallon Rate ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={perGallonRate}
                    onChange={(e) => setPerGallonRate(e.target.value)}
                    placeholder="0.15"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Service Fee ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={emergencyFee}
                    onChange={(e) => setEmergencyFee(e.target.value)}
                    placeholder="150.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Inspection Fee ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inspectionFee}
                    onChange={(e) => setInspectionFee(e.target.value)}
                    placeholder="200.00"
                  />
                </div>
              </div>
              <Button onClick={handleSavePricing} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="h-4 w-4 mr-2" />
                Save Pricing
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        {/* ── Employees Tab ─────────────────────────────── */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <CardTitle>Employee Certifications & Compliance</CardTitle>
              </div>
              <CardDescription>Track certifications, training, and WorkSafe compliance across your team.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmployeeCertDashboard />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Assets Tab ─────────────────────────────── */}
        <TabsContent value="assets" className="space-y-4">
          <SepticAssetsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
