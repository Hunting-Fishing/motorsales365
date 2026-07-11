
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamHistory } from "@/hooks/useTeamHistory";
import { HistoryTable } from "./team-history/HistoryTable";
import { HistoryFilters } from "./team-history/HistoryFilters";
import { HistoryEmptyState } from "./team-history/HistoryEmptyState";

export const TeamHistoryTab = () => {
  const {
    loading,
    filteredHistory,
    actionTypeFilter,
    setActionTypeFilter,
    searchTerm,
    setSearchTerm,
    handleRefresh
  } = useTeamHistory();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Team History</h2>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 rounded-md border p-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasFilters = actionTypeFilter !== "all" || searchTerm !== "";

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Team History</h2>
          <p className="text-muted-foreground">
            Track all changes and activities related to your team members.
          </p>
        </div>
        
        <HistoryFilters 
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          actionTypeFilter={actionTypeFilter}
          onActionTypeFilterChange={setActionTypeFilter}
          onRefresh={handleRefresh}
        />
      </div>

      {filteredHistory.length === 0 ? (
        <HistoryEmptyState hasFilters={hasFilters} />
      ) : (
        <HistoryTable records={filteredHistory} />
      )}
    </div>
  );
};
