import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Save,
  Monitor,
  Smartphone,
  Palette,
  Zap,
  Bell,
  Shield,
  Download,
  Upload
} from 'lucide-react';
import { useInventoryView } from '@/contexts/InventoryViewContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InventorySettingsPanelProps {
  onClose?: () => void;
}

export function InventorySettingsPanel({ onClose }: InventorySettingsPanelProps) {
  const { viewMode, setViewMode } = useInventoryView();
  
  // Settings state
  const [settings, setSettings] = React.useState({
    // Display preferences
    defaultViewMode: 'table',
    itemsPerPage: 50,
    showThumbnails: true,
    showDescription: true,
    showAdvancedFields: false,
    
    // Notifications
    lowStockAlerts: true,
    outOfStockAlerts: true,
    emailNotifications: false,
    reorderReminders: true,
    
    // Auto-actions
    autoReorderEnabled: false,
    autoReorderThreshold: 10,
    autoArchiveInactive: false,
    
    // Performance
    virtualScrolling: true,
    lazyLoadImages: true,
    cacheEnabled: true,
    
    // Accessibility
    highContrast: false,
    reducedMotion: false,
    screenReaderOptimized: false,
    
    // Data management
    autoSaveInterval: 30, // seconds
    backupFrequency: 'daily',
    dataRetention: 365 // days
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    localStorage.setItem('inventorySettings', JSON.stringify(settings));
    console.log('Settings saved:', settings);
  };

  const handleResetSettings = () => {
    const defaultSettings = {
      defaultViewMode: 'table',
      itemsPerPage: 50,
      showThumbnails: true,
      showDescription: true,
      showAdvancedFields: false,
      lowStockAlerts: true,
      outOfStockAlerts: true,
      emailNotifications: false,
      reorderReminders: true,
      autoReorderEnabled: false,
      autoReorderThreshold: 10,
      autoArchiveInactive: false,
      virtualScrolling: true,
      lazyLoadImages: true,
      cacheEnabled: true,
      highContrast: false,
      reducedMotion: false,
      screenReaderOptimized: false,
      autoSaveInterval: 30,
      backupFrequency: 'daily',
      dataRetention: 365
    };
    setSettings(defaultSettings);
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'inventory-settings.json';
    link.click();
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string);
          setSettings(importedSettings);
        } catch (error) {
          console.error('Error importing settings:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  React.useEffect(() => {
    const savedSettings = localStorage.getItem('inventorySettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="h-6 w-6 mr-2 text-primary" />
            Inventory Settings
          </h2>
          <p className="text-muted-foreground">
            Customize your inventory management experience
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExportSettings}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handleResetSettings}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSaveSettings}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Monitor className="h-5 w-5 mr-2 text-blue-600" />
              Display Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultView">Default View Mode</Label>
              <Select
                value={settings.defaultViewMode}
                onValueChange={(value) => handleSettingChange('defaultViewMode', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table View</SelectItem>
                  <SelectItem value="grid">Grid View</SelectItem>
                  <SelectItem value="cards">Card View</SelectItem>
                  <SelectItem value="list">List View</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="itemsPerPage">Items per Page</Label>
              <Select
                value={settings.itemsPerPage.toString()}
                onValueChange={(value) => handleSettingChange('itemsPerPage', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 items</SelectItem>
                  <SelectItem value="50">50 items</SelectItem>
                  <SelectItem value="100">100 items</SelectItem>
                  <SelectItem value="200">200 items</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showThumbnails">Show Product Thumbnails</Label>
              <Switch
                id="showThumbnails"
                checked={settings.showThumbnails}
                onCheckedChange={(checked) => handleSettingChange('showThumbnails', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showDescription">Show Item Descriptions</Label>
              <Switch
                id="showDescription"
                checked={settings.showDescription}
                onCheckedChange={(checked) => handleSettingChange('showDescription', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showAdvanced">Show Advanced Fields</Label>
              <Switch
                id="showAdvanced"
                checked={settings.showAdvancedFields}
                onCheckedChange={(checked) => handleSettingChange('showAdvancedFields', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications & Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-amber-600" />
              Notifications & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="lowStockAlerts">Low Stock Alerts</Label>
                <p className="text-xs text-muted-foreground">Get notified when items are running low</p>
              </div>
              <Switch
                id="lowStockAlerts"
                checked={settings.lowStockAlerts}
                onCheckedChange={(checked) => handleSettingChange('lowStockAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="outOfStockAlerts">Out of Stock Alerts</Label>
                <p className="text-xs text-muted-foreground">Get notified when items are out of stock</p>
              </div>
              <Switch
                id="outOfStockAlerts"
                checked={settings.outOfStockAlerts}
                onCheckedChange={(checked) => handleSettingChange('outOfStockAlerts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive alerts via email</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reorderReminders">Reorder Reminders</Label>
                <p className="text-xs text-muted-foreground">Smart reorder suggestions</p>
              </div>
              <Switch
                id="reorderReminders"
                checked={settings.reorderReminders}
                onCheckedChange={(checked) => handleSettingChange('reorderReminders', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Automation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-purple-600" />
              Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoReorder">Auto-Reorder</Label>
                <p className="text-xs text-muted-foreground">Automatically create purchase orders</p>
              </div>
              <Switch
                id="autoReorder"
                checked={settings.autoReorderEnabled}
                onCheckedChange={(checked) => handleSettingChange('autoReorderEnabled', checked)}
              />
            </div>

            {settings.autoReorderEnabled && (
              <div className="space-y-2">
                <Label htmlFor="autoReorderThreshold">Auto-Reorder Threshold (%)</Label>
                <Input
                  id="autoReorderThreshold"
                  type="number"
                  value={settings.autoReorderThreshold}
                  onChange={(e) => handleSettingChange('autoReorderThreshold', parseInt(e.target.value))}
                  min="1"
                  max="100"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoArchive">Auto-Archive Inactive Items</Label>
                <p className="text-xs text-muted-foreground">Archive items with no activity</p>
              </div>
              <Switch
                id="autoArchive"
                checked={settings.autoArchiveInactive}
                onCheckedChange={(checked) => handleSettingChange('autoArchiveInactive', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2 text-green-600" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="virtualScrolling">Virtual Scrolling</Label>
                <p className="text-xs text-muted-foreground">Improve performance for large datasets</p>
              </div>
              <Switch
                id="virtualScrolling"
                checked={settings.virtualScrolling}
                onCheckedChange={(checked) => handleSettingChange('virtualScrolling', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="lazyLoad">Lazy Load Images</Label>
                <p className="text-xs text-muted-foreground">Load images only when visible</p>
              </div>
              <Switch
                id="lazyLoad"
                checked={settings.lazyLoadImages}
                onCheckedChange={(checked) => handleSettingChange('lazyLoadImages', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="cacheEnabled">Enable Caching</Label>
                <p className="text-xs text-muted-foreground">Cache data for faster loading</p>
              </div>
              <Switch
                id="cacheEnabled"
                checked={settings.cacheEnabled}
                onCheckedChange={(checked) => handleSettingChange('cacheEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-indigo-600" />
              Accessibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="highContrast">High Contrast Mode</Label>
                <p className="text-xs text-muted-foreground">Increase color contrast</p>
              </div>
              <Switch
                id="highContrast"
                checked={settings.highContrast}
                onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reducedMotion">Reduced Motion</Label>
                <p className="text-xs text-muted-foreground">Minimize animations</p>
              </div>
              <Switch
                id="reducedMotion"
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="screenReader">Screen Reader Optimized</Label>
                <p className="text-xs text-muted-foreground">Enhanced screen reader support</p>
              </div>
              <Switch
                id="screenReader"
                checked={settings.screenReaderOptimized}
                onCheckedChange={(checked) => handleSettingChange('screenReaderOptimized', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Save className="h-5 w-5 mr-2 text-red-600" />
              Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="autoSave">Auto-Save Interval (seconds)</Label>
              <Input
                id="autoSave"
                type="number"
                value={settings.autoSaveInterval}
                onChange={(e) => handleSettingChange('autoSaveInterval', parseInt(e.target.value))}
                min="10"
                max="300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="backupFreq">Backup Frequency</Label>
              <Select
                value={settings.backupFrequency}
                onValueChange={(value) => handleSettingChange('backupFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataRetention">Data Retention (days)</Label>
              <Input
                id="dataRetention"
                type="number"
                value={settings.dataRetention}
                onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
                min="30"
                max="3650"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Import/Export Settings</Label>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handleExportSettings}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <label htmlFor="importSettings">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                    <input
                      id="importSettings"
                      type="file"
                      accept=".json"
                      onChange={handleImportSettings}
                      className="hidden"
                    />
                  </label>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Settings Summary</p>
              <p className="text-xs text-muted-foreground">
                {Object.values(settings).filter(Boolean).length} features enabled
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Badge variant="outline">
                Performance: {settings.virtualScrolling && settings.cacheEnabled ? 'Optimized' : 'Standard'}
              </Badge>
              <Badge variant="outline">
                Accessibility: {settings.highContrast || settings.screenReaderOptimized ? 'Enhanced' : 'Standard'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}