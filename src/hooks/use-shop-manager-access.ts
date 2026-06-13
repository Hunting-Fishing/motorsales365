import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { getShopManagerAccess } from "@/lib/shop-manager.functions";

export function useShopManagerAccess() {
  const { user } = useAuth();
  const fn = useServerFn(getShopManagerAccess);
  return useQuery({
    queryKey: ["shop-manager-access", user?.id ?? "anon"],
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 60_000,
  });
}
