
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useShopId } from "@/hooks/useShopId";

interface PortalSettings {
  enabled: boolean;
  custom_domain: string;
  branding_enabled: boolean;
  allow_document_upload: boolean;
  allow_payment_methods: boolean;
  welcome_message: string;
}

export function CustomerPortalAccess() {
  const [settings, setSettings] = useState<PortalSettings>({
    enabled: true,
    custom_domain: '',
    branding_enabled: true,
    allow_document_upload: true,
    allow_payment_methods: true,
    welcome_message: 'Welcome to our customer portal! Here you can manage your appointments, view service history, and more.'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { shopId } = useShopId();

  const portalUrl = settings.custom_domain || `${window.location.origin}/customer-portal`;

  useEffect(() => {
    if (shopId) {
      loadSettings();
    }
  }, [shopId]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const contactInfo = data.contact_info as Record<string, unknown> || {};
        setSettings({
          enabled: data.is_public ?? true,
          custom_domain: (contactInfo.custom_domain as string) || '',
          branding_enabled: data.logo_url !== null,
          allow_document_upload: data.application_forms_enabled ?? true,
          allow_payment_methods: data.gallery_enabled ?? true,
          welcome_message: data.description || ''
        });
      }
    } catch (error) {
      console.error('Error loading portal settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!shopId) return;
    
    try {
      setIsSaving(true);
      
      // Check if record exists
      const { data: existing } = await supabase
        .from('portal_settings')
        .select('id')
        .eq('shop_id', shopId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('portal_settings')
          .update({
            is_public: settings.enabled,
            description: settings.welcome_message,
            application_forms_enabled: settings.allow_document_upload,
            gallery_enabled: settings.allow_payment_methods,
            contact_info: { custom_domain: settings.custom_domain },
            updated_at: new Date().toISOString()
          })
          .eq('shop_id', shopId);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('portal_settings')
          .insert([{
            shop_id: shopId,
            organization_name: 'Customer Portal',
            is_public: settings.enabled,
            description: settings.welcome_message,
            application_forms_enabled: settings.allow_document_upload,
            gallery_enabled: settings.allow_payment_methods,
            contact_info: JSON.parse(JSON.stringify({ custom_domain: settings.custom_domain }))
          }]);
        if (error) throw error;
      }
      
      toast({
        title: "Success",
        description: "Customer portal settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving portal settings:', error);
      toast({
        title: "Error",
        description: "Failed to save portal settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyPortalUrl = () => {
    navigator.clipboard.writeText(portalUrl);
    toast({
      title: "Copied",
      description: "Portal URL copied to clipboard",
    });
  };

  const openPortal = () => {
    window.open(portalUrl, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Portal Access</CardTitle>
          <CardDescription>
            Configure your customer portal settings and access controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Portal URL */}
          <div className="space-y-2">
            <Label>Portal URL</Label>
            <div className="flex items-center space-x-2">
              <Input 
                value={portalUrl} 
                readOnly 
                className="flex-1 bg-muted"
              />
              <Button variant="outline" size="sm" onClick={copyPortalUrl}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={openPortal}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="portal-enabled">Enable Customer Portal</Label>
                <p className="text-sm text-muted-foreground">Allow customers to access the portal</p>
              </div>
              <Switch
                id="portal-enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="branding-enabled">Custom Branding</Label>
                <p className="text-sm text-muted-foreground">Apply your shop's branding to the portal</p>
              </div>
              <Switch
                id="branding-enabled"
                checked={settings.branding_enabled}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, branding_enabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="document-upload">Document Upload</Label>
                <p className="text-sm text-muted-foreground">Allow customers to upload documents</p>
              </div>
              <Switch
                id="document-upload"
                checked={settings.allow_document_upload}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, allow_document_upload: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="payment-methods">Payment Methods</Label>
                <p className="text-sm text-muted-foreground">Allow customers to save payment methods</p>
              </div>
              <Switch
                id="payment-methods"
                checked={settings.allow_payment_methods}
                onCheckedChange={(checked) =>
                  setSettings(prev => ({ ...prev, allow_payment_methods: checked }))
                }
              />
            </div>
          </div>

          {/* Custom Domain */}
          <div className="space-y-2">
            <Label htmlFor="custom-domain">Custom Domain (Optional)</Label>
            <Input
              id="custom-domain"
              placeholder="portal.yourshop.com"
              value={settings.custom_domain}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, custom_domain: e.target.value }))
              }
            />
            <p className="text-sm text-muted-foreground">
              Use your own domain for the customer portal
            </p>
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label htmlFor="welcome-message">Welcome Message</Label>
            <Textarea
              id="welcome-message"
              placeholder="Enter a welcome message for your customers"
              value={settings.welcome_message}
              onChange={(e) =>
                setSettings(prev => ({ ...prev, welcome_message: e.target.value }))
              }
              rows={3}
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
