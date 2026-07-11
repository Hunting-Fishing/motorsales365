
import { companyInfoService } from "./companyInfoService";
import { businessHoursService } from "./businessHoursService";
import { businessConstantsService } from '@/services/unified/businessConstantsService';
import { unifiedSettingsService } from '@/services/unified/unifiedSettingsService';

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  tax_id: string;
  business_type: string;
  industry: string;
  other_industry?: string;  
  logo_url: string;
  website?: string;
  description?: string;
}

export interface BusinessHours {
  id?: string;
  shop_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export const companyService = {
  // Company Info Methods
  getShopInfo: companyInfoService.getShopInfo,
  updateCompanyInfo: companyInfoService.updateCompanyInfo,
  uploadLogo: companyInfoService.uploadLogo,
  
  // Business Hours Methods
  getBusinessHours: businessHoursService.getBusinessHours,
  updateBusinessHours: businessHoursService.updateBusinessHours,
  
  // Business Industry Methods (now using unified service)
  addCustomIndustry: businessConstantsService.addCustomIndustry,
  
  // Unified Settings Methods
  getSetting: unifiedSettingsService.getSetting,
  setSetting: unifiedSettingsService.setSetting,
  getSettingsByCategory: unifiedSettingsService.getSettingsByCategory,
  setSettingsForCategory: unifiedSettingsService.setSettingsForCategory
};
