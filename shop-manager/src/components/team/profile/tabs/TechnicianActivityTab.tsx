
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { TeamMember } from "@/types/team";
import { ActivityFilters } from "./activity/ActivityFilters";
import { ActivityList } from "./activity/ActivityList";
import { EmptyState } from "./activity/EmptyState";
import { FlagActivityDialog } from "./activity/FlagActivityDialog";
import { useActivityData } from "./activity/useActivityData";

interface TechnicianActivityTabProps {
  member: TeamMember;
}

export function TechnicianActivityTab({ member }: TechnicianActivityTabProps) {
  const {
    activities,
    isLoading,
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
  } = useActivityData(member.id);

  // Flag dialog state
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [flagReason, setFlagReason] = useState("");

  // Flag dialog handlers
  const handleOpenFlagDialog = (activity) => {
    setSelectedActivity(activity);
    setFlagReason("");
    setFlagDialogOpen(true);
  };
  
  const handleSubmitFlag = () => {
    if (!selectedActivity || !flagReason.trim()) return;
    
    // In a real implementation, this would save to the database
    // For the demo, just update the local state
    setActivities(prevActivities => 
      prevActivities.map(act => 
        act.id === selectedActivity.id ? { ...act, flagged: true, flagReason } : act
      )
    );
    
    setFlagDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading activity history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Activity History</span>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setFlaggedOnly(!flaggedOnly)}
                className={flaggedOnly ? "bg-red-50 text-red-700 border-red-200" : ""}
              >
                <Flag className={`h-4 w-4 mr-1 ${flaggedOnly ? "text-red-500" : ""}`} />
                {flaggedOnly ? "Show All" : "Flagged Only"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <ActivityFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />

            {activities.length === 0 ? (
              <EmptyState hasActivities={false} />
            ) : filteredActivities.length === 0 ? (
              <EmptyState hasActivities={true} />
            ) : (
              <ActivityList 
                activities={filteredActivities} 
                onFlagActivity={handleOpenFlagDialog} 
              />
            )}
          </div>
        </CardContent>
      </Card>
      
      <FlagActivityDialog
        open={flagDialogOpen}
        onOpenChange={setFlagDialogOpen}
        activity={selectedActivity}
        flagReason={flagReason}
        onFlagReasonChange={setFlagReason}
        onSubmit={handleSubmitFlag}
      />
    </>
  );
}
