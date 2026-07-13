
import { supabase } from '@/integrations/supabase/client';
import { getTools, getToolById, getToolsByCategory } from './liveToolService';
import { AffiliateTool } from '@/types/affiliate';

// Transform database tool to AffiliateTool for compatibility
const transformTool = (tool: any): AffiliateTool => ({
  id: tool.id,
  name: tool.title,
  description: tool.description || '',
  slug: tool.title?.toLowerCase().replace(/\s+/g, '-') || '',
  price: tool.price || 0,
  imageUrl: tool.image_url || '/assets/tools/default.jpg',
  category: 'Tools',
  manufacturer: 'Professional Tools', // Generic manufacturer for now
  rating: tool.average_rating || 0,
  reviewCount: tool.review_count || 0,
  affiliateLink: tool.affiliate_link || '#',
  featured: tool.is_featured || false,
  bestSeller: tool.is_bestseller || false,
  tags: []
});

/**
 * Get all affiliate tools
 * @returns Promise<AffiliateTool[]>
 */
export const getAffiliateTools = async (): Promise<AffiliateTool[]> => {
  try {
    const tools = await getTools();
    return tools.map(transformTool);
  } catch (error) {
    console.error('Error fetching affiliate tools:', error);
    return [];
  }
};

/**
 * Get a single affiliate tool by ID
 * @param id Tool ID
 * @returns Promise<AffiliateTool | undefined>
 */
export const getAffiliateToolById = async (id: string): Promise<AffiliateTool | undefined> => {
  try {
    const tool = await getToolById(id);
    return tool ? transformTool(tool) : undefined;
  } catch (error) {
    console.error('Error fetching affiliate tool by ID:', error);
    return undefined;
  }
};

/**
 * Create a new affiliate tool
 */
export const createAffiliateTool = async (tool: Partial<AffiliateTool>): Promise<AffiliateTool> => {
  try {
    // Note: tools table doesn't exist in current schema, using products instead
    const { data, error } = await supabase
      .from('products')
      .insert({
        title: tool.name,
        name: tool.name,
        description: tool.description,
        price: tool.price,
        image_url: tool.imageUrl,
        category_id: 'tools-category', // Default category
        sku: `TOOL-${Date.now()}`,
        stock_quantity: 1
      })
      .select()
      .single();

    if (error) throw error;
    return transformTool(data);
  } catch (error) {
    console.error('Error creating affiliate tool:', error);
    throw error;
  }
};

/**
 * Update an existing affiliate tool
 */
export const updateAffiliateTool = async (id: string, updates: Partial<AffiliateTool>): Promise<AffiliateTool> => {
  try {
    // Note: tools table doesn't exist in current schema, using products instead
    const { data, error } = await supabase
      .from('products')
      .update({
        title: updates.name, // Use title instead of name
        description: updates.description,
        price: updates.price,
        image_url: updates.imageUrl
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return transformTool(data);
  } catch (error) {
    console.error('Error updating affiliate tool:', error);
    throw error;
  }
};

/**
 * Delete an affiliate tool
 */
export const deleteAffiliateTool = async (id: string): Promise<boolean> => {
  try {
    // Note: tools table doesn't exist in current schema, using products instead
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting affiliate tool:', error);
    return false;
  }
};
