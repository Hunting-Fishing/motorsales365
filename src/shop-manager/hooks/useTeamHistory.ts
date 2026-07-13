
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface HistoryRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  flagged: boolean;
  resolved: boolean;
}

export function useTeamHistory() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [history, searchTerm, actionTypeFilter]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Fetch real team member history from database
      const { data: teamHistory, error } = await supabase
        .from('team_member_history')
        .select(`
          id,
          timestamp,
          action_type,
          action_by,
          action_by_name,
          details,
          profile_id
        `)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching team history:', error);
        toast({
          title: "Error",
          description: "Failed to load team history",
          variant: "destructive"
        });
        return;
      }

      // Transform data to match expected format
      const formattedHistory: HistoryRecord[] = (teamHistory || []).map(record => ({
        id: record.id,
        timestamp: record.timestamp,
        userId: record.action_by || 'unknown',
        userName: record.action_by_name || 'Unknown User',
        action: record.action_type,
        details: typeof record.details === 'object' 
          ? JSON.stringify(record.details) 
          : String(record.details || ''),
        flagged: false, // Can be enhanced based on business logic
        resolved: false
      }));

      setHistory(formattedHistory);
    } catch (error) {
      console.error("Error loading team history:", error);
      toast({
        title: "Error",
        description: "Failed to load team history",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterHistory = () => {
    let filtered = [...history];

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.userName.toLowerCase().includes(term) ||
          record.userId.toLowerCase().includes(term) ||
          record.details.toLowerCase().includes(term) ||
          record.action.toLowerCase().includes(term)
      );
    }

    // Apply action type filter
    if (actionTypeFilter !== "all") {
      if (actionTypeFilter === "flagged") {
        filtered = filtered.filter((record) => record.flagged);
      } else {
        filtered = filtered.filter((record) =>
          record.action.toLowerCase().includes(actionTypeFilter.toLowerCase())
        );
      }
    }

    setFilteredHistory(filtered);
  };

  const handleRefresh = () => {
    loadHistory();
  };

  return {
    loading,
    history,
    filteredHistory,
    searchTerm,
    setSearchTerm,
    actionTypeFilter,
    setActionTypeFilter,
    handleRefresh
  };
}
