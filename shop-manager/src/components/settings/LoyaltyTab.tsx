
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";
import { LoyaltyTierCard } from "./loyalty/LoyaltyTierCard";
import { LoyaltyTierForm } from "./loyalty/LoyaltyTierForm";
import { getLoyaltySettings, updateLoyaltySettings, toggleLoyaltyProgramEnabled } from "@/services/loyalty";
import { getShopTiers } from "@/services/loyalty/tierService";
import { LoyaltySettings, LoyaltyTier } from "@/types/loyalty";
import { useShopId } from "@/hooks/useShopId";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function LoyaltyTab() {
  const { shopId } = useShopId();
  const [activeTab, setActiveTab] = useState("settings");
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<LoyaltySettings | null>(null);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [isAddingTier, setIsAddingTier] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings and tiers
  useEffect(() => {
    const loadLoyaltyData = async () => {
      if (!shopId) return;
      
      setIsLoading(true);
      try {
        // Load loyalty settings
        const settingsData = await getLoyaltySettings(shopId);
        setSettings(settingsData);
        
        // Load tiers
        const tiersData = await getShopTiers(shopId);
        setTiers(tiersData);
      } catch (error) {
        console.error('Error loading loyalty data:', error);
        toast.error('Failed to load loyalty program data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLoyaltyData();
  }, [shopId]);

  // Handle settings save
  const handleSaveSettings = async () => {
    if (!settings || !shopId) return;
    
    setIsSaving(true);
    try {
      await updateLoyaltySettings(settings);
      toast.success('Loyalty settings saved successfully');
    } catch (error) {
      console.error('Error saving loyalty settings:', error);
      toast.error('Failed to save loyalty settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle toggle loyalty program
  const handleToggleLoyalty = async (enabled: boolean) => {
    if (!settings || !shopId) return;
    
    setIsSaving(true);
    try {
      await toggleLoyaltyProgramEnabled(settings.id, enabled);
      setSettings({
        ...settings,
        is_enabled: enabled
      });
      toast.success(enabled ? 'Loyalty program enabled' : 'Loyalty program disabled');
    } catch (error) {
      console.error('Error toggling loyalty program:', error);
      toast.error('Failed to update loyalty program status');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle input changes for settings
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!settings) return;
    
    setSettings({
      ...settings,
      [name]: name === 'points_per_dollar' || name === 'points_expiration_days' 
        ? Number(value) 
        : value
    });
  };

  // Handle adding a new tier
  const handleAddTier = async (tier: LoyaltyTier) => {
    if (!shopId) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .insert({
          name: tier.name,
          threshold: tier.threshold,
          benefits: tier.benefits || '',
          multiplier: tier.multiplier,
          color: tier.color,
          shop_id: shopId
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setTiers([...tiers, data]);
      toast.success(`${tier.name} tier created successfully`);
      setIsAddingTier(false);
    } catch (error) {
      console.error('Error adding loyalty tier:', error);
      toast.error('Failed to create loyalty tier');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle updating a tier
  const handleUpdateTier = async (tier: LoyaltyTier) => {
    if (!shopId || !tier.id) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .update({
          name: tier.name,
          threshold: tier.threshold,
          benefits: tier.benefits,
          multiplier: tier.multiplier,
          color: tier.color
        })
        .eq('id', tier.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setTiers(tiers.map(t => t.id === tier.id ? data : t));
      toast.success(`${tier.name} tier updated successfully`);
      setEditingTier(null);
    } catch (error) {
      console.error('Error updating loyalty tier:', error);
      toast.error('Failed to update loyalty tier');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle deleting a tier
  const handleDeleteTier = async (tier: LoyaltyTier) => {
    if (!tier.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('loyalty_tiers')
        .delete()
        .eq('id', tier.id);
        
      if (error) throw error;
      
      setTiers(tiers.filter(t => t.id !== tier.id));
      toast.success(`${tier.name} tier deleted`);
    } catch (error) {
      console.error('Error deleting loyalty tier:', error);
      toast.error('Failed to delete loyalty tier');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit tier
  const handleEditTier = (tier: LoyaltyTier) => {
    setEditingTier(tier);
    setIsAddingTier(false);
  };

  // Cancel edit/add
  const handleCancelEdit = () => {
    setEditingTier(null);
    setIsAddingTier(false);
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // No settings found
  if (!settings) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load loyalty program settings. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">Program Settings</TabsTrigger>
          <TabsTrigger value="tiers">Loyalty Tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Program Settings</CardTitle>
              <CardDescription>
                Configure your shop's loyalty program settings and parameters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="loyaltyEnabled">Enable Loyalty Program</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on to allow customers to earn and redeem loyalty points
                  </p>
                </div>
                <Switch
                  id="loyaltyEnabled"
                  checked={settings.is_enabled}
                  onCheckedChange={handleToggleLoyalty}
                  disabled={isSaving}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="points_per_dollar">Points Per Dollar</Label>
                <Input
                  id="points_per_dollar"
                  name="points_per_dollar"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={settings.points_per_dollar}
                  onChange={handleInputChange}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  How many loyalty points customers earn per dollar spent
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="points_expiration_days">Points Expiration (Days)</Label>
                <Input
                  id="points_expiration_days"
                  name="points_expiration_days"
                  type="number"
                  min="0"
                  value={settings.points_expiration_days}
                  onChange={handleInputChange}
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground">
                  Number of days until points expire (0 for no expiration)
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-esm-blue-600 hover:bg-esm-blue-700"
                >
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Loyalty Tiers</h3>
            <Button 
              onClick={() => { setIsAddingTier(true); setEditingTier(null); }}
              disabled={isAddingTier || !!editingTier}
              className="bg-esm-blue-600 hover:bg-esm-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Tier
            </Button>
          </div>
          
          {/* Add Tier Form */}
          {isAddingTier && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <LoyaltyTierForm 
                  onSave={handleAddTier}
                  onCancel={handleCancelEdit}
                />
              </CardContent>
            </Card>
          )}
          
          {/* Edit Tier Form */}
          {editingTier && (
            <Card>
              <CardHeader>
                <CardTitle>Edit {editingTier.name} Tier</CardTitle>
              </CardHeader>
              <CardContent>
                <LoyaltyTierForm 
                  tier={editingTier}
                  onSave={handleUpdateTier}
                  onCancel={handleCancelEdit}
                />
              </CardContent>
            </Card>
          )}
          
          {/* List of Tiers */}
          <div className="space-y-3">
            {tiers.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  No loyalty tiers defined yet. Create your first tier to get started.
                </CardContent>
              </Card>
            ) : (
              tiers
                .sort((a, b) => a.threshold - b.threshold)
                .map(tier => (
                  <LoyaltyTierCard
                    key={tier.id}
                    tier={tier}
                    onEdit={() => handleEditTier(tier)}
                    onDelete={() => handleDeleteTier(tier)}
                  />
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
