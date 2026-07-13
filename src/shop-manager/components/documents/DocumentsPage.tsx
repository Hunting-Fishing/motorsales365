
import React, { useState } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { DocumentGrid } from './DocumentGrid';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentSearchFilters } from './DocumentSearchFilters';
// import { DocumentDetailDialog } from './DocumentDetailDialog';
import { DocumentEditDialog } from './DocumentEditDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { Document, DocumentSearchParams } from '@/types/document';
import { toast } from '@/hooks/use-toast';

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useState<DocumentSearchParams>({});
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { documents, loading, error, refetch, createDocument, deleteDocument } = useDocuments(searchParams);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setSearchParams(prev => ({ ...prev, search_query: query || undefined }));
  };

  const handleFilterChange = (filters: Partial<DocumentSearchParams>) => {
    setSearchParams(prev => ({ ...prev, ...filters }));
  };

  const handleDocumentClick = (document: Document) => {
    setSelectedDocument(document);
    setIsDetailDialogOpen(true);
  };

  const handleEditDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsEditDialogOpen(true);
  };

  const handleDeleteDocument = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument(id);
        toast({
          title: "Success",
          description: "Document deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete document",
          variant: "destructive",
        });
      }
    }
  };

  const handleDocumentCreated = async (documentData: any) => {
    // Document is already created, just refresh the list
    refetch();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={refetch}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Documents</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage your documents, files, and links in one place
          </p>
        </div>
        <Button 
          onClick={() => setUploadDialogOpen(true)} 
          className="w-full sm:w-auto whitespace-nowrap"
          size="default"
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="mb-8 space-y-6">
        <div className="w-full">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>
        
        <DocumentSearchFilters 
          onFilterChange={handleFilterChange}
          currentFilters={searchParams}
        />
      </div>

      <div className="mb-6">
        <DocumentGrid
          documents={documents}
          onDocumentClick={handleDocumentClick}
          onEditDocument={handleEditDocument}
          onDeleteDocument={handleDeleteDocument}
        />
      </div>

      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onDocumentCreated={handleDocumentCreated}
      />

      {/* DocumentDetailDialog temporarily disabled */}

      <DocumentEditDialog
        document={selectedDocument}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedDocument(null);
        }}
        onUpdate={(updatedDoc) => {
          // Update the documents list
          refetch();
          setIsEditDialogOpen(false);
          setSelectedDocument(null);
        }}
      />
    </div>
  );
}
