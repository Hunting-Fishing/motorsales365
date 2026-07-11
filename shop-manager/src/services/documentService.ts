
import { supabase } from '@/integrations/supabase/client';
import { Document, DocumentCategory, CreateDocumentData, DocumentSearchParams } from '@/types/document';

// File validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain'
];

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }
  
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not supported' };
  }
  
  return { valid: true };
};

const getShopId = async (): Promise<string> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();
  
  if (!profile?.shop_id) {
    throw new Error('Shop ID not found');
  }
  
  return profile.shop_id;
};

export class DocumentService {
  static async getDocuments(searchParams: DocumentSearchParams = {}): Promise<Document[]> {
    let query = supabase
      .from('documents')
      .select(`
        *,
        category:document_categories(name)
      `)
      .order('created_at', { ascending: false });

    if (searchParams.search_query) {
      query = query.or(`title.ilike.%${searchParams.search_query}%,description.ilike.%${searchParams.search_query}%`);
    }

    if (searchParams.category_id) {
      query = query.eq('category_id', searchParams.category_id);
    }

    if (searchParams.document_type) {
      query = query.eq('document_type', searchParams.document_type);
    }

    if (searchParams.customer_id) {
      query = query.eq('customer_id', searchParams.customer_id);
    }

    if (searchParams.work_order_id) {
      query = query.eq('work_order_id', searchParams.work_order_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(doc => ({
      ...doc,
      document_type: doc.document_type as 'pdf' | 'image' | 'weblink' | 'internal_link',
      metadata: (typeof doc.metadata === 'object' && doc.metadata !== null) ? doc.metadata as Record<string, any> : {}
    }));
  }

  static async getDocument(id: string): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return {
      ...data,
      document_type: data.document_type as 'pdf' | 'image' | 'weblink' | 'internal_link',
      metadata: (typeof data.metadata === 'object' && data.metadata !== null) ? data.metadata as Record<string, any> : {}
    };
  }

  static async createDocument(documentData: CreateDocumentData): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      document_type: data.document_type as 'pdf' | 'image' | 'weblink' | 'internal_link',
      metadata: (typeof data.metadata === 'object' && data.metadata !== null) ? data.metadata as Record<string, any> : {}
    };
  }

  static async uploadDocument(documentData: CreateDocumentData): Promise<Document> {
    return this.createDocument(documentData);
  }

  static async uploadFile(file: File, path: string, bucketName: string = 'documents'): Promise<{ path: string }> {
    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const shopId = await getShopId();
    const filePath = `${shopId}/${path}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (error) throw error;

    // Only return the path - URLs should be generated on-demand
    return {
      path: data.path
    };
  }

  static async getSignedUrl(filePath: string, bucketName: string = 'documents'): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;
  }

  static async updateDocument(id: string, updates: Partial<CreateDocumentData>): Promise<Document> {
    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      document_type: data.document_type as 'pdf' | 'image' | 'weblink' | 'internal_link',
      metadata: (typeof data.metadata === 'object' && data.metadata !== null) ? data.metadata as Record<string, any> : {}
    };
  }

  static async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getCategories(): Promise<DocumentCategory[]> {
    const { data, error } = await supabase
      .from('document_categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  static async logAccess(documentId: string, accessType: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Get user's display name from profiles
      const userName = await this.getUserDisplayName(user.id);
      
      const { error } = await supabase
        .from('document_access_logs')
        .insert({
          document_id: documentId,
          accessed_by: user.id,
          accessed_by_name: userName,
          access_type: accessType
        });

      if (error) {
        console.error('Error logging document access:', error);
      }
    }
  }

  static async getUserDisplayName(userId: string): Promise<string> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single();

      if (profile) {
        if (profile.first_name && profile.last_name) {
          return `${profile.first_name} ${profile.last_name}`.trim();
        } else if (profile.first_name) {
          return profile.first_name;
        } else if (profile.last_name) {
          return profile.last_name;
        } else if (profile.email) {
          return profile.email;
        }
      }
    } catch (error) {
      console.error('Error fetching user display name:', error);
    }
    return 'Unknown User';
  }

  static async uploadDocumentVersion(documentId: string, file: File, versionNotes?: string): Promise<any> {
    // Validate file before upload
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const shopId = await getShopId();
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `versions/${documentId}/${timestamp}.${fileExt}`;
    const filePath = `${shopId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (error) throw error;

    // Create version record in database (simplified for now)
    // Note: document_versions table would need to be created for this to work
    console.log('Document version uploaded:', {
      documentId,
      filePath: data.path,
      fileSize: file.size,
      versionNotes
    });
    
    return {
      success: true,
      path: data.path,
      size: file.size,
      notes: versionNotes
    };
  }
}

export const getCustomerDocuments = (searchParams: DocumentSearchParams) => DocumentService.getDocuments(searchParams);
export const getDocumentCategories = DocumentService.getCategories;
export const uploadDocumentVersion = DocumentService.uploadDocumentVersion;
