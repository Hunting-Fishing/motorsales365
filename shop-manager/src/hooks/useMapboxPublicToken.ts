import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'mapbox_public_token';

export function useMapboxPublicToken() {
  const envToken = (import.meta as any).env?.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined;

  const [storedToken, setStoredToken] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [edgeFunctionToken, setEdgeFunctionToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch token from edge function if no local token available
  useEffect(() => {
    const fetchTokenFromEdge = async () => {
      // Only fetch if we don't already have a token
      if (envToken || storedToken) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (!error && data?.token) {
          setEdgeFunctionToken(data.token);
        }
      } catch (err) {
        console.log('Could not fetch Mapbox token from edge function');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenFromEdge();
  }, [envToken, storedToken]);

  const token = useMemo(() => {
    return (envToken || storedToken || edgeFunctionToken || '').trim();
  }, [envToken, storedToken, edgeFunctionToken]);

  const setToken = useCallback((nextToken: string) => {
    const trimmed = (nextToken || '').trim();
    setStoredToken(trimmed);

    try {
      if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return {
    token,
    setToken,
    hasEnvToken: Boolean(envToken && envToken.trim()),
    isLoading,
  };
}
