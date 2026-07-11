import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category_id: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_read_time: number;
  tags: string[];
  video_url?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  author_id?: string;
  view_count?: number;
  rating?: number;
}

export interface HelpLearningPath {
  id: string;
  title: string;
  description: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: string;
  target_role: string;
  articles: string[];
  prerequisites: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HelpResource {
  id: string;
  title: string;
  description: string;
  resource_type: 'template' | 'tool' | 'video' | 'document' | 'calculator';
  file_url?: string;
  download_url?: string;
  category_id: string;
  tags: string[];
  is_active: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
}

// Mock data for categories since they might not be in the current database
const mockCategories: HelpCategory[] = [
  { id: '1', name: 'Getting Started', description: 'Essential guides for new users', icon: 'Rocket', sort_order: 1, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '2', name: 'Work Orders', description: 'Work order management system', icon: 'Wrench', sort_order: 2, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '3', name: 'Customer Management', description: 'Customer relationship tools', icon: 'Users', sort_order: 3, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '4', name: 'Inventory Management', description: 'Parts and inventory control', icon: 'Package', sort_order: 4, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '5', name: 'Financial Management', description: 'Billing and financial tools', icon: 'DollarSign', sort_order: 5, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '6', name: 'Reporting & Analytics', description: 'Business intelligence', icon: 'BarChart3', sort_order: 6, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

// Mock data for learning paths
const mockLearningPaths: HelpLearningPath[] = [
  {
    id: '1',
    title: 'Complete Beginner Onboarding',
    description: 'Everything you need to know to get started with All Business 365 in your first 30 days',
    difficulty_level: 'beginner',
    estimated_duration: '4-6 weeks',
    target_role: 'All Users',
    articles: ['Complete Setup Guide', 'First Week Checklist'],
    prerequisites: [],
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    title: 'Service Manager Mastery',
    description: 'Advanced path for service managers focusing on operations and analytics',
    difficulty_level: 'intermediate',
    estimated_duration: '6-8 weeks',
    target_role: 'Manager',
    articles: ['Advanced Work Order Workflows', 'Custom Report Creation'],
    prerequisites: ['Complete Setup Guide'],
    is_active: true,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

// Mock data for resources
const mockResources: HelpResource[] = [
  {
    id: '1',
    title: 'Work Order Template Library',
    description: 'Collection of professional work order templates for different service types',
    resource_type: 'template',
    category_id: '2',
    tags: ['templates', 'work-orders'],
    is_active: true,
    download_count: 3456,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  },
  {
    id: '2',
    title: 'ROI Calculator Tool',
    description: 'Calculate return on investment for All Business 365 implementation',
    resource_type: 'calculator',
    category_id: '6',
    tags: ['calculator', 'roi'],
    is_active: true,
    download_count: 1876,
    created_at: '2024-01-01',
    updated_at: '2024-01-01'
  }
];

// Fetch help categories
export const useHelpCategories = () => {
  return useQuery({
    queryKey: ['help-categories'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('help_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching help categories:', error);
        return mockCategories;
      }
    },
  });
};

// Fetch help articles from enhanced help_articles table
export const useHelpArticles = (categoryId?: string, featured?: boolean) => {
  return useQuery({
    queryKey: ['help-articles', categoryId, featured],
    queryFn: async () => {
      try {
        let query = supabase
          .from('help_articles')
          .select(`
            *,
            help_categories (
              id,
              name,
              icon
            )
          `);
        
        if (categoryId && categoryId !== 'all') {
          query = query.eq('category_id', categoryId);
        }
        
        if (featured) {
          query = query.eq('is_featured', true);
        }
        
        query = query.order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return data || [];
      } catch (error) {
        console.error('Error fetching help articles:', error);
        return [];
      }
    },
  });
};

// Fetch learning paths
export const useHelpLearningPaths = () => {
  return useQuery({
    queryKey: ['help-learning-paths'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('help_learning_paths')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching learning paths:', error);
        return mockLearningPaths;
      }
    },
  });
};

// Fetch help resources
export const useHelpResources = (categoryId?: string, resourceType?: string) => {
  return useQuery({
    queryKey: ['help-resources', categoryId, resourceType],
    queryFn: async () => {
      try {
        let query = supabase
          .from('help_resources')
          .select(`
            *,
            help_categories (
              id,
              name,
              icon
            )
          `)
          .eq('is_active', true);
        
        if (categoryId && categoryId !== 'all') {
          query = query.eq('category_id', categoryId);
        }
        
        if (resourceType && resourceType !== 'all') {
          query = query.eq('resource_type', resourceType);
        }
        
        query = query.order('download_count', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching help resources:', error);
        return mockResources.map(resource => ({
          ...resource,
          help_categories: { name: 'General', icon: 'FileText' }
        }));
      }
    },
  });
};

// Fetch single help article
export const useHelpArticle = (id: string) => {
  return useQuery({
    queryKey: ['help-article', id],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('help_articles')
          .select(`
            *,
            help_categories (
              id,
              name,
              icon
            )
          `)
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        // Increment view count
        await supabase
          .from('help_articles')
          .update({ view_count: (data.view_count || 0) + 1 })
          .eq('id', id);
        
        return data;
      } catch (error) {
        console.error('Error fetching help article:', error);
        throw error;
      }
    },
  });
};

// Search help articles
export const useSearchHelpArticles = (searchTerm: string) => {
  return useQuery({
    queryKey: ['search-help-articles', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];
      
      try {
        const { data, error } = await supabase
          .from('help_articles')
          .select(`
            *,
            help_categories (
              id,
              name,
              icon
            )
          `)
          .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
          .order('is_featured', { ascending: false })
          .order('view_count', { ascending: false });
        
        if (error) throw error;
        
        // Record search analytics
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await supabase
            .from('help_search_analytics')
            .insert({
              search_query: searchTerm,
              results_count: data?.length || 0,
              search_time_ms: 200,
              user_id: user.user.id
            });
        }
        
        return data || [];
      } catch (error) {
        console.error('Error searching help articles:', error);
        return [];
      }
    },
    enabled: searchTerm.length > 2,
  });
};