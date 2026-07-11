import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Upload, Loader2 } from 'lucide-react';
import { useGunsmithFirearm, useUpdateGunsmithFirearm, uploadGunsmithDocument } from '@/hooks/useGunsmith';
import { useToast } from '@/hooks/use-toast';

export default function GunsmithFirearmEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: firearm, isLoading } = useGunsmithFirearm(id || '');
  const updateFirearm = useUpdateGunsmithFirearm();
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    make: '',
    model: '',
    serial_number: '',
    caliber: '',
    firearm_type: 'rifle',
    classification: 'non-restricted',
    barrel_length: '',
    registration_number: '',
    condition: 'good',
    notes: '',
    photo_url: ''
  });

  useEffect(() => {
    if (firearm) {
      setForm({
        make: firearm.make || '',
        model: firearm.model || '',
        serial_number: firearm.serial_number || '',
        caliber: firearm.caliber || '',
        firearm_type: firearm.firearm_type || 'rifle',
        classification: firearm.classification || 'non-restricted',
        barrel_length: firearm.barrel_length?.toString() || '',
        registration_number: firearm.registration_number || '',
        condition: firearm.condition || 'good',
        notes: firearm.notes || '',
        photo_url: firearm.photo_url || ''
      });
    }
  }, [firearm]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadGunsmithDocument(file, 'firearms');
      setForm(prev => ({ ...prev, photo_url: url }));
      toast({ title: 'Photo uploaded' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    updateFirearm.mutate({
      id,
      ...form,
      barrel_length: form.barrel_length ? parseFloat(form.barrel_length) : undefined
    }, {
      onSuccess: () => navigate('/gunsmith/firearms')
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!firearm) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Firearm not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/firearms')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Firearm</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Firearm Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-4">
                {form.photo_url && (
                  <img src={form.photo_url} alt="Firearm" className="h-24 w-24 object-cover rounded-lg" />
                )}
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  value={form.make}
                  onChange={e => setForm(prev => ({ ...prev, make: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={form.model}
                  onChange={e => setForm(prev => ({ ...prev, model: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={form.serial_number}
                  onChange={e => setForm(prev => ({ ...prev, serial_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caliber">Caliber</Label>
                <Input
                  id="caliber"
                  value={form.caliber}
                  onChange={e => setForm(prev => ({ ...prev, caliber: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Firearm Type</Label>
                <Select value={form.firearm_type} onValueChange={v => setForm(prev => ({ ...prev, firearm_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rifle">Rifle</SelectItem>
                    <SelectItem value="shotgun">Shotgun</SelectItem>
                    <SelectItem value="handgun">Handgun</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classification (Canadian)</Label>
                <Select value={form.classification} onValueChange={v => setForm(prev => ({ ...prev, classification: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non-restricted">Non-Restricted</SelectItem>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="prohibited">Prohibited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barrel_length">Barrel Length (inches)</Label>
                <Input
                  id="barrel_length"
                  type="number"
                  step="0.1"
                  value={form.barrel_length}
                  onChange={e => setForm(prev => ({ ...prev, barrel_length: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input
                  id="registration_number"
                  value={form.registration_number}
                  onChange={e => setForm(prev => ({ ...prev, registration_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={v => setForm(prev => ({ ...prev, condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/gunsmith/firearms')}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateFirearm.isPending}>
                {updateFirearm.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
