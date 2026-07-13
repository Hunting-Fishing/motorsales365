
import React from "react";

interface EmptyStateProps {
  hasActivities: boolean;
}

export function EmptyState({ hasActivities }: EmptyStateProps) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      {hasActivities ? (
        <>No activities match your filters.</>
      ) : (
        <>No activities recorded for this team member yet.</>
      )}
    </div>
  );
}
