import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type ShopManagerPlanCardProps = {
  name: string;
  priceLabel: string;
  cadence: string;
  blurb: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
  onSelect: () => void;
  disabled?: boolean;
};

export function ShopManagerPlanCard(props: ShopManagerPlanCardProps) {
  return (
    <Card
      className={`flex flex-col gap-4 p-6 ${
        props.highlighted ? "border-primary shadow-lg" : ""
      }`}
    >
      <div>
        <h3 className="text-lg font-semibold">{props.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{props.blurb}</p>
      </div>
      <div>
        <span className="text-3xl font-bold">{props.priceLabel}</span>
        <span className="text-sm text-muted-foreground"> / {props.cadence}</span>
      </div>
      <ul className="space-y-2 text-sm">
        {props.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={props.onSelect}
        disabled={props.disabled}
        variant={props.highlighted ? "default" : "outline"}
        className="mt-auto"
      >
        {props.ctaLabel}
      </Button>
    </Card>
  );
}
