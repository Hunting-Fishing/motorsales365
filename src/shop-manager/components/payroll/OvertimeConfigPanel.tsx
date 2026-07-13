import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { Settings, Clock, DollarSign, Save } from 'lucide-react';

interface OvertimeConfig {
  weeklyThreshold: number;
  dailyThreshold: number;
  dailyOvertimeEnabled: boolean;
  overtimeMultiplier: number;
  doubleTimeThreshold: number;
  doubleTimeEnabled: boolean;
  doubleTimeMultiplier: number;
}

const DEFAULT_CONFIG: OvertimeConfig = {
  weeklyThreshold: 40,
  dailyThreshold: 8,
  dailyOvertimeEnabled: true,
  overtimeMultiplier: 1.5,
  doubleTimeThreshold: 12,
  doubleTimeEnabled: false,
  doubleTimeMultiplier: 2.0,
};

export function OvertimeConfigPanel() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [config, setConfig] = useState<OvertimeConfig>(DEFAULT_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);

  // Load config from localStorage
  useEffect(() => {
    if (shopId) {
      const stored = localStorage.getItem(`overtime_config_${shopId}`);
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    }
  }, [shopId]);

  const handleChange = (key: keyof OvertimeConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!shopId) return;
    
    localStorage.setItem(`overtime_config_${shopId}`, JSON.stringify(config));
    setHasChanges(false);
    toast({
      title: 'Settings Saved',
      description: 'Overtime configuration has been updated.',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Overtime Configuration
          </CardTitle>
          <CardDescription>
            Configure overtime thresholds and pay multipliers for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Weekly Overtime */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Weekly Overtime
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weeklyThreshold">Weekly Hours Threshold</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="weeklyThreshold"
                    type="number"
                    value={config.weeklyThreshold}
                    onChange={(e) => handleChange('weeklyThreshold', parseFloat(e.target.value) || 40)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">hours/week</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hours worked beyond this threshold are overtime
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtimeMultiplier">Overtime Pay Multiplier</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="overtimeMultiplier"
                    type="number"
                    step="0.1"
                    value={config.overtimeMultiplier}
                    onChange={(e) => handleChange('overtimeMultiplier', parseFloat(e.target.value) || 1.5)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">× regular rate</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Overtime */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Daily Overtime
              </h3>
              <Switch
                checked={config.dailyOvertimeEnabled}
                onCheckedChange={(checked) => handleChange('dailyOvertimeEnabled', checked)}
              />
            </div>
            {config.dailyOvertimeEnabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dailyThreshold">Daily Hours Threshold</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="dailyThreshold"
                      type="number"
                      value={config.dailyThreshold}
                      onChange={(e) => handleChange('dailyThreshold', parseFloat(e.target.value) || 8)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">hours/day</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hours beyond this in a single day are overtime
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Double Time */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Double Time
              </h3>
              <Switch
                checked={config.doubleTimeEnabled}
                onCheckedChange={(checked) => handleChange('doubleTimeEnabled', checked)}
              />
            </div>
            {config.doubleTimeEnabled && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doubleTimeThreshold">Double Time Threshold</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="doubleTimeThreshold"
                      type="number"
                      value={config.doubleTimeThreshold}
                      onChange={(e) => handleChange('doubleTimeThreshold', parseFloat(e.target.value) || 12)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">hours/day</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doubleTimeMultiplier">Double Time Multiplier</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="doubleTimeMultiplier"
                      type="number"
                      step="0.1"
                      value={config.doubleTimeMultiplier}
                      onChange={(e) => handleChange('doubleTimeMultiplier', parseFloat(e.target.value) || 2.0)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">× regular rate</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="pt-4 flex justify-end">
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Rules Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              • <strong>Weekly OT:</strong> After {config.weeklyThreshold} hours/week → {config.overtimeMultiplier}× pay
            </p>
            {config.dailyOvertimeEnabled && (
              <p>
                • <strong>Daily OT:</strong> After {config.dailyThreshold} hours/day → {config.overtimeMultiplier}× pay
              </p>
            )}
            {config.doubleTimeEnabled && (
              <p>
                • <strong>Double Time:</strong> After {config.doubleTimeThreshold} hours/day → {config.doubleTimeMultiplier}× pay
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
