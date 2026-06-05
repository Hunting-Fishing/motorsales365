// Shared inline styles for all 365 MotorSales transactional emails.
// Body background must always be white.
export const main = {
  backgroundColor: "#ffffff",
  fontFamily: "'Inter', Arial, sans-serif",
  margin: 0,
  padding: 0,
} as const;
export const container = { maxWidth: "560px", margin: "0 auto", padding: "32px 24px" } as const;
export const brandBar = { borderTop: "4px solid hsl(220 90% 50%)", marginBottom: "24px" } as const;
export const h1 = {
  fontSize: "24px",
  fontWeight: 700,
  color: "#0f172a",
  margin: "0 0 16px",
  fontFamily: "'Plus Jakarta Sans', 'Inter', Arial, sans-serif",
} as const;
export const text = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#334155",
  margin: "0 0 16px",
} as const;
export const muted = { fontSize: "13px", color: "#64748b", margin: "8px 0 0" } as const;
export const button = {
  backgroundColor: "hsl(220 90% 50%)",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "14px",
  display: "inline-block",
} as const;
export const card = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "20px",
  margin: "20px 0",
} as const;
export const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
  fontSize: "14px",
  color: "#334155",
} as const;
export const footer = {
  fontSize: "12px",
  color: "#94a3b8",
  margin: "32px 0 0",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "16px",
} as const;

export const SITE_NAME = "365 MotorSales";
export const SITE_URL = "https://www.365motorsales.com";
