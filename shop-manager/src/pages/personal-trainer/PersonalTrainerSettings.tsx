import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Clock, Bell, Dumbbell, Utensils, Save, Loader2 } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_SETTINGS = {
  default_session_duration: 60,
  cancellation_policy_hours: 24,
  max_daily_sessions: 8,
  session_buffer_minutes: 15,
  allow_client_booking: true,
  auto_checkin_reminder: true,
  checkin_reminder_day: 'sunday',
  package_expiry_reminder_days: 7,
  session_low_reminder_count: 2,
  default_calorie_target: 2000,
  default_protein_target: 150,
  default_hydration_target: 2500,
  welcome_message: "Welcome to your fitness journey! We're excited to help you reach your goals.",
  cancellation_policy_text: 'Please cancel at least 24 hours in advance to avoid being charged for the session.',
  session_types: 'personal_training,group_class,assessment,consultation',
};

export default function PersonalTrainerSettings() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dbSettings, isLoading } = useQuery({
    queryKey: ['pt-settings', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      const { data } = await (supabase as any).from('pt_settings').select('*').eq('shop_id', shopId).maybeSingle();
      return data;
    },
    enabled: !!shopId,
  });

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (dbSettings) {
      setSettings(s => ({ ...s, ...dbSettings }));
    }
  }, [dbSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('No shop');
      const payload = { shop_id: shopId, ...settings, updated_at: new Date().toISOString() };
      if (dbSettings?.id) {
        const { error } = await (supabase as any).from('pt_settings').update(payload).eq('id', dbSettings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('pt_settings').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pt-settings'] });
      toast({ title: 'Settings saved successfully' });
    },
    onError: (e: any) => toast({ title: 'Error saving', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Configure your Personal Trainer module</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5 text-orange-500" />Session Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Default Duration (minutes)</Label><Input type="number" value={settings.default_session_duration} onChange={e => setSettings(s => ({ ...s, default_session_duration: parseInt(e.target.value) || 60 }))} /></div>
            <div><Label>Buffer Between Sessions (min)</Label><Input type="number" value={settings.session_buffer_minutes} onChange={e => setSettings(s => ({ ...s, session_buffer_minutes: parseInt(e.target.value) || 15 }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Max Daily Sessions</Label><Input type="number" value={settings.max_daily_sessions} onChange={e => setSettings(s => ({ ...s, max_daily_sessions: parseInt(e.target.value) || 8 }))} /></div>
            <div><Label>Cancellation Policy (hours before)</Label><Input type="number" value={settings.cancellation_policy_hours} onChange={e => setSettings(s => ({ ...s, cancellation_policy_hours: parseInt(e.target.value) || 24 }))} /></div>
          </div>
          <div><Label>Session Types (comma-separated)</Label><Input value={settings.session_types} onChange={e => setSettings(s => ({ ...s, session_types: e.target.value }))} /></div>
          <div className="flex items-center justify-between">
            <div><Label>Allow Client Self-Booking</Label><p className="text-xs text-muted-foreground">Clients can book sessions from their portal</p></div>
            <Switch checked={settings.allow_client_booking} onCheckedChange={v => setSettings(s => ({ ...s, allow_client_booking: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-5 w-5 text-blue-500" />Notifications & Reminders</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Auto Check-in Reminders</Label><p className="text-xs text-muted-foreground">Send weekly reminder to clients for check-ins</p></div>
            <Switch checked={settings.auto_checkin_reminder} onCheckedChange={v => setSettings(s => ({ ...s, auto_checkin_reminder: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in Reminder Day</Label>
              <Select value={settings.checkin_reminder_day} onValueChange={v => setSettings(s => ({ ...s, checkin_reminder_day: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(d => (
                    <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Package Expiry Alert (days before)</Label><Input type="number" value={settings.package_expiry_reminder_days} onChange={e => setSettings(s => ({ ...s, package_expiry_reminder_days: parseInt(e.target.value) || 7 }))} /></div>
          </div>
          <div><Label>Low Session Alert (remaining count)</Label><Input type="number" value={settings.session_low_reminder_count} onChange={e => setSettings(s => ({ ...s, session_low_reminder_count: parseInt(e.target.value) || 2 }))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Utensils className="h-5 w-5 text-green-500" />Nutrition Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div><Label>Default Calories</Label><Input type="number" value={settings.default_calorie_target} onChange={e => setSettings(s => ({ ...s, default_calorie_target: parseInt(e.target.value) || 2000 }))} /></div>
            <div><Label>Default Protein (g)</Label><Input type="number" value={settings.default_protein_target} onChange={e => setSettings(s => ({ ...s, default_protein_target: parseInt(e.target.value) || 150 }))} /></div>
            <div><Label>Default Hydration (ml)</Label><Input type="number" value={settings.default_hydration_target} onChange={e => setSettings(s => ({ ...s, default_hydration_target: parseInt(e.target.value) || 2500 }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Dumbbell className="h-5 w-5 text-violet-500" />Client Communication</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Welcome Message</Label><Textarea value={settings.welcome_message} onChange={e => setSettings(s => ({ ...s, welcome_message: e.target.value }))} rows={3} /></div>
          <div><Label>Cancellation Policy Text</Label><Textarea value={settings.cancellation_policy_text} onChange={e => setSettings(s => ({ ...s, cancellation_policy_text: e.target.value }))} rows={3} /></div>
        </CardContent>
      </Card>
    </div>
  );
}
