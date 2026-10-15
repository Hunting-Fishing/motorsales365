// Native Google handoff only. A valid authorization URL is not a signed-in
// session, successful signup, profile/role provisioning or provider readiness.
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { siteOrigin } from "@/lib/site-config";

export const GOOGLE_OAUTH_FAILED = "Could not start Google sign-in. Please try again.";
export const GOOGLE_AUTH_ORIGIN = "https://wjxaajgvddtrxxtocxen.supabase.co";
const siteOrigins = new Set(["https://www.365motorsales.com", "https://365motorsales.com"]);

function hasUnsafeUrlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 127 || code === 92) return true;
  }
  return false;
}

export function safeAuthInternalPath(value: unknown): string | undefined {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    hasUnsafeUrlCharacters(value)
  )
    return undefined;
  try {
    const parsed = new URL(value, "https://www.365motorsales.com");
    if (parsed.origin !== "https://www.365motorsales.com" || parsed.pathname.startsWith("//"))
      return undefined;
    return value;
  } catch {
    return undefined;
  }
}

export function googleOAuthReturnUrl(redirect?: string): string {
  const origin = siteOrigin();
  if (!siteOrigins.has(origin) || (redirect !== undefined && !safeAuthInternalPath(redirect)))
    throw new Error(GOOGLE_OAUTH_FAILED);
  return redirect === undefined
    ? origin
    : `${origin}/login?redirect=${encodeURIComponent(redirect)}`;
}

const responseSchema = z
  .object({
    data: z.object({ provider: z.literal("google"), url: z.string().max(8192) }).strict(),
    error: z.null(),
  })
  .strict();

function validReturnTo(returnTo: unknown): returnTo is string {
  if (typeof returnTo !== "string" || returnTo.length > 4096 || hasUnsafeUrlCharacters(returnTo))
    return false;
  try {
    const callback = new URL(returnTo);
    const redirect = callback.searchParams.get("redirect");
    return (
      siteOrigins.has(callback.origin) &&
      !callback.username &&
      !callback.password &&
      !callback.hash &&
      ((callback.pathname === "/" && !callback.search) ||
        (callback.pathname === "/login" &&
          [...callback.searchParams.keys()].length === 1 &&
          redirect !== null &&
          !!safeAuthInternalPath(redirect)))
    );
  } catch {
    return false;
  }
}

export function confirmedGoogleAuthorizationUrl(raw: unknown, returnTo: string): string {
  const result = responseSchema.safeParse(raw);
  if (!result.success || !validReturnTo(returnTo)) throw new Error(GOOGLE_OAUTH_FAILED);
  try {
    const { url } = result.data.data;
    const parsed = new URL(url);
    const keys = [...parsed.searchParams.keys()];
    const allowed = new Set(["provider", "redirect_to", "code_challenge", "code_challenge_method"]);
    const challenge = parsed.searchParams.get("code_challenge");
    const method = parsed.searchParams.get("code_challenge_method");
    if (
      hasUnsafeUrlCharacters(url) ||
      parsed.origin !== GOOGLE_AUTH_ORIGIN ||
      parsed.pathname !== "/auth/v1/authorize" ||
      parsed.username ||
      parsed.password ||
      parsed.hash ||
      keys.some((key) => !allowed.has(key)) ||
      new Set(keys).size !== keys.length ||
      parsed.searchParams.get("provider") !== "google" ||
      parsed.searchParams.get("redirect_to") !== returnTo ||
      ((challenge !== null || method !== null) &&
        (method !== "s256" || !challenge || !/^[A-Za-z0-9_-]{43,128}$/.test(challenge)))
    )
      throw new Error();
    return url;
  } catch {
    throw new Error(GOOGLE_OAUTH_FAILED);
  }
}

export async function requestGoogleAuthorization(returnTo: string): Promise<string> {
  // Only this exact site root or the internally validated login redirect is
  // dispatched. Never accept an arbitrary callback origin from a caller.
  if (!validReturnTo(returnTo)) throw new Error(GOOGLE_OAUTH_FAILED);
  try {
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: returnTo, skipBrowserRedirect: true },
    });
    return confirmedGoogleAuthorizationUrl(result, returnTo);
  } catch {
    throw new Error(GOOGLE_OAUTH_FAILED);
  }
}
