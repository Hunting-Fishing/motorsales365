import { Heart } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { listShopFavoriteIds, toggleShopFavorite } from "@/lib/shop.functions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function useShopFavorites() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["shop-fav-ids", user?.id],
    queryFn: () => listShopFavoriteIds(),
    enabled: !!user,
    staleTime: 30_000,
  });
  return new Set<string>(data?.ids ?? []);
}

interface Props {
  productId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "label";
}

export function ShopFavoriteButton({
  productId,
  className,
  size = "md",
  variant = "icon",
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const favs = useShopFavorites();
  const isFav = favs.has(productId);

  const mutation = useMutation({
    mutationFn: () =>
      toggleShopFavorite({ data: { productId, favorite: !isFav } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-fav-ids", user?.id] });
      qc.invalidateQueries({ queryKey: ["shop-fav-products", user?.id] });
      toast.success(isFav ? "Removed from saved" : "Saved to favorites");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info("Sign in to save products");
      navigate({ to: "/login" });
      return;
    }
    mutation.mutate();
  };

  const sizeClasses = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  if (variant === "label") {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={mutation.isPending}
        aria-pressed={isFav}
        aria-label={isFav ? "Remove from saved" : "Save product"}
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
          isFav
            ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : "border-border bg-card hover:border-rose-400 hover:text-rose-600",
          className,
        )}
      >
        <Heart className={cn(iconSize, isFav && "fill-current")} />
        {isFav ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={mutation.isPending}
      aria-pressed={isFav}
      aria-label={isFav ? "Remove from saved" : "Save product"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border bg-background/90 shadow-sm backdrop-blur transition hover:scale-105",
        sizeClasses,
        isFav
          ? "border-rose-500 text-rose-500"
          : "border-border text-foreground/70 hover:text-rose-500",
        className,
      )}
    >
      <Heart className={cn(iconSize, isFav && "fill-current")} />
    </button>
  );
}
