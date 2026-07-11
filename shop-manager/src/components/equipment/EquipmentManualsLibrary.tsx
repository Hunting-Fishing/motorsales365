import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EquipmentManual } from '@/types/manual';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Trash2, Plus, Search } from 'lucide-react';
import { UploadManualDialog } from './UploadManualDialog';

export function EquipmentManualsLibrary() {
  const [manuals, setManuals] = useState<EquipmentManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  const fetchManuals = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_manuals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setManuals(data || []);
    } catch (error) {
      console.error('Error fetching manuals:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load manuals library',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManuals();
  }, []);

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

  const handleDelete = async (manual: EquipmentManual) => {
    if (!confirm(`Delete "${manual.title}"? This will remove it from all equipment.`)) return;

    try {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('equipment-manuals')
        .remove([manual.file_url]);

      if (storageError) throw storageError;

      // Delete manual record (links will cascade delete)
      const { error } = await supabase
        .from('equipment_manuals')
        .delete()
        .eq('id', manual.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Manual deleted',
      });
      fetchManuals();
    } catch (error) {
      console.error('Error deleting manual:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete manual',
      });
    }
  };

  const filteredManuals = manuals.filter(manual => {
    const search = searchTerm.toLowerCase();
    return (
      manual.title.toLowerCase().includes(search) ||
      manual.manufacturer?.toLowerCase().includes(search) ||
      manual.model?.toLowerCase().includes(search) ||
      manual.document_number?.toLowerCase().includes(search) ||
      manual.tags?.some(tag => tag.toLowerCase().includes(search))
    );
  });

  if (loading) {
    return <div className="text-center py-8">Loading manuals library...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Manuals Library</h2>
          <p className="text-muted-foreground">
            Central repository for all equipment manuals - upload once, link to multiple equipment
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Manual
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search manuals by title, manufacturer, model, or tags..."
          className="pl-9"
        />
      </div>

      {filteredManuals.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No manuals found matching your search' : 'No manuals in library yet'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowUpload(true)}>
              Upload First Manual
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredManuals.map((manual) => (
            <Card key={manual.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5" />
                    <h3 className="font-semibold">{manual.title}</h3>
                    {manual.manual_type && (
                      <Badge variant="secondary">{manual.manual_type}</Badge>
                    )}
                  </div>
                  {manual.description && (
                    <p className="text-sm text-muted-foreground mb-2">{manual.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {manual.manufacturer && (
                      <span>Manufacturer: {manual.manufacturer}</span>
                    )}
                    {manual.model && (
                      <span>Model: {manual.model}</span>
                    )}
                    {manual.document_number && (
                      <span>Doc #: {manual.document_number}</span>
                    )}
                    {manual.version && (
                      <span>Version: {manual.version}</span>
                    )}
                  </div>
                  {manual.tags && manual.tags.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {manual.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2">
                    Uploaded: {new Date(manual.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownload(manual)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(manual)}
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
        equipmentId=""
        equipmentName=""
        onSuccess={fetchManuals}
      />
    </div>
  );
}
