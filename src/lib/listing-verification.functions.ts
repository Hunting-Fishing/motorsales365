/**
 * LTO Document Verification for listings.
 *
 * Sellers upload their Certificate of Registration (CR) and Official Receipt
 * (OR) to a private storage bucket. This server function fetches each doc,
 * runs it through the configured standalone vision provider for structured
 * field extraction, then cross-checks the extracted fields against the
 * listing to build a mismatch report and an overall verification status.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  listingId: z.string().uuid(),
});

const docSchema = z.object({
  plate_no: z.string().nullable().optional(),
  engine_no: z.string().nullable().optional(),
  chassis_no: z.string().nullable().optional(),
  vin: z.string().nullable().optional(),
  make: z.string().nullable().optional(),
  series_model: z.string().nullable().optional(),
  body_type: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  fuel_type: z.string().nullable().optional(),
  year_model: z.union([z.string(), z.number()]).nullable().optional(),
  owner_name: z.string().nullable().optional(),
  cr_date: z.string().nullable().optional(),
  or_valid_until: z.string().nullable().optional(),
  or_renewal_due: z.string().nullable().optional(),
  received_from: z.string().nullable().optional(),
});
type DocFields = z.infer<typeof docSchema>;

export type FieldCheck = {
  field: string;
  label: string;
  listingValue: string | null;
  documentValue: string | null;
  match: "match" | "mismatch" | "missing";
};

const SYSTEM_PROMPT = `You extract vehicle registration data from Philippine LTO documents (Certificate of Registration "CR" and Official Receipt "OR"). Return ONLY a JSON object — no prose, no markdown fences.

Shape:
{
  "plate_no": string|null,
  "engine_no": string|null,
  "chassis_no": string|null,
  "vin": string|null,
  "make": string|null,
  "series_model": string|null,
  "body_type": string|null,
  "color": string|null,
  "fuel_type": string|null,
  "year_model": string|null,
  "owner_name": string|null,
  "cr_date": string|null,
  "or_valid_until": string|null,
  "or_renewal_due": string|null,
  "received_from": string|null
}

Rules:
- Copy values verbatim from the document. Never guess.
- Dates as MM/DD/YYYY when possible.
- If a field is not visible or not present on this document type, return null for it.
- CRs typically have plate/engine/chassis/VIN/make/series/color/year/owner. ORs have plate/valid-until/renewal/received-from.`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  return s === -1 || e === -1 ? raw.trim() : raw.slice(s, e + 1).trim();
}

function norm(v: unknown): string {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [_, a, b, c] = m;
    void _;
    const yr = c.length === 2 ? Number(c) + 2000 : Number(c);
    const d = new Date(Date.UTC(yr, Number(a) - 1, Number(b)));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function compareField(
  field: string,
  label: string,
  listing: string | null | undefined,
  doc: string | null | undefined,
  opts: { exact?: boolean } = {},
): FieldCheck {
  const lv = norm(listing);
  const dv = norm(doc);
  if (!dv) return { field, label, listingValue: listing ?? null, documentValue: null, match: "missing" };
  if (!lv) return { field, label, listingValue: null, documentValue: doc ?? null, match: "missing" };
  const match = opts.exact ? lv === dv : lv === dv || lv.includes(dv) || dv.includes(lv);
  return {
    field,
    label,
    listingValue: listing ?? null,
    documentValue: doc ?? null,
    match: match ? "match" : "mismatch",
  };
}

async function extractDocFields(
  bytes: Uint8Array,
  mediaType: string,
  gateway: ReturnType<typeof createOpenAICompatible>,
  modelName: string,
  docType: "cr" | "or",
): Promise<DocFields> {
  const model = gateway(modelName);
  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract fields from this ${docType === "cr" ? "Certificate of Registration (CR)" : "Official Receipt (OR)"} and return the JSON object described.`,
          },
          { type: "image", image: bytes, mediaType },
        ],
      },
    ],
  });
  try {
    return docSchema.parse(JSON.parse(extractJson(result.text)));
  } catch {
    return {};
  }
}

export const verifyListingDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: listing, error: lErr } = await supabase
      .from("listings")
      .select("id,user_id,title,attributes,vehicle_id,category_slug,region,province,city")
      .eq("id", data.listingId)
      .maybeSingle();
    if (lErr) throw new Error(lErr.message);
    if (!listing) throw new Error("Listing not found");
    if (listing.user_id !== userId) throw new Error("Not your listing");

    const attrs = (listing.attributes ?? {}) as Record<string, unknown>;
    const listingFields = {
      vin: (attrs.vin_chassis as string | undefined) ?? null,
      make: (attrs.make as string | undefined) ?? null,
      model: (attrs.model as string | undefined) ?? null,
      year: attrs.year != null ? String(attrs.year) : null,
      color: (attrs.color as string | undefined) ?? null,
      body_type: (attrs.body_type as string | undefined) ?? null,
      fuel: (attrs.fuel as string | undefined) ?? null,
      plate: (attrs.plate_no as string | undefined) ?? null,
    };

    const { data: docs } = await supabase
      .from("listing_documents")
      .select("doc_type,storage_path,mime_type")
      .eq("listing_id", data.listingId);
    const docList = (docs ?? []) as Array<{
      doc_type: "cr" | "or";
      storage_path: string;
      mime_type: string;
    }>;
    if (docList.length === 0) throw new Error("Upload at least one document first");

    const key = process.env.AI_API_KEY?.trim();
    const baseURL = process.env.AI_API_BASE_URL?.trim().replace(/\/+$/, "");
    const modelName = process.env.AI_MODEL_VISION?.trim() || process.env.AI_MODEL?.trim();
    if (!key || !baseURL || !modelName) {
      throw new Error("Verification unavailable — standalone AI provider is not configured");
    }
    const gateway = createOpenAICompatible({
      name: "standalone",
      baseURL,
      headers: { Authorization: `Bearer ${key}` },
    });

    const extracted: { cr?: DocFields; or?: DocFields } = {};
    for (const d of docList) {
      const { data: signed } = await supabase.storage
        .from("listing-documents")
        .createSignedUrl(d.storage_path, 300);
      if (!signed?.signedUrl) continue;
      const res = await fetch(signed.signedUrl);
      if (!res.ok) continue;
      const mediaType = d.mime_type || res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      if (!/^image\//.test(mediaType)) {
        extracted[d.doc_type] = { received_from: "PDF_SKIPPED" } as DocFields;
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      try {
        extracted[d.doc_type] = await extractDocFields(bytes, mediaType, gateway, modelName, d.doc_type);
      } catch (e) {
        extracted[d.doc_type] = {};
        void e;
      }
    }

    const cr = extracted.cr ?? {};
    const or = extracted.or ?? {};
    const checks: FieldCheck[] = [];
    checks.push(compareField("vin_chassis", "VIN / Chassis", listingFields.vin, cr.vin || cr.chassis_no));
    checks.push(compareField("make", "Make", listingFields.make, cr.make));
    checks.push(compareField("model", "Model", listingFields.model, cr.series_model));
    checks.push(
      compareField("year", "Year", listingFields.year, cr.year_model != null ? String(cr.year_model) : null, {
        exact: true,
      }),
    );
    checks.push(compareField("color", "Color", listingFields.color, cr.color));
    checks.push(compareField("body_type", "Body type", listingFields.body_type, cr.body_type));
    checks.push(compareField("fuel", "Fuel", listingFields.fuel, cr.fuel_type));
    if (or.plate_no || cr.plate_no) {
      checks.push(compareField("plate", "Plate", listingFields.plate, cr.plate_no || or.plate_no));
    }

    if (cr.plate_no && or.plate_no) {
      const consistent = norm(cr.plate_no) === norm(or.plate_no);
      checks.push({
        field: "or_cr_plate",
        label: "OR ↔ CR plate",
        listingValue: cr.plate_no,
        documentValue: or.plate_no,
        match: consistent ? "match" : "mismatch",
      });
    }

    const validUntil = parseDate(or.or_valid_until);
    let expired = false;
    if (validUntil) {
      expired = validUntil.getTime() < Date.now();
      checks.push({
        field: "or_valid_until",
        label: "OR valid until",
        listingValue: null,
        documentValue: or.or_valid_until ?? null,
        match: expired ? "mismatch" : "match",
      });
    }

    const mismatches = checks.filter((c) => c.match === "mismatch");
    let status: "lto_verified" | "mismatch" | "expired" | "pending" = "pending";
    if (expired) status = "expired";
    else if (mismatches.length === 0 && checks.some((c) => c.match === "match")) status = "lto_verified";
    else if (mismatches.length > 0) status = "mismatch";

    const payload = {
      listing_id: data.listingId,
      user_id: userId,
      status,
      extracted_json: { cr, or },
      mismatches_json: checks,
      checked_at: new Date().toISOString(),
      verified_by: "system",
    };

    const { error: upErr } = await supabase
      .from("listing_verifications")
      .upsert(payload, { onConflict: "listing_id" });
    if (upErr) throw new Error(upErr.message);

    return { status, checks, extracted: { cr, or } };
  });

export const getListingVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: v }, { data: d }] = await Promise.all([
      supabase
        .from("listing_verifications")
        .select("status,mismatches_json,extracted_json,checked_at")
        .eq("listing_id", data.listingId)
        .maybeSingle(),
      supabase
        .from("listing_documents")
        .select("id,doc_type,storage_path,mime_type,file_size,uploaded_at")
        .eq("listing_id", data.listingId)
        .order("uploaded_at", { ascending: false }),
    ]);
    return {
      verification: v ?? null,
      documents: (d ?? []) as Array<{
        id: string;
        doc_type: "cr" | "or";
        storage_path: string;
        mime_type: string;
        file_size: number;
        uploaded_at: string;
      }>,
    };
  });

export const deleteListingDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc } = await supabase
      .from("listing_documents")
      .select("id,user_id,storage_path")
      .eq("id", data.documentId)
      .maybeSingle();
    if (!doc || doc.user_id !== userId) throw new Error("Not found");
    await supabase.storage.from("listing-documents").remove([doc.storage_path]);
    const { error } = await supabase.from("listing_documents").delete().eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
