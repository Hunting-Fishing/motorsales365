// Unified services for the new data persistence system
import { businessConstantsService, type BusinessConstant, type BusinessConstantsResponse } from './businessConstantsService';
import { unifiedSettingsService, type UnifiedSetting } from './unifiedSettingsService';

export { businessConstantsService, type BusinessConstant, type BusinessConstantsResponse };
export { unifiedSettingsService, type UnifiedSetting };

// Utility functions for common operations
export const unifiedServices = {
  businessConstants: businessConstantsService,
  settings: unifiedSettingsService
};