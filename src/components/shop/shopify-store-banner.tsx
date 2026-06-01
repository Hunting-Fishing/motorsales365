import { ShoppingBag, ArrowRight } from "lucide-react";

export function ShopifyStoreBanner() {
  return (
    <a
      href="https://365-motor-sales.myshopify.com"
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex items-center gap-4 overflow-hidden rounded-xl border bg-gradient-to-r from-primary to-primary-glow px-5 py-4 text-primary-foreground shadow-sm transition hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
        <ShoppingBag className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Visit the 365 MotorSales Store</p>
        <p className="text-sm text-white/80">
          Shop our own products — exclusive deals on tools, parts & accessories.
        </p>
      </div>
      <div className="hidden shrink-0 items-center gap-1 text-sm font-medium sm:flex">
        Shop now
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </a>
  );
}
