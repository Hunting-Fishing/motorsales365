import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const INQUIRY_TYPES = [
  "financing",
  "insurance",
  "or_cr",
  "title_transfer",
  "inspection",
  "towing",
  "other",
] as const;
type InquiryType = (typeof INQUIRY_TYPES)[number];

interface Input {
  inquiryType: InquiryType;
  contactName: string;
  email: string;
  phone?: string;
  message?: string;
  vehicleSummary?: string;
  listingId?: string;
  userId?: string;
  sourceUrl?: string;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export const createServiceInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: Input) => {
    if (!INQUIRY_TYPES.includes(data.inquiryType)) {
      throw new Error("Invalid inquiry type");
    }
    const name = (data.contactName ?? "").trim();
    const email = (data.email ?? "").trim().toLowerCase();
    if (name.length < 1 || name.length > 100) throw new Error("Name must be 1–100 characters");
    if (email.length > 255 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      throw new Error("Email is invalid");
    }
    if (data.phone && data.phone.length > 30) throw new Error("Phone too long");
    if (data.message && data.message.length > 2000) throw new Error("Message too long");
    if (data.vehicleSummary && data.vehicleSummary.length > 300) {
      throw new Error("Vehicle summary too long");
    }
    if (data.listingId && !isUuid(data.listingId)) throw new Error("Invalid listingId");
    if (data.userId && !isUuid(data.userId)) throw new Error("Invalid userId");
    if (data.sourceUrl && data.sourceUrl.length > 500) throw new Error("Source URL too long");
    return { ...data, contactName: name, email };
  })
  .handler(async ({ data }) => {
    const { error, data: row } = await supabaseAdmin
      .from("service_inquiries")
      .insert({
        inquiry_type: data.inquiryType,
        contact_name: data.contactName,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message ?? null,
        vehicle_summary: data.vehicleSummary ?? null,
        listing_id: data.listingId ?? null,
        user_id: data.userId ?? null,
        source_url: data.sourceUrl ?? null,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    // Fan-out to the staff queue. Fail-soft if email infra is down.
    try {
      await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          template: "service-inquiry-staff-notice",
          to: "partners@365motorsales.ph",
          data: {
            inquiry_id: (row as any).id,
            inquiry_type: data.inquiryType,
            contact_name: data.contactName,
            email: data.email,
            phone: data.phone ?? null,
            vehicle_summary: data.vehicleSummary ?? null,
            message: data.message ?? null,
            source_url: data.sourceUrl ?? null,
          },
        },
      } as any);
    } catch {
      // No-op; the row is already saved and visible to staff.
    }

    return { ok: true, id: (row as any).id };
  });
