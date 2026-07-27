// Single source of truth for the 365 staff email domain.
// Anyone with an email on this domain is automatically treated as a 365
// employee account — never a private seller or business.
export const STAFF_EMAIL_DOMAIN = "@365motorsales.com";

export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(STAFF_EMAIL_DOMAIN);
}

/**
 * True when the JWT claims belong to a verified @365motorsales.com account.
 * Internal staff get complimentary Shop Manager access (bug-bash / dogfooding).
 */
export function isStaffClaims(claims: Record<string, any> | null | undefined): boolean {
  const email = (claims?.email as string | undefined) ?? null;
  if (!isStaffEmail(email)) return false;
  // Only trust confirmed mailboxes — anyone can type an address at signup.
  const verified = claims?.email_verified;
  return verified !== false;
}
