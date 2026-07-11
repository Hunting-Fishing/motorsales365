import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, Upload, Trash2, Download, Search, 
  FileImage, File, AlertTriangle, Calendar, Eye
} from 'lucide-react';
import { UploadDocumentDialog } from './UploadDocumentDialog';
import { toast } from 'sonner';
import { format, differenceInDays, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface EquipmentDocumentsProps {
  equipmentId: string;
  shopId: string;
}

const DOCUMENT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'manual', label: 'Manual' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'warranty', label: 'Warranty' },
  { value: 'registration', label: 'Registration' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'other', label: 'Other' }
];

const TYPE_COLORS: Record<string, string> = {
  manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  certificate: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  warranty: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  registration: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  insurance: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  inspection: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  receipt: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  other: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
};

export function EquipmentDocuments({ equipmentId, shopId }: EquipmentDocumentsProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['equipment-documents', equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_documents')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('equipment_documents')
        .delete()
        .eq('id', documentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment-documents', equipmentId] });
      toast.success('Document deleted');
    },
    onError: () => {
      toast.error('Failed to delete document');
    }
  });

  const filteredDocuments = documents?.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (mimeType: string | null) => {
    if (mimeType?.startsWith('image/')) return FileImage;
    return File;
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return { status: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    if (days <= 30) return { status: 'expiring', label: `${days}d left`, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
    return { status: 'valid', label: format(parseISO(expiryDate), 'MMM d, yyyy'), color: '' };
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
              {documents && documents.length > 0 && (
                <Badge variant="secondary">{documents.length}</Badge>
              )}
            </CardTitle>
            <Button onClick={() => setIsUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document List */}
          {filteredDocuments?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents found</p>
              <p className="text-sm mt-1">Upload manuals, certificates, or other documents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments?.map((doc) => {
                const Icon = getFileIcon(doc.mime_type);
                const expiryStatus = getExpiryStatus(doc.expiry_date);
                
                return (
                  <div 
                    key={doc.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground truncate">{doc.name}</span>
                        <Badge className={TYPE_COLORS[doc.document_type || 'other']}>
                          {doc.document_type || 'other'}
                        </Badge>
                        {expiryStatus && expiryStatus.status !== 'valid' && (
                          <Badge className={expiryStatus.color}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {expiryStatus.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        {doc.description && (
                          <span className="truncate max-w-[200px]">{doc.description}</span>
                        )}
                        {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                        {doc.expiry_date && expiryStatus?.status === 'valid' && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires {expiryStatus.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded {format(new Date(doc.created_at), 'MMM d, yyyy')}
                        {doc.uploaded_by_name && ` by ${doc.uploaded_by_name}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <a href={doc.file_url} download={doc.file_name}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(doc.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <UploadDocumentDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        equipmentId={equipmentId}
        shopId={shopId}
      />
    </>
  );
}
