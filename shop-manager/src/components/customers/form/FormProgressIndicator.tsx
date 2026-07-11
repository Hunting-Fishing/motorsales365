
import React from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface FormProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  progressPercentage: number;
  currentTab: string;
}

export const FormProgressIndicator: React.FC<FormProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  progressPercentage,
  currentTab
}) => {
  const getTabLabel = (tab: string): string => {
    switch (tab) {
      case "personal": return "Personal";
      case "business": return "Business";
      case "payment": return "Payment";
      case "preferences": return "Preferences";
      case "vehicles": return "Vehicles";
      case "household": return "Household";
      case "segments": return "Segments";
      default: return tab;
    }
  };

  return (
    <div className="space-y-1.5 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10">
            Step {currentStep} of {totalSteps}
          </Badge>
          <span className="text-sm font-medium">{getTabLabel(currentTab)}</span>
        </div>
        <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}% Complete</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
    </div>
  );
};
