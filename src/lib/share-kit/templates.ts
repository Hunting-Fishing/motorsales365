import rearShirt from "@/assets/share-kit/rear-shirt.png.asset.json";
import armBand from "@/assets/share-kit/arm-band.png.asset.json";
import type { ShareTemplate, TemplateContext } from "./types";
import { LOGO_DATA_URL } from "./logo-data";

/** Brand logo embedded as <image> so the SVG renders the real mark, not text. */
function brandLogo(x: number, y: number, size: number): string {
  return `<image href="${LOGO_DATA_URL}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/>`;
}

/** Small ad-tracking label baked into the corner of every generated ad. */
function trackingTag(x: number, y: number, label: string, id: string, fontPx = 18): string {
  const safe = (s: string) => escapeXml(s);
  return `<text x="${x}" y="${y}" font-family="'JetBrains Mono',monospace" font-size="${fontPx}" fill="#94a3b8" opacity="0.85">AD · ${safe(label)} · ${safe(id)}</text>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SQUARE_BG = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1d4a"/>
      <stop offset="0.5" stop-color="#0a0a0a"/>
      <stop offset="1" stop-color="#7a0d18"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1d4ed8"/>
      <stop offset="1" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
`;

function squareSvg(ctx: TemplateContext): string {
  const safe = (s: string) => escapeXml(s);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  ${SQUARE_BG}
  <rect width="1080" height="1080" fill="url(#g)"/>
  <rect x="0" y="0" width="1080" height="12" fill="url(#accent)"/>
  <rect x="0" y="1068" width="1080" height="12" fill="url(#accent)"/>
  <text x="540" y="120" text-anchor="middle" font-family="'Plus Jakarta Sans','Inter',Arial,sans-serif" font-weight="900" font-size="64" fill="#ffffff" letter-spacing="6">365 MOTOR SALES</text>
  <text x="540" y="170" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="600" font-size="26" fill="#cbd5e1" letter-spacing="8">NATIONWIDE PHILIPPINES</text>
  <text x="540" y="295" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="92" fill="#ffffff">Buy. Sell. Tow.</text>
  <text x="540" y="385" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="56" fill="#fbbf24">Get an exclusive offer.</text>
  <g font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="700" font-size="28" fill="#e2e8f0">
    <text x="180" y="460" text-anchor="middle">CARS</text>
    <text x="360" y="460" text-anchor="middle">BIKES</text>
    <text x="540" y="460" text-anchor="middle">TRUCKS</text>
    <text x="720" y="460" text-anchor="middle">HEAVY EQ</text>
    <text x="900" y="460" text-anchor="middle">PARTS</text>
  </g>
  <text x="540" y="1010" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="36" fill="#ffffff">${safe(ctx.name || "Your 365 Member")}</text>
  <text x="540" y="1045" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="22" fill="#94a3b8">${safe(ctx.code)} · 365motorsales.com/r/${safe(ctx.code)}</text>
</svg>`;
}

function storySvg(ctx: TemplateContext): string {
  const safe = (s: string) => escapeXml(s);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920">
  ${SQUARE_BG}
  <rect width="1080" height="1920" fill="url(#g)"/>
  <rect x="0" y="0" width="1080" height="16" fill="url(#accent)"/>
  <rect x="0" y="1904" width="1080" height="16" fill="url(#accent)"/>
  <text x="540" y="180" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="80" fill="#ffffff" letter-spacing="8">365</text>
  <text x="540" y="240" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="700" font-size="32" fill="#cbd5e1" letter-spacing="10">MOTOR SALES PH</text>
  <text x="540" y="430" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="120" fill="#ffffff">SCAN</text>
  <text x="540" y="540" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="120" fill="#fbbf24">TO SHOP</text>
  <text x="540" y="640" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="56" fill="#ffffff">NATIONWIDE</text>
  <text x="540" y="1680" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="44" fill="#ffffff">${safe(ctx.name || "Your 365 Member")}</text>
  <text x="540" y="1735" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="28" fill="#94a3b8">${safe(ctx.code)}</text>
  <text x="540" y="1810" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="700" font-size="30" fill="#e2e8f0">365motorsales.com</text>
</svg>`;
}

function bannerSvg(ctx: TemplateContext): string {
  const safe = (s: string) => escapeXml(s);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  ${SQUARE_BG}
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="0" y="0" width="1200" height="8" fill="url(#accent)"/>
  <rect x="0" y="622" width="1200" height="8" fill="url(#accent)"/>
  <g transform="translate(60,80)">
    <text font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="42" fill="#cbd5e1" letter-spacing="6">365 MOTOR SALES</text>
    <text y="80" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="78" fill="#ffffff">Buy. Sell. Tow.</text>
    <text y="160" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="50" fill="#fbbf24">Exclusive offer inside.</text>
    <text y="240" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="700" font-size="28" fill="#e2e8f0">Cars · Motorcycles · Trucks · Heavy Equipment · Parts</text>
    <text y="340" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="34" fill="#ffffff">${safe(ctx.name || "Your 365 Member")}</text>
    <text y="380" font-family="'JetBrains Mono',monospace" font-size="22" fill="#94a3b8">${safe(ctx.code)} · 365motorsales.com/r/${safe(ctx.code)}</text>
  </g>
</svg>`;
}

function towSvg(ctx: TemplateContext): string {
  const safe = (s: string) => escapeXml(s);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0a0a"/>
      <stop offset="1" stop-color="#7a0d18"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#tg)"/>
  <rect x="0" y="0" width="1080" height="14" fill="#fbbf24"/>
  <rect x="0" y="1336" width="1080" height="14" fill="#fbbf24"/>
  <text x="540" y="140" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="56" fill="#fbbf24" letter-spacing="10">24 / 7 EMERGENCY</text>
  <text x="540" y="260" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="140" fill="#ffffff">TOW SERVICE</text>
  <text x="540" y="340" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="44" fill="#ffffff">Nationwide Philippines</text>
  <text x="540" y="420" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="700" font-size="30" fill="#cbd5e1">Light · Medium · Heavy duty · Roadside</text>
  <text x="540" y="1240" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="40" fill="#ffffff">${safe(ctx.name || "Your 365 Member")}</text>
  <text x="540" y="1290" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="26" fill="#fbbf24">${safe(ctx.code)} · 365motorsales.com</text>
</svg>`;
}

function carsSvg(ctx: TemplateContext): string {
  const safe = (s: string) => escapeXml(s);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1d4ed8"/>
      <stop offset="1" stop-color="#0b1d4a"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#cg)"/>
  <rect x="0" y="0" width="1080" height="540" fill="#ffffff"/>
  <text x="60" y="140" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="52" fill="#0b2a6b" letter-spacing="6">365 MOTOR SALES</text>
  <text x="60" y="260" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="120" fill="#0b1d4a">CARS</text>
  <text x="60" y="360" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="120" fill="#dc2626">FOR SALE</text>
  <text x="60" y="440" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="700" font-size="32" fill="#475569">Verified sellers · Nationwide listings</text>
  <text x="60" y="700" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="64" fill="#fbbf24">Find your next ride.</text>
  <text x="60" y="780" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="700" font-size="32" fill="#e2e8f0">Sedans · SUVs · Trucks · Vans · Motorcycles</text>
  <text x="60" y="980" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="36" fill="#ffffff">${safe(ctx.name || "Your 365 Member")}</text>
  <text x="60" y="1030" font-family="'JetBrains Mono',monospace" font-size="22" fill="#cbd5e1">${safe(ctx.code)} · 365motorsales.com/r/${safe(ctx.code)}</text>
</svg>`;
}

function partsSvg(ctx: TemplateContext): string {
  const safe = (s: string) => escapeXml(s);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <defs>
    <pattern id="carbon" width="20" height="20" patternUnits="userSpaceOnUse">
      <rect width="20" height="20" fill="#0a0a0a"/>
      <rect width="10" height="10" fill="#161616"/>
      <rect x="10" y="10" width="10" height="10" fill="#161616"/>
    </pattern>
  </defs>
  <rect width="1080" height="1080" fill="url(#carbon)"/>
  <rect x="0" y="0" width="1080" height="10" fill="#fbbf24"/>
  <rect x="0" y="1070" width="1080" height="10" fill="#fbbf24"/>
  <text x="540" y="130" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="56" fill="#fbbf24" letter-spacing="8">PARTS &amp; ACCESSORIES</text>
  <text x="540" y="240" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="900" font-size="96" fill="#ffffff">OEM · AFTERMARKET</text>
  <text x="540" y="310" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="700" font-size="34" fill="#cbd5e1">Shipped nationwide · Cash on delivery available</text>
  <text x="540" y="1000" text-anchor="middle" font-family="'Plus Jakarta Sans',Arial,sans-serif" font-weight="800" font-size="38" fill="#ffffff">${safe(ctx.name || "Your 365 Member")}</text>
  <text x="540" y="1045" text-anchor="middle" font-family="'JetBrains Mono',monospace" font-size="24" fill="#fbbf24">${safe(ctx.code)} · 365motorsales.com</text>
</svg>`;
}


export const TEMPLATES: ShareTemplate[] = [
  {
    id: "rear-shirt",
    label: "Rear Shirt Ad",
    description: "Full Philippine motors hero artwork with services strip and contact card. Your QR sits at the bottom-right.",
    width: 1240,
    height: 1550,
    kind: "image",
    imageUrl: rearShirt.url,
    background: "#ffffff",
    qr: {
      cx: 0.82,
      cy: 0.15,
      size: 0.28,
      platePadding: 0.08,
      plateRadius: 0.06,
      caption: {
        text: "Scan · {firstName}",
        offset: 0.085,
        fontPx: 28,
        color: "#0b2a6b",
        weight: 800,
      },
    },
    shareText: "Buy, sell, or tow in the Philippines with 365 Motor Sales. Scan to see {firstName}'s exclusive offer: {link}",
  },
  {
    id: "arm-band",
    label: "Arm Band Ad",
    description: "Compact logo + QR layout. Designed for stickers, arm bands, and chat posts.",
    width: 1240,
    height: 2000,
    kind: "image",
    imageUrl: armBand.url,
    background: "#ffffff",
    qr: {
      cx: 0.5,
      cy: 0.72,
      size: 0.5,
      platePadding: 0.04,
      plateRadius: 0.03,
      caption: {
        text: "{name} · {code}",
        offset: 0.22,
        fontPx: 38,
        color: "#0b2a6b",
        weight: 800,
      },
    },
    shareText: "365 Motor Sales — buy, sell, tow nationwide. Scan {firstName}'s code: {link}",
  },
  {
    id: "square-social",
    label: "Square (Facebook / IG)",
    description: "1080×1080 social post with bold typography and your QR centered low.",
    width: 1080,
    height: 1080,
    kind: "svg",
    renderSvg: squareSvg,
    qr: {
      cx: 0.5,
      cy: 0.74,
      size: 0.46,
      platePadding: 0.06,
      plateRadius: 0.04,
    },
    shareText: "Buy. Sell. Tow. Scan {firstName}'s 365 Motor Sales code: {link}",
  },
  {
    id: "story-reel",
    label: "Story / Reel (9:16)",
    description: "1080×1920 vertical for Stories, Reels, and TikTok with a giant QR.",
    width: 1080,
    height: 1920,
    kind: "svg",
    renderSvg: storySvg,
    qr: {
      cx: 0.5,
      cy: 0.6,
      size: 0.7,
      platePadding: 0.06,
      plateRadius: 0.04,
    },
    shareText: "Scan to shop 365 Motor Sales — {firstName}'s code: {link}",
  },
  {
    id: "banner-1200",
    label: "Landscape Banner (1200×630)",
    description: "Perfect for Facebook link previews and group posts.",
    width: 1200,
    height: 630,
    kind: "svg",
    renderSvg: bannerSvg,
    qr: {
      cx: 0.82,
      cy: 0.5,
      size: 0.85,
      platePadding: 0.06,
      plateRadius: 0.04,
    },
    shareText: "365 Motor Sales — buy, sell, tow nationwide. Scan {firstName}'s code: {link}",
  },
  {
    id: "tow-247",
    label: "24/7 Tow Service",
    description: "Bold emergency tow card — perfect for roadside flyers and group posts.",
    width: 1080,
    height: 1350,
    kind: "svg",
    renderSvg: towSvg,
    qr: {
      cx: 0.5,
      cy: 0.7,
      size: 0.42,
      platePadding: 0.06,
      plateRadius: 0.04,
      caption: {
        text: "Scan to request a tow",
        offset: 0.05,
        fontPx: 30,
        color: "#ffffff",
        weight: 800,
      },
    },
    shareText: "Stranded? 365 Motor Sales nationwide tow network. Scan {firstName}'s code: {link}",
  },
  {
    id: "buy-cars",
    label: "Cars For Sale",
    description: "Bright automotive listing promo — drives buyers to your referral page.",
    width: 1080,
    height: 1080,
    kind: "svg",
    renderSvg: carsSvg,
    qr: {
      cx: 0.78,
      cy: 0.62,
      size: 0.36,
      platePadding: 0.06,
      plateRadius: 0.04,
    },
    shareText: "Looking for your next ride? Browse verified PH listings via {firstName}: {link}",
  },
  {
    id: "parts-shop",
    label: "Parts & Accessories",
    description: "Carbon-and-amber parts ad. Great for groups and online shop posts.",
    width: 1080,
    height: 1080,
    kind: "svg",
    renderSvg: partsSvg,
    qr: {
      cx: 0.5,
      cy: 0.7,
      size: 0.42,
      platePadding: 0.06,
      plateRadius: 0.04,
    },
    shareText: "OEM & aftermarket parts shipped nationwide. Scan {firstName}'s 365 code: {link}",
  },
];

export function getTemplate(id: string): ShareTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
