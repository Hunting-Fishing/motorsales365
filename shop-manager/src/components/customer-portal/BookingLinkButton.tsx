
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export function BookingLinkButton() {
  const { userId } = useAuthUser();
  const [isBookingEnabled, setIsBookingEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkBookingPermissions() {
      if (!userId) return;
      
      try {
        // First check global shop setting
        const { data: shopSettings, error: shopError } = await supabase
          .from('shop_settings')
          .select('booking_enabled')
          .limit(1)
          .single();
        
        if (shopError) {
          console.error('Error fetching shop settings:', shopError);
          setError('Could not check booking availability');
          setLoading(false);
          return;
        }
        
        // If global booking is disabled, don't check individual permissions
        if (!shopSettings.booking_enabled) {
          setIsBookingEnabled(false);
          setLoading(false);
          return;
        }
        
        // Check individual customer permission
        const { data: relationshipData, error: relationshipError } = await supabase
          .from('customer_shop_relationships')
          .select('booking_enabled')
          .eq('customer_id', userId)
          .limit(1)
          .single();
        
        if (relationshipError) {
          console.error('Error fetching customer permissions:', relationshipError);
          // Default to enabled if we can't find the relationship
          setIsBookingEnabled(true);
        } else {
          setIsBookingEnabled(relationshipData.booking_enabled);
        }
        
      } catch (err) {
        console.error('Error checking booking permissions:', err);
        setError('Could not verify booking permissions');
      } finally {
        setLoading(false);
      }
    }
    
    checkBookingPermissions();
  }, [userId]);

  if (loading) {
    return <Skeleton className="w-full h-10" />;
  }

  if (error) {
    return (
      <div className="p-3 text-sm bg-yellow-50 border border-yellow-200 rounded-md flex items-center text-yellow-700">
        <AlertCircle className="h-4 w-4 mr-2" />
        {error}
      </div>
    );
  }

  if (isBookingEnabled === false) {
    return (
      <div className="p-3 text-sm bg-gray-50 border border-gray-200 rounded-md flex items-center text-gray-500">
        <Calendar className="h-4 w-4 mr-2" />
        Booking is currently unavailable
      </div>
    );
  }

  return (
    <Link to="/client-booking" className="block">
      <Button variant="outline" className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 hover:bg-gradient-to-r hover:from-green-100 hover:to-blue-100">
        <Calendar className="h-4 w-4 text-green-600" />
        <span className="text-green-700 font-medium">Book an Appointment</span>
      </Button>
    </Link>
  );
}
