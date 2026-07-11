
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { securityService } from "@/services/settings/securityService";
import { SecuritySettings } from "@/types/settings";
import { useToast } from "@/components/ui/use-toast";
import { Shield, KeySquare, Clock, UserCheck2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SecurityAdvancedTab({ shopId }: { shopId?: string }) {
  const [settings, setSettings] = useState<SecuritySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [ipInput, setIpInput] = useState("");

  useEffect(() => {
    if (!shopId) return;
    
    const loadSettings = async () => {
      setLoading(true);
      const data = await securityService.getSecuritySettings(shopId);
      
      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        const defaultSettings = {
          shop_id: shopId,
          password_policy: {
            min_length: 8,
            require_numbers: true,
            require_special: true,
          },
          mfa_enabled: false,
          session_timeout_minutes: 60,
          ip_whitelist: []
        } as Partial<SecuritySettings>;
        
        const newSettings = await securityService.createSecuritySettings(defaultSettings);
        setSettings(newSettings);
      }
      
      setLoading(false);
    };
    
    loadSettings();
  }, [shopId]);

  const handlePolicyChange = (field: string, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      password_policy: {
        ...settings.password_policy,
        [field]: value
      }
    });
  };

  const handleChange = (field: string, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [field]: value
    });
  };

  const handleAddIP = () => {
    if (!settings || !ipInput) return;
    
    // Simple IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ipInput)) {
      toast({
        title: "Invalid IP Address",
        description: "Please enter a valid IPv4 address",
        variant: "destructive"
      });
      return;
    }
    
    setSettings({
      ...settings,
      ip_whitelist: [...settings.ip_whitelist, ipInput]
    });
    
    setIpInput("");
  };

  const handleRemoveIP = (ip: string) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      ip_whitelist: settings.ip_whitelist.filter(item => item !== ip)
    });
  };

  const handleSave = async () => {
    if (!settings || !shopId) return;
    
    setSaving(true);
    
    try {
      if (settings.id) {
        await securityService.updateSecuritySettings(settings.id, settings);
      } else {
        await securityService.createSecuritySettings({
          ...settings,
          shop_id: shopId
        });
      }
      
      toast({
        title: "Settings saved",
        description: "Your security settings have been updated"
      });
    } catch (error) {
      console.error("Error saving security settings:", error);
      toast({
        title: "Error",
        description: "Failed to save security settings",
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
            <KeySquare className="h-5 w-5" />
            Password Policy
          </CardTitle>
          <CardDescription>
            Set requirements for user passwords to enhance security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="min_length">Minimum Password Length</Label>
            <Select 
              value={settings?.password_policy.min_length?.toString() || "8"} 
              onValueChange={(value) => handlePolicyChange("min_length", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select minimum length" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 characters</SelectItem>
                <SelectItem value="8">8 characters</SelectItem>
                <SelectItem value="10">10 characters</SelectItem>
                <SelectItem value="12">12 characters</SelectItem>
                <SelectItem value="16">16 characters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_numbers">Require Numbers</Label>
              <p className="text-sm text-muted-foreground">
                Passwords must contain at least one number
              </p>
            </div>
            <Switch 
              id="require_numbers" 
              checked={settings?.password_policy.require_numbers || false}
              onCheckedChange={(checked) => handlePolicyChange("require_numbers", checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="require_special">Require Special Characters</Label>
              <p className="text-sm text-muted-foreground">
                Passwords must contain at least one special character
              </p>
            </div>
            <Switch 
              id="require_special" 
              checked={settings?.password_policy.require_special || false}
              onCheckedChange={(checked) => handlePolicyChange("require_special", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck2 className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Configure multi-factor authentication settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mfa_enabled">Require MFA for All Users</Label>
              <p className="text-sm text-muted-foreground">
                All users will be required to set up two-factor authentication
              </p>
            </div>
            <Switch 
              id="mfa_enabled" 
              checked={settings?.mfa_enabled || false}
              onCheckedChange={(checked) => handleChange("mfa_enabled", checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Settings
          </CardTitle>
          <CardDescription>
            Configure user session behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session_timeout">Session Timeout</Label>
            <Select 
              value={settings?.session_timeout_minutes?.toString() || "60"} 
              onValueChange={(value) => handleChange("session_timeout_minutes", parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select timeout duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
                <SelectItem value="1440">24 hours</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Users will be automatically logged out after this period of inactivity
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            IP Whitelist
          </CardTitle>
          <CardDescription>
            Restrict access to specific IP addresses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Enter IP address (e.g., 192.168.1.1)"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
            />
            <Button onClick={handleAddIP} type="button">Add</Button>
          </div>
          
          {settings?.ip_whitelist && settings.ip_whitelist.length > 0 ? (
            <div className="border rounded-md divide-y">
              {settings.ip_whitelist.map((ip, index) => (
                <div key={index} className="flex items-center justify-between p-3">
                  <span>{ip}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 h-8 px-2" 
                    onClick={() => handleRemoveIP(ip)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No IP addresses in whitelist. Add an IP to restrict access.
            </p>
          )}
          
          <p className="text-sm text-muted-foreground">
            Leave the whitelist empty to allow access from all IPs
          </p>
          
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
