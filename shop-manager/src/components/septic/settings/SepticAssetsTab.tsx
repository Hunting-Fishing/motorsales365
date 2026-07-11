
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, Wrench, Camera, Upload, ExternalLink, ImageIcon } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EQUIPMENT_CATEGORIES = [
  'Vehicle', 'Forklift', 'Skidsteer', 'Boom Truck', 'Telehandler',
  'Compactor', 'Pump', 'Jetter', 'Camera', 'Locator', 'Hose',
  'Trailer', 'Generator', 'Excavator', 'Other',
];

const STATUS_OPTIONS = ['available', 'in_use', 'maintenance', 'retired'];

const statusColor = (s: string) => {
  if (s === 'available' || s === 'active' || s === 'operational') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (s === 'in_use') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  if (s === 'maintenance') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
};

interface EquipmentForm {
  equipment_name: string;
  equipment_type: string;
  category: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  year: string;
  vin_number: string;
  plate_number: string;
  status: string;
  purchase_date: string;
  purchase_price: string;
  warranty_expiry: string;
  current_hours: string;
  current_mileage: string;
  notes: string;
}

const emptyForm: EquipmentForm = {
  equipment_name: '', equipment_type: '', category: '', manufacturer: '',
  model: '', serial_number: '', year: '', vin_number: '', plate_number: '',
  status: 'available', purchase_date: '', purchase_price: '', warranty_expiry: '',
  current_hours: '', current_mileage: '', notes: '',
};

export default function SepticAssetsTab() {
  const { shopId } = useShopId();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipmentForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: equipment = [], isLoading } = useQuery({
    queryKey: ['septic-equipment-assets', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_equipment')
        .select('*')
        .eq('shop_id', shopId)
        .order('equipment_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['septic-employees-for-assignment', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await supabase
        .from('septic_employees')
        .select('id, first_name, last_name')
        .eq('shop_id', shopId)
        .eq('status', 'active')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingId) {
        const { error } = await supabase.from('septic_equipment').update(payload as any).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('septic_equipment').insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-equipment-assets'] });
      toast.success(editingId ? 'Equipment updated' : 'Equipment added');
      closeDialog();
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('septic_equipment').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['septic-equipment-assets'] });
      toast.success('Equipment deleted');
      setDeleteConfirm(null);
    },
    onError: (e: any) => toast.error(e.message || 'Delete failed'),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setForm({
      equipment_name: item.equipment_name || '',
      equipment_type: item.equipment_type || '',
      category: item.category || '',
      manufacturer: item.manufacturer || '',
      model: item.model || '',
      serial_number: item.serial_number || '',
      year: item.year?.toString() || '',
      vin_number: item.vin_number || '',
      plate_number: item.plate_number || '',
      status: item.status || 'available',
      purchase_date: item.purchase_date || '',
      purchase_price: item.purchase_price?.toString() || '',
      warranty_expiry: item.warranty_expiry || '',
      current_hours: item.current_hours?.toString() || '',
      current_mileage: item.current_mileage?.toString() || '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.equipment_name.trim()) {
      toast.error('Equipment name is required');
      return;
    }
    if (!shopId) return;

    const payload: any = {
      shop_id: shopId,
      equipment_name: form.equipment_name.trim(),
      equipment_type: form.equipment_type || null,
      category: form.category || null,
      manufacturer: form.manufacturer || null,
      model: form.model || null,
      serial_number: form.serial_number || null,
      year: form.year ? parseInt(form.year) : null,
      vin_number: form.vin_number || null,
      plate_number: form.plate_number || null,
      status: form.status,
      purchase_date: form.purchase_date || null,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      warranty_expiry: form.warranty_expiry || null,
      current_hours: form.current_hours ? parseFloat(form.current_hours) : null,
      current_mileage: form.current_mileage ? parseFloat(form.current_mileage) : null,
      notes: form.notes || null,
    };

    saveMutation.mutate(payload);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, equipmentId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${shopId}/${equipmentId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('septic-equipment-photos').upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('septic-equipment-photos').getPublicUrl(path);
      const item = equipment.find((eq: any) => eq.id === equipmentId);
      const currentPhotos = Array.isArray((item as any)?.photos) ? (item as any).photos : [];
      const updatedPhotos = [...currentPhotos, urlData.publicUrl];

      // Set as profile image if first photo, otherwise add to gallery
      const updates: any = { photos: updatedPhotos };
      if (!(item as any)?.profile_image_url) {
        updates.profile_image_url = urlData.publicUrl;
      }

      const { error } = await supabase.from('septic_equipment').update(updates as any).eq('id', equipmentId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['septic-equipment-assets'] });
      toast.success('Photo uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleAddManual = async (equipmentId: string) => {
    if (!manualUrl.trim()) return;
    try {
      const item = equipment.find((eq: any) => eq.id === equipmentId);
      const currentManuals = Array.isArray((item as any)?.manual_urls) ? (item as any).manual_urls : [];
      const newManual = { label: manualLabel || 'Manual', url: manualUrl };
      const updated = [...currentManuals, newManual];

      const { error } = await supabase.from('septic_equipment').update({ manual_urls: updated } as any).eq('id', equipmentId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['septic-equipment-assets'] });
      setManualUrl('');
      setManualLabel('');
      toast.success('Manual linked');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add manual');
    }
  };

  const setField = (k: keyof EquipmentForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Company Equipment & Assets</h3>
          <p className="text-sm text-muted-foreground">Register vehicles, heavy equipment, tools, and all company assets</p>
        </div>
        <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Add Equipment
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : equipment.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No equipment registered yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first piece of equipment to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item: any) => {
            const emp = item.septic_employees as any;
            const photos = Array.isArray(item.photos) ? item.photos : [];
            const manuals = Array.isArray(item.manual_urls) ? item.manual_urls : [];

            return (
              <Card key={item.id} className="overflow-hidden">
                {/* Profile image */}
                <div className="relative h-40 bg-muted flex items-center justify-center">
                  {item.profile_image_url ? (
                    <img src={item.profile_image_url} alt={item.equipment_name} className="w-full h-full object-cover" />
                  ) : (
                    <Wrench className="h-16 w-16 text-muted-foreground/30" />
                  )}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {item.status && <Badge className={statusColor(item.status)}>{item.status}</Badge>}
                  </div>
                  <div className="absolute bottom-2 left-2">
                    {item.category && <Badge variant="secondary" className="text-xs">{item.category}</Badge>}
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">{item.equipment_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {[item.year, item.manufacturer, item.model].filter(Boolean).join(' ') || item.equipment_type || '—'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {item.serial_number && <p className="text-xs text-muted-foreground">S/N: {item.serial_number}</p>}
                  {item.vin_number && <p className="text-xs text-muted-foreground">VIN: {item.vin_number}</p>}
                  {item.plate_number && <p className="text-xs text-muted-foreground">Plate: {item.plate_number}</p>}

                  {(item.current_hours || item.current_mileage) && (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {item.current_hours && <span>{Number(item.current_hours).toLocaleString()} hrs</span>}
                      {item.current_mileage && <span>{Number(item.current_mileage).toLocaleString()} mi</span>}
                    </div>
                  )}

                  {emp && (
                    <Badge variant="outline" className="text-xs">
                      Assigned: {emp.first_name} {emp.last_name}
                    </Badge>
                  )}

                  {/* Photos section */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, item.id)} disabled={uploading} />
                      <div className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                        <Camera className="h-3.5 w-3.5" />
                        {uploading ? 'Uploading...' : `Photos (${photos.length})`}
                      </div>
                    </label>
                    {manuals.length > 0 && (
                      <span className="text-xs text-muted-foreground">• {manuals.length} manual(s)</span>
                    )}
                  </div>

                  {/* Manual links */}
                  {manuals.length > 0 && (
                    <div className="space-y-1">
                      {manuals.map((m: any, i: number) => (
                        <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                          <ExternalLink className="h-3 w-3" /> {m.label}
                        </a>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update equipment details' : 'Register a new piece of equipment or vehicle'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Equipment Name *</Label>
              <Input value={form.equipment_name} onChange={e => setField('equipment_name', e.target.value)} placeholder="e.g. 2024 Kenworth T880" />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setField('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Equipment Type</Label>
              <Input value={form.equipment_type} onChange={e => setField('equipment_type', e.target.value)} placeholder="e.g. Vacuum Truck" />
            </div>

            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input value={form.manufacturer} onChange={e => setField('manufacturer', e.target.value)} placeholder="e.g. Kenworth" />
            </div>

            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={form.model} onChange={e => setField('model', e.target.value)} placeholder="e.g. T880" />
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={e => setField('year', e.target.value)} placeholder="2024" />
            </div>

            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input value={form.serial_number} onChange={e => setField('serial_number', e.target.value)} placeholder="S/N" />
            </div>

            <div className="space-y-2">
              <Label>VIN</Label>
              <Input value={form.vin_number} onChange={e => setField('vin_number', e.target.value)} placeholder="Vehicle ID Number" />
            </div>

            <div className="space-y-2">
              <Label>Plate Number</Label>
              <Input value={form.plate_number} onChange={e => setField('plate_number', e.target.value)} placeholder="License plate" />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setField('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchase_date} onChange={e => setField('purchase_date', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Purchase Price ($)</Label>
              <Input type="number" step="0.01" value={form.purchase_price} onChange={e => setField('purchase_price', e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <Label>Warranty Expiry</Label>
              <Input type="date" value={form.warranty_expiry} onChange={e => setField('warranty_expiry', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Current Hours</Label>
              <Input type="number" value={form.current_hours} onChange={e => setField('current_hours', e.target.value)} placeholder="0" />
            </div>

            <div className="space-y-2">
              <Label>Current Mileage</Label>
              <Input type="number" value={form.current_mileage} onChange={e => setField('current_mileage', e.target.value)} placeholder="0" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Additional notes..." rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Update' : 'Add Equipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>This action cannot be undone. Are you sure you want to remove this equipment?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
