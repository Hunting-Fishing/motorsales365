import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface WeatherDay {
  id?: string;
  forecast_date: string;
  temperature_high: number | null;
  temperature_low: number | null;
  precipitation_chance: number | null;
  wind_speed: number | null;
  humidity: number | null;
  conditions: string | null;
  is_suitable_for_work: boolean | null;
  suitability?: 'good' | 'marginal' | 'poor';
}

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  address?: string;
  source?: 'user' | 'company' | 'default';
}

interface CachedWeather {
  forecast: WeatherDay[];
  location: WeatherLocation;
  fetched_at: string;
}

// Default location (fallback only)
const DEFAULT_LOCATION: WeatherLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
  address: 'San Francisco, CA',
  source: 'default',
};

// Cache duration in hours
const CACHE_DURATION_HOURS = 6;

export function usePowerWashingWeather() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch user's weather preference from database
  const userPreferenceQuery = useQuery({
    queryKey: ['power-washing-weather-preference', user?.id],
    queryFn: async (): Promise<WeatherLocation | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('power_washing_weather_preferences')
        .select('latitude, longitude, address')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching weather preference:', error);
        return null;
      }
      
      if (data) {
        return {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          address: data.address || undefined,
          source: 'user',
        };
      }
      return null;
    },
    enabled: !!user?.id,
  });

  // Fetch company location from shops table
  const companyLocationQuery = useQuery({
    queryKey: ['company-location'],
    queryFn: async (): Promise<WeatherLocation | null> => {
      // Get the user's shop
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user?.id)
        .maybeSingle();
      
      if (!profile?.shop_id) return null;

      const { data: shop, error } = await supabase
        .from('shops')
        .select('latitude, longitude, address, city, state')
        .eq('id', profile.shop_id)
        .maybeSingle();
      
      if (error || !shop) {
        console.error('Error fetching company location:', error);
        return null;
      }
      
      // If shop has lat/lng, use it
      if (shop.latitude && shop.longitude) {
        const address = [shop.address, shop.city, shop.state].filter(Boolean).join(', ') || 'Company Address';
        return {
          latitude: shop.latitude,
          longitude: shop.longitude,
          address,
          source: 'company',
        };
      }
      
      return null;
    },
    enabled: !!user?.id,
  });

  // Determine the effective location (priority: user > company > default)
  const getEffectiveLocation = (): WeatherLocation => {
    if (userPreferenceQuery.data) {
      return userPreferenceQuery.data;
    }
    if (companyLocationQuery.data) {
      return companyLocationQuery.data;
    }
    return DEFAULT_LOCATION;
  };

  // Check if cached weather is still valid
  const getCachedWeather = (location: WeatherLocation): CachedWeather | null => {
    try {
      const cached = localStorage.getItem('pw_weather_cache');
      if (cached) {
        const data = JSON.parse(cached) as CachedWeather;
        const fetchedAt = new Date(data.fetched_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60);
        
        // Check if cache is still valid and matches current location
        if (hoursDiff < CACHE_DURATION_HOURS &&
            Math.abs(data.location.latitude - location.latitude) < 0.01 &&
            Math.abs(data.location.longitude - location.longitude) < 0.01) {
          return data;
        }
      }
    } catch (e) {
      console.error('Error reading cached weather:', e);
    }
    return null;
  };

  // Save weather to cache
  const cacheWeather = (data: CachedWeather) => {
    try {
      localStorage.setItem('pw_weather_cache', JSON.stringify(data));
    } catch (e) {
      console.error('Error caching weather:', e);
    }
  };

  // Main weather query
  const weatherQuery = useQuery({
    queryKey: ['power-washing-weather', userPreferenceQuery.data, companyLocationQuery.data],
    queryFn: async (): Promise<{ forecast: WeatherDay[]; location: WeatherLocation; lastUpdated: string }> => {
      const location = getEffectiveLocation();
      
      // Check cache first
      const cached = getCachedWeather(location);
      if (cached) {
        console.log('Using cached weather data');
        return {
          forecast: cached.forecast,
          location: { ...cached.location, source: location.source },
          lastUpdated: cached.fetched_at,
        };
      }

      console.log('Fetching fresh weather data for:', location);

      // Fetch from edge function
      const { data, error } = await supabase.functions.invoke('get-weather-forecast', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });

      if (error) {
        console.error('Error fetching weather:', error);
        throw new Error(error.message || 'Failed to fetch weather data');
      }

      if (!data.success) {
        throw new Error(data.error || 'Weather API returned an error');
      }

      // Cache the result
      const cacheData: CachedWeather = {
        forecast: data.forecast,
        location: {
          ...location,
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        },
        fetched_at: data.fetched_at,
      };
      cacheWeather(cacheData);

      return {
        forecast: data.forecast,
        location: { ...cacheData.location, source: location.source },
        lastUpdated: data.fetched_at,
      };
    },
    staleTime: CACHE_DURATION_HOURS * 60 * 60 * 1000,
    retry: 2,
    enabled: !userPreferenceQuery.isLoading && !companyLocationQuery.isLoading,
  });

  // Mutation to update user's location preference
  const updateLocationMutation = useMutation({
    mutationFn: async (newLocation: { latitude: number; longitude: number; address?: string }) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Upsert the preference
      const { error } = await supabase
        .from('power_washing_weather_preferences')
        .upsert({
          user_id: user.id,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          address: newLocation.address,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });
      
      if (error) throw error;
      
      // Clear weather cache to force refresh
      localStorage.removeItem('pw_weather_cache');
      
      return newLocation;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['power-washing-weather-preference'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-weather'] });
      toast.success('Weather location updated');
    },
    onError: (error) => {
      console.error('Error updating location:', error);
      toast.error('Failed to update weather location');
    },
  });

  // Mutation to reset to company address
  const useCompanyLocationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Delete user's preference to fall back to company
      const { error } = await supabase
        .from('power_washing_weather_preferences')
        .delete()
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Clear weather cache
      localStorage.removeItem('pw_weather_cache');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-weather-preference'] });
      queryClient.invalidateQueries({ queryKey: ['power-washing-weather'] });
      toast.success('Using company address for weather');
    },
    onError: (error) => {
      console.error('Error resetting to company location:', error);
      toast.error('Failed to reset location');
    },
  });

  // Force refresh weather data
  const refreshWeather = async () => {
    localStorage.removeItem('pw_weather_cache');
    await queryClient.invalidateQueries({ queryKey: ['power-washing-weather'] });
  };

  const effectiveLocation = getEffectiveLocation();

  return {
    weatherData: weatherQuery.data?.forecast ?? [],
    location: weatherQuery.data?.location ?? effectiveLocation,
    companyLocation: companyLocationQuery.data,
    lastUpdated: weatherQuery.data?.lastUpdated,
    isLoading: weatherQuery.isLoading || userPreferenceQuery.isLoading || companyLocationQuery.isLoading,
    isError: weatherQuery.isError,
    error: weatherQuery.error,
    refetch: weatherQuery.refetch,
    refreshWeather,
    updateLocation: updateLocationMutation.mutate,
    isUpdatingLocation: updateLocationMutation.isPending,
    useCompanyLocation: useCompanyLocationMutation.mutate,
    isResettingToCompany: useCompanyLocationMutation.isPending,
    hasCustomLocation: !!userPreferenceQuery.data,
  };
}
