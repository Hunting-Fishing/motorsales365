import { supabase } from "@/integrations/supabase/client";
import { waMeUrl } from "./whatsapp";

export type SupportContact = {
  whatsappHref: string | null;
  messengerHref: string | null;
};

export async function fetchSupportContact(): Promise<SupportContact> {
  const { data } = await supabase
    .from("site_settings")
    .select("key, value")
    .in("key", ["support_whatsapp", "support_messenger"]);

  const map = new Map(data?.map((r) => [r.key, r.value?.trim() ?? ""]) ?? []);

  const whatsapp = map.get("support_whatsapp") || "";
  const messenger = map.get("support_messenger") || "";

  return {
    whatsappHref: waMeUrl(whatsapp) ?? null,
    messengerHref: messenger || null,
  };
}
