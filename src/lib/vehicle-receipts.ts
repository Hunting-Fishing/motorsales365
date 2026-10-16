import { z } from "zod";

export const PART_CATEGORIES = {
  suspension: "Suspension",
  brakes: "Brakes",
  electrical: "Electrical",
  fuel: "Fuel",
  engine: "Engine",
  drivetrain: "Drivetrain",
  cooling: "Cooling",
  exhaust: "Exhaust",
  wheels_tires: "Wheels & tires",
  body: "Body & exterior",
  interior: "Interior",
  fluids: "Fluids & filters",
  accessories: "Accessories",
  labor: "Labor",
  misc: "Miscellaneous",
} as const;
export const categoryKeys = Object.keys(PART_CATEGORIES) as [
  keyof typeof PART_CATEGORIES,
  ...(keyof typeof PART_CATEGORIES)[],
];
export const receiptDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Use a valid date");
export const receiptLineSchema = z.object({
  description: z.string().trim().min(1).max(250),
  category: z.enum(categoryKeys).nullable(),
  brand: z.string().trim().max(120).nullable().default(null),
  part_number: z.string().trim().max(120).nullable().default(null),
  quantity: z.number().positive().max(99999).nullable().default(null),
  total: z.number().nonnegative().max(99999999).nullable().default(null),
  confidence: z.number().min(0).max(1).default(0),
  reviewed: z.boolean().default(false),
});
export type ReceiptLine = z.infer<typeof receiptLineSchema>;
const receiptEntryFields = {
  vendor: z.string().trim().max(200).nullable(),
  purchasedOn: receiptDate.nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  total: z.number().nonnegative().max(99999999).nullable(),
  items: z.array(receiptLineSchema).min(1).max(100),
  confirm: z.boolean(),
};
function reviewReceiptEntry(
  entry: { confirm: boolean; purchasedOn: string | null; items: ReceiptLine[] },
  ctx: z.RefinementCtx,
) {
  if (
    entry.confirm &&
    (!entry.purchasedOn ||
      entry.items.some((item) => !item.reviewed || !item.category || item.quantity === null))
  )
    ctx.addIssue({
      code: "custom",
      message: "Set the purchase date and review the name, category and quantity of every item.",
    });
}
// The editor validates before creating a draft; the server retains the same
// field bounds/transforms/review predicate and additionally requires its ID.
export const receiptEntrySchema = z.object(receiptEntryFields).superRefine(reviewReceiptEntry);
export const receiptSaveSchema = z
  .object({ id: z.string().uuid(), ...receiptEntryFields })
  .superRefine(reviewReceiptEntry);
export const receiptExtractionSchema = z.object({
  vendor: z.string().trim().max(200).nullable(),
  purchased_on: receiptDate.nullable(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  total: z.number().nonnegative().max(99999999).nullable(),
  items: z.array(receiptLineSchema).max(100),
});
export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;
export type ReceiptTarget = { vehicleId?: string; shopVehicleId?: string };
export type VehicleReceipt = {
  id: string;
  can_write?: boolean;
  attachment_uploaded?: boolean;
  vehicle_id: string | null;
  shop_vehicle_id: string | null;
  created_by: string;
  file_path: string | null;
  file_name: string | null;
  media_type: string | null;
  vendor: string | null;
  purchased_on: string | null;
  currency: string;
  total: number | null;
  status: "draft" | "confirmed";
  share_with_shop: boolean;
  items: Array<
    ReceiptLine & {
      id: string;
      installed_on: string | null;
      odometer_km: number | null;
      public_summary_allowed: boolean;
    }
  >;
};
export function needsReceiptReview(line: ReceiptLine) {
  return !line.reviewed || !line.category || line.confidence < 0.85;
}
export function parseReceiptExtraction(text: string): ReceiptExtraction {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const parsed = receiptExtractionSchema.parse(
    JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)),
  );
  // No AI response can mark itself as human-reviewed, including high-confidence lines.
  return { ...parsed, items: parsed.items.map((item) => ({ ...item, reviewed: false })) };
}
export function validateReceiptFile(file: { size: number; type: string }) {
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type))
    throw new Error("Use a JPG, PNG, WebP or PDF receipt.");
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    throw new Error("Receipts must be between 1 byte and 10 MB.");
}
export function localReceiptDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
