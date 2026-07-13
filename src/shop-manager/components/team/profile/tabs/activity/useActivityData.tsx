
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function useActivityData(memberId: string) {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch real activity data from database
  useEffect(() => {
    const fetchActivities = async () => {
      if (!memberId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch work order activities
        const { data: workOrderActivities, error: woError } = await supabase
          .from('work_order_activities')
          .select('*')
          .eq('user_id', memberId)
          .order('timestamp', { ascending: false });

        if (woError) throw woError;

        // Fetch customer activities  
        const { data: customerActivities, error: custError } = await supabase
          .from('customer_activities')
          .select('*')
          .eq('user_id', memberId)
          .order('timestamp', { ascending: false });

        if (custError) throw custError;

        // Combine and format activities
        const allActivities = [
          ...(workOrderActivities || []).map(activity => ({
            id: activity.id,
            type: "workOrder",
            date: activity.timestamp,
            description: activity.action,
            flagged: activity.flagged,
            flagReason: activity.flag_reason,
            workOrderId: activity.work_order_id,
            userId: activity.user_id
          })),
          ...(customerActivities || []).map(activity => ({
            id: activity.id,
            type: "customer",
            date: activity.timestamp,
            description: activity.action,
            flagged: activity.flagged,
            flagReason: activity.flag_reason,
            customerId: activity.customer_id,
            userId: activity.user_id
          }))
        ];

        setActivities(allActivities);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setError('Failed to load team member activities');
        toast.error('Failed to load team member activities');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [memberId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...activities];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.description.toLowerCase().includes(query)
      );
    }
    
    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(activity => activity.type === typeFilter);
    }
    
    // Apply flagged filter
    if (flaggedOnly) {
      filtered = filtered.filter(activity => activity.flagged);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      
      if (sortBy === "newest") {
        return dateB - dateA;
      } else {
        return dateA - dateB;
      }
    });
    
    setFilteredActivities(filtered);
  }, [activities, searchQuery, typeFilter, flaggedOnly, sortBy]);

  return {
    activities,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    flaggedOnly,
    setFlaggedOnly,
    sortBy,
    setSortBy,
    filteredActivities,
    setActivities
  };
}
