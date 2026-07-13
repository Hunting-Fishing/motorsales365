
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getAllShops, getDefaultShop } from "@/services/shops/shopService";

export const useShopData = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [availableShops, setAvailableShops] = useState<Array<{id: string, name: string}>>([]);
  const [currentUserShopId, setCurrentUserShopId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Memoized shop data to prevent unnecessary re-renders
  const memoizedShopData = useMemo(() => ({
    isLoading,
    availableShops,
    currentUserShopId
  }), [isLoading, availableShops, currentUserShopId]);

  const fetchUserAndShopData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("🔄 useShopData: Starting to fetch user and shop data...");
      
      // Get the current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("❌ useShopData: User error:", userError);
        throw userError;
      }
      
      if (!user) {
        console.warn("⚠️ useShopData: No authenticated user found");
        toast({
          title: "Authentication Required",
          description: "Please log in to continue.",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }
      
      console.log("👤 useShopData: Current user ID:", user.id);
      
      // Get the user's profile to find their shop_id - handle both patterns
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();
      
      console.log("👤 useShopData: Profile query result:", { profile, profileError });
      
      if (profileError) {
        console.error("❌ useShopData: Profile error:", profileError);
        
        // Try to get all shops as fallback
        console.log("🔄 useShopData: Trying to get all shops as fallback...");
        const shops = await getAllShops();
        console.log("🏪 useShopData: Available shops from getAllShops:", shops);
        
        if (shops.length === 0) {
          toast({
            title: "No Shops Found",
            description: "Please create a shop first before adding customers.",
            variant: "destructive"
          });
          return;
        }
        
        setAvailableShops(shops.map(shop => ({ id: shop.id, name: shop.name })));
        setCurrentUserShopId(shops[0].id); // Use first shop as default
        console.log("✅ useShopData: Set first shop as default:", shops[0].id);
        return;
      }
      
      console.log("👤 useShopData: User profile shop_id:", profile?.shop_id);
      
      // Set the current user's shop ID
      if (profile?.shop_id) {
        setCurrentUserShopId(profile.shop_id);
        console.log("✅ useShopData: Set current user shop_id:", profile.shop_id);
      }
      
      // Get all shops for dropdown (may be limited by RLS)
      console.log("🔄 useShopData: Fetching all available shops...");
      const shops = await getAllShops();
      console.log("🏪 useShopData: All shops retrieved:", shops);
      
      if (shops.length === 0) {
        console.warn("⚠️ useShopData: No shops available");
        toast({
          title: "No Shops Available",
          description: "Please contact your administrator to set up shops.",
          variant: "destructive"
        });
        return;
      }
      
      const mappedShops = shops.map(shop => ({ id: shop.id, name: shop.name }));
      setAvailableShops(mappedShops);
      console.log("✅ useShopData: Available shops set:", mappedShops);
      
      // If user doesn't have a shop_id set, use the first available shop
      if (!profile?.shop_id && shops.length > 0) {
        setCurrentUserShopId(shops[0].id);
        console.log("🔧 useShopData: Auto-assigned first shop as default:", shops[0].id);
      }
      
    } catch (error) {
      console.error("❌ useShopData: Error fetching shop data:", error);
      toast({
        title: "Error",
        description: "Failed to load shop data. Please refresh the page and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      console.log("✅ useShopData: Loading complete");
    }
  }, [toast, navigate]);

  useEffect(() => {
    let isMounted = true;
    
    const initializeShopData = async () => {
      if (isMounted) {
        await fetchUserAndShopData();
      }
    };
    
    initializeShopData();
    
    return () => {
      isMounted = false;
    };
  }, [fetchUserAndShopData]);

  console.log("📊 useShopData: Current state:", {
    isLoading: memoizedShopData.isLoading,
    availableShops: memoizedShopData.availableShops.length,
    currentUserShopId: memoizedShopData.currentUserShopId
  });

  return memoizedShopData;
};
