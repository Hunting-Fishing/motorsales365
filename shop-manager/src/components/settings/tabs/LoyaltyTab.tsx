
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loyaltySettingsService } from '@/services/settings/loyaltySettingsService';
import { useToast } from '@/hooks/use-toast';
import { LoyaltyTierManager } from '@/components/loyalty/LoyaltyTierManager';
import type { LoyaltyConfiguration } from '@/services/settings/loyaltySettingsService';

export function LoyaltyTab() {
  const { toast } = useToast();
  const [config, setConfig] = useState<LoyaltyConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      setError(null);
      const configuration = await loyaltySettingsService.getConfiguration();
      setConfig(configuration);
      setHasChanges(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load loyalty configuration';
      setError(errorMessage);
      console.error('Error loading loyalty configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !hasChanges) return;

    try {
      setSaving(true);
      setError(null);
      await loyaltySettingsService.updateConfiguration(config);
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Loyalty settings saved successfully",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save loyalty settings';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (updates: Partial<LoyaltyConfiguration>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
    setHasChanges(true);
  };

  useEffect(() => {
    loadConfiguration();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading loyalty settings...</span>
      </div>
    );
  }

  if (error && !config) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfiguration}
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!config) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No loyalty configuration found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Loyalty Program Settings</h2>
          <p className="text-muted-foreground">Configure your customer loyalty program</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Program Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="loyalty-enabled" className="text-base font-medium">
                Enable Loyalty Program
              </Label>
              <p className="text-sm text-muted-foreground">
                Turn on the customer loyalty program
              </p>
            </div>
            <Switch
              id="loyalty-enabled"
              checked={config.enabled}
              onCheckedChange={(enabled) => handleConfigChange({ enabled })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="points-per-dollar">Points per Dollar Spent</Label>
              <Input
                id="points-per-dollar"
                type="number"
                min="0"
                step="0.1"
                value={config.pointsPerDollar}
                onChange={(e) => 
                  handleConfigChange({ pointsPerDollar: parseFloat(e.target.value) || 0 })
                }
                disabled={!config.enabled}
              />
            </div>

            <div>
              <Label htmlFor="points-expiration">Points Expiration (Days)</Label>
              <Input
                id="points-expiration"
                type="number"
                min="1"
                value={config.pointsExpirationDays}
                onChange={(e) => 
                  handleConfigChange({ pointsExpirationDays: parseInt(e.target.value) || 365 })
                }
                disabled={!config.enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {config.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Loyalty Tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <LoyaltyTierManager
              tiers={config.tierTemplates}
              onTiersChange={(tierTemplates) => handleConfigChange({ tierTemplates })}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
