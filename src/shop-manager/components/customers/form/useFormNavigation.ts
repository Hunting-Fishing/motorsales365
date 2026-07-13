
import { useState, useCallback } from "react";

export const useFormNavigation = () => {
  const [currentTab, setCurrentTab] = useState("personal");

  const tabOrder = [
    "personal", 
    "business", 
    "payment",
    "preferences", 
    "vehicles", 
    "household", 
    "segments"
  ];
  
  // Calculate current step and total steps
  const currentStep = tabOrder.indexOf(currentTab) + 1;
  const totalSteps = tabOrder.length;
  
  // Get completion percentage
  const progressPercentage = (currentStep / totalSteps) * 100;

  const handleNext = useCallback(() => {
    const currentIndex = tabOrder.indexOf(currentTab);
    
    if (currentIndex < tabOrder.length - 1) {
      setCurrentTab(tabOrder[currentIndex + 1]);
    }
  }, [currentTab, tabOrder]);

  const handlePrevious = useCallback(() => {
    const currentIndex = tabOrder.indexOf(currentTab);
    
    if (currentIndex > 0) {
      setCurrentTab(tabOrder[currentIndex - 1]);
    }
  }, [currentTab, tabOrder]);
  
  // Jump directly to a specific tab
  const jumpToTab = useCallback((tab: string) => {
    if (tabOrder.includes(tab)) {
      setCurrentTab(tab);
    }
  }, [tabOrder]);

  return {
    currentTab,
    setCurrentTab,
    handleNext,
    handlePrevious,
    jumpToTab,
    tabOrder,
    currentStep,
    totalSteps,
    progressPercentage
  };
};
