import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useCallback } from "react";

export interface WeldingSettings {
  id: string;
  shop_id: string;
  company_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  default_tax_rate: number;
  default_invoice_terms: string | null;
  business_hours: any;
  invoice_prefix: string;
  quote_prefix: string;
  po_prefix: string;
  currency: string;
  currency_symbol: string;
  enable_email_notifications: boolean;
  enable_customer_portal: boolean;
  require_deposit: boolean;
  deposit_percentage: number;
  invoice_next_number: number;
  quote_next_number: number;
  po_next_number: number;
  number_padding: number;
  include_year: boolean;
  year_format: string;
  travel_rate_per_km: number;
  mobile_quick_links: string[];
}

const defaults: WeldingSettings = {
  id: "",
  shop_id: "",
  company_name: "Welding Company",
  phone: null,
  email: null,
  address: null,
  logo_url: null,
  default_tax_rate: 0,
  default_invoice_terms: null,
  business_hours: null,
  invoice_prefix: "INV-",
  quote_prefix: "QUO-",
  po_prefix: "PO-",
  currency: "CAD",
  currency_symbol: "$",
  enable_email_notifications: false,
  enable_customer_portal: true,
  require_deposit: false,
  deposit_percentage: 25,
  invoice_next_number: 1,
  quote_next_number: 1,
  po_next_number: 1,
  number_padding: 4,
  include_year: false,
  year_format: "full",
  travel_rate_per_km: 0.65,
  mobile_quick_links: ["Overview", "Gallery", "Quotes", "Invoices", "Payments Due"],
};

export function previewNumber(prefix: string, nextNum: number, padding: number, includeYear: boolean, yearFormat: string): string {
  let result = prefix;
  if (includeYear) {
    const now = new Date();
    const year = yearFormat === "short" ? String(now.getFullYear()).slice(-2) : String(now.getFullYear());
    result += year + "-";
  }
  const effectivePadding = Math.max(padding, String(nextNum).length);
  result += String(nextNum).padStart(effectivePadding, "0");
  return result;
}

interface WeldingSettingsContextType {
  settings: WeldingSettings;
  loading: boolean;
  reload: () => Promise<void>;
  formatCurrency: (amount: number) => string;
  previewNextInvoice: () => string;
  previewNextQuote: () => string;
  previewNextPO: () => string;
}

const WeldingSettingsContext = createContext<WeldingSettingsContextType>({
  settings: defaults,
  loading: true,
  reload: async () => {},
  formatCurrency: (n) => `$${n.toFixed(2)}`,
  previewNextInvoice: () => "",
  previewNextQuote: () => "",
  previewNextPO: () => "",
});

export const useWeldingSettings = () => useContext(WeldingSettingsContext);

export const WeldingSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<WeldingSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const { userId, isAuthenticated } = useAuthUser();

  const load = useCallback(async () => {
    if (!userId || !isAuthenticated) { setLoading(false); return; }
    // Get shop_id from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("shop_id")
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();
    const shopId = profile?.shop_id;
    if (!shopId) { setLoading(false); return; }
    const { data } = await supabase
      .from("welding_company_settings" as any)
      .select("*")
      .eq("shop_id", shopId)
      .maybeSingle();
    if (data) {
      const d = data as any;
      setSettings({
        ...defaults,
        ...d,
        mobile_quick_links: Array.isArray(d.mobile_quick_links) ? d.mobile_quick_links : defaults.mobile_quick_links,
      });
    }
    setLoading(false);
  }, [userId, isAuthenticated]);

  useEffect(() => { if (userId && isAuthenticated) load(); }, [userId, isAuthenticated, load]);

  const formatCurrency = (amount: number) => `${settings.currency_symbol}${amount.toFixed(2)}`;

  const previewNextInvoice = () =>
    previewNumber(settings.invoice_prefix, settings.invoice_next_number, settings.number_padding, settings.include_year, settings.year_format);
  const previewNextQuote = () =>
    previewNumber(settings.quote_prefix, settings.quote_next_number, settings.number_padding, settings.include_year, settings.year_format);
  const previewNextPO = () =>
    previewNumber(settings.po_prefix, settings.po_next_number, settings.number_padding, settings.include_year, settings.year_format);

  return (
    <WeldingSettingsContext.Provider value={{ settings, loading, reload: load, formatCurrency, previewNextInvoice, previewNextQuote, previewNextPO }}>
      {children}
    </WeldingSettingsContext.Provider>
  );
};
