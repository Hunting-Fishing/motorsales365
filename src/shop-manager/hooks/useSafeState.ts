
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Safe state hook that prevents state updates after component unmount
 */
export function useSafeState<T>(initialState: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialState);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (mountedRef.current) {
      setState(value);
    }
  }, []);

  return [state, safeSetState];
}

/**
 * Safe async state hook with loading and error handling
 */
export function useSafeAsyncState<T>(initialState: T) {
  const [state, safeSetState] = useSafeState(initialState);
  const [loading, setLoading] = useSafeState(false);
  const [error, setError] = useSafeState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateState = useCallback(async (asyncOperation: () => Promise<T>) => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);
      const result = await asyncOperation();
      
      if (mountedRef.current) {
        safeSetState(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [safeSetState, setLoading, setError]);

  return {
    state,
    loading,
    error,
    updateState,
    setState: safeSetState
  };
}
