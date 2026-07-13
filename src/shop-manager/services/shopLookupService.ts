import { supabase } from '@/lib/supabase';

export interface ShopPublicInfo {
  id: string;
  name: string;
  slug: string;
  invite_code: string;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  industry?: string | null;
  business_type?: string | null;
  shop_description?: string | null;
  relevanceScore?: number;
}

export interface EnhancedSearchParams {
  query: string;
  industry?: string;
  city?: string;
  state?: string;
  limit?: number;
}

/**
 * Calculate relevance score for search results
 */
function calculateRelevanceScore(shop: ShopPublicInfo, query: string): number {
  const q = query.toLowerCase().trim();
  const name = (shop.name || '').toLowerCase();
  const industry = (shop.industry || '').toLowerCase();
  const businessType = (shop.business_type || '').toLowerCase();
  const city = (shop.city || '').toLowerCase();
  const description = (shop.shop_description || '').toLowerCase();
  
  let score = 0;
  
  // Exact name match (highest priority)
  if (name === q) {
    score += 100;
  }
  // Name starts with query
  else if (name.startsWith(q)) {
    score += 80;
  }
  // Name contains query
  else if (name.includes(q)) {
    score += 60;
  }
  
  // Industry/business type match
  if (industry.includes(q) || businessType.includes(q)) {
    score += 50;
  }
  
  // City match
  if (city.includes(q)) {
    score += 40;
  }
  
  // Description match
  if (description.includes(q)) {
    score += 20;
  }
  
  // Boost for having logo (indicates more complete profile)
  if (shop.logo_url) {
    score += 5;
  }
  
  return score;
}

/**
 * Look up a shop by its URL slug
 */
export async function getShopBySlug(slug: string): Promise<ShopPublicInfo | null> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, slug, invite_code, logo_url, address, city, state, phone, industry, business_type, shop_description')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    console.error('Shop lookup by slug failed:', error);
    return null;
  }

  return data;
}

/**
 * Look up a shop by its invite code (case-insensitive)
 */
export async function getShopByInviteCode(code: string): Promise<ShopPublicInfo | null> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, slug, invite_code, logo_url, address, city, state, phone, industry, business_type, shop_description')
    .ilike('invite_code', code.trim())
    .single();

  if (error || !data) {
    console.error('Shop lookup by invite code failed:', error);
    return null;
  }

  return data;
}

/**
 * Basic search shops by name for directory search (legacy)
 */
export async function searchShops(query: string, limit = 10): Promise<ShopPublicInfo[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, slug, invite_code, logo_url, address, city, state, phone, industry, business_type, shop_description')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error) {
    console.error('Shop search failed:', error);
    return [];
  }

  return data || [];
}

/**
 * Enhanced search with multi-field partial matching and relevance scoring
 * Searches across: name, industry, business_type, shop_description, city, state
 */
export async function enhancedSearchShops(params: EnhancedSearchParams): Promise<ShopPublicInfo[]> {
  const { query, industry, city, state, limit = 50 } = params;
  const searchTerm = query.trim();
  
  if (!searchTerm && !industry) {
    return [];
  }

  // Build the query with OR conditions for multi-field search
  let supabaseQuery = supabase
    .from('shops')
    .select('id, name, slug, invite_code, logo_url, address, city, state, phone, industry, business_type, shop_description');

  // If we have a search term, search across multiple fields
  if (searchTerm) {
    // Use OR to search across multiple fields with partial matching
    supabaseQuery = supabaseQuery.or(
      `name.ilike.%${searchTerm}%,` +
      `industry.ilike.%${searchTerm}%,` +
      `business_type.ilike.%${searchTerm}%,` +
      `shop_description.ilike.%${searchTerm}%,` +
      `city.ilike.%${searchTerm}%,` +
      `state.ilike.%${searchTerm}%`
    );
  }

  // Apply additional filters if provided
  if (industry && industry !== 'all') {
    supabaseQuery = supabaseQuery.ilike('industry', `%${industry}%`);
  }
  
  if (city) {
    supabaseQuery = supabaseQuery.ilike('city', `%${city}%`);
  }
  
  if (state) {
    supabaseQuery = supabaseQuery.ilike('state', `%${state}%`);
  }

  const { data, error } = await supabaseQuery.limit(limit);

  if (error) {
    console.error('Enhanced shop search failed:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Calculate relevance scores and sort
  const scoredResults = data.map(shop => ({
    ...shop,
    relevanceScore: calculateRelevanceScore(shop, searchTerm)
  }));

  // Sort by relevance score (highest first)
  scoredResults.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  return scoredResults;
}

/**
 * Get all available industries from shops for filter dropdown
 */
export async function getAvailableIndustries(): Promise<string[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('industry')
    .not('industry', 'is', null)
    .not('industry', 'eq', '');

  if (error) {
    console.error('Get industries failed:', error);
    return [];
  }

  // Get unique industries
  const industries = [...new Set(data?.map(d => d.industry).filter(Boolean) || [])];
  return industries.sort();
}

/**
 * Get all public shops for directory listing
 */
export async function getAllShops(limit = 50): Promise<ShopPublicInfo[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, slug, invite_code, logo_url, address, city, state, phone, industry, business_type, shop_description')
    .limit(limit);

  if (error) {
    console.error('Get all shops failed:', error);
    return [];
  }

  return data || [];
}
