
import React from "react";

interface BaysEmptyStateProps {
  isLoading: boolean;
}

export const BaysEmptyState: React.FC<BaysEmptyStateProps> = ({ isLoading }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading bays...</div>;
  }
  
  return <div className="text-center py-8">No bays found. Add your first bay to get started.</div>;
};
