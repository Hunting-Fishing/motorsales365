
export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentTag {
  id: string;
  name: string;
  usage_count: number;
  color: string;
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  document_type: 'pdf' | 'image' | 'weblink' | 'internal_link';
  file_path?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  category_id?: string;
  work_order_id?: string;
  customer_id?: string;
  is_public: boolean;
  is_archived: boolean;
  metadata: Record<string, any>;
  tags: string[];
  created_by: string;
  created_by_name: string;
  updated_by?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
  category_name?: string;
}

// Add CustomerDocument type (alias for Document with customer context)
export interface CustomerDocument extends Document {
  customer_id: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_path?: string;
  file_size?: number;
  version_notes?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface DocumentAccessLog {
  id: string;
  document_id: string;
  accessed_by: string;
  accessed_by_name: string;
  access_type: 'view' | 'download' | 'edit' | 'delete';
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface DocumentSearchParams {
  search_query?: string;
  category_id?: string;
  document_type?: 'pdf' | 'image' | 'weblink' | 'internal_link';
  tags?: string[];
  work_order_id?: string;
  customer_id?: string;
  limit?: number;
  offset?: number;
}

export interface CreateDocumentData {
  title: string;
  description?: string;
  document_type: 'pdf' | 'image' | 'weblink' | 'internal_link';
  file_path?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  category_id?: string;
  work_order_id?: string;
  customer_id?: string;
  is_public?: boolean;
  metadata?: Record<string, any>;
  tags?: string[];
  created_by: string;
  created_by_name: string;
}

// Add SavedSearch type
export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  search_query: Record<string, any>;
  user_id: string;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}
