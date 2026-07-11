
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { emailProviderService } from "@/services/settings/emailProviderService";
import { EmailProviderSettings } from "@/types/settings";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Send, Server, Key } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function EmailSettingsTab({ shopId }: { shopId?: string }) {
  const [settings, setSettings] = useState<EmailProviderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!shopId) return;
    
    const loadSettings = async () => {
      setLoading(true);
      const data = await emailProviderService.getEmailProviderSettings(shopId);
      
      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          shop_id: shopId,
          provider: "smtp",
          is_enabled: false
        } as Partial<EmailProviderSettings>;
        
        const newSettings = await emailProviderService.createEmailProviderSettings(defaultSettings);
        setSettings(newSettings);
      }
      
      setLoading(false);
    };
    
    loadSettings();
  }, [shopId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    
    // Handle number inputs
    if (type === 'number') {
      setSettings(prev => prev ? { ...prev, [id]: parseInt(value) } : null);
    } else {
      setSettings(prev => prev ? { ...prev, [id]: value } : null);
    }
  };

  const handleSelectChange = (field: string, value: string) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleToggleChange = (field: string, value: boolean) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = async () => {
    if (!settings || !shopId) return;
    
    setSaving(true);
    
    try {
      if (settings.id) {
        await emailProviderService.updateEmailProviderSettings(settings.id, settings);
      } else {
        await emailProviderService.createEmailProviderSettings({
          ...settings,
          shop_id: shopId
        });
      }
      
      toast({
        title: "Settings saved",
        description: "Your email settings have been updated"
      });
    } catch (error) {
      console.error("Error saving email settings:", error);
      toast({
        title: "Error",
        description: "Failed to save email settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings) return;
    
    setTesting(true);
    
    try {
      const success = await emailProviderService.testEmailConnection(settings);
      
      if (success) {
        toast({
          title: "Connection successful",
          description: "Your email settings are working correctly",
          variant: "success"
        });
      } else {
        toast({
          title: "Connection failed",
          description: "Failed to connect with the provided settings",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error testing email connection:", error);
      toast({
        title: "Error",
        description: "Failed to test email connection",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
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
            <Mail className="h-5 w-5" />
            Email Provider
          </CardTitle>
          <CardDescription>
            Configure your email service provider for sending notifications, reminders, and marketing emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Service</Label>
              <p className="text-sm text-muted-foreground">
                Turn on to enable email functionality
              </p>
            </div>
            <Switch 
              checked={settings?.is_enabled}
              onCheckedChange={(checked) => handleToggleChange("is_enabled", checked)}
            />
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-2">
            <Label htmlFor="provider">Email Provider</Label>
            <Select 
              value={settings?.provider || "smtp"} 
              onValueChange={(value) => handleSelectChange("provider", value)}
              disabled={!settings?.is_enabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smtp">SMTP</SelectItem>
                <SelectItem value="sendgrid">SendGrid</SelectItem>
                <SelectItem value="mailgun">Mailgun</SelectItem>
                <SelectItem value="ses">Amazon SES</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="from_email">From Email</Label>
            <Input
              id="from_email"
              placeholder="no-reply@yourcompany.com"
              value={settings?.from_email || ""}
              onChange={handleInputChange}
              disabled={!settings?.is_enabled}
            />
          </div>
          
          {settings?.provider === "smtp" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp_host">SMTP Host</Label>
                <Input
                  id="smtp_host"
                  placeholder="smtp.example.com"
                  value={settings?.smtp_host || ""}
                  onChange={handleInputChange}
                  disabled={!settings?.is_enabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtp_port">SMTP Port</Label>
                <Input
                  id="smtp_port"
                  type="number"
                  placeholder="587"
                  value={settings?.smtp_port || ""}
                  onChange={handleInputChange}
                  disabled={!settings?.is_enabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtp_username">SMTP Username</Label>
                <Input
                  id="smtp_username"
                  placeholder="username"
                  value={settings?.smtp_username || ""}
                  onChange={handleInputChange}
                  disabled={!settings?.is_enabled}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="smtp_password">SMTP Password</Label>
                <Input
                  id="smtp_password"
                  type="password"
                  placeholder="••••••••"
                  value={settings?.smtp_password || ""}
                  onChange={handleInputChange}
                  disabled={!settings?.is_enabled}
                />
              </div>
            </div>
          )}
          
          {(settings?.provider === "sendgrid" || settings?.provider === "mailgun" || settings?.provider === "ses" || settings?.provider === "other") && (
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="••••••••"
                value={settings?.api_key || ""}
                onChange={handleInputChange}
                disabled={!settings?.is_enabled}
              />
            </div>
          )}
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={testing || !settings?.is_enabled}
            >
              <Send className="mr-2 h-4 w-4" />
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            
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
