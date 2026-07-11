import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, User, MapPin, Settings, CalendarIcon, Search } from 'lucide-react';
import { useGeocode } from '@/hooks/useMapbox';
import { useDebounce } from '@/hooks/useDebounce';
import { MiniMapPreview } from '@/components/shared/MiniMapPreview';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SepticCustomerForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  property_type: string;
  bedrooms: number | null;
  property_size: string;
  system_type: string;
  last_pump_date: string;
  access_notes: string;
}

const initialForm: SepticCustomerForm = {
  first_name: '', last_name: '', email: '', phone: '',
  address: '', city: '', state: '', zip_code: '',
  latitude: null, longitude: null, notes: '',
  property_type: '', bedrooms: null, property_size: '',
  system_type: '', last_pump_date: '', access_notes: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (form: SepticCustomerForm) => void;
  isPending: boolean;
}

export function SepticAddCustomerDialog({ open, onOpenChange, onSave, isPending }: Props) {
  const [form, setForm] = useState<SepticCustomerForm>(initialForm);
  const [tab, setTab] = useState('contact');
  const [addressQuery, setAddressQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pumpDate, setPumpDate] = useState<Date | undefined>();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const debouncedAddress = useDebounce(addressQuery, 400);
  const geocode = useGeocode();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setTab('contact');
      setAddressQuery('');
      setSuggestions([]);
      setPumpDate(undefined);
    }
  }, [open]);

  // Geocode on debounced address change
  useEffect(() => {
    if (debouncedAddress.length < 3) {
      setSuggestions([]);
      return;
    }
    geocode.mutateAsync({ address: debouncedAddress }).then((results) => {
      setSuggestions(results || []);
      setShowSuggestions(true);
    }).catch(() => setSuggestions([]));
  }, [debouncedAddress]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = (suggestion: any) => {
    const ctx = suggestion.context || {};
    setForm(prev => ({
      ...prev,
      address: suggestion.placeName || suggestion.address || '',
      city: ctx.city || '',
      state: ctx.state || '',
      zip_code: ctx.postcode || '',
      latitude: suggestion.coordinates?.[1] ?? null,
      longitude: suggestion.coordinates?.[0] ?? null,
    }));
    setAddressQuery(suggestion.placeName || suggestion.address || '');
    setShowSuggestions(false);
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSave = () => {
    onSave({
      ...form,
      last_pump_date: pumpDate ? format(pumpDate, 'yyyy-MM-dd') : '',
    });
  };

  const set = (key: keyof SepticCustomerForm, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Add New Customer</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="contact" className="flex items-center gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" /> Contact
            </TabsTrigger>
            <TabsTrigger value="location" className="flex items-center gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" /> Property
            </TabsTrigger>
            <TabsTrigger value="septic" className="flex items-center gap-1.5 text-xs">
              <Settings className="h-3.5 w-3.5" /> Septic Info
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Contact Info */}
          <TabsContent value="contact" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Smith" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="General notes about the customer..." rows={3} />
            </div>
          </TabsContent>

          {/* Tab 2: Property & Location */}
          <TabsContent value="location" className="space-y-4">
            <div className="space-y-2 relative" ref={suggestionsRef}>
              <Label>Address</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={addressQuery}
                  onChange={(e) => {
                    setAddressQuery(e.target.value);
                    set('address', e.target.value);
                    setShowSuggestions(true);
                  }}
                  placeholder="Start typing an address..."
                  className="pl-10"
                />
                {geocode.isPending && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex items-start gap-2 border-b border-border/50 last:border-0"
                      onClick={() => selectSuggestion(s)}
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-foreground">{s.placeName || s.address}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="State" />
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input value={form.zip_code} onChange={(e) => set('zip_code', e.target.value)} placeholder="12345" />
              </div>
            </div>

            {form.latitude && form.longitude && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pin location on map (drag to adjust)</Label>
                <MiniMapPreview
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onLocationChange={handleLocationChange}
                  className="h-[200px]"
                  draggable
                />
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Septic Info */}
          <TabsContent value="septic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={form.property_type} onValueChange={(v) => set('property_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="municipal">Municipal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bedrooms</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.bedrooms ?? ''}
                  onChange={(e) => set('bedrooms', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="e.g. 3"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Size</Label>
                <Input value={form.property_size} onChange={(e) => set('property_size', e.target.value)} placeholder="e.g. 2 acres" />
              </div>
              <div className="space-y-2">
                <Label>Known System Type</Label>
                <Select value={form.system_type} onValueChange={(v) => set('system_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select system" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conventional">Conventional</SelectItem>
                    <SelectItem value="mound">Mound</SelectItem>
                    <SelectItem value="aerobic">Aerobic</SelectItem>
                    <SelectItem value="chamber">Chamber</SelectItem>
                    <SelectItem value="drip">Drip Distribution</SelectItem>
                    <SelectItem value="sand_filter">Sand Filter</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Last Pump Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !pumpDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pumpDate ? format(pumpDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={pumpDate}
                    onSelect={setPumpDate}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Access Notes</Label>
              <Textarea
                value={form.access_notes}
                onChange={(e) => set('access_notes', e.target.value)}
                placeholder="Gate codes, key locations, access instructions..."
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!form.first_name || !form.last_name || isPending}
            className="bg-gradient-to-r from-emerald-600 to-teal-700"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
