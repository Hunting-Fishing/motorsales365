import { useMemo } from 'react';
import { useTaxSettings } from '@/hooks/useTaxSettings';
import { validateTaxSettings, createTaxAuditEntry } from '@/utils/taxValidation';
import { TaxSettings } from '@/services/settings/taxSettingsService';

interface UseSystemTaxIntegrationProps {
  shopId?: string;
  enableAuditTrail?: boolean;
}

/**
 * System-wide tax integration hook that provides:
 * - Centralized tax settings access
 * - System validation
 * - Audit trail support
 * - Consistency checks across modules
 */
export function useSystemTaxIntegration({
  shopId,
  enableAuditTrail = true
}: UseSystemTaxIntegrationProps) {
  const { 
    taxSettings, 
    loading, 
    saving, 
    dataChanged, 
    updateTaxSetting, 
    saveTaxSettings,
    loadTaxSettings 
  } = useTaxSettings(shopId);

  // Validate tax settings
  const validation = useMemo(() => {
    if (!taxSettings) {
      return {
        isValid: false,
        errors: ['Tax settings not loaded'],
        warnings: []
      };
    }
    return validateTaxSettings(taxSettings);
  }, [taxSettings]);

  // System-wide tax configuration status
  const systemStatus = useMemo(() => {
    if (loading) return 'loading';
    if (!taxSettings) return 'not_configured';
    if (!validation.isValid) return 'invalid';
    if (validation.warnings.length > 0) return 'warnings';
    return 'configured';
  }, [loading, taxSettings, validation]);

  // Audit trail functions
  const createAuditEntry = (
    entityType: 'quote' | 'invoice' | 'work_order',
    entityId: string,
    taxCalculation: any,
    userId?: string
  ) => {
    if (!enableAuditTrail) return null;
    return createTaxAuditEntry(entityType, entityId, taxCalculation, userId);
  };

  // Check if tax integration is properly configured for each module
  const moduleStatus = useMemo(() => {
    const configured = systemStatus === 'configured';
    return {
      quotes: configured,
      invoices: configured,
      workOrders: configured,
      fleet: configured,
      business: configured
    };
  }, [systemStatus]);

  return {
    // Core tax settings
    taxSettings,
    loading,
    saving,
    dataChanged,
    
    // Validation
    validation,
    systemStatus,
    moduleStatus,
    
    // Actions
    updateTaxSetting,
    saveTaxSettings,
    loadTaxSettings,
    createAuditEntry,
    
    // Helper functions
    isSystemReady: systemStatus === 'configured',
    hasWarnings: validation.warnings.length > 0,
    hasErrors: validation.errors.length > 0,
    
    // System metrics
    metrics: {
      configurationComplete: Object.values(moduleStatus).every(Boolean),
      moduleCount: Object.keys(moduleStatus).length,
      configuredModules: Object.entries(moduleStatus).filter(([, configured]) => configured).length
    }
  };
}