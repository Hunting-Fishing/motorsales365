import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthDebugInfo {
  sessionValid: boolean;
  tokenExpiry: string | null;
  localStorageKeys: string[];
  sessionStorageKeys: string[];
  clientConfig: {
    url: string;
    autoRefreshToken: boolean;
    persistSession: boolean;
  };
  lastAuthEvent: string | null;
  authErrors: string[];
  sessionHistory: Array<{
    timestamp: string;
    event: string;
    userId: string | null;
    sessionId: string | null;
  }>;
}

export function useAuthDebugger() {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo>({
    sessionValid: false,
    tokenExpiry: null,
    localStorageKeys: [],
    sessionStorageKeys: [],
    clientConfig: {
      url: '',
      autoRefreshToken: false,
      persistSession: false,
    },
    lastAuthEvent: null,
    authErrors: [],
    sessionHistory: [],
  });

  const sessionHistoryRef = useRef<AuthDebugInfo['sessionHistory']>([]);
  const errorsRef = useRef<string[]>([]);

  const addSessionEvent = (event: string, session: Session | null) => {
    const eventData = {
      timestamp: new Date().toISOString(),
      event,
      userId: session?.user?.id || null,
      sessionId: session?.access_token?.substring(0, 10) || null,
    };
    
    sessionHistoryRef.current = [eventData, ...sessionHistoryRef.current.slice(0, 9)];
    console.log('🔍 Auth Debug Event:', eventData);
  };

  const addAuthError = (error: string) => {
    errorsRef.current = [error, ...errorsRef.current.slice(0, 4)];
    console.error('🚨 Auth Debug Error:', error);
  };

  const analyzeStorageKeys = () => {
    const localKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('supabase') || key.includes('sb-') || key.includes('auth')
    );
    
    const sessionKeys = typeof sessionStorage !== 'undefined' 
      ? Object.keys(sessionStorage).filter(key => 
          key.startsWith('supabase') || key.includes('sb-') || key.includes('auth')
        )
      : [];

    return { localKeys, sessionKeys };
  };

  const validateSession = async (): Promise<{
    valid: boolean;
    tokenExpiry: string | null;
    error?: string;
  }> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addAuthError(`Session validation error: ${error.message}`);
        return { valid: false, tokenExpiry: null, error: error.message };
      }

      if (!session) {
        addAuthError('No active session found');
        return { valid: false, tokenExpiry: null, error: 'No session' };
      }

      // Check token expiry
      const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null;
      const now = new Date();
      const isExpired = expiresAt ? now > expiresAt : false;

      if (isExpired) {
        addAuthError(`Session token expired at ${expiresAt?.toISOString()}`);
        return { 
          valid: false, 
          tokenExpiry: expiresAt?.toISOString() || null,
          error: 'Token expired'
        };
      }

      console.log('✅ Session validation successful:', {
        userId: session.user.id,
        expiresAt: expiresAt?.toISOString(),
        timeUntilExpiry: expiresAt ? Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60) + ' minutes' : 'unknown'
      });

      return { 
        valid: true, 
        tokenExpiry: expiresAt?.toISOString() || null 
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
      addAuthError(`Session validation failed: ${errorMsg}`);
      return { valid: false, tokenExpiry: null, error: errorMsg };
    }
  };

  const testDatabaseConnection = async (): Promise<boolean> => {
    try {
      console.log('🔍 Testing database connection with auth...');
      
      // Test a simple query that requires authentication
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .limit(1);

      if (error) {
        addAuthError(`Database connection test failed: ${error.message}`);
        console.error('❌ Database connection test failed:', error);
        return false;
      }

      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown database error';
      addAuthError(`Database connection test error: ${errorMsg}`);
      console.error('❌ Database connection test error:', error);
      return false;
    }
  };

  const refreshDebugInfo = async () => {
    const { localKeys, sessionKeys } = analyzeStorageKeys();
    const sessionValidation = await validateSession();
    
    setDebugInfo({
      sessionValid: sessionValidation.valid,
      tokenExpiry: sessionValidation.tokenExpiry,
      localStorageKeys: localKeys,
      sessionStorageKeys: sessionKeys,
      clientConfig: {
        url: 'https://oudkbrnvommbvtuispla.supabase.co',
        autoRefreshToken: true,
        persistSession: true,
      },
      lastAuthEvent: sessionHistoryRef.current[0]?.event || null,
      authErrors: errorsRef.current,
      sessionHistory: sessionHistoryRef.current,
    });

    // Test database connection if session is valid
    if (sessionValidation.valid) {
      await testDatabaseConnection();
    }
  };

  useEffect(() => {
    // Set up auth state change listener for debugging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        addSessionEvent(event, session);
        
        // Refresh debug info after auth state changes
        setTimeout(() => {
          refreshDebugInfo();
        }, 100);
      }
    );

    // Initial debug info collection
    refreshDebugInfo();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    debugInfo,
    refreshDebugInfo,
    addAuthError,
    addSessionEvent,
    validateSession,
    testDatabaseConnection,
  };
}