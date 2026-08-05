import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  returnPath?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
};

/**
 * Formerly launched the external Shop Manager deployment via a signed SSO
 * token. The Shop Manager app now lives in-tree under `/shop/*`, so this is a
 * plain typed `<Link>`. `returnPath` is preserved as an optional query hint.
 */
export function OpenShopManagerButton({
  returnPath,
  size = "default",
  className,
  label = "Open Shop Manager",
}: Props) {
  return (
    <Button asChild size={size} className={className}>
      <Link
        to="/workspace"
        search={returnPath ? ({ next: returnPath } as any) : undefined}
      >
        {label}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );
}
