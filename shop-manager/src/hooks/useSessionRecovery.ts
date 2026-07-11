import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/utils/authCleanup';

export interface SessionRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  forceRefresh?: boolean;
}

export function useSessionRecovery() {
  const recoveryInProgressRef = useRef(false);
  const retryCountRef = useRef(0);

  const attemptSessionRecovery = useCallback(async (
    options: SessionRecoveryOptions = {}
  ): Promise<{
    success: boolean;
    session: any;
    error?: string;
    recoveryStep?: string;
  }> => {
    const { maxRetries = 3, retryDelay = 1000, forceRefresh = false } = options;

    if (recoveryInProgressRef.current) {
      console.log('🔄 Session recovery already in progress, skipping...');
      return { success: false, session: null, error: 'Recovery in progress' };
    }

    recoveryInProgressRef.current = true;
    retryCountRef.current += 1;

    try {
      console.log(`🔄 Starting session recovery attempt ${retryCountRef.current}/${maxRetries}`);

      // Step 1: Check current session first
      console.log('🔍 Step 1: Checking current session...');
      let { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && !forceRefresh) {
        // Validate the session is actually working
        console.log('🔍 Step 1a: Validating session with database test...');
        try {
          const { error: dbError } = await supabase
            .from('user_roles')
            .select('user_id')
            .limit(1);
          
          if (!dbError) {
            console.log('✅ Session recovery: Current session is valid');
            retryCountRef.current = 0;
            return { success: true, session, recoveryStep: 'current_session_valid' };
          } else {
            console.log('❌ Session exists but database test failed:', dbError.message);
          }
        } catch (dbError) {
          console.log('❌ Database test failed:', dbError);
        }
      }

      // Step 2: Try to refresh the session
      if (session?.refresh_token) {
        console.log('🔄 Step 2: Attempting to refresh session...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: session.refresh_token
        });

        if (refreshData.session && !refreshError) {
          console.log('✅ Session recovery: Session refreshed successfully');
          retryCountRef.current = 0;
          return { success: true, session: refreshData.session, recoveryStep: 'session_refreshed' };
        } else {
          console.log('❌ Session refresh failed:', refreshError?.message);
        }
      }

      // Step 3: Clean up and try to get session again
      console.log('🧹 Step 3: Cleaning up auth state and retrying...');
      cleanupAuthState();
      
      // Wait a bit for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: retryData, error: retryError } = await supabase.auth.getSession();
      
      if (retryData.session && !retryError) {
        console.log('✅ Session recovery: Session restored after cleanup');
        retryCountRef.current = 0;
        return { success: true, session: retryData.session, recoveryStep: 'session_restored' };
      }

      // Step 4: If we have retries left, try again
      if (retryCountRef.current < maxRetries) {
        console.log(`⏳ Step 4: Retrying in ${retryDelay}ms... (${retryCountRef.current}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        recoveryInProgressRef.current = false;
        return attemptSessionRecovery(options);
      }

      // Step 5: Complete failure - user needs to re-authenticate
      console.log('❌ Session recovery failed: All attempts exhausted');
      retryCountRef.current = 0;
      return { 
        success: false, 
        session: null, 
        error: 'Session recovery failed after all attempts',
        recoveryStep: 'recovery_failed'
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown recovery error';
      console.error('❌ Session recovery error:', errorMsg);
      retryCountRef.current = 0;
      return { 
        success: false, 
        session: null, 
        error: errorMsg,
        recoveryStep: 'recovery_error'
      };
    } finally {
      recoveryInProgressRef.current = false;
    }
  }, []);

  const forceSessionRefresh = useCallback(async () => {
    console.log('🔄 Forcing session refresh...');
    return attemptSessionRecovery({ forceRefresh: true, maxRetries: 1 });
  }, [attemptSessionRecovery]);

  const isRecoveryInProgress = useCallback(() => {
    return recoveryInProgressRef.current;
  }, []);

  const resetRetryCount = useCallback(() => {
    retryCountRef.current = 0;
  }, []);

  return {
    attemptSessionRecovery,
    forceSessionRefresh,
    isRecoveryInProgress,
    resetRetryCount,
  };
}