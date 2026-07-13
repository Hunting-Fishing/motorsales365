import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Palette, Paintbrush, Eye, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ColorThemeManagerProps {
  onThemeUpdate: () => void;
}

export function ColorThemeManager({ onThemeUpdate }: ColorThemeManagerProps) {
  const [colors, setColors] = useState({
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#EC4899',
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadBrandingSettings();
  }, []);

  const loadBrandingSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) return;

      const { data: branding } = await supabase
        .from('branding_settings')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .single();

      if (branding) {
        setColors({
          primary: branding.primary_color || '#3B82F6',
          secondary: branding.secondary_color || '#10B981',
          accent: branding.accent_color || '#EC4899',
        });
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
    }
  };

  const saveBrandingSettings = async () => {
    try {
      setSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('Shop not found');

      const { error } = await supabase
        .from('branding_settings')
        .upsert({
          shop_id: profile.shop_id,
          primary_color: colors.primary,
          secondary_color: colors.secondary,
          accent_color: colors.accent,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Apply colors to CSS variables
      applyColorsToCSS();
      onThemeUpdate();

      toast({
        title: 'Success',
        description: 'Brand colors updated successfully',
      });
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save brand colors',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const applyColorsToCSS = () => {
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    root.style.setProperty('--primary', hexToHsl(colors.primary));
    root.style.setProperty('--secondary', hexToHsl(colors.secondary));
    root.style.setProperty('--accent', hexToHsl(colors.accent));
  };

  const resetToDefaults = () => {
    setColors({
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#EC4899',
    });
  };

  const previewColors = () => {
    applyColorsToCSS();
    toast({
      title: 'Preview Applied',
      description: 'Colors applied temporarily. Save to make permanent.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Brand Colors
        </CardTitle>
        <CardDescription>
          Customize your brand colors that will be applied throughout the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                id="primary-color"
                type="color"
                value={colors.primary}
                onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                className="w-16 h-10 p-1 rounded cursor-pointer"
              />
              <Input
                type="text"
                value={colors.primary}
                onChange={(e) => setColors(prev => ({ ...prev, primary: e.target.value }))}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Main brand color for buttons, links, and highlights
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary-color">Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                id="secondary-color"
                type="color"
                value={colors.secondary}
                onChange={(e) => setColors(prev => ({ ...prev, secondary: e.target.value }))}
                className="w-16 h-10 p-1 rounded cursor-pointer"
              />
              <Input
                type="text"
                value={colors.secondary}
                onChange={(e) => setColors(prev => ({ ...prev, secondary: e.target.value }))}
                placeholder="#10B981"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Supporting color for success states and complements
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accent-color">Accent Color</Label>
            <div className="flex gap-2">
              <Input
                id="accent-color"
                type="color"
                value={colors.accent}
                onChange={(e) => setColors(prev => ({ ...prev, accent: e.target.value }))}
                className="w-16 h-10 p-1 rounded cursor-pointer"
              />
              <Input
                type="text"
                value={colors.accent}
                onChange={(e) => setColors(prev => ({ ...prev, accent: e.target.value }))}
                placeholder="#EC4899"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Accent color for special elements and CTAs
            </p>
          </div>
        </div>

        {/* Color Preview */}
        <div className="space-y-4">
          <Label>Color Preview</Label>
          <div className="grid grid-cols-3 gap-4">
            <div 
              className="h-20 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: colors.primary }}
            >
              Primary
            </div>
            <div 
              className="h-20 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: colors.secondary }}
            >
              Secondary
            </div>
            <div 
              className="h-20 rounded-lg flex items-center justify-center text-white font-medium"
              style={{ backgroundColor: colors.accent }}
            >
              Accent
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={previewColors} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          
          <Button onClick={resetToDefaults} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <Button onClick={saveBrandingSettings} disabled={saving}>
            {saving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Paintbrush className="h-4 w-4 mr-2" />
                Save Colors
              </>
            )}
          </Button>
        </div>

        {/* Guidelines */}
        <div className="bg-amber-50 dark:bg-amber-950/50 p-4 rounded-lg">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
            Color Guidelines
          </h4>
          <ul className="text-sm text-amber-600 dark:text-amber-300 space-y-1">
            <li>• Ensure sufficient contrast for accessibility</li>
            <li>• Test colors in both light and dark themes</li>
            <li>• Primary color should align with your brand identity</li>
            <li>• Preview changes before saving to see the full effect</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}