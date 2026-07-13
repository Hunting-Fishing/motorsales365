
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Document } from '@/types/document';
import { DocumentService } from '@/services/documentService';
import { Download, Eye, FileText, Image, Link, ExternalLink, MoreVertical, Edit, Trash2, Calendar, Tag, User } from 'lucide-react';

interface DocumentCardProps {
  document: Document;
  onClick?: (document: Document) => void;
  onView?: (document: Document) => void;
  onEdit?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onDownload?: (document: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onClick,
  onView,
  onEdit,
  onDelete,
  onDownload
}) => {
  const getIconForType = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'weblink':
        return <Link className="h-4 w-4" />;
      case 'internal_link':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleView = async () => {
    try {
      if (document.document_type === 'weblink') {
        // For web links, open URL directly
        if (document.file_url) {
          window.open(document.file_url, '_blank');
        }
      } else if (document.file_path) {
        // For uploaded files, get a fresh signed URL
        const bucketName = document.work_order_id ? 'work-order-documents' : 'documents';
        const signedUrl = await DocumentService.getSignedUrl(document.file_path, bucketName);
        window.open(signedUrl, '_blank');
      }
      
      if (onView) {
        onView(document);
      }
      if (onClick) {
        onClick(document);
      }
      // Log the access
      DocumentService.logAccess(document.id, 'view');
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  };

  const handleDownload = async () => {
    try {
      if (document.document_type === 'weblink') {
        // For web links, just open the URL
        if (document.file_url) {
          window.open(document.file_url, '_blank');
        }
      } else if (document.file_path) {
        // For uploaded files, get a fresh signed URL for download
        const bucketName = document.work_order_id ? 'work-order-documents' : 'documents';
        const signedUrl = await DocumentService.getSignedUrl(document.file_path, bucketName);
        
        // Create download link
        const link = window.document.createElement('a');
        link.href = signedUrl;
        link.download = document.title;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
      }
      
      if (onDownload) {
        onDownload(document);
      }
      // Log the access
      DocumentService.logAccess(document.id, 'download');
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(document);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(document);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 border border-border/50 hover:border-border bg-card/50 hover:bg-card cursor-pointer">
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 opacity-60 hover:opacity-100 group-hover:opacity-100 transition-all duration-200 hover:bg-background/80 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px] bg-background border shadow-lg z-50">
            <DropdownMenuItem onClick={handleView} className="gap-2 cursor-pointer">
              <Eye className="h-4 w-4" />
              View Document
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }} 
              className="gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onEdit && (
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }} 
                className="gap-2 cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                Edit Details
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }} 
                className="gap-2 text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CardContent className="p-6" onClick={handleView}>
        <div className="space-y-4">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
              {getIconForType(document.document_type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate text-base group-hover:text-primary transition-colors duration-200 leading-tight">
                {document.title}
              </h3>
              
              <Badge variant="outline" className="text-xs mt-2 bg-background/60 backdrop-blur-sm">
                {document.document_type.toUpperCase()}
              </Badge>
              
              {document.description && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                  {document.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(document.created_at).toLocaleDateString()}</span>
            </div>
            
            {document.file_size && (
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>{formatFileSize(document.file_size)}</span>
              </div>
            )}

            {document.category_name && (
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                <span className="truncate">{document.category_name}</span>
              </div>
            )}
          </div>

          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {document.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs px-2.5 py-1 bg-muted/60 hover:bg-muted transition-colors font-medium">
                  {tag}
                </Badge>
              ))}
              {document.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2.5 py-1 bg-muted/60 font-medium">
                  +{document.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground text-sm truncate">
                  {document.created_by_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Uploaded {new Date(document.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              Click to view
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
