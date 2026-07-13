import { useState, useEffect } from 'react';
import { teamDataService, TeamFilterData } from '@/services/team/teamDataService';

export function useTeamFilterData() {
  const [filterData, setFilterData] = useState<TeamFilterData>({
    departments: [],
    roles: [],
    locations: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFilterData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await teamDataService.getAllFilterData();
      setFilterData(data);
    } catch (err) {
      setError('Failed to load team filter data');
      console.error('Error fetching team filter data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterData();
  }, []);

  return {
    filterData,
    isLoading,
    error,
    refetch: fetchFilterData
  };
}