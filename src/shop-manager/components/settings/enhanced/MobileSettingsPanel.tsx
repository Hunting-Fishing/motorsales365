import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Bell, 
  Download, 
  Wifi, 
  Camera, 
  MapPin,
  Vibrate,
  Battery,
  Moon,
  Sun
} from 'lucide-react';

interface MobileSettings {
  pushNotifications: boolean;
  offlineSync: boolean;
  autoDownload: boolean;
  cameraQuality: 'low' | 'medium' | 'high';
  locationTracking: boolean;
  hapticFeedback: boolean;
  batteryOptimization: boolean;
  darkModeAuto: boolean;
  syncFrequency: number; // minutes
  offlineDataLimit: number; // MB
}

interface MobileSettingsPanelProps {
  settings: MobileSettings;
  onChange: (settings: Partial<MobileSettings>) => void;
  onResetToDefaults: () => void;
}

export function MobileSettingsPanel({ 
  settings, 
  onChange, 
  onResetToDefaults 
}: MobileSettingsPanelProps) {
  const handleSettingChange = <K extends keyof MobileSettings>(
    key: K, 
    value: MobileSettings[K]
  ) => {
    onChange({ [key]: value });
  };

  const getStorageUsage = () => {
    // Estimate based on settings - actual storage depends on cached data
    const baseUsage = 50; // Base app data in MB
    const cacheMultiplier = settings.offlineSync ? 3 : 1;
    const qualityMultiplier = settings.cameraQuality === 'high' ? 2 : settings.cameraQuality === 'medium' ? 1.5 : 1;
    return Math.round(baseUsage * cacheMultiplier * qualityMultiplier);
  };

  const getCameraQualityDescription = (quality: string) => {
    switch (quality) {
      case 'low': return 'Faster, smaller files (720p)';
      case 'medium': return 'Balanced quality and size (1080p)';
      case 'high': return 'Best quality, larger files (4K)';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications when app is closed
              </p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => 
                handleSettingChange('pushNotifications', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Haptic Feedback</Label>
              <p className="text-sm text-muted-foreground">
                Vibrate for interactions and alerts
              </p>
            </div>
            <Switch
              checked={settings.hapticFeedback}
              onCheckedChange={(checked) => 
                handleSettingChange('hapticFeedback', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Offline & Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5" />
            Offline & Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Offline Sync</Label>
              <p className="text-sm text-muted-foreground">
                Keep data available when offline
              </p>
            </div>
            <Switch
              checked={settings.offlineSync}
              onCheckedChange={(checked) => 
                handleSettingChange('offlineSync', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Download</Label>
              <p className="text-sm text-muted-foreground">
                Download updates automatically on WiFi
              </p>
            </div>
            <Switch
              checked={settings.autoDownload}
              onCheckedChange={(checked) => 
                handleSettingChange('autoDownload', checked)
              }
            />
          </div>

          <div className="space-y-3">
            <Label>Sync Frequency: {settings.syncFrequency} minutes</Label>
            <Slider
              value={[settings.syncFrequency]}
              onValueChange={(value) => 
                handleSettingChange('syncFrequency', value[0])
              }
              min={5}
              max={60}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5 min</span>
              <span>60 min</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Offline Data Limit: {settings.offlineDataLimit} MB</Label>
            <Slider
              value={[settings.offlineDataLimit]}
              onValueChange={(value) => 
                handleSettingChange('offlineDataLimit', value[0])
              }
              min={50}
              max={1000}
              step={50}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50 MB</span>
              <span>1 GB</span>
            </div>
          </div>

          <div className="p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">Current Usage</span>
              <Badge variant="secondary">{getStorageUsage()} MB</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Camera & Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Camera & Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Photo Quality</Label>
            <Select
              value={settings.cameraQuality}
              onValueChange={(value: 'low' | 'medium' | 'high') => 
                handleSettingChange('cameraQuality', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Quality</SelectItem>
                <SelectItem value="medium">Medium Quality</SelectItem>
                <SelectItem value="high">High Quality</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getCameraQualityDescription(settings.cameraQuality)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Location & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Location Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Track location for work order check-ins
              </p>
            </div>
            <Switch
              checked={settings.locationTracking}
              onCheckedChange={(checked) => 
                handleSettingChange('locationTracking', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="w-5 h-5" />
            Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Battery Optimization</Label>
              <p className="text-sm text-muted-foreground">
                Reduce background activity to save battery
              </p>
            </div>
            <Switch
              checked={settings.batteryOptimization}
              onCheckedChange={(checked) => 
                handleSettingChange('batteryOptimization', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Switch theme based on system settings
              </p>
            </div>
            <Switch
              checked={settings.darkModeAuto}
              onCheckedChange={(checked) => 
                handleSettingChange('darkModeAuto', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Reset Settings */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Reset all mobile settings to their default values
            </p>
            <Button 
              variant="outline" 
              onClick={onResetToDefaults}
              className="w-full"
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}