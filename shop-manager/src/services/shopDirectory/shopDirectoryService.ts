
import { supabase } from "@/lib/supabase";

export interface ShopDirectoryItem {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  shop_description?: string;
  shop_image_url?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  distance?: number; // Added distance property to the interface
}

export interface ShopSearchParams {
  searchTerm?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in miles
  limit?: number;
}

export async function getPublicShops(params: ShopSearchParams = {}): Promise<ShopDirectoryItem[]> {
  try {
    const { searchTerm, latitude, longitude, radius = 50, limit = 50 } = params;
    
    let query = supabase
      .from('shops')
      .select(`
        id, 
        name, 
        address, 
        city, 
        state, 
        postal_code,
        phone,
        email,
        logo_url,
        shop_description,
        shop_image_url,
        latitude,
        longitude,
        is_active,
        organizations!inner(
          organization_visibility!inner(is_public, display_in_directory)
        )
      `)
      .eq('is_active', true)
      .eq('organizations.organization_visibility.display_in_directory', true);
    
    // Apply search term if provided
    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,state.ilike.%${searchTerm}%`);
    }
    
    // Set result limit
    query = query.limit(limit);
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching public shops:", error);
      throw error;
    }
    
    let shops: ShopDirectoryItem[] = data || [];
    
    // Calculate distances if we have coordinates
    if (latitude && longitude) {
      shops = shops.map(shop => {
        let distance = null;
        if (shop.latitude && shop.longitude) {
          // Calculate distance using Haversine formula
          distance = calculateDistance(
            latitude, 
            longitude, 
            shop.latitude, 
            shop.longitude
          );
        }
        // Create a new object with all shop properties plus the distance
        return { ...shop, distance } as ShopDirectoryItem;
      });
      
      // Filter by radius if requested
      if (radius) {
        shops = shops.filter(shop => shop.distance !== null && shop.distance <= radius);
      }
      
      // Sort by distance
      shops = shops.sort((a, b) => {
        // Handle null distance values
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }
    
    return shops;
  } catch (error) {
    console.error("Error in getPublicShops:", error);
    return [];
  }
}

// Helper function to calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export async function registerWithShop(customerId: string, shopId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('customer_shop_relationships')
      .insert({
        customer_id: customerId,
        shop_id: shopId,
        status: 'active'
      });
      
    if (error) {
      console.error("Error registering with shop:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in registerWithShop:", error);
    return false;
  }
}

export async function unregisterFromShop(customerId: string, shopId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('customer_shop_relationships')
      .delete()
      .eq('customer_id', customerId)
      .eq('shop_id', shopId);
      
    if (error) {
      console.error("Error unregistering from shop:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in unregisterFromShop:", error);
    return false;
  }
}

export async function getCustomerShops(customerId: string): Promise<ShopDirectoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('customer_shop_relationships')
      .select(`
        shops (
          id,
          name,
          address,
          city,
          state,
          postal_code,
          phone,
          email,
          logo_url,
          shop_description,
          shop_image_url,
          latitude,
          longitude,
          is_active
        )
      `)
      .eq('customer_id', customerId)
      .eq('status', 'active');
      
    if (error) {
      console.error("Error fetching customer shops:", error);
      throw error;
    }
    
    // Transform the nested data structure into a flat array of shops
    const shops: ShopDirectoryItem[] = data?.map(item => {
      // Map each shops object to our ShopDirectoryItem interface explicitly
      const shop = item.shops as any;
      
      return {
        id: shop.id,
        name: shop.name,
        address: shop.address,
        city: shop.city,
        state: shop.state,
        postal_code: shop.postal_code,
        phone: shop.phone,
        email: shop.email,
        logo_url: shop.logo_url,
        shop_description: shop.shop_description,
        shop_image_url: shop.shop_image_url,
        latitude: shop.latitude,
        longitude: shop.longitude,
        is_active: shop.is_active
      };
    }) || [];
    
    return shops;
  } catch (error) {
    console.error("Error in getCustomerShops:", error);
    return [];
  }
}
