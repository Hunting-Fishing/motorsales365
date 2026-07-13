import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentManual, EquipmentManualLink } from '@/types/manual';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { FileText, Link as LinkIcon, Download, Trash2, Plus } from 'lucide-react';
import { UploadManualDialog } from './UploadManualDialog';
import { LinkManualDialog } from './LinkManualDialog';

interface EquipmentManualsProps {
  equipmentId: string;
  equipmentName: string;
}

export function EquipmentManuals({ equipmentId, equipmentName }: EquipmentManualsProps) {
  const [manuals, setManuals] = useState<(EquipmentManualLink & { manual: EquipmentManual })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const { toast } = useToast();

  const fetchManuals = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_manual_links')
        .select(`
          *,
          manual:equipment_manuals(*)
        `)
        .eq('equipment_id', equipmentId);

      if (error) throw error;
      setManuals(data as any || []);
    } catch (error) {
      console.error('Error fetching manuals:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load manuals',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManuals();
  }, [equipmentId]);

  const handleDownload = async (manual: EquipmentManual) => {
    try {
      const { data, error } = await supabase.storage
        .from('equipment-manuals')
        .download(manual.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = manual.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading manual:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to download manual',
      });
    }
  };

  const handleUnlink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('equipment_manual_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Manual unlinked from equipment',
      });
      fetchManuals();
    } catch (error) {
      console.error('Error unlinking manual:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to unlink manual',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading manuals...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Equipment Manuals</h3>
        <div className="flex gap-2">
          <Button onClick={() => setShowLink(true)} variant="outline" size="sm">
            <LinkIcon className="h-4 w-4 mr-2" />
            Link Existing
          </Button>
          <Button onClick={() => setShowUpload(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Upload New
          </Button>
        </div>
      </div>

      {manuals.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No manuals linked to this equipment</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setShowLink(true)} variant="outline">
              Link Existing Manual
            </Button>
            <Button onClick={() => setShowUpload(true)}>
              Upload New Manual
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {manuals.map((link) => (
            <Card key={link.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5" />
                    <h4 className="font-semibold">{link.manual.title}</h4>
                    {link.manual.manual_type && (
                      <Badge variant="secondary">{link.manual.manual_type}</Badge>
                    )}
                  </div>
                  {link.manual.description && (
                    <p className="text-sm text-muted-foreground mb-2">{link.manual.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {link.manual.manufacturer && (
                      <span>Manufacturer: {link.manual.manufacturer}</span>
                    )}
                    {link.manual.model && (
                      <span>Model: {link.manual.model}</span>
                    )}
                    {link.manual.document_number && (
                      <span>Doc #: {link.manual.document_number}</span>
                    )}
                    {link.manual.version && (
                      <span>Version: {link.manual.version}</span>
                    )}
                  </div>
                  {link.notes && (
                    <p className="text-sm mt-2 text-muted-foreground italic">Note: {link.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownload(link.manual)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleUnlink(link.id)}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <UploadManualDialog
        open={showUpload}
        onOpenChange={setShowUpload}
        equipmentId={equipmentId}
        equipmentName={equipmentName}
        onSuccess={fetchManuals}
      />

      <LinkManualDialog
        open={showLink}
        onOpenChange={setShowLink}
        equipmentId={equipmentId}
        equipmentName={equipmentName}
        onSuccess={fetchManuals}
      />
    </div>
  );
}
