
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomerDocument } from '@/types/document';
import { DocumentService } from '@/services/documentService';
import { Download, Eye, FileText, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentListProps {
  documents: CustomerDocument[];
  onDocumentUpdated: () => void;
  onDocumentDeleted: (documentId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDocumentUpdated,
  onDocumentDeleted
}) => {
  const { toast } = useToast();

  const handleView = (doc: CustomerDocument) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  const handleDownload = (doc: CustomerDocument) => {
    if (doc.file_url) {
      const link = window.document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.title;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  };

  const handleDelete = async (doc: CustomerDocument) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await DocumentService.deleteDocument(doc.id);
        onDocumentDeleted(doc.id);
        toast({
          title: "Success",
          description: "Document deleted successfully.",
        });
      } catch (error) {
        console.error('Error deleting document:', error);
        toast({
          title: "Error",
          description: "Failed to delete document. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadProp = (doc: CustomerDocument) => {
    if (doc.file_url) {
      const linkElement = window.document.createElement('a');
      linkElement.href = doc.file_url;
      linkElement.download = doc.title;
      window.document.body.appendChild(linkElement);
      linkElement.click();
      window.document.body.removeChild(linkElement);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
        <p className="text-gray-500">Upload your first document to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((document) => (
        <div key={document.id} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 truncate">{document.title}</h3>
              {document.description && (
                <p className="text-sm text-gray-600 mt-1">{document.description}</p>
              )}
            </div>
            <Badge variant="outline" className="ml-2">
              {document.document_type.toUpperCase()}
            </Badge>
          </div>

          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {document.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>Created by {document.created_by_name}</span>
            <span>{new Date(document.created_at).toLocaleDateString()}</span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleView(document)}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadProp(document)}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(document)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
