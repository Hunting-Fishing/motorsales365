import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertMember(supabase: any, userId: string, businessId: string) {
  const { data } = await supabase.rpc("is_business_member", {
    _user: userId,
    _business: businessId,
  });
  if (!data) throw new Error("Forbidden");
}
async function assertManager(supabase: any, userId: string, businessId: string) {
  const { data } = await supabase.rpc("has_business_role", {
    _user: userId,
    _business: businessId,
    _role: "manager",
  });
  if (!data) throw new Error("Forbidden");
}

async function nextInvoiceNumber(supabase: any, businessId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabase
    .from("business_invoices")
    .select("invoice_number")
    .eq("business_id", businessId)
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  let n = 1;
  if (data?.invoice_number) {
    const tail = String(data.invoice_number).slice(prefix.length);
    const parsed = parseInt(tail, 10);
    if (Number.isFinite(parsed)) n = parsed + 1;
  }
  return `${prefix}${String(n).padStart(4, "0")}`;
}

export const listBusinessInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertMember(supabase, userId, data.businessId);
    const { data: rows, error } = await supabase
      .from("business_invoices")
      .select("*")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return rows ?? [];
  });

export const getBusinessInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertMember(supabase, userId, data.businessId);
    const { data: invoice, error } = await supabase
      .from("business_invoices")
      .select("*")
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (error) throw error;
    if (!invoice) throw new Error("Invoice not found");
    const { data: items, error: iErr } = await supabase
      .from("business_invoice_items")
      .select("*")
      .eq("invoice_id", data.id)
      .order("created_at", { ascending: true });
    if (iErr) throw iErr;
    return { invoice, items: items ?? [] };
  });

export const createBusinessInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      businessId: string;
      customer_name?: string | null;
      customer_email?: string | null;
      customer_phone?: string | null;
      customer_address?: string | null;
      description?: string | null;
      po_number?: string | null;
      payment_method?: string | null;
      terms?: string | null;
      issue_date?: string | null;
      due_date?: string | null;
      tax_rate?: number;
      notes?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const invoice_number = await nextInvoiceNumber(supabase, data.businessId);
    const payload: any = {
      business_id: data.businessId,
      created_by: userId,
      invoice_number,
      customer_name: data.customer_name ?? null,
      customer_email: data.customer_email ?? null,
      customer_phone: data.customer_phone ?? null,
      customer_address: data.customer_address ?? null,
      description: data.description ?? null,
      po_number: data.po_number ?? null,
      payment_method: data.payment_method ?? null,
      terms: data.terms ?? null,
      due_date: data.due_date ?? null,
      tax_rate: data.tax_rate ?? 0,
      notes: data.notes ?? null,
    };
    if (data.issue_date) payload.issue_date = data.issue_date;
    const { data: row, error } = await supabase
      .from("business_invoices")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const updateBusinessInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      businessId: string;
      customer_name?: string | null;
      customer_email?: string | null;
      customer_phone?: string | null;
      customer_address?: string | null;
      description?: string | null;
      po_number?: string | null;
      payment_method?: string | null;
      terms?: string | null;
      issue_date?: string | null;
      due_date?: string | null;
      status?: "draft" | "sent" | "paid" | "void";
      tax_rate?: number;
      notes?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const patch: any = {};
    for (const k of [
      "customer_name",
      "customer_email",
      "customer_phone",
      "customer_address",
      "description",
      "po_number",
      "payment_method",
      "terms",
      "issue_date",
      "due_date",
      "status",
      "tax_rate",
      "notes",
    ] as const) {
      if ((data as any)[k] !== undefined) patch[k] = (data as any)[k];
    }
    const { data: row, error } = await supabase
      .from("business_invoices")
      .update(patch)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .select("*")
      .single();
    if (error) throw error;
    // Recompute totals if tax_rate changed
    if (patch.tax_rate !== undefined) {
      const { data: items } = await supabase
        .from("business_invoice_items")
        .select("line_total")
        .eq("invoice_id", data.id);
      const sub = (items ?? []).reduce(
        (s: number, r: any) => s + Number(r.line_total ?? 0),
        0,
      );
      const tax = Math.round(sub * Number(patch.tax_rate ?? 0)) / 100;
      await supabase
        .from("business_invoices")
        .update({ subtotal: sub, tax_amount: tax, total: sub + tax })
        .eq("id", data.id);
    }
    return row;
  });

export const deleteBusinessInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_invoices")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw error;
    return { ok: true };
  });

export const addBusinessInvoiceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      invoiceId: string;
      businessId: string;
      inventory_item_id?: string | null;
      description: string;
      quantity: number;
      unit_price: number;
    }) => {
      if (!d.description?.trim()) throw new Error("Description required");
      if (!(d.quantity > 0)) throw new Error("Quantity must be > 0");
      return d;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);

    // If linked to inventory, verify stock is sufficient
    if (data.inventory_item_id) {
      const { data: inv } = await supabase
        .from("business_inventory_items")
        .select("qty_on_hand, name")
        .eq("id", data.inventory_item_id)
        .maybeSingle();
      if (!inv) throw new Error("Inventory item not found");
      if (Number(inv.qty_on_hand ?? 0) < Number(data.quantity)) {
        throw new Error(
          `Not enough stock — ${inv.name} has ${inv.qty_on_hand} on hand.`,
        );
      }
    }

    const { data: row, error } = await supabase
      .from("business_invoice_items")
      .insert({
        invoice_id: data.invoiceId,
        business_id: data.businessId,
        inventory_item_id: data.inventory_item_id ?? null,
        description: data.description.trim(),
        quantity: data.quantity,
        unit_price: data.unit_price,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const updateBusinessInvoiceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      businessId: string;
      description?: string;
      quantity?: number;
      unit_price?: number;
      inventory_item_id?: string | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const patch: any = {};
    for (const k of [
      "description",
      "quantity",
      "unit_price",
      "inventory_item_id",
    ] as const) {
      if ((data as any)[k] !== undefined) patch[k] = (data as any)[k];
    }
    const { data: row, error } = await supabase
      .from("business_invoice_items")
      .update(patch)
      .eq("id", data.id)
      .eq("business_id", data.businessId)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteBusinessInvoiceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId, data.businessId);
    const { error } = await supabase
      .from("business_invoice_items")
      .delete()
      .eq("id", data.id)
      .eq("business_id", data.businessId);
    if (error) throw error;
    return { ok: true };
  });

export const listBusinessServicesForInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertMember(supabase, userId, data.businessId);
    const { data: rows, error } = await supabase
      .from("business_services")
      .select("id,title,description,unit,price_php,max_price_php,active")
      .eq("business_id", data.businessId)
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

