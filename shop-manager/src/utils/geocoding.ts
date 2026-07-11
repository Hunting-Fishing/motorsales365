/**
 * Geocoding utility using Mapbox API
 */

// Fallback token - users should configure their own in Supabase secrets
const FALLBACK_MAPBOX_TOKEN = 'pk.eyJ1IjoibG92YWJsZS1kZXYiLCJhIjoiY200aGd0NnJyMGFwbTJscjE4NWpxMXptOSJ9.oQFUL7tXenYPGUouQRznow';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode an address string to get coordinates
 * @param address The address to geocode
 * @param accessToken Optional Mapbox access token (uses fallback if not provided)
 */
export async function geocodeAddress(address: string, accessToken?: string): Promise<GeocodingResult | null> {
  if (!address || address.trim().length < 5) {
    console.warn('Geocoding skipped: address too short or empty');
    return null;
  }

  const token = accessToken || FALLBACK_MAPBOX_TOKEN;

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${token}&limit=1&country=US,CA&types=address,place,poi`
    );

    if (!response.ok) {
      console.error('Geocoding request failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      console.log('Geocoded address successfully:', address, '→', feature.center);
      return {
        longitude: feature.center[0],
        latitude: feature.center[1],
        formattedAddress: feature.place_name || address
      };
    }

    console.warn('No geocoding results for address:', address);
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
