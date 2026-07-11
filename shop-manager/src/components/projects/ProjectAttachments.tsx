import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDropzone } from "react-dropzone";
import { 
  Loader2, Upload, FileText, Image, File, Trash2, Download, 
  FolderOpen, FileSpreadsheet, FileArchive
} from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  created_at: string;
}

interface ProjectAttachmentsProps {
  projectId: string;
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'designs', label: 'Designs' },
  { value: 'photos', label: 'Photos' },
  { value: 'reports', label: 'Reports' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'permits', label: 'Permits' },
];

export const ProjectAttachments = ({ projectId }: ProjectAttachmentsProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('project_attachments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Failed to fetch attachments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [projectId]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}_${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-attachments')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('project_attachments')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          category: selectedCategory,
          uploaded_by: user?.id,
        });

      if (dbError) throw dbError;

      toast.success('File uploaded successfully');
      fetchAttachments();
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachment: Attachment) => {
    try {
      // Extract file path from URL
      const urlParts = attachment.file_url.split('/');
      const filePath = urlParts.slice(-2).join('/');

      // Delete from storage
      await supabase.storage
        .from('project-attachments')
        .remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('project_attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;

      toast.success('File deleted');
      fetchAttachments();
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => uploadFile(file));
  }, [selectedCategory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
  });

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-8 w-8 text-muted-foreground" />;
    if (fileType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) 
      return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    if (fileType.includes('zip') || fileType.includes('archive')) 
      return <FileArchive className="h-8 w-8 text-yellow-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredAttachments = filterCategory === 'all' 
    ? attachments 
    : attachments.filter(a => a.category === filterCategory);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Attachments</CardTitle>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        <div className="flex gap-2 items-center mb-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">← Upload to category</div>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          )}
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </p>
        </div>

        {/* Attachments List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAttachments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No attachments yet</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredAttachments.map((attachment) => (
              <div 
                key={attachment.id} 
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50"
              >
                {getFileIcon(attachment.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{attachment.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{attachment.category}</span>
                    <span>•</span>
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span>{format(new Date(attachment.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => window.open(attachment.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteAttachment(attachment)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
