import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useGunsmithSettings, useUpdateGunsmithSettings } from '@/hooks/gunsmith/useGunsmithSettings';
import { useShopName } from '@/hooks/useShopName';
import { useCompany } from '@/contexts/CompanyContext';
import { Loader2, Settings, Clock, DollarSign, Shield, Bell } from 'lucide-react';

export default function GunsmithSettings() {
  const { data: settings, isLoading } = useGunsmithSettings();
  const updateSettings = useUpdateGunsmithSettings();
  const { shopName, updateShopName, loading: shopNameLoading } = useShopName();
  const { refresh: refreshCompany } = useCompany();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [businessName, setBusinessName] = useState('');

  // Initialize business name from shop name
  useEffect(() => {
    if (shopName && !businessName) {
      setBusinessName(shopName);
    }
  }, [shopName]);

  const handleSave = async () => {
    // Update shop name if changed
    if (businessName !== shopName) {
      await updateShopName(businessName);
      refreshCompany(); // Refresh company context to update sidebar
    }
    // Update other settings
    updateSettings.mutate(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading || shopNameLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentData = { ...settings, ...formData };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gunsmith Settings</h1>
          <p className="text-muted-foreground">Configure your gunsmith shop settings</p>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Work Hours
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic shop information and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter your business name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ffl_number">FFL Number</Label>
                  <Input
                    id="ffl_number"
                    value={currentData.ffl_number || ''}
                    onChange={(e) => updateField('ffl_number', e.target.value)}
                    placeholder="1-23-456-78-9A-01234"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle>Work Hours</CardTitle>
              <CardDescription>Set your operating hours and appointment settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="work_hours_start">Opening Time</Label>
                  <Input
                    id="work_hours_start"
                    type="time"
                    value={currentData.work_hours_start || '08:00'}
                    onChange={(e) => updateField('work_hours_start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="work_hours_end">Closing Time</Label>
                  <Input
                    id="work_hours_end"
                    type="time"
                    value={currentData.work_hours_end || '17:00'}
                    onChange={(e) => updateField('work_hours_end', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appointment_duration">Default Appointment Duration (minutes)</Label>
                <Input
                  id="appointment_duration"
                  type="number"
                  value={currentData.appointment_duration_minutes || 30}
                  onChange={(e) => updateField('appointment_duration_minutes', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Configure labor rates and payment requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_labor_rate">Default Labor Rate ($/hr)</Label>
                  <Input
                    id="default_labor_rate"
                    type="number"
                    step="0.01"
                    value={currentData.default_labor_rate || 75}
                    onChange={(e) => updateField('default_labor_rate', parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    value={currentData.tax_rate || 0}
                    onChange={(e) => updateField('tax_rate', parseFloat(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Require Deposit</Label>
                  <p className="text-sm text-muted-foreground">Require customers to pay a deposit for work orders</p>
                </div>
                <Switch
                  checked={currentData.require_deposit || false}
                  onCheckedChange={(checked) => updateField('require_deposit', checked)}
                />
              </div>
              {currentData.require_deposit && (
                <div className="space-y-2">
                  <Label htmlFor="deposit_percentage">Deposit Percentage (%)</Label>
                  <Input
                    id="deposit_percentage"
                    type="number"
                    step="1"
                    value={currentData.deposit_percentage || 50}
                    onChange={(e) => updateField('deposit_percentage', parseFloat(e.target.value))}
                  />
                </div>
              )}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>Auto-generate Invoice</Label>
                  <p className="text-sm text-muted-foreground">Automatically create invoice when job is completed</p>
                </div>
                <Switch
                  checked={currentData.auto_generate_invoice !== false}
                  onCheckedChange={(checked) => updateField('auto_generate_invoice', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Settings</CardTitle>
              <CardDescription>ATF compliance and regulatory settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="compliance_reminder_days">Compliance Reminder (days before)</Label>
                <Input
                  id="compliance_reminder_days"
                  type="number"
                  value={currentData.compliance_reminder_days || 30}
                  onChange={(e) => updateField('compliance_reminder_days', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Days before license expiration to send reminders
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Notification settings coming soon. Configure email and SMS alerts for job updates,
                appointment reminders, and compliance deadlines.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
