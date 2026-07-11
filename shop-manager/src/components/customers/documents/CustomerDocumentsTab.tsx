
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Customer } from '@/types/customer';
import { CustomerDocument, DocumentCategory } from '@/types/document';
import { getCustomerDocuments, getDocumentCategories } from '@/services/documentService';
import { Plus, FileText, RefreshCw } from 'lucide-react';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { DocumentList } from './DocumentList';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface CustomerDocumentsTabProps {
  customer: Customer;
}

export const CustomerDocumentsTab: React.FC<CustomerDocumentsTabProps> = ({ customer }) => {
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState<CustomerDocument[]>([]);

  useEffect(() => {
    loadDocuments();
    loadCategories();
  }, [customer.id]);

  useEffect(() => {
    // Apply filters
    let filtered = [...documents];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        (doc.description && doc.description.toLowerCase().includes(query)) ||
        (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }
    
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(doc => doc.category_id === categoryFilter);
    }
    
    setFilteredDocuments(filtered);
  }, [documents, searchQuery, categoryFilter]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const docs = await getCustomerDocuments({ customer_id: customer.id });
      // Filter and cast to CustomerDocument[] ensuring customer_id is present
      const customerDocs = docs
        .filter(doc => doc.customer_id === customer.id)
        .map(doc => ({ ...doc, customer_id: customer.id } as CustomerDocument));
      setDocuments(customerDocs);
      setFilteredDocuments(customerDocs);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await getDocumentCategories();
      setCategories(cats);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const handleDocumentUploaded = (document: CustomerDocument) => {
    setDocuments(prev => [document, ...prev]);
  };

  const handleDocumentDeleted = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-semibold">Documents</h2>
        
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Upload Document
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2">
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />
        </div>
        <div>
          <Label htmlFor="category-filter" className="sr-only">Filter by Category</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger id="category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <DocumentList
          documents={filteredDocuments}
          onDocumentUpdated={loadDocuments}
          onDocumentDeleted={handleDocumentDeleted}
        />
      )}
      
      <DocumentUploadDialog
        customerId={customer.id}
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onDocumentUploaded={handleDocumentUploaded}
        categories={categories}
      />
    </div>
  );
};
