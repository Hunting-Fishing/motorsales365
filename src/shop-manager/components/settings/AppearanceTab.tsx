
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { appearanceService } from "@/services/settings/appearanceService";
import { AppearanceSettings } from "@/types/settings";
import { useToast } from "@/components/ui/use-toast";
import { Palette, Type, Brush } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AppearanceTab({ shopId }: { shopId?: string }) {
  const [settings, setSettings] = useState<AppearanceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, [shopId]);
  
  const loadSettings = async () => {
    setLoading(true);
    
    try {
      // Get current user's shop ID if not provided
      let currentShopId = shopId;
      if (!currentShopId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();
          
        currentShopId = profile?.shop_id;
      }
      
      if (!currentShopId) return;
      
      const data = await appearanceService.getAppearanceSettings(currentShopId);
      
      if (data) {
        setSettings(data);
      } else {
        // Default settings should already exist from the migration, but fallback just in case
        setSettings({
          shop_id: currentShopId,
          theme_mode: "light",
          font_family: "Inter",
          primary_color: "#0f172a",
          secondary_color: "#64748b",
          accent_color: "#3b82f6"
        } as AppearanceSettings);
      }
    } catch (error) {
      console.error('Error loading appearance settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setSettings(prev => prev ? { ...prev, [id]: value } : null);
  };

  const handleSelectChange = (field: keyof AppearanceSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    
    try {
      // Use settings.shop_id which was set during loading
      const result = await supabase
        .from('appearance_settings')
        .update({
          theme_mode: settings.theme_mode,
          font_family: settings.font_family,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          accent_color: settings.accent_color,
          updated_at: new Date().toISOString()
        })
        .eq('shop_id', settings.shop_id);
      
      if (result.error) {
        throw result.error;
      }
      
      // Apply theme immediately
      document.documentElement.style.setProperty('--primary', settings.primary_color);
      document.documentElement.style.setProperty('--secondary', settings.secondary_color);
      document.documentElement.style.setProperty('--accent', settings.accent_color);
      
      toast({
        title: "Settings saved",
        description: "Your appearance settings have been updated"
      });
    } catch (error) {
      console.error("Error saving appearance settings:", error);
      toast({
        title: "Error",
        description: "Failed to save appearance settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme_mode">Theme Mode</Label>
            <Select
              value={settings?.theme_mode || "light"}
              onValueChange={(value) => handleSelectChange("theme_mode", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select theme mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto (System)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="font_family">Font Family</Label>
            <Select
              value={settings?.font_family || "Inter"}
              onValueChange={(value) => handleSelectChange("font_family", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select font family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Montserrat">Montserrat</SelectItem>
                <SelectItem value="Lato">Lato</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Preview: <span className={`font-${settings?.font_family?.toLowerCase()}`}>The quick brown fox jumps over the lazy dog.</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brush className="h-5 w-5" />
            Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="primary_color"
                  type="color"
                  className="w-12 h-10 p-1"
                  value={settings?.primary_color || "#0f172a"}
                  onChange={handleInputChange}
                />
                <Input
                  id="primary_color"
                  type="text"
                  className="flex-1"
                  value={settings?.primary_color || "#0f172a"}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="secondary_color"
                  type="color"
                  className="w-12 h-10 p-1"
                  value={settings?.secondary_color || "#64748b"}
                  onChange={handleInputChange}
                />
                <Input
                  id="secondary_color"
                  type="text"
                  className="flex-1"
                  value={settings?.secondary_color || "#64748b"}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="accent_color"
                  type="color"
                  className="w-12 h-10 p-1"
                  value={settings?.accent_color || "#3b82f6"}
                  onChange={handleInputChange}
                />
                <Input
                  id="accent_color"
                  type="text"
                  className="flex-1"
                  value={settings?.accent_color || "#3b82f6"}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 border rounded-md">
            <h3 className="text-sm font-medium mb-2">Preview</h3>
            <div className="flex flex-col gap-2">
              <div className="h-8 rounded-md" style={{ backgroundColor: settings?.primary_color || "#0f172a" }}></div>
              <div className="h-8 rounded-md" style={{ backgroundColor: settings?.secondary_color || "#64748b" }}></div>
              <div className="h-8 rounded-md" style={{ backgroundColor: settings?.accent_color || "#3b82f6" }}></div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-esm-blue-600 hover:bg-esm-blue-700"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
