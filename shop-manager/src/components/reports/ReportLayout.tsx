
import React, { ReactNode } from 'react';
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface ReportLayoutProps {
  isLoading: boolean;
  children: ReactNode;
}

export const ReportLayout: React.FC<ReportLayoutProps> = ({ isLoading, children }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
        <p className="mt-4 text-muted-foreground">Loading report data...</p>
      </div>
    );
  }

  return (
    <Card className="p-4">
      {children}
    </Card>
  );
};
