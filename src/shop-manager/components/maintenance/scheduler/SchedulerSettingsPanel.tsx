
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useShopId } from "@/hooks/useShopId";
import { supabase } from "@/integrations/supabase/client";

interface SchedulerConfig {
  auto_schedule_enabled: boolean;
  default_priority_weight: number;
  technician_skill_matching: boolean;
  workload_balancing: boolean;
  max_daily_hours: number;
  maintenance_buffer_days: number;
  notification_lead_days: number;
  prefer_same_technician: boolean;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  auto_schedule_enabled: false,
  default_priority_weight: 5,
  technician_skill_matching: true,
  workload_balancing: true,
  max_daily_hours: 8,
  maintenance_buffer_days: 3,
  notification_lead_days: 7,
  prefer_same_technician: true
};

export function SchedulerSettingsPanel() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [config, setConfig] = useState<SchedulerConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`scheduler_config_${shopId}`);
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
      localStorage.setItem(`scheduler_config_${shopId}`, JSON.stringify(config));
      toast({
        title: 'Settings saved',
        description: 'Scheduler settings have been updated.'
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
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Schedule Settings
            </CardTitle>
            <Button onClick={saveSettings} disabled={saving} size="sm">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-Scheduling */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-Schedule Maintenance</Label>
              <p className="text-sm text-muted-foreground">Automatically schedule maintenance based on intervals</p>
            </div>
            <Switch
              checked={config.auto_schedule_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, auto_schedule_enabled: checked })}
            />
          </div>

          {/* Technician Matching */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Skill-Based Matching</Label>
              <p className="text-sm text-muted-foreground">Match technicians based on required skills</p>
            </div>
            <Switch
              checked={config.technician_skill_matching}
              onCheckedChange={(checked) => setConfig({ ...config, technician_skill_matching: checked })}
            />
          </div>

          {/* Workload Balancing */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Workload Balancing</Label>
              <p className="text-sm text-muted-foreground">Distribute work evenly across technicians</p>
            </div>
            <Switch
              checked={config.workload_balancing}
              onCheckedChange={(checked) => setConfig({ ...config, workload_balancing: checked })}
            />
          </div>

          {/* Prefer Same Technician */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Prefer Same Technician</Label>
              <p className="text-sm text-muted-foreground">Assign previous technician when possible</p>
            </div>
            <Switch
              checked={config.prefer_same_technician}
              onCheckedChange={(checked) => setConfig({ ...config, prefer_same_technician: checked })}
            />
          </div>

          {/* Numeric Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Daily Hours</Label>
              <Input
                type="number"
                min={4}
                max={12}
                value={config.max_daily_hours}
                onChange={(e) => setConfig({ ...config, max_daily_hours: parseInt(e.target.value) || 8 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority Weight (1-10)</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={config.default_priority_weight}
                onChange={(e) => setConfig({ ...config, default_priority_weight: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buffer Days</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={config.maintenance_buffer_days}
                onChange={(e) => setConfig({ ...config, maintenance_buffer_days: parseInt(e.target.value) || 3 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notification Lead Days</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={config.notification_lead_days}
                onChange={(e) => setConfig({ ...config, notification_lead_days: parseInt(e.target.value) || 7 })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
