import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { toast } from 'sonner';
import { format } from 'date-fns';

const EVENT_TYPES = [
  { value: 'class', label: '🏋️ Class' },
  { value: 'signup', label: '📝 Signup Event' },
  { value: 'notification', label: '📢 Notification' },
  { value: 'closed_day', label: '🚫 Closed Day' },
  { value: 'health_concern', label: '⚠️ Health Concern' },
  { value: 'event', label: '🎉 Event' },
  { value: 'maintenance', label: '🔧 Maintenance' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultDate?: Date;
}

export function CreateGymEventDialog({ isOpen, onClose, onCreated, defaultDate }: Props) {
  const { shopId } = useShopId();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('event');
  const [startDate, setStartDate] = useState(defaultDate ? format(defaultDate, "yyyy-MM-dd'T'HH:mm") : '');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [maxSignups, setMaxSignups] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !startDate || !shopId) {
      toast.error('Please fill in title and start time');
      return;
    }

    setSaving(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const start = new Date(startDate).toISOString();
      const end = endDate ? new Date(endDate).toISOString() : new Date(new Date(startDate).getTime() + 3600000).toISOString();

      const { error } = await (supabase as any).from('pt_gym_events').insert({
        shop_id: shopId,
        title: title.trim(),
        description: description.trim() || null,
        start_time: start,
        end_time: end,
        all_day: allDay,
        event_type: eventType,
        location: location.trim() || null,
        max_signups: maxSignups ? parseInt(maxSignups) : null,
        created_by: user?.id,
      });

      if (error) throw error;
      toast.success('Event created!');
      onCreated();
      onClose();
      // Reset
      setTitle(''); setDescription(''); setEventType('event');
      setStartDate(''); setEndDate(''); setAllDay(false);
      setLocation(''); setMaxSignups('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Create Gym Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Morning Yoga Class" />
          </div>

          <div>
            <Label>Event Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={allDay} onCheckedChange={setAllDay} id="allday" />
            <Label htmlFor="allday">All Day</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start {allDay ? 'Date' : 'Date & Time'} *</Label>
              <Input
                type={allDay ? 'date' : 'datetime-local'}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>End {allDay ? 'Date' : 'Date & Time'}</Label>
              <Input
                type={allDay ? 'date' : 'datetime-local'}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Studio A, Main Floor" />
          </div>

          {(eventType === 'class' || eventType === 'signup' || eventType === 'event') && (
            <div>
              <Label>Max Signups (leave empty for unlimited)</Label>
              <Input type="number" min="1" value={maxSignups} onChange={e => setMaxSignups(e.target.value)} placeholder="e.g. 20" />
            </div>
          )}

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Event details..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Creating...' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
