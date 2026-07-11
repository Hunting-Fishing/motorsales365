import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Location {
  id: string;
  address: string;
  coordinates: [number, number]; // [lng, lat]
  name?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface OptimizedRoute {
  geometry: {
    type: string;
    coordinates: [number, number][];
  };
  duration: number;
  distance: number;
  durationMinutes: number;
  distanceMiles: number;
}

export interface RouteLeg {
  from: string;
  to: string;
  duration: number;
  distance: number;
  durationMinutes: number;
  distanceMiles: number;
  steps?: { instruction: string; distance: number; duration: number }[];
}

export interface RouteOptimizationResult {
  success: boolean;
  optimizedRoute: OptimizedRoute;
  optimizedOrder: Location[];
  legs: RouteLeg[];
}

export interface GeocodingResult {
  placeName: string;
  coordinates: [number, number];
  address: string;
  context?: {
    postcode?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export function useRouteOptimization() {
  return useMutation({
    mutationFn: async ({
      origin,
      destinations,
      returnToOrigin = true,
    }: {
      origin: [number, number];
      destinations: Location[];
      returnToOrigin?: boolean;
    }): Promise<RouteOptimizationResult> => {
      const { data, error } = await supabase.functions.invoke('mapbox-route-optimization', {
        body: { origin, destinations, returnToOrigin },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Route optimization failed');

      return data;
    },
  });
}

export function useGeocode() {
  return useMutation({
    mutationFn: async ({
      address,
      coordinates,
    }: {
      address?: string;
      coordinates?: [number, number];
    }): Promise<GeocodingResult[]> => {
      const { data, error } = await supabase.functions.invoke('mapbox-geocode', {
        body: { address, coordinates },
      });

      if (error) throw error;
      return data.results || [];
    },
  });
}
