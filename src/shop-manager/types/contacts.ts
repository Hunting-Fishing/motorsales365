export interface ContactCategory {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  shop_id: string;
  category_id: string | null;
  contact_type: 'person' | 'company' | 'vendor' | 'supplier';
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  notes: string | null;
  tags: string[];
  profile_image_url: string | null;
  is_favorite: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: ContactCategory;
}

export interface Resource {
  id: string;
  shop_id: string;
  category_id: string | null;
  resource_type: 'website' | 'document' | 'video' | 'tool' | 'api' | 'portal';
  name: string;
  description: string | null;
  url: string | null;
  username: string | null;
  notes: string | null;
  tags: string[];
  icon: string | null;
  thumbnail_url: string | null;
  is_favorite: boolean;
  is_active: boolean;
  last_accessed_at: string | null;
  access_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: ContactCategory;
}

export type ContactFormData = Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'category'>;
export type ResourceFormData = Omit<Resource, 'id' | 'created_at' | 'updated_at' | 'category'>;
