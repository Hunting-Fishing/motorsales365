import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Settings, Clock, Mail, Bell, Shield, Save } from 'lucide-react';
import { BookingSettings, useUpdateBookingSettings } from '@/hooks/useBookingSystem';

interface BookingSettingsPanelProps {
  settings: BookingSettings | null | undefined;
}

export function BookingSettingsPanel({ settings }: BookingSettingsPanelProps) {
  const [formData, setFormData] = useState<Partial<BookingSettings>>({
    allow_online_booking: true,
    require_confirmation: true,
    allow_same_day_booking: true,
    min_booking_notice_hours: 2,
    max_advance_booking_days: 90,
    slot_interval_minutes: 15,
    default_buffer_minutes: 15,
    allow_waitlist: true,
    auto_confirm: false,
    send_confirmation_email: true,
    send_reminder_email: true,
    reminder_hours_before: 24,
    cancellation_policy: '',
    booking_instructions: '',
  });

  const updateSettings = useUpdateBookingSettings();

  useEffect(() => {
    if (settings) {
      setFormData({
        allow_online_booking: settings.allow_online_booking,
        require_confirmation: settings.require_confirmation,
        allow_same_day_booking: settings.allow_same_day_booking,
        min_booking_notice_hours: settings.min_booking_notice_hours,
        max_advance_booking_days: settings.max_advance_booking_days,
        slot_interval_minutes: settings.slot_interval_minutes,
        default_buffer_minutes: settings.default_buffer_minutes,
        allow_waitlist: settings.allow_waitlist,
        auto_confirm: settings.auto_confirm,
        send_confirmation_email: settings.send_confirmation_email,
        send_reminder_email: settings.send_reminder_email,
        reminder_hours_before: settings.reminder_hours_before,
        cancellation_policy: settings.cancellation_policy || '',
        booking_instructions: settings.booking_instructions || '',
      });
    }
  }, [settings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync(formData);
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>
            Configure how customers can book appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Online Booking</Label>
              <p className="text-sm text-muted-foreground">Customers can book appointments online</p>
            </div>
            <Switch 
              checked={formData.allow_online_booking}
              onCheckedChange={(checked) => setFormData({ ...formData, allow_online_booking: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Same-Day Booking</Label>
              <p className="text-sm text-muted-foreground">Customers can book for today</p>
            </div>
            <Switch 
              checked={formData.allow_same_day_booking}
              onCheckedChange={(checked) => setFormData({ ...formData, allow_same_day_booking: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Confirm Bookings</Label>
              <p className="text-sm text-muted-foreground">Automatically confirm new bookings</p>
            </div>
            <Switch 
              checked={formData.auto_confirm}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_confirm: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Waitlist</Label>
              <p className="text-sm text-muted-foreground">Allow customers to join waitlist when fully booked</p>
            </div>
            <Switch 
              checked={formData.allow_waitlist}
              onCheckedChange={(checked) => setFormData({ ...formData, allow_waitlist: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Time Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Minimum Booking Notice (hours)</Label>
              <Input 
                type="number"
                value={formData.min_booking_notice_hours}
                onChange={(e) => setFormData({ ...formData, min_booking_notice_hours: parseInt(e.target.value) || 2 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How far in advance bookings must be made
              </p>
            </div>

            <div>
              <Label>Maximum Advance Booking (days)</Label>
              <Input 
                type="number"
                value={formData.max_advance_booking_days}
                onChange={(e) => setFormData({ ...formData, max_advance_booking_days: parseInt(e.target.value) || 90 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How far ahead customers can book
              </p>
            </div>

            <div>
              <Label>Time Slot Interval (minutes)</Label>
              <Input 
                type="number"
                value={formData.slot_interval_minutes}
                onChange={(e) => setFormData({ ...formData, slot_interval_minutes: parseInt(e.target.value) || 15 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Time increments for booking slots (e.g., 15, 30, 60)
              </p>
            </div>

            <div>
              <Label>Default Buffer Time (minutes)</Label>
              <Input 
                type="number"
                value={formData.default_buffer_minutes}
                onChange={(e) => setFormData({ ...formData, default_buffer_minutes: parseInt(e.target.value) || 15 })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Time between appointments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Send Confirmation Email</Label>
              <p className="text-sm text-muted-foreground">Email customers when booking is confirmed</p>
            </div>
            <Switch 
              checked={formData.send_confirmation_email}
              onCheckedChange={(checked) => setFormData({ ...formData, send_confirmation_email: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Send Reminder Email</Label>
              <p className="text-sm text-muted-foreground">Email customers before their appointment</p>
            </div>
            <Switch 
              checked={formData.send_reminder_email}
              onCheckedChange={(checked) => setFormData({ ...formData, send_reminder_email: checked })}
            />
          </div>

          {formData.send_reminder_email && (
            <div>
              <Label>Reminder Hours Before</Label>
              <Input 
                type="number"
                value={formData.reminder_hours_before}
                onChange={(e) => setFormData({ ...formData, reminder_hours_before: parseInt(e.target.value) || 24 })}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Policies & Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Cancellation Policy</Label>
            <Textarea 
              value={formData.cancellation_policy || ''}
              onChange={(e) => setFormData({ ...formData, cancellation_policy: e.target.value })}
              placeholder="Describe your cancellation policy..."
              rows={3}
            />
          </div>

          <div>
            <Label>Booking Instructions</Label>
            <Textarea 
              value={formData.booking_instructions || ''}
              onChange={(e) => setFormData({ ...formData, booking_instructions: e.target.value })}
              placeholder="Any special instructions for customers when booking..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gap-2" disabled={updateSettings.isPending}>
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
