import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin, Building, Users, Clock, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface BusinessLocation {
  id: string;
  shop_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_email?: string;
  is_headquarters: boolean;
  is_active: boolean;
  location_type: string;
  parent_location_id?: string;
  operating_status: string;
  square_footage?: number;
  employee_count?: number;
  specializations?: string[];
  timezone: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function LocationManagement() {
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<BusinessLocation | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    manager_name: '',
    manager_phone: '',
    manager_email: '',
    is_headquarters: false,
    is_active: true,
    location_type: 'branch',
    operating_status: 'operational',
    square_footage: '',
    employee_count: '',
    specializations: [] as string[],
    timezone: 'UTC',
    notes: '',
  });

  const locationTypes = [
    { value: 'headquarters', label: 'Headquarters' },
    { value: 'branch', label: 'Branch Office' },
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'service_center', label: 'Service Center' },
  ];

  const operatingStatuses = [
    { value: 'operational', label: 'Operational' },
    { value: 'temporarily_closed', label: 'Temporarily Closed' },
    { value: 'under_renovation', label: 'Under Renovation' },
  ];

  const commonSpecializations = [
    'oil_change', 'tire_service', 'brake_repair', 'engine_diagnostics', 
    'transmission', 'electrical', 'air_conditioning', 'body_work', 
    'detailing', 'towing', 'emergency_service', 'fleet_service'
  ];

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('Shop not found');

      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('is_headquarters', { ascending: false })
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load business locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
      manager_name: '',
      manager_phone: '',
      manager_email: '',
      is_headquarters: false,
      is_active: true,
      location_type: 'branch',
      operating_status: 'operational',
      square_footage: '',
      employee_count: '',
      specializations: [],
      timezone: 'UTC',
      notes: '',
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        toast({
          title: 'Error',
          description: 'Location name is required',
          variant: 'destructive',
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('Shop not found');

      const locationData = {
        shop_id: profile.shop_id,
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zip: formData.zip.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        manager_name: formData.manager_name.trim() || null,
        manager_phone: formData.manager_phone.trim() || null,
        manager_email: formData.manager_email.trim() || null,
        is_headquarters: formData.is_headquarters,
        is_active: formData.is_active,
        location_type: formData.location_type,
        operating_status: formData.operating_status,
        square_footage: formData.square_footage ? parseInt(formData.square_footage) : null,
        employee_count: formData.employee_count ? parseInt(formData.employee_count) : null,
        specializations: formData.specializations.length > 0 ? formData.specializations : null,
        timezone: formData.timezone,
        notes: formData.notes.trim() || null,
        created_by: user.id,
      };

      let error;
      
      if (editingLocation) {
        ({ error } = await supabase
          .from('business_locations')
          .update(locationData)
          .eq('id', editingLocation.id));
      } else {
        ({ error } = await supabase
          .from('business_locations')
          .insert(locationData));
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Location ${editingLocation ? 'updated' : 'created'} successfully`,
      });

      setShowAddDialog(false);
      setEditingLocation(null);
      resetForm();
      loadLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      toast({
        title: 'Error',
        description: `Failed to ${editingLocation ? 'update' : 'create'} location`,
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (location: BusinessLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      zip: location.zip || '',
      phone: location.phone || '',
      email: location.email || '',
      manager_name: location.manager_name || '',
      manager_phone: location.manager_phone || '',
      manager_email: location.manager_email || '',
      is_headquarters: location.is_headquarters,
      is_active: location.is_active,
      location_type: location.location_type,
      operating_status: location.operating_status,
      square_footage: location.square_footage?.toString() || '',
      employee_count: location.employee_count?.toString() || '',
      specializations: location.specializations || [],
      timezone: location.timezone,
      notes: location.notes || '',
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (locationId: string) => {
    try {
      const { error } = await supabase
        .from('business_locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });

      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete location',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-100 text-green-800';
      case 'temporarily_closed': return 'bg-yellow-100 text-yellow-800';
      case 'under_renovation': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'headquarters': return <Building className="h-4 w-4 text-blue-500" />;
      case 'branch': return <MapPin className="h-4 w-4 text-green-500" />;
      case 'warehouse': return <Building className="h-4 w-4 text-orange-500" />;
      case 'service_center': return <Users className="h-4 w-4 text-purple-500" />;
      default: return <MapPin className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Location Management</h1>
            <p className="text-muted-foreground">
              Manage multiple business locations and their operational details
            </p>
          </div>
        </div>

        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setEditingLocation(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </DialogTitle>
              <DialogDescription>
                {editingLocation 
                  ? 'Update the details for this business location'
                  : 'Create a new business location with operational details'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Basic Information</h3>
                
                <div>
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Main Office, Downtown Branch, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="location_type">Location Type</Label>
                  <Select value={formData.location_type} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, location_type: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locationTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_headquarters"
                    checked={formData.is_headquarters}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_headquarters: checked }))}
                  />
                  <Label htmlFor="is_headquarters">This is the headquarters location</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Location is active</Label>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="font-semibold">Address Information</h3>
                
                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="123 Business Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={formData.zip}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingLocation ? 'Update Location' : 'Create Location'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Locations Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="animate-spin">⏳</span> Loading locations...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <Card key={location.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(location.location_type)}
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(location)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(location.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {location.is_headquarters && (
                    <Badge variant="default" className="text-xs">Headquarters</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">{location.location_type}</Badge>
                  <Badge className={`text-xs ${getStatusColor(location.operating_status)}`}>
                    {location.operating_status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {(location.address || location.city) && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      {location.address && <div>{location.address}</div>}
                      {(location.city || location.state) && (
                        <div>{[location.city, location.state, location.zip].filter(Boolean).join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}

                {location.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{location.phone}</span>
                  </div>
                )}

                {location.manager_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Manager: {location.manager_name}</span>
                  </div>
                )}

                {location.employee_count && (
                  <div className="text-sm text-muted-foreground">
                    {location.employee_count} employees
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {locations.length === 0 && !loading && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No locations yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first business location to get started with multi-location management
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Location
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}