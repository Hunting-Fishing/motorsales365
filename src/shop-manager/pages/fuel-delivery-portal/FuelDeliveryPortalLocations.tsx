import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Loader2, Fuel, ArrowLeft, MapPin, Plus, Edit, Trash2, Save 
} from 'lucide-react';
import { geocodeAddress } from '@/utils/geocoding';

interface Location {
  id: string;
  location_name: string | null;
  address: string;
  tank_capacity_gallons: number | null;
  current_level_gallons: number | null;
  fuel_type: string | null;
  access_instructions: string | null;
  shop_id: string;
}

export default function FuelDeliveryPortalLocations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  
  const [formData, setFormData] = useState({
    locationName: '',
    address: '',
    tankSize: '',
    fuelType: '',
    deliveryInstructions: '',
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      // Get customer ID
      const { data: customer } = await supabase
        .from('fuel_delivery_customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!customer) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      setCustomerId(customer.id);

      // Load locations - get shop_id from customer first
      const { data: customerWithShop } = await supabase
        .from('fuel_delivery_customers')
        .select('shop_id')
        .eq('id', customer.id)
        .single();

      // Load locations
      const { data: locationsData, error } = await supabase
        .from('fuel_delivery_locations')
        .select('id, location_name, address, tank_capacity_gallons, current_level_gallons, fuel_type, access_instructions, shop_id')
        .eq('customer_id', customer.id)
        .order('location_name');

      if (error) throw error;
      setLocations(locationsData || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      locationName: '',
      address: '',
      tankSize: '',
      fuelType: '',
      deliveryInstructions: '',
    });
    setEditingLocation(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      locationName: location.location_name || '',
      address: location.address || '',
      tankSize: location.tank_capacity_gallons?.toString() || '',
      fuelType: location.fuel_type || '',
      deliveryInstructions: location.access_instructions || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!customerId || !formData.locationName.trim() || !formData.address.trim()) {
      toast({
        title: "Required Fields",
        description: "Please fill in location name and address",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      // Get the customer's shop_id first
      const { data: customerData } = await supabase
        .from('fuel_delivery_customers')
        .select('shop_id')
        .eq('id', customerId)
        .single();

      if (!customerData?.shop_id) {
        throw new Error('Could not find shop for customer');
      }

      // Geocode the address
      let latitude = null;
      let longitude = null;
      const geocodeResult = await geocodeAddress(formData.address);
      if (geocodeResult) {
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
      }

      const locationData = {
        shop_id: customerData.shop_id,
        customer_id: customerId,
        location_name: formData.locationName.trim(),
        address: formData.address.trim(),
        tank_capacity_gallons: formData.tankSize ? parseFloat(formData.tankSize) : null,
        fuel_type: formData.fuelType || null,
        access_instructions: formData.deliveryInstructions || null,
        latitude,
        longitude,
      };

      if (editingLocation) {
        // Update existing
        const { error } = await supabase
          .from('fuel_delivery_locations')
          .update(locationData)
          .eq('id', editingLocation.id);

        if (error) throw error;
        toast({ title: "Location Updated" });
      } else {
        // Create new
        const { error } = await supabase
          .from('fuel_delivery_locations')
          .insert([locationData]);

        if (error) throw error;
        toast({ title: "Location Added" });
      }

      setDialogOpen(false);
      resetForm();
      loadLocations();
    } catch (error: any) {
      console.error('Error saving location:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save location",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
      const { error } = await supabase
        .from('fuel_delivery_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      toast({ title: "Location Deleted" });
      loadLocations();
    } catch (error: any) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/fuel-delivery-portal/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Fuel className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">My Locations</span>
            </div>
          </div>
          <Button onClick={openAddDialog} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {locations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No delivery locations yet. Add your first location!
              </p>
              <Button onClick={openAddDialog} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {locations.map((location) => (
              <Card key={location.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{location.location_name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEditDialog(location)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(location.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{location.address}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {location.tank_capacity_gallons && (
                      <span className="bg-muted px-2 py-1 rounded">
                        Tank: {location.tank_capacity_gallons} gal
                      </span>
                    )}
                    {location.fuel_type && (
                      <span className="bg-muted px-2 py-1 rounded">
                        {location.fuel_type}
                      </span>
                    )}
                  </div>
                  {location.access_instructions && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      📝 {location.access_instructions}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Add New Location'}
            </DialogTitle>
            <DialogDescription>
              {editingLocation 
                ? 'Update the details for this delivery location.' 
                : 'Add a new delivery location for fuel deliveries.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="locationName">Location Name *</Label>
              <Input
                id="locationName"
                placeholder="e.g., Home, Office, Farm"
                value={formData.locationName}
                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                placeholder="123 Main St, City, State ZIP"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tankSize">Tank Size (gallons)</Label>
                <Input
                  id="tankSize"
                  type="number"
                  placeholder="e.g., 500"
                  value={formData.tankSize}
                  onChange={(e) => setFormData({ ...formData, tankSize: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuelType">Fuel Type</Label>
                <Input
                  id="fuelType"
                  placeholder="e.g., Diesel"
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
              <Textarea
                id="deliveryInstructions"
                placeholder="Gate codes, access notes, preferred times..."
                value={formData.deliveryInstructions}
                onChange={(e) => setFormData({ ...formData, deliveryInstructions: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingLocation ? 'Update' : 'Add'} Location
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
