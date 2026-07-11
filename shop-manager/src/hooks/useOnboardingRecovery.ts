
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ErrorHandler } from '@/utils/errorHandler';
import { OnboardingError, ErrorType, ErrorSeverity } from '@/utils/errorTypes';

const DRAFT_STORAGE_KEY = 'onboarding_draft';

export function useOnboardingRecovery() {
  const [hasDraftData, setHasDraftData] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  // Check for draft data on mount
  useEffect(() => {
    const draftData = localStorage.getItem(DRAFT_STORAGE_KEY);
    setHasDraftData(!!draftData);
  }, []);

  const saveDraft = (data: any, currentStep: number) => {
    try {
      const draftData = {
        data,
        currentStep,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      console.log('Draft saved successfully');
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const loadDraft = () => {
    try {
      const draftData = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftData) {
        return JSON.parse(draftData);
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
    return null;
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraftData(false);
      console.log('Draft cleared successfully');
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  const recoverFromError = async () => {
    setIsRecovering(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new OnboardingError(
          ErrorType.AUTHENTICATION,
          ErrorSeverity.CRITICAL,
          'NO_USER',
          'No authenticated user',
          'Please log in to continue'
        );
      }

      // Get user's profile to find shop_id - handle both patterns
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (profile?.shop_id) {
        // Check existing onboarding progress
        const { data: progress } = await supabase
          .from('onboarding_progress')
          .select('*')
          .eq('shop_id', profile.shop_id)
          .maybeSingle();

        if (progress) {
          console.log('Found existing onboarding progress:', progress);
          return {
            currentStep: progress.current_step || 0,
            data: progress.step_data || {},
            completedSteps: progress.completed_steps || []
          };
        }
      }

      // Fallback to draft data
      const draftData = loadDraft();
      if (draftData) {
        console.log('Loaded draft data for recovery');
        return draftData;
      }

      return null;
    } catch (error) {
      const processedError = ErrorHandler.handleError(error, { context: 'onboarding_recovery' });
      throw processedError;
    } finally {
      setIsRecovering(false);
    }
  };

  return {
    hasDraftData,
    isRecovering,
    saveDraft,
    loadDraft,
    clearDraft,
    recoverFromError
  };
}
