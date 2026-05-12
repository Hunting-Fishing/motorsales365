// Client-side referral cookie/localStorage helpers (first-touch attribution).
const DAYS = 90;
const MS = DAYS * 24 * 60 * 60 * 1000;

function setCookie(name: string, value: string, maxAgeMs = MS) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + maxAgeMs).toUTCString();
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  let id = getCookie("mref_vid") || localStorage.getItem("mref_vid");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mref_vid", id);
    setCookie("mref_vid", id);
  }
  return id;
}

export function recordTouch(code: string) {
  if (typeof window === "undefined") return;
  const first = getCookie("mref_first") || localStorage.getItem("mref_first");
  if (!first) {
    setCookie("mref_first", code);
    setCookie("mref_credit", code);
    localStorage.setItem("mref_first", code);
    localStorage.setItem("mref_credit", code);
  }
  setCookie("mref_last", code);
  localStorage.setItem("mref_last", code);
}

export function getCreditedCode(): string | null {
  return getCookie("mref_credit") || (typeof window !== "undefined" ? localStorage.getItem("mref_credit") : null);
}
