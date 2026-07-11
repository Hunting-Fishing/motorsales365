import { useState, useCallback } from 'react';

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export function useGeolocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<GeolocationPosition | null>(null);

  const getCurrentLocation = useCallback(async (options?: GeolocationOptions): Promise<GeolocationPosition> => {
    setIsLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by this browser';
        setError(error);
        setIsLoading(false);
        reject(new Error(error));
        return;
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLastPosition(position);
          setIsLoading(false);
          resolve(position);
        },
        (err) => {
          let errorMessage = 'Failed to get location';
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          
          setError(errorMessage);
          setIsLoading(false);
          reject(new Error(errorMessage));
        },
        defaultOptions
      );
    });
  }, []);

  const watchPosition = useCallback((
    onSuccess: (position: GeolocationPosition) => void,
    onError?: (error: GeolocationPositionError) => void,
    options?: GeolocationOptions
  ) => {
    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser';
      setError(error);
      return null;
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
      ...options
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLastPosition(position);
        setError(null);
        onSuccess(position);
      },
      (err) => {
        let errorMessage = 'Failed to watch location';
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case err.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        setError(errorMessage);
        onError?.(err);
      },
      defaultOptions
    );

    return watchId;
  }, []);

  const clearWatch = useCallback((watchId: number) => {
    navigator.geolocation.clearWatch(watchId);
  }, []);

  const calculateDistance = useCallback((
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }, []);

  const formatCoordinates = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    return {
      lat: parseFloat(latitude.toFixed(6)),
      lng: parseFloat(longitude.toFixed(6)),
      formatted: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    };
  }, []);

  return {
    isLoading,
    error,
    lastPosition,
    getCurrentLocation,
    watchPosition,
    clearWatch,
    calculateDistance,
    formatCoordinates
  };
}