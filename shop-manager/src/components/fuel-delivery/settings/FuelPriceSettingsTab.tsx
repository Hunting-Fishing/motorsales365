import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, MapPin, RefreshCw, Fuel } from 'lucide-react';
import { 
  useShopFuelPriceSettings, 
  useUpdateFuelPriceSettings, 
  useRefreshFuelPrices,
} from '@/hooks/fuel-delivery/useFuelMarketPrices';
import { FuelMarketPrices } from '../FuelMarketPrices';
import { CitySearchCombobox } from './CitySearchCombobox';

interface FuelPriceSettingsTabProps {
  shopId: string | undefined;
}

export function FuelPriceSettingsTab({ shopId }: FuelPriceSettingsTabProps) {
  const { data: settings, isLoading } = useShopFuelPriceSettings();
  const updateMutation = useUpdateFuelPriceSettings();
  const refreshMutation = useRefreshFuelPrices();

  const [referenceCity, setReferenceCity] = useState('Victoria');
  const [referenceProvince, setReferenceProvince] = useState('BC');
  const [customLocationLabel, setCustomLocationLabel] = useState('');
  const [showOnPortal, setShowOnPortal] = useState(true);

  // Load settings when fetched
  useEffect(() => {
    if (settings) {
      setReferenceCity(settings.reference_city);
      setReferenceProvince(settings.reference_province);
      setCustomLocationLabel(settings.custom_location_label || '');
      setShowOnPortal(settings.show_on_portal);
    }
  }, [settings]);

  const handleCityChange = (value: string) => {
    const [city, province] = value.split('|');
    setReferenceCity(city);
    setReferenceProvince(province);
  };

  const handleSave = () => {
    updateMutation.mutate({
      reference_city: referenceCity,
      reference_province: referenceProvince,
      custom_location_label: customLocationLabel || null,
      show_on_portal: showOnPortal,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-orange-500" />
            <CardTitle>Market Price Settings</CardTitle>
          </div>
          <CardDescription>
            Search and select your city from 500+ Canadian locations for accurate fuel market prices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Custom Location Label */}
          <div className="space-y-2">
            <Label>Your Service Area (Optional)</Label>
            <Input
              value={customLocationLabel}
              onChange={(e) => setCustomLocationLabel(e.target.value)}
              placeholder="e.g., Campbell River Area, Comox Valley, etc."
            />
            <p className="text-xs text-muted-foreground">
              This label will be shown to customers instead of the city name
            </p>
          </div>

          {/* Reference City Selection - Searchable Combobox */}
          <div className="space-y-2">
            <Label>Reference City for Pricing</Label>
            <CitySearchCombobox
              value={`${referenceCity}|${referenceProvince}`}
              onValueChange={handleCityChange}
              placeholder="Search for your city..."
            />
            <p className="text-xs text-muted-foreground">
              Search from 500+ Canadian cities. Type to filter by city or province name.
            </p>
          </div>

          {/* Currently Selected */}
          {referenceCity && referenceProvince && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <MapPin className="h-4 w-4 text-orange-500" />
              <span className="text-sm">
                Selected: <strong>{referenceCity}, {referenceProvince}</strong>
              </span>
            </div>
          )}

          {/* Show on Portal Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label>Show Fuel Prices on Customer Portal</Label>
              <p className="text-xs text-muted-foreground">
                Display current market prices to customers for transparency
              </p>
            </div>
            <Switch
              checked={showOnPortal}
              onCheckedChange={setShowOnPortal}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
            >
              {refreshMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Prices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">Price Preview</CardTitle>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>OpenStreetMap</span>
              </div>
              <span className="text-muted-foreground/60">•</span>
              <span>Updates every 6 hours</span>
            </div>
          </div>
          <CardDescription>
            This is how current fuel prices will appear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FuelMarketPrices showRefresh={false} />
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">About Fuel Price Data</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Fuel prices are based on regional market data for Canadian cities.
          </p>
          <p>
            <strong>500+ Cities Available:</strong> Search for your exact city or the nearest major center for accurate local pricing.
          </p>
          <p>
            <strong>Regional Accuracy:</strong> Prices account for provincial taxes, location remoteness, and local market conditions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
