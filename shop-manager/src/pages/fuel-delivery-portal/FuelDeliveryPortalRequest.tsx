import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Loader2, Fuel, ArrowLeft, MapPin, CheckCircle, Send 
} from 'lucide-react';
import { format } from 'date-fns';

interface CustomerData {
  id: string;
  shop_id: string;
  company_name: string | null;
  contact_name: string;
  preferred_fuel_type: string | null;
}

interface Location {
  id: string;
  location_name: string;
  address: string;
}

export default function FuelDeliveryPortalRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    locationId: '',
    requestedDate: '',
    timeWindow: 'any',
    fuelType: '',
    estimatedGallons: '',
    urgency: 'normal',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      // Load customer data
      const { data: customerData, error: customerError } = await supabase
        .from('fuel_delivery_customers')
        .select('id, shop_id, company_name, contact_name, preferred_fuel_type')
        .eq('user_id', user.id)
        .single();

      if (customerError || !customerData) {
        navigate('/fuel-delivery-portal/login');
        return;
      }

      setCustomer(customerData);
      if (customerData.preferred_fuel_type) {
        setFormData(prev => ({ ...prev, fuelType: customerData.preferred_fuel_type }));
      }

      // Load customer's delivery locations
      const { data: locationsData } = await supabase
        .from('fuel_delivery_locations')
        .select('id, location_name, address')
        .eq('customer_id', customerData.id)
        .order('location_name');

      setLocations(locationsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('fuel_delivery_requests')
        .insert([{
          shop_id: customer.shop_id,
          customer_id: customer.id,
          location_id: formData.locationId || null,
          requested_date: formData.requestedDate || null,
          requested_time_window: formData.timeWindow,
          fuel_type: formData.fuelType || null,
          estimated_gallons: formData.estimatedGallons ? parseFloat(formData.estimatedGallons) : null,
          urgency: formData.urgency,
          notes: formData.notes || null,
          status: 'pending',
        }]);

      if (error) throw error;

      toast({
        title: "Request Submitted!",
        description: "Your delivery request has been sent. We'll contact you soon.",
      });

      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4">
        <Card className="w-full max-w-md shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">
              Request Submitted!
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your fuel delivery request has been received. We'll review it and contact you soon to confirm scheduling.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Link to="/fuel-delivery-portal/dashboard" className="w-full">
              <Button className="w-full bg-primary hover:bg-primary/90">
                Back to Dashboard
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setSubmitted(false)}
            >
              Submit Another Request
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/fuel-delivery-portal/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Fuel className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Request Delivery</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto shadow-xl bg-card/95 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Request Fuel Delivery</CardTitle>
            <CardDescription>
              Fill out the form below to request a fuel delivery. We'll contact you to confirm the schedule.
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Location Selection */}
              <div className="space-y-2">
                <Label>Delivery Location</Label>
                {locations.length > 0 ? (
                  <Select 
                    value={formData.locationId} 
                    onValueChange={(value) => setFormData({ ...formData, locationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.location_name} - {loc.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">No saved locations</p>
                    <Link to="/fuel-delivery-portal/locations">
                      <Button type="button" variant="outline" size="sm">
                        Add a Location
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* Preferred Date */}
              <div className="space-y-2">
                <Label htmlFor="requestedDate">Preferred Delivery Date</Label>
                <Input
                  id="requestedDate"
                  type="date"
                  value={formData.requestedDate}
                  onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
                <p className="text-xs text-muted-foreground">Leave blank for flexible scheduling</p>
              </div>

              {/* Time Window */}
              <div className="space-y-2">
                <Label>Preferred Time Window</Label>
                <RadioGroup 
                  value={formData.timeWindow}
                  onValueChange={(value) => setFormData({ ...formData, timeWindow: value })}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="morning" id="morning" />
                    <Label htmlFor="morning" className="cursor-pointer">Morning (8am-12pm)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="afternoon" id="afternoon" />
                    <Label htmlFor="afternoon" className="cursor-pointer">Afternoon (12pm-5pm)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="evening" id="evening" />
                    <Label htmlFor="evening" className="cursor-pointer">Evening (5pm-8pm)</Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="any" id="any" />
                    <Label htmlFor="any" className="cursor-pointer">Any Time</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Fuel Type */}
              <div className="space-y-2">
                <Label>Fuel Type</Label>
                <Select 
                  value={formData.fuelType} 
                  onValueChange={(value) => setFormData({ ...formData, fuelType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasoline_87">Gasoline 87</SelectItem>
                    <SelectItem value="gasoline_89">Gasoline 89</SelectItem>
                    <SelectItem value="gasoline_91">Gasoline 91</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="heating_oil">Heating Oil</SelectItem>
                    <SelectItem value="propane">Propane</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estimated Gallons */}
              <div className="space-y-2">
                <Label htmlFor="estimatedGallons">Estimated Gallons Needed</Label>
                <Input
                  id="estimatedGallons"
                  type="number"
                  placeholder="e.g., 100"
                  value={formData.estimatedGallons}
                  onChange={(e) => setFormData({ ...formData, estimatedGallons: e.target.value })}
                  min="1"
                />
              </div>

              {/* Urgency */}
              <div className="space-y-2">
                <Label>Urgency</Label>
                <RadioGroup 
                  value={formData.urgency}
                  onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="cursor-pointer">Normal</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="urgent" id="urgent" />
                    <Label htmlFor="urgent" className="cursor-pointer text-orange-600">Urgent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="emergency" id="emergency" />
                    <Label htmlFor="emergency" className="cursor-pointer text-red-600">Emergency</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions, gate codes, or comments..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex gap-3">
              <Link to="/fuel-delivery-portal/dashboard" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
