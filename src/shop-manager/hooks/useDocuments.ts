
import { useState, useEffect } from 'react';
import { Document, DocumentSearchParams } from '@/types/document';
import { DocumentService } from '@/services/documentService';

export function useDocuments(searchParams: DocumentSearchParams = {}) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await DocumentService.getDocuments(searchParams);
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [JSON.stringify(searchParams)]);

  const createDocument = async (documentData: any) => {
    try {
      const newDocument = await DocumentService.createDocument(documentData);
      setDocuments(prev => [newDocument, ...prev]);
      return newDocument;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
      throw err;
    }
  };

  const updateDocument = async (id: string, updates: any) => {
    try {
      const updatedDocument = await DocumentService.updateDocument(id, updates);
      setDocuments(prev => prev.map(doc => doc.id === id ? updatedDocument : doc));
      return updatedDocument;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document');
      throw err;
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      await DocumentService.deleteDocument(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
      throw err;
    }
  };

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument
  };
}
