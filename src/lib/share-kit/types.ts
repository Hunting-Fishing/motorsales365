export type QrPlate = {
  /** Relative coords (0-1) of the QR center on the canvas */
  cx: number;
  cy: number;
  /** Relative size (0-1) of QR width (height = same, square) */
  size: number;
  /** Padding in QR-size fractions for white plate (0 to disable plate) */
  platePadding?: number;
  plateRadius?: number;
  caption?: {
    text: string; // {name} {firstName} {code} interpolation
    /** Relative y position (0-1) of caption baseline below QR */
    offset: number;
    fontPx: number; // px at full canvas width
    color: string;
    weight: number;
  };
};

export type ShareTemplate = {
  id: string;
  label: string;
  description: string;
  /** Output canvas size */
  width: number;
  height: number;
  /** Kind of base art */
  kind: "image" | "svg";
  /** For 'image' templates, CDN URL of base PNG */
  imageUrl?: string;
  /** Background fill behind the base image (visible if image is transparent) */
  background?: string;
  /** For 'svg' templates, a render function that returns SVG string (without QR) */
  renderSvg?: (ctx: TemplateContext) => string;
  /** QR placement */
  qr: QrPlate;
  /** Suggested share copy */
  shareText: string; // supports {name} {firstName} {code} {link}
  /** Display grouping in the Share Kit UI */
  category?: string;
};

export type TemplateContext = {
  name: string;
  firstName: string;
  code: string;
  link: string;
};

export function interpolate(text: string, ctx: TemplateContext): string {
  return text
    .replaceAll("{name}", ctx.name)
    .replaceAll("{firstName}", ctx.firstName)
    .replaceAll("{code}", ctx.code)
    .replaceAll("{link}", ctx.link);
}
