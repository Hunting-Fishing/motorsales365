import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Save, Shield, Clock, Database } from 'lucide-react';
import { enterpriseService } from '@/services/enterpriseService';
import type { SystemSetting } from '@/types/phase4';

export const SystemSettings = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await enterpriseService.getSystemSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error fetching system settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleUpdateSetting = async (key: string, value: any) => {
    setSaving(true);
    try {
      await enterpriseService.updateSystemSetting(key, value);
      setSettings(settings.map(setting => 
        setting.key === key ? { ...setting, value } : setting
      ));
    } catch (error) {
      console.error('Error updating setting:', error);
    } finally {
      setSaving(false);
    }
  };

  const getSettingIcon = (key: string) => {
    if (key.includes('security')) return Shield;
    if (key.includes('cache') || key.includes('performance')) return Clock;
    return Database;
  };

  const renderSettingControl = (setting: SystemSetting) => {
    const value = setting.value;
    
    if (typeof value === 'boolean' || value === 'true' || value === 'false') {
      return (
        <Switch
          checked={value === true || value === 'true'}
          onCheckedChange={(checked) => handleUpdateSetting(setting.key, checked)}
        />
      );
    }
    
    if (typeof value === 'number' || !isNaN(Number(value))) {
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => setSettings(settings.map(s => 
            s.key === setting.key ? { ...s, value: e.target.value } : s
          ))}
          onBlur={(e) => handleUpdateSetting(setting.key, Number(e.target.value))}
          className="w-32"
        />
      );
    }
    
    return (
      <Input
        value={value}
        onChange={(e) => setSettings(settings.map(s => 
          s.key === setting.key ? { ...s, value: e.target.value } : s
        ))}
        onBlur={(e) => handleUpdateSetting(setting.key, e.target.value)}
        className="w-48"
      />
    );
  };

  const groupedSettings = settings.reduce((groups, setting) => {
    const category = setting.key.split('.')[0];
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(setting);
    return groups;
  }, {} as Record<string, SystemSetting[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Settings</h2>
          <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-48"></div>
                <div className="h-4 bg-muted rounded w-64"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex justify-between items-center">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-8 bg-muted rounded w-24"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Object.keys(groupedSettings).length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Settings</h3>
              <p>No system settings are currently configured.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSettings).map(([category, categorySettings]) => {
            const Icon = getSettingIcon(category);
            
            return (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <CardTitle className="capitalize">{category} Settings</CardTitle>
                  </div>
                  <CardDescription>
                    Configure {category}-related system settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {categorySettings.map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-sm font-medium">
                            {setting.key.split('.').slice(1).join(' ').replace(/_/g, ' ')}
                          </Label>
                          {setting.description && (
                            <p className="text-xs text-muted-foreground">
                              {setting.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {renderSettingControl(setting)}
                          {saving && (
                            <div className="text-xs text-muted-foreground">Saving...</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};