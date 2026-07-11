
export interface Company {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  taxId?: string;
}

export interface CompanySettings {
  id: string;
  companyId: string;
  settingKey: string;
  settingValue: any;
}

export interface BusinessHours {
  id: string;
  companyId: string;
  dayOfWeek: number;
  open: string;
  close: string;
  isClosed: boolean;
}
