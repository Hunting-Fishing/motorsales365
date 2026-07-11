import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface AppSettings {
  // General Settings
  general: {
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    language: string;
    currency: string;
  };
  
  // Appearance Settings
  appearance: {
    theme: 'light' | 'dark' | 'system';
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    fontSize: 'sm' | 'base' | 'lg';
    compactMode: boolean;
  };
  
  // Notification Settings
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    workOrderUpdates: boolean;
    customerMessages: boolean;
    inventoryAlerts: boolean;
    reminderNotifications: boolean;
    soundEnabled: boolean;
    volume: number;
  };
  
  // Work Order Settings
  workOrders: {
    defaultStatus: string;
    autoAssignment: boolean;
    requirePhotos: boolean;
    allowCustomerComments: boolean;
    estimateApprovalRequired: boolean;
    autoInvoiceGeneration: boolean;
    defaultPriority: 'low' | 'medium' | 'high';
  };
  
  // Mobile Settings
  mobile: {
    offlineMode: boolean;
    syncFrequency: number; // minutes
    pushNotifications: boolean;
    cameraQuality: 'low' | 'medium' | 'high';
    locationTracking: boolean;
    dataCompression: boolean;
  };
  
  // Dashboard Settings
  dashboard: {
    defaultView: 'overview' | 'analytics' | 'work-orders';
    refreshInterval: number; // seconds
    showQuickActions: boolean;
    displayMetrics: string[];
    chartAnimations: boolean;
  };
}

type SettingsAction = 
  | { type: 'LOAD_SETTINGS'; payload: AppSettings }
  | { type: 'UPDATE_SETTING'; category: keyof AppSettings; key: string; value: any }
  | { type: 'UPDATE_CATEGORY'; category: keyof AppSettings; settings: any }
  | { type: 'RESET_SETTINGS' }
  | { type: 'RESET_CATEGORY'; category: keyof AppSettings };

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: (category: keyof AppSettings, key: string, value: any) => void;
  updateCategory: (category: keyof AppSettings, settings: any) => void;
  resetSettings: () => void;
  resetCategory: (category: keyof AppSettings) => void;
  saveSettings: () => Promise<void>;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

const defaultSettings: AppSettings = {
  general: {
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    language: 'en',
    currency: 'USD',
  },
  appearance: {
    theme: 'light',
    primaryColor: '#3B82F6',
    secondaryColor: '#64748B',
    accentColor: '#10B981',
    fontFamily: 'Inter',
    fontSize: 'base',
    compactMode: false,
  },
  notifications: {
    email: true,
    sms: false,
    push: true,
    workOrderUpdates: true,
    customerMessages: true,
    inventoryAlerts: true,
    reminderNotifications: true,
    soundEnabled: true,
    volume: 0.8,
  },
  workOrders: {
    defaultStatus: 'pending',
    autoAssignment: false,
    requirePhotos: false,
    allowCustomerComments: true,
    estimateApprovalRequired: true,
    autoInvoiceGeneration: false,
    defaultPriority: 'medium',
  },
  mobile: {
    offlineMode: true,
    syncFrequency: 15,
    pushNotifications: true,
    cameraQuality: 'medium',
    locationTracking: false,
    dataCompression: true,
  },
  dashboard: {
    defaultView: 'overview',
    refreshInterval: 30,
    showQuickActions: true,
    displayMetrics: ['work_orders', 'revenue', 'customers', 'inventory'],
    chartAnimations: true,
  },
};

const SettingsContext = createContext<SettingsContextType | null>(null);

function settingsReducer(state: AppSettings, action: SettingsAction): AppSettings {
  switch (action.type) {
    case 'LOAD_SETTINGS':
      return action.payload;
    case 'UPDATE_SETTING':
      return {
        ...state,
        [action.category]: {
          ...state[action.category],
          [action.key]: action.value,
        },
      };
    case 'UPDATE_CATEGORY':
      return {
        ...state,
        [action.category]: {
          ...state[action.category],
          ...action.settings,
        },
      };
    case 'RESET_SETTINGS':
      return defaultSettings;
    case 'RESET_CATEGORY':
      return {
        ...state,
        [action.category]: defaultSettings[action.category],
      };
    default:
      return state;
  }
}

export function UnifiedSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, dispatch] = useReducer(settingsReducer, defaultSettings);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false);
  const { toast } = useToast();

  // Load settings from localStorage on mount
  useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('app-settings');
        if (saved) {
          const parsedSettings = JSON.parse(saved);
          dispatch({ type: 'LOAD_SETTINGS', payload: { ...defaultSettings, ...parsedSettings } });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast({
          title: 'Settings Error',
          description: 'Failed to load saved settings. Using defaults.',
          variant: 'destructive',
        });
      }
    };

    loadSettings();
  }, [toast]);

  const updateSetting = React.useCallback((category: keyof AppSettings, key: string, value: any) => {
    dispatch({ type: 'UPDATE_SETTING', category, key, value });
    setHasUnsavedChanges(true);
  }, []);

  const updateCategory = React.useCallback((category: keyof AppSettings, categorySettings: any) => {
    dispatch({ type: 'UPDATE_CATEGORY', category, settings: categorySettings });
    setHasUnsavedChanges(true);
  }, []);

  const resetSettings = React.useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' });
    setHasUnsavedChanges(true);
  }, []);

  const resetCategory = React.useCallback((category: keyof AppSettings) => {
    dispatch({ type: 'RESET_CATEGORY', category });
    setHasUnsavedChanges(true);
  }, []);

  const saveSettings = React.useCallback(async () => {
    setIsLoading(true);
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings));
      setHasUnsavedChanges(false);
      
      toast({
        title: 'Settings Saved',
        description: 'Your settings have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Save Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [settings, toast]);

  // Auto-save settings when they change (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timeoutId = setTimeout(() => {
      saveSettings();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [settings, hasUnsavedChanges, saveSettings]);

  const contextValue: SettingsContextType = {
    settings,
    updateSetting,
    updateCategory,
    resetSettings,
    resetCategory,
    saveSettings,
    isLoading,
    hasUnsavedChanges,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useUnifiedSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useUnifiedSettings must be used within UnifiedSettingsProvider');
  }
  return context;
}