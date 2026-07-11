
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { supabase } from '@/integrations/supabase/client';

interface SchedulingConfig {
  business_hours_start: string;
  business_hours_end: string;
  slot_duration_minutes: number;
  buffer_time_minutes: number;
  max_advance_booking_days: number;
  allow_same_day_booking: boolean;
  require_approval: boolean;
  auto_assign_technician: boolean;
}

const DEFAULT_CONFIG: SchedulingConfig = {
  business_hours_start: '08:00',
  business_hours_end: '17:00',
  slot_duration_minutes: 60,
  buffer_time_minutes: 15,
  max_advance_booking_days: 30,
  allow_same_day_booking: true,
  require_approval: false,
  auto_assign_technician: true
};

export function SchedulingSettings() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [config, setConfig] = useState<SchedulingConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load from localStorage for simplicity
    const saved = localStorage.getItem(`scheduling_config_${shopId}`);
    if (saved) {
      try {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Error parsing saved config:', e);
      }
    }
    setLoading(false);
  }, [shopId]);

  const saveSettings = async () => {
    if (!shopId) return;
    
    setSaving(true);
    try {
      localStorage.setItem(`scheduling_config_${shopId}`, JSON.stringify(config));
      toast({
        title: 'Settings saved',
        description: 'Scheduling settings have been updated successfully.'
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Scheduling Settings</CardTitle>
            </div>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
          <CardDescription>
            Configure time-off types, approval workflows, and scheduling rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Business Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Business Hours Start</Label>
              <Input
                id="start-time"
                type="time"
                value={config.business_hours_start}
                onChange={(e) => setConfig({ ...config, business_hours_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Business Hours End</Label>
              <Input
                id="end-time"
                type="time"
                value={config.business_hours_end}
                onChange={(e) => setConfig({ ...config, business_hours_end: e.target.value })}
              />
            </div>
          </div>

          {/* Slot Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="slot-duration">Slot Duration</Label>
              <Select
                value={config.slot_duration_minutes.toString()}
                onValueChange={(v) => setConfig({ ...config, slot_duration_minutes: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="buffer-time">Buffer Between Appointments</Label>
              <Select
                value={config.buffer_time_minutes.toString()}
                onValueChange={(v) => setConfig({ ...config, buffer_time_minutes: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No buffer</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advance Booking */}
          <div className="space-y-2">
            <Label htmlFor="advance-days">Max Advance Booking Days</Label>
            <Input
              id="advance-days"
              type="number"
              min={1}
              max={365}
              value={config.max_advance_booking_days}
              onChange={(e) => setConfig({ ...config, max_advance_booking_days: parseInt(e.target.value) || 30 })}
            />
          </div>

          {/* Toggle Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Same-Day Booking</Label>
                <p className="text-sm text-muted-foreground">Allow customers to book appointments for today</p>
              </div>
              <Switch
                checked={config.allow_same_day_booking}
                onCheckedChange={(checked) => setConfig({ ...config, allow_same_day_booking: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Require Approval</Label>
                <p className="text-sm text-muted-foreground">Appointments require manager approval before confirmation</p>
              </div>
              <Switch
                checked={config.require_approval}
                onCheckedChange={(checked) => setConfig({ ...config, require_approval: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Assign Technician</Label>
                <p className="text-sm text-muted-foreground">Automatically assign available technicians to new appointments</p>
              </div>
              <Switch
                checked={config.auto_assign_technician}
                onCheckedChange={(checked) => setConfig({ ...config, auto_assign_technician: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
