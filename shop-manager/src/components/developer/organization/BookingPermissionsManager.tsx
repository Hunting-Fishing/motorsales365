
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface BookingPermission {
  id: string;
  shop_name: string;
  allow_online_booking: boolean;
  allow_customer_portal: boolean;
  require_approval: boolean;
}

export function BookingPermissionsManager() {
  const [permissions, setPermissions] = useState<BookingPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBookingPermissions();
  }, []);

  const loadBookingPermissions = async () => {
    try {
      setIsLoading(true);
      
      // Fetch shops and their booking settings from company_settings
      const { data: shops, error: shopsError } = await supabase
        .from('shops')
        .select('id, name');

      if (shopsError) throw shopsError;

      if (shops && shops.length > 0) {
        // Fetch booking permission settings for each shop
        const { data: settings, error: settingsError } = await supabase
          .from('company_settings')
          .select('shop_id, settings_key, settings_value')
          .in('shop_id', shops.map(s => s.id))
          .eq('settings_key', 'booking_permissions');

        if (settingsError) throw settingsError;

        const permissionsList: BookingPermission[] = shops.map(shop => {
          const shopSettings = settings?.find(s => s.shop_id === shop.id);
          const settingsData = (shopSettings?.settings_value as Record<string, unknown>) || {};
          
          return {
            id: shop.id,
            shop_name: shop.name,
            allow_online_booking: (settingsData.allow_online_booking as boolean) ?? true,
            allow_customer_portal: (settingsData.allow_customer_portal as boolean) ?? true,
            require_approval: (settingsData.require_approval as boolean) ?? false
          };
        });

        setPermissions(permissionsList);
      }
    } catch (error) {
      console.error('Error fetching booking permissions:', error);
      toast({
        title: "Error",
        description: "Failed to load booking permissions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePermission = async (shopId: string, field: string, value: boolean) => {
    try {
      // Get current settings first
      const { data: existing } = await supabase
        .from('company_settings')
        .select('settings_value')
        .eq('shop_id', shopId)
        .eq('settings_key', 'booking_permissions')
        .maybeSingle();

      const currentSettings = (existing?.settings_value as Record<string, unknown>) || {};
      const newSettings = JSON.parse(JSON.stringify({ ...currentSettings, [field]: value }));

      if (existing) {
        const { error } = await supabase
          .from('company_settings')
          .update({
            settings_value: newSettings,
            updated_at: new Date().toISOString()
          })
          .eq('shop_id', shopId)
          .eq('settings_key', 'booking_permissions');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert([{
            shop_id: shopId,
            settings_key: 'booking_permissions',
            settings_value: newSettings
          }]);
        if (error) throw error;
      }

      // Update local state
      setPermissions(prev => prev.map(p => 
        p.id === shopId ? { ...p, [field]: value } : p
      ));
      
      toast({
        title: "Success",
        description: "Booking permissions updated successfully",
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Failed to update booking permissions",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Booking Permissions</CardTitle>
          <CardDescription>Loading booking permissions...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Permissions</CardTitle>
        <CardDescription>
          Configure which shops can accept online bookings and customer portal access
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permissions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No shops configured yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Shops will appear here once they are set up in your organization
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {permissions.map((permission) => (
              <div key={permission.id} className="border border-border rounded-lg p-4">
                <h4 className="font-medium mb-4">{permission.shop_name}</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`online-booking-${permission.id}`}>
                      Allow Online Booking
                    </Label>
                    <Switch
                      id={`online-booking-${permission.id}`}
                      checked={permission.allow_online_booking}
                      onCheckedChange={(checked) =>
                        updatePermission(permission.id, 'allow_online_booking', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`customer-portal-${permission.id}`}>
                      Allow Customer Portal Access
                    </Label>
                    <Switch
                      id={`customer-portal-${permission.id}`}
                      checked={permission.allow_customer_portal}
                      onCheckedChange={(checked) =>
                        updatePermission(permission.id, 'allow_customer_portal', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`require-approval-${permission.id}`}>
                      Require Booking Approval
                    </Label>
                    <Switch
                      id={`require-approval-${permission.id}`}
                      checked={permission.require_approval}
                      onCheckedChange={(checked) =>
                        updatePermission(permission.id, 'require_approval', checked)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
