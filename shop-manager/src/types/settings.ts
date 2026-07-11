
export interface AppearanceSettings {
  id: string;
  shop_id: string;
  theme_mode: 'light' | 'dark' | 'auto';
  font_family: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmailProviderSettings {
  id: string;
  shop_id: string;
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'ses' | 'other';
  api_key?: string;
  from_email?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrationSettings {
  id: string;
  shop_id: string;
  integration_type: 'payment' | 'calendar' | 'sms' | 'analytics' | 'crm' | 'other';
  config: Record<string, any>;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SecuritySettings {
  id: string;
  shop_id: string;
  password_policy: {
    min_length: number;
    require_numbers: boolean;
    require_special: boolean;
  };
  mfa_enabled: boolean;
  session_timeout_minutes: number;
  ip_whitelist: string[];
  created_at?: string;
  updated_at?: string;
}

export interface SettingsTabProps {
  shopId?: string;
}
