import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  getFormDraft, 
  saveFormDraft, 
  deleteFormDraftByTemplate,
  FormDraft 
} from '@/services/formDraftService';
import { supabase } from '@/integrations/supabase/client';

interface UseFormDraftOptions {
  templateId: string;
  autoSaveInterval?: number; // in milliseconds, default 30 seconds
  onDraftLoaded?: (draftData: Record<string, any>) => void;
  customerId?: string;
  vehicleId?: string;
}

interface UseFormDraftReturn {
  draft: FormDraft | null;
  isDraftLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  hasDraft: boolean;
  saveDraft: (data: Record<string, any>) => Promise<void>;
  loadDraft: () => Promise<Record<string, any> | null>;
  clearDraft: () => Promise<void>;
  setAutoSaveData: (data: Record<string, any>) => void;
}

export function useFormDraft({
  templateId,
  autoSaveInterval = 30000,
  onDraftLoaded,
  customerId,
  vehicleId,
}: UseFormDraftOptions): UseFormDraftReturn {
  const [draft, setDraft] = useState<FormDraft | null>(null);
  const [isDraftLoading, setIsDraftLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [userId, setUserId] = useState<string | undefined>();
  
  const autoSaveDataRef = useRef<Record<string, any> | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();
  }, []);

  // Load existing draft on mount
  useEffect(() => {
    const loadExistingDraft = async () => {
      if (!templateId) return;
      
      setIsDraftLoading(true);
      try {
        const existingDraft = await getFormDraft(templateId, userId);
        setDraft(existingDraft);
        
        if (existingDraft && onDraftLoaded) {
          onDraftLoaded(existingDraft.draftData);
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      } finally {
        setIsDraftLoading(false);
      }
    };

    loadExistingDraft();
  }, [templateId, userId, onDraftLoaded]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveInterval <= 0) return;

    const performAutoSave = async () => {
      if (autoSaveDataRef.current && Object.keys(autoSaveDataRef.current).length > 0) {
        try {
          const savedDraft = await saveFormDraft(templateId, autoSaveDataRef.current, {
            userId,
            customerId,
            vehicleId,
          });
          
          if (savedDraft) {
            setDraft(savedDraft);
            setLastSaved(new Date());
          }
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    };

    autoSaveTimerRef.current = setInterval(performAutoSave, autoSaveInterval);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [templateId, userId, customerId, vehicleId, autoSaveInterval]);

  const setAutoSaveData = useCallback((data: Record<string, any>) => {
    autoSaveDataRef.current = data;
  }, []);

  const saveDraft = useCallback(async (data: Record<string, any>) => {
    if (!templateId) return;
    
    setIsSaving(true);
    try {
      const savedDraft = await saveFormDraft(templateId, data, {
        userId,
        customerId,
        vehicleId,
      });
      
      if (savedDraft) {
        setDraft(savedDraft);
        setLastSaved(new Date());
        toast({
          title: 'Draft saved',
          description: 'Your progress has been saved.',
        });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to save draft.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [templateId, userId, customerId, vehicleId, toast]);

  const loadDraft = useCallback(async (): Promise<Record<string, any> | null> => {
    if (!templateId) return null;
    
    const existingDraft = await getFormDraft(templateId, userId);
    
    if (existingDraft) {
      setDraft(existingDraft);
      return existingDraft.draftData;
    }
    
    return null;
  }, [templateId, userId]);

  const clearDraft = useCallback(async () => {
    if (!templateId) return;
    
    try {
      await deleteFormDraftByTemplate(templateId, userId);
      setDraft(null);
      setLastSaved(null);
      autoSaveDataRef.current = null;
      
      toast({
        title: 'Draft cleared',
        description: 'Your draft has been removed.',
      });
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [templateId, userId, toast]);

  return {
    draft,
    isDraftLoading,
    isSaving,
    lastSaved,
    hasDraft: !!draft,
    saveDraft,
    loadDraft,
    clearDraft,
    setAutoSaveData,
  };
}
