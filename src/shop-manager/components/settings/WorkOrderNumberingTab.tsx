
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { supabase } from '@/integrations/supabase/client';
import { Hash, Save } from 'lucide-react';

interface WorkOrderNumberingSettings {
  prefix: string;
  separator: string;
  number_format: string;
  current_number: number;
  number_length: number;
  include_year: boolean;
  include_month: boolean;
  custom_format: string;
}

const defaultSettings: WorkOrderNumberingSettings = {
  prefix: 'WO',
  separator: '-',
  number_format: 'sequential',
  current_number: 1000,
  number_length: 4,
  include_year: false,
  include_month: false,
  custom_format: '{prefix}{separator}{number}'
};

export function WorkOrderNumberingTab() {
  const [settings, setSettings] = useState<WorkOrderNumberingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { shopId, loading: shopLoading, error: shopError } = useShopId();

  useEffect(() => {
    if (shopId) {
      loadSettings();
    }
  }, [shopId]);

  const loadSettings = async () => {
    if (!shopId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('settings_value')
        .eq('shop_id', shopId)
        .eq('settings_key', 'work_order_numbering')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.settings_value) {
        // Type assertion after validation
        const settingsData = data.settings_value as unknown;
        if (typeof settingsData === 'object' && settingsData !== null) {
          setSettings({ ...defaultSettings, ...(settingsData as Partial<WorkOrderNumberingSettings>) });
        }
      }
    } catch (error) {
      console.error('Error loading work order numbering settings:', error);
      toast({
        title: "Error",
        description: "Failed to load work order numbering settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!shopId) return;
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('company_settings')
        .upsert({
          shop_id: shopId,
          settings_key: 'work_order_numbering',
          settings_value: settings as any, // Type assertion for Json compatibility
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Work order numbering settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving work order numbering settings:', error);
      toast({
        title: "Error",
        description: "Failed to save work order numbering settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (key: keyof WorkOrderNumberingSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const generatePreview = () => {
    let preview = settings.custom_format;
    preview = preview.replace('{prefix}', settings.prefix);
    preview = preview.replace('{separator}', settings.separator);
    preview = preview.replace('{year}', settings.include_year ? new Date().getFullYear().toString() : '');
    preview = preview.replace('{month}', settings.include_month ? (new Date().getMonth() + 1).toString().padStart(2, '0') : '');
    preview = preview.replace('{number}', (settings.current_number + 1).toString().padStart(settings.number_length, '0'));
    return preview;
  };

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (shopError || !shopId) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Unable to load shop information</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Hash className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold">Work Order Numbering</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Number Format Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefix</Label>
              <Input
                id="prefix"
                value={settings.prefix}
                onChange={(e) => updateSettings('prefix', e.target.value)}
                placeholder="WO"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="separator">Separator</Label>
              <Select value={settings.separator} onValueChange={(value) => updateSettings('separator', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-">Dash (-)</SelectItem>
                  <SelectItem value="_">Underscore (_)</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value=".">Period (.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="current_number">Current Number</Label>
              <Input
                id="current_number"
                type="number"
                value={settings.current_number}
                onChange={(e) => updateSettings('current_number', parseInt(e.target.value) || 0)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="number_length">Number Length (with leading zeros)</Label>
              <Input
                id="number_length"
                type="number"
                min="1"
                max="10"
                value={settings.number_length}
                onChange={(e) => updateSettings('number_length', parseInt(e.target.value) || 4)}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include_year"
                checked={settings.include_year}
                onCheckedChange={(checked) => updateSettings('include_year', checked)}
              />
              <Label htmlFor="include_year">Include Year</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="include_month"
                checked={settings.include_month}
                onCheckedChange={(checked) => updateSettings('include_month', checked)}
              />
              <Label htmlFor="include_month">Include Month</Label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="custom_format">Custom Format</Label>
            <Input
              id="custom_format"
              value={settings.custom_format}
              onChange={(e) => updateSettings('custom_format', e.target.value)}
              placeholder="{prefix}{separator}{number}"
            />
            <p className="text-sm text-muted-foreground">
              Available placeholders: {'{prefix}'}, {'{separator}'}, {'{year}'}, {'{month}'}, {'{number}'}
            </p>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <Label className="text-sm font-medium">Preview</Label>
            <p className="text-lg font-mono mt-1">{generatePreview()}</p>
          </div>
          
          <Button onClick={saveSettings} disabled={saving} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
