import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EquipmentManual } from '@/types/manual';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FileText, Link as LinkIcon, Search } from 'lucide-react';

interface LinkManualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentName: string;
  onSuccess: () => void;
}

export function LinkManualDialog({
  open,
  onOpenChange,
  equipmentId,
  equipmentName,
  onSuccess,
}: LinkManualDialogProps) {
  const [manuals, setManuals] = useState<EquipmentManual[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedManual, setSelectedManual] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const fetchManuals = async () => {
    setLoading(true);
    try {
      // Get all manuals
      const { data: allManuals, error: manualsError } = await supabase
        .from('equipment_manuals')
        .select('*')
        .order('title');

      if (manualsError) throw manualsError;

      // Get already linked manuals for this equipment
      const { data: linkedManuals, error: linksError } = await supabase
        .from('equipment_manual_links')
        .select('manual_id')
        .eq('equipment_id', equipmentId);

      if (linksError) throw linksError;

      const linkedIds = new Set(linkedManuals?.map(l => l.manual_id) || []);
      const availableManuals = allManuals?.filter(m => !linkedIds.has(m.id)) || [];
      
      setManuals(availableManuals);
    } catch (error) {
      console.error('Error fetching manuals:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load available manuals',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchManuals();
      setSelectedManual(null);
      setNotes('');
      setSearchTerm('');
    }
  }, [open, equipmentId]);

  const handleLink = async () => {
    if (!selectedManual) return;

    setLinking(true);
    try {
      const { error } = await supabase
        .from('equipment_manual_links')
        .insert({
          equipment_id: equipmentId,
          manual_id: selectedManual,
          notes: notes || null,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Manual linked to equipment',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error linking manual:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to link manual',
      });
    } finally {
      setLinking(false);
    }
  };

  const filteredManuals = manuals.filter(manual => {
    const search = searchTerm.toLowerCase();
    return (
      manual.title.toLowerCase().includes(search) ||
      manual.manufacturer?.toLowerCase().includes(search) ||
      manual.model?.toLowerCase().includes(search) ||
      manual.document_number?.toLowerCase().includes(search)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Link Manual to {equipmentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div>
            <Label htmlFor="search">Search Manuals</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, manufacturer, model, or document number..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading manuals...</div>
            ) : filteredManuals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No available manuals found. Upload a new manual first.
              </div>
            ) : (
              filteredManuals.map((manual) => (
                <Card
                  key={manual.id}
                  className={`p-3 cursor-pointer transition-colors ${
                    selectedManual === manual.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedManual(manual.id)}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{manual.title}</h4>
                        {manual.manual_type && (
                          <Badge variant="secondary" className="shrink-0">
                            {manual.manual_type}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {manual.manufacturer && <span>Mfg: {manual.manufacturer}</span>}
                        {manual.model && <span>Model: {manual.model}</span>}
                        {manual.document_number && <span>Doc #: {manual.document_number}</span>}
                        {manual.version && <span>Ver: {manual.version}</span>}
                      </div>
                      {manual.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {manual.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {selectedManual && (
            <div>
              <Label htmlFor="notes">Link Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about why this manual applies to this equipment..."
                rows={2}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleLink} disabled={!selectedManual || linking}>
              {linking ? 'Linking...' : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Manual
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
