import { type CatalogItem } from "@/data/fuel-station-catalog";

export type ServiceFormValue = {
  id?: string;
  title: string;
  description: string | null;
  price_label: string | null;
  photo_url: string | null;
  active: boolean;
  category: string | null;
  unit: string | null;
  price_php: number | null;
  sale_price_php: number | null;
  catalog_key: string | null;
};

export function blankService(): ServiceFormValue {
  return {
    title: "",
    description: null,
    price_label: null,
    photo_url: null,
    active: true,
    category: null,
    unit: null,
    price_php: null,
    sale_price_php: null,
    catalog_key: null,
  };
}

export function fromCatalogItem(item: CatalogItem): ServiceFormValue {
  return {
    ...blankService(),
    title: item.title,
    description: item.description ?? null,
    category: item.category,
    unit: item.unit ?? null,
    catalog_key: item.key,
  };
}

export function formatServicePrice(svc: {
  price_label?: string | null;
  price_php?: number | null;
  sale_price_php?: number | null;
  unit?: string | null;
}): string | null {
  if (svc.price_label && svc.price_label.trim()) return svc.price_label;
  const p = svc.sale_price_php ?? svc.price_php;
  if (p == null) return null;
  const unit = svc.unit ? `/${svc.unit}` : "";
  return `₱${Number(p).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit}`;
}
