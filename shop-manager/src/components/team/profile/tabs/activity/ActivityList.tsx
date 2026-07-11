
import React from "react";
import { ActivityItem } from "./ActivityItem";

interface ActivityListProps {
  activities: any[];
  onFlagActivity: (activity: any) => void;
}

export function ActivityList({ activities, onFlagActivity }: ActivityListProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activities match your filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityItem 
          key={activity.id} 
          activity={activity} 
          onFlagActivity={onFlagActivity} 
        />
      ))}
    </div>
  );
}
