
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Upload, PaintBucket } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BrandingActions } from "./branding/BrandingActions";
import { ColorsTab } from "./branding/ColorsTab";
import { LogoTab } from "./branding/LogoTab";
import { ThemeTab } from "./branding/ThemeTab";
import { useShopName } from "@/hooks/useShopName";
import { useShopData } from "@/hooks/useShopData";

// Default branding colors
const defaultColors = {
  primary: "#3a6dfc",
  secondary: "#1F45FC",
  accent: "#8eb9ff",
  text: "#141c59",
  background: "#ffffff"
};

export function BrandingTab() {
  const { shopName, updateShopName, loading: shopNameLoading } = useShopName();
  const { shopData } = useShopData();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [colors, setColors] = useState(defaultColors);
  const [brandingSettings, setBrandingSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load existing branding settings
  useEffect(() => {
    if (shopData?.id) {
      loadBrandingSettings();
    }
  }, [shopData?.id]);

  const loadBrandingSettings = async () => {
    if (!shopData?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('branding_settings')
        .select('*')
        .eq('shop_id', shopData.id)
        .single();

      if (data) {
        setBrandingSettings(data);
        setColors({
          primary: data.primary_color || defaultColors.primary,
          secondary: data.secondary_color || defaultColors.secondary,
          accent: data.accent_color || defaultColors.accent,
          text: defaultColors.text,
          background: defaultColors.background
        });
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (error) {
      console.error('Error loading branding settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (colorKey: string, value: string) => {
    setColors(prev => ({
      ...prev,
      [colorKey]: value
    }));
  };

  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    // Update immediately for better UX, save happens on blur or save action
    updateShopName(newName);
  };

  const handleReset = () => {
    setColors(defaultColors);
    setLogoPreview(null);
    setLogoFile(null);
    // We no longer manage theme state here
    // setTheme("light");
    
    toast({
      title: "Branding reset",
      description: "All branding settings have been reset to default values"
    });
  };

  const handleSave = async () => {
    if (!shopData?.id) {
      toast({
        title: "Error",
        description: "Shop ID not found",
        variant: "destructive"
      });
      return;
    }

    try {
      let logoUrl = brandingSettings?.logo_url;
      
      // Upload logo if file is selected
      if (logoFile) {
        const fileName = `logo-${Date.now()}.${logoFile.name.split('.').pop()}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile);
          
        if (uploadError) {
          toast({
            title: "Upload failed",
            description: uploadError.message,
            variant: "destructive"
          });
          return;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(uploadData.path);
          
        logoUrl = publicUrl;
      }
      
      // Save branding settings to database using the actual shop_id
      const { error } = await supabase
        .from('branding_settings')
        .update({
          primary_color: colors.primary,
          secondary_color: colors.secondary,
          accent_color: colors.accent,
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('shop_id', shopData.id);
        
      if (error) {
        toast({
          title: "Save failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      // Update local state
      setBrandingSettings(prev => ({
        ...prev,
        primary_color: colors.primary,
        secondary_color: colors.secondary,
        accent_color: colors.accent,
        logo_url: logoUrl
      }));
      
      // Apply colors to CSS variables for immediate UI feedback
      document.documentElement.style.setProperty('--primary', colors.primary);
      document.documentElement.style.setProperty('--secondary', colors.secondary);
      document.documentElement.style.setProperty('--accent', colors.accent);
      
      toast({
        title: "Branding updated",
        description: "Your branding settings have been saved and applied"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save branding settings",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BrandingActions onReset={handleReset} onSave={handleSave} />

      <Tabs defaultValue="colors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Colors</span>
          </TabsTrigger>
          <TabsTrigger value="logo" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Logo</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <PaintBucket className="h-4 w-4" />
            <span>Theme</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-4">
          <ColorsTab colors={colors} onColorChange={handleColorChange} />
        </TabsContent>

        <TabsContent value="logo" className="space-y-4">
          <LogoTab 
            logoPreview={logoPreview}
            companyName={shopName}
            onLogoChange={handleLogoChange}
            onCompanyNameChange={handleCompanyNameChange}
            loading={shopNameLoading}
          />
        </TabsContent>

        <TabsContent value="theme" className="space-y-4">
          {/* Remove theme and setTheme props */}
          <ThemeTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
