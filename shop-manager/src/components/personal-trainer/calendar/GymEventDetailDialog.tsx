import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GymEvent, EVENT_TYPE_CONFIG } from './GymEventCard';
import { format } from 'date-fns';
import { MapPin, Clock, Users, Tag, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Props {
  event: GymEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export function GymEventDetailDialog({ event, isOpen, onClose, onDeleted }: Props) {
  if (!event) return null;

  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.event;
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return;
    const { error } = await (supabase as any).from('pt_gym_events').delete().eq('id', event.id);
    if (error) {
      toast.error('Failed to delete event');
    } else {
      toast.success('Event deleted');
      onDeleted();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className={cn(config.bg, config.color, 'border', config.border)}>
              {config.label}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold mt-2">{event.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {event.all_day ? (
              <span>{format(start, 'EEEE, MMMM d, yyyy')} — All Day</span>
            ) : (
              <span>
                {format(start, 'EEE, MMM d')} · {format(start, 'h:mm a')} – {format(end, 'h:mm a')}
              </span>
            )}
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}

          {event.max_signups && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{event.current_signups} / {event.max_signups} spots filled</span>
            </div>
          )}

          {event.description && (
            <div className="pt-2 border-t border-border">
              <p className="text-sm text-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
