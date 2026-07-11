
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useShopId } from '@/hooks/useShopId';
import { toast } from '@/hooks/use-toast';

interface BusinessSettingsStepProps {
  onNext: () => void;
  onPrevious: () => void;
  data: any;
  updateData: (data: any) => void;
}

const days = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 0, name: 'Sunday' }
];

export function BusinessSettingsStep({ onNext, onPrevious, data, updateData }: BusinessSettingsStepProps) {
  const { shopId } = useShopId();
  const [isLoading, setIsLoading] = useState(false);
  const [businessHours, setBusinessHours] = useState(
    days.map(day => ({
      day_of_week: day.id,
      dayName: day.name,
      open_time: '09:00',
      close_time: '17:00',
      is_closed: day.id === 0 || day.id === 6 // Default closed on weekends
    }))
  );
  const [settings, setSettings] = useState({
    laborRate: '100',
    taxRate: '8.5',
    appointmentBooking: true,
    emailNotifications: true,
    smsNotifications: false,
    ...data.businessSettings
  });

  useEffect(() => {
    if (data.businessSettings?.businessHours) {
      setBusinessHours(data.businessSettings.businessHours);
    }
  }, [data.businessSettings]);

  const handleHourChange = (dayIndex: number, field: string, value: string | boolean) => {
    setBusinessHours(prev => 
      prev.map((hour, index) => 
        index === dayIndex ? { ...hour, [field]: value } : hour
      )
    );
  };

  const handleSettingChange = (field: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = async () => {
    setIsLoading(true);
    try {
      if (shopId) {
        // Save business hours to database
        const hoursToSave = businessHours.map(hour => ({
          shop_id: shopId,
          day_of_week: hour.day_of_week,
          open_time: hour.open_time + ':00',
          close_time: hour.close_time + ':00',
          is_closed: hour.is_closed
        }));

        // Delete existing hours first
        await supabase
          .from('shop_hours')
          .delete()
          .eq('shop_id', shopId);

        // Insert new hours
        const { error: hoursError } = await supabase
          .from('shop_hours')
          .insert(hoursToSave);

        if (hoursError) throw hoursError;

        // Update onboarding progress
        const businessSettingsData = {
          businessHours,
          laborRate: settings.laborRate,
          taxRate: settings.taxRate,
          appointmentBooking: settings.appointmentBooking,
          emailNotifications: settings.emailNotifications,
          smsNotifications: settings.smsNotifications
        };

        const { error: progressError } = await supabase
          .from('onboarding_progress')
          .update({
            step_data: {
              basicInfo: data.basicInfo || {},
              businessSettings: businessSettingsData,
              sampleData: data.sampleData || {}
            },
            current_step: 2,
            completed_steps: [0, 1]
          })
          .eq('shop_id', shopId);

        if (progressError) throw progressError;
      }

      // Update local state
      updateData({ businessSettings: { businessHours, ...settings } });
      onNext();
    } catch (error: any) {
      console.error('Error saving business settings:', error);
      toast({
        title: "Error",
        description: "Failed to save business settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>
            Set your operating hours for each day of the week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {businessHours.map((hour, index) => (
            <div key={hour.day_of_week} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-4">
                <Switch
                  checked={!hour.is_closed}
                  onCheckedChange={(checked) => handleHourChange(index, 'is_closed', !checked)}
                />
                <Label className="w-20">{hour.dayName}</Label>
              </div>
              {!hour.is_closed && (
                <div className="flex items-center space-x-2">
                  <Input
                    type="time"
                    value={hour.open_time}
                    onChange={(e) => handleHourChange(index, 'open_time', e.target.value)}
                    className="w-32"
                  />
                  <span>to</span>
                  <Input
                    type="time"
                    value={hour.close_time}
                    onChange={(e) => handleHourChange(index, 'close_time', e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
              {hour.is_closed && (
                <span className="text-gray-500">Closed</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rates & Settings</CardTitle>
          <CardDescription>
            Configure your basic pricing and notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="laborRate">Default Labor Rate ($/hour)</Label>
              <Input
                id="laborRate"
                type="number"
                value={settings.laborRate}
                onChange={(e) => handleSettingChange('laborRate', e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.1"
                value={settings.taxRate}
                onChange={(e) => handleSettingChange('taxRate', e.target.value)}
                placeholder="8.5"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Online Appointment Booking</Label>
                <p className="text-sm text-gray-500">Allow customers to book appointments online</p>
              </div>
              <Switch
                checked={settings.appointmentBooking}
                onCheckedChange={(checked) => handleSettingChange('appointmentBooking', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications via text message</p>
              </div>
              <Switch
                checked={settings.smsNotifications}
                onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={onPrevious} variant="outline">
          Previous
        </Button>
        <Button onClick={handleNext} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
