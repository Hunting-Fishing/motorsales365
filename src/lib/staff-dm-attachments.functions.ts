import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Returns a short-lived signed URL for a staff DM attachment,
 * but only if the caller is the sender or recipient of the message.
 */
export const getStaffDmAttachmentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ messageId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims?.email as string | undefined)?.toLowerCase() ?? "";
    if (!email.endsWith("@365motorsales.com")) throw new Error("Not permitted");

    const { data: row, error } = await supabase
      .from("staff_dms")
      .select("id, sender_id, recipient_id, attachment_path, attachment_name, attachment_type")
      .eq("id", data.messageId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Message not found");
    if (row.sender_id !== userId && row.recipient_id !== userId) {
      throw new Error("Not permitted");
    }
    if (!row.attachment_path) throw new Error("No attachment");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("staff-dm-attachments")
      .createSignedUrl(row.attachment_path, 60 * 10, {
        download: row.attachment_name ?? undefined,
      });
    if (signErr || !signed) throw new Error(signErr?.message ?? "Sign failed");
    return {
      url: signed.signedUrl,
      name: row.attachment_name,
      type: row.attachment_type,
    };
  });
