import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from './useShopId';
import { useToast } from './use-toast';
import type { SafetyDocument, SafetyDocumentType } from '@/types/safety';

export interface CreateDocumentData {
  document_type: SafetyDocumentType;
  title: string;
  description?: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  chemical_name?: string;
  manufacturer?: string;
  hazard_classification?: string[];
  storage_location?: string;
  version?: string;
  revision_date?: string;
  effective_date?: string;
  expiry_date?: string;
  requires_acknowledgment?: boolean;
  department?: string;
}

export function useSafetyDocuments() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<SafetyDocument[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchDocuments();
    }
  }, [shopId]);

  const fetchDocuments = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('safety_documents' as any)
        .select('*')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('title', { ascending: true }) as any);

      if (error) throw error;
      setDocuments((data || []) as SafetyDocument[]);
    } catch (error: any) {
      console.error('Error fetching safety documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load safety documents',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (file: File, data: Omit<CreateDocumentData, 'file_url' | 'file_name' | 'file_size' | 'mime_type'>) => {
    if (!shopId) return null;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${shopId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('safety-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('safety-documents')
        .getPublicUrl(fileName);

      // Create document record
      const { data: document, error } = await (supabase
        .from('safety_documents' as any)
        .insert({
          shop_id: shopId,
          uploaded_by: userData.user.id,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          version: '1.0',
          ...data
        })
        .select()
        .single() as any);

      if (error) throw error;
      
      await fetchDocuments();
      toast({
        title: 'Success',
        description: 'Document uploaded successfully'
      });
      
      return document;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload document',
        variant: 'destructive'
      });
      return null;
    }
  };

  const createDocument = async (data: CreateDocumentData) => {
    if (!shopId) return null;
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: document, error } = await (supabase
        .from('safety_documents' as any)
        .insert({
          shop_id: shopId,
          uploaded_by: userData.user.id,
          version: data.version || '1.0',
          ...data
        })
        .select()
        .single() as any);

      if (error) throw error;
      
      await fetchDocuments();
      toast({
        title: 'Success',
        description: 'Document created successfully'
      });
      
      return document;
    } catch (error: any) {
      console.error('Error creating document:', error);
      toast({
        title: 'Error',
        description: 'Failed to create document',
        variant: 'destructive'
      });
      return null;
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const { error } = await (supabase
        .from('safety_documents' as any)
        .update({ is_active: false })
        .eq('id', documentId) as any);

      if (error) throw error;
      
      await fetchDocuments();
      toast({
        title: 'Success',
        description: 'Document deleted'
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      });
    }
  };

  const searchSDS = (query: string) => {
    return documents.filter(d => 
      d.document_type === 'sds' && 
      (d.chemical_name?.toLowerCase().includes(query.toLowerCase()) ||
       d.title.toLowerCase().includes(query.toLowerCase()))
    );
  };

  const getByType = (type: SafetyDocumentType) => {
    return documents.filter(d => d.document_type === type);
  };

  const getExpiringDocuments = (daysAhead: number = 30) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return documents.filter(d => 
      d.expiry_date && 
      new Date(d.expiry_date) <= futureDate
    );
  };

  return {
    loading,
    documents,
    uploadDocument,
    createDocument,
    deleteDocument,
    searchSDS,
    getByType,
    getExpiringDocuments,
    refetch: fetchDocuments
  };
}
