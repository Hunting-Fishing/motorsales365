// Single source of truth for the 365 staff email domain.
// Anyone with an email on this domain is automatically treated as a 365
// employee account — never a private seller or business.
export const STAFF_EMAIL_DOMAIN = "@365motorsales.com";

export function isStaffEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(STAFF_EMAIL_DOMAIN);
}
