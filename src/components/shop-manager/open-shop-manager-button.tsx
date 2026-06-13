import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestShopManagerSsoUrl } from "@/lib/shop-manager.functions";
import { toast } from "sonner";

type Props = {
  returnPath?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
};

export function OpenShopManagerButton({
  returnPath,
  size = "default",
  className,
  label = "Open Shop Manager",
}: Props) {
  const fn = useServerFn(requestShopManagerSsoUrl);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { url } = await fn({ data: { returnPath } });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open Shop Manager");
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading} size={size} className={className}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="mr-2 h-4 w-4" />
      )}
      {label}
    </Button>
  );
}
