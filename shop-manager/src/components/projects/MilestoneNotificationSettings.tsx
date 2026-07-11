import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Bell, Mail, Loader2 } from 'lucide-react';
import { useMilestoneNotifications } from '@/hooks/useMilestoneNotifications';

export function MilestoneNotificationSettings() {
  const { preferences, savePreferences, isSavingPreferences, isLoading } = useMilestoneNotifications();

  const [settings, setSettings] = useState({
    email_notifications: true,
    in_app_notifications: true,
    reminder_days: [7, 3, 1],
    notify_on_overdue: true,
    notify_on_completion: true,
  });

  useEffect(() => {
    if (preferences) {
      setSettings({
        email_notifications: preferences.email_notifications,
        in_app_notifications: preferences.in_app_notifications,
        reminder_days: preferences.reminder_days || [7, 3, 1],
        notify_on_overdue: preferences.notify_on_overdue,
        notify_on_completion: preferences.notify_on_completion,
      });
    }
  }, [preferences]);

  const handleReminderDayToggle = (day: number) => {
    setSettings(prev => ({
      ...prev,
      reminder_days: prev.reminder_days.includes(day)
        ? prev.reminder_days.filter(d => d !== day)
        : [...prev.reminder_days, day].sort((a, b) => b - a),
    }));
  };

  const handleSave = () => {
    savePreferences(settings);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Milestone Notification Settings
        </CardTitle>
        <CardDescription>
          Configure how you want to be notified about project milestones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Notification Channels</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="in-app" className="font-normal">In-app notifications</Label>
              </div>
              <Switch
                id="in-app"
                checked={settings.in_app_notifications}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, in_app_notifications: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email" className="font-normal">Email notifications</Label>
              </div>
              <Switch
                id="email"
                checked={settings.email_notifications}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, email_notifications: checked }))}
              />
            </div>
          </div>
        </div>

        {/* Reminder Days */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Remind me before milestone</Label>
          <div className="flex flex-wrap gap-2">
            {[7, 3, 1].map(day => (
              <div key={day} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day}`}
                  checked={settings.reminder_days.includes(day)}
                  onCheckedChange={() => handleReminderDayToggle(day)}
                />
                <Label htmlFor={`day-${day}`} className="font-normal">
                  {day} day{day !== 1 ? 's' : ''}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Additional Notifications</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="overdue" className="font-normal">Notify when milestones become overdue</Label>
              <Switch
                id="overdue"
                checked={settings.notify_on_overdue}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_on_overdue: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="completion" className="font-normal">Notify when milestones are completed</Label>
              <Switch
                id="completion"
                checked={settings.notify_on_completion}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_on_completion: checked }))}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isSavingPreferences} className="w-full">
          {isSavingPreferences && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
