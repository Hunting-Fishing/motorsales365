import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";

function processingError(): Response {
  return Response.json({ error: "Failed to process unsubscribe" }, { status: 500 });
}

async function consumedTokenResponse(
  supabase: SupabaseClient,
  email: string,
  method: "GET" | "POST",
): Promise<Response> {
  // A consumed token alone is not proof of current suppression. In particular,
  // never reapply suppression from an old token after a later consent change.
  const { data, error } = await supabase
    .from("suppressed_emails")
    .select("email, reason")
    .eq("email", email)
    .maybeSingle();
  if (error) return processingError();
  if (data?.email !== email || data?.reason !== "unsubscribe") {
    return Response.json(
      { error: "This link has already been used", reason: "token_consumed" },
      { status: 409 },
    );
  }
  return Response.json(
    method === "GET"
      ? { valid: false, reason: "already_unsubscribed" }
      : { success: false, reason: "already_unsubscribed" },
  );
}

export const Route = createFileRoute("/email/unsubscribe")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (!supabaseUrl || !supabaseServiceKey) {
            return Response.json({ error: "Server configuration error" }, { status: 500 });
          }

          // Extract token from query params
          const url = new URL(request.url);
          const token = url.searchParams.get("token");

          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const supabase = createClient(supabaseUrl, supabaseServiceKey);

          // Look up the token
          const { data: tokenRecord, error: lookupError } = await supabase
            .from("email_unsubscribe_tokens")
            .select("token, email, used_at")
            .eq("token", token)
            .maybeSingle();

          if (lookupError) return processingError();
          if (!tokenRecord) {
            return Response.json({ error: "Invalid or expired token" }, { status: 404 });
          }
          if (
            tokenRecord.token !== token ||
            typeof tokenRecord.email !== "string" ||
            !tokenRecord.email
          ) {
            return processingError();
          }

          if (tokenRecord.used_at) {
            return await consumedTokenResponse(supabase, tokenRecord.email.toLowerCase(), "GET");
          }

          return Response.json({ valid: true });
        } catch {
          return processingError();
        }
      },

      POST: async ({ request }) => {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (!supabaseUrl || !supabaseServiceKey) {
            return Response.json({ error: "Server configuration error" }, { status: 500 });
          }

          // Extract token from query params (always present for RFC 8058 one-click)
          const url = new URL(request.url);
          let token: string | null = url.searchParams.get("token");

          // Detect RFC 8058 one-click unsubscribe: POST with form-encoded body
          // containing "List-Unsubscribe=One-Click". Email clients (Gmail, Apple Mail,
          // etc.) send this when the user clicks "Unsubscribe" in the mail UI.
          const contentType = request.headers.get("content-type") ?? "";
          if (contentType.includes("application/x-www-form-urlencoded")) {
            const formText = await request.text();
            const params = new URLSearchParams(formText);
            // For one-click, token comes from query param (already set above).
            // Otherwise, token may be in the form body.
            if (!params.get("List-Unsubscribe")) {
              const formToken = params.get("token");
              if (formToken) {
                token = formToken;
              }
            }
          } else {
            // JSON body (from the app's unsubscribe page)
            try {
              const body: unknown = await request.json();
              if (body && typeof body === "object" && "token" in body && body.token) {
                if (typeof body.token !== "string") {
                  return Response.json({ error: "Token must be a string" }, { status: 400 });
                }
                token = body.token;
              }
            } catch {
              // Fall through — token stays from query param
            }
          }

          if (!token) {
            return Response.json({ error: "Token is required" }, { status: 400 });
          }

          const supabase = createClient(supabaseUrl, supabaseServiceKey);

          // Look up the token
          const { data: tokenRecord, error: lookupError } = await supabase
            .from("email_unsubscribe_tokens")
            .select("token, email, used_at")
            .eq("token", token)
            .maybeSingle();

          if (lookupError) return processingError();
          if (!tokenRecord) {
            return Response.json({ error: "Invalid or expired token" }, { status: 404 });
          }
          if (
            tokenRecord.token !== token ||
            typeof tokenRecord.email !== "string" ||
            !tokenRecord.email
          ) {
            return processingError();
          }
          const email = tokenRecord.email.toLowerCase();

          if (tokenRecord.used_at) {
            return await consumedTokenResponse(supabase, email, "POST");
          }

          // Only token consumption is conditional; suppression is a separate
          // write. This is not an atomic unsubscribe transaction or repair.
          const { data: updated, error: updateError } = await supabase
            .from("email_unsubscribe_tokens")
            .update({ used_at: new Date().toISOString() })
            .eq("token", token)
            .is("used_at", null)
            .select("token, email, used_at")
            .maybeSingle();

          if (updateError) {
            return processingError();
          }

          if (!updated) {
            return await consumedTokenResponse(supabase, email, "POST");
          }
          if (
            updated.token !== token ||
            updated.email !== tokenRecord.email ||
            typeof updated.used_at !== "string" ||
            !updated.used_at
          ) {
            return processingError();
          }

          // Add email to suppressed list (upsert to handle duplicates)
          // Existing reason-overwrite behavior remains pending a reviewed
          // suppression/consent policy; do not mistake this for that repair.
          const { data: suppressed, error: suppressError } = await supabase
            .from("suppressed_emails")
            .upsert({ email, reason: "unsubscribe" }, { onConflict: "email" })
            .select("email, reason")
            .maybeSingle();

          if (
            suppressError ||
            suppressed?.email !== email ||
            suppressed?.reason !== "unsubscribe"
          ) {
            return processingError();
          }

          return Response.json({ success: true });
        } catch {
          return processingError();
        }
      },
    },
  },
});
