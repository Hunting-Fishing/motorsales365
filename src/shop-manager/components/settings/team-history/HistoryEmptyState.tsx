
import React from "react";
import { ClipboardList, Filter } from "lucide-react";
import { motion } from "framer-motion";

interface HistoryEmptyStateProps {
  hasFilters: boolean;
}

export function HistoryEmptyState({ hasFilters }: HistoryEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="border rounded-lg p-8 text-center bg-card/50"
    >
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
        {hasFilters ? (
          <Filter className="h-8 w-8 text-muted-foreground" />
        ) : (
          <ClipboardList className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">
        {hasFilters ? "No matching records found" : "No history records yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {hasFilters
          ? "Try adjusting your search or filter to find what you're looking for."
          : "Team member activity will be recorded here as they interact with the system."}
      </p>
    </motion.div>
  );
}
