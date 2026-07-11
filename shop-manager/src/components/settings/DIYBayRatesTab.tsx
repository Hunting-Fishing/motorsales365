
import React, { useState, useCallback } from "react";
import { useDIYBayRates } from "@/hooks/useDIYBayRates";
import { Bay } from "@/services/diybay/diybayService";
import { DIYBayHeader } from "./diybay/DIYBayHeader";
import { RateSettingsForm } from "./diybay/RateSettingsForm";
import { BaySection } from "./diybay/BaySection";
import { DIYBayDialogs } from "./diybay/DIYBayDialogs";
import { useDialogState } from "@/hooks/diybay/useDialogState";
import { useBayOrder } from "@/hooks/diybay/useBayOrder";
import { toast } from "@/hooks/use-toast";

export const DIYBayRatesTab: React.FC = () => {
  const {
    bays,
    setBays,
    settings,
    isLoading,
    isSaving,
    rateHistory,
    loadData,
    addBay,
    saveBay,
    removeBay,
    loadRateHistory,
    updateBayRateSettings,
    calculateRate,
  } = useDIYBayRates();

  const [localSettings, setLocalSettings] = useState(settings);
  const [viewMode, setViewMode] = useState<"table" | "cards" | "compact">("table");
  
  const {
    editBay,
    isEditDialogOpen,
    selectedBay,
    isHistoryDialogOpen,
    setIsEditDialogOpen,
    setIsHistoryDialogOpen,
    handleEditClick,
    handleHistoryClick
  } = useDialogState();

  // Add bay ordering functionality
  const { handleDragEnd, isSavingOrder } = useBayOrder(bays, setBays);

  const handleStatusChange = useCallback(async (bay: Bay, isActive: boolean) => {
    await saveBay({ ...bay, is_active: isActive });
  }, [saveBay]);

  // Update this function to return a Promise<boolean> for the EditableCell component
  const handleRateChange = useCallback(async (bay: Bay, field: 'hourly_rate' | 'daily_rate' | 'weekly_rate' | 'monthly_rate', value: number): Promise<boolean> => {
    try {
      return await saveBay({ ...bay, [field]: value });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      return false;
    }
  }, [saveBay]);

  const handleSettingsChange = useCallback((field: keyof typeof settings, value: number) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    return await updateBayRateSettings(localSettings);
  }, [updateBayRateSettings, localSettings]);

  const handleDeleteClick = useCallback((bay: Bay) => {
    if (window.confirm(`Are you sure you want to delete ${bay.bay_name}?`)) {
      removeBay(bay.id, bay.bay_name);
    }
  }, [removeBay]);

  // Create a wrapper function that adapts the types
  const handleHistoryClickWrapper = useCallback(
    async (bay: Bay): Promise<void> => {
      await handleHistoryClick(bay, loadRateHistory);
    },
    [handleHistoryClick, loadRateHistory]
  );

  // This wrapper function ensures saveBay returns a Promise<boolean> like the original,
  // but satisfies the EditBayDialog's onSave prop type
  const handleSaveBay = useCallback(
    async (bay: Bay): Promise<boolean> => {
      try {
        return await saveBay(bay);
      } catch (error) {
        console.error("Error saving bay:", error);
        return false;
      }
    },
    [saveBay]
  );

  return (
    <div>
      <DIYBayHeader />

      <RateSettingsForm
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onSaveSettings={handleSaveSettings}
        isSaving={isSaving}
      />

      <BaySection 
        bays={bays}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isLoading={isLoading}
        isSaving={isSaving || isSavingOrder}
        onStatusChange={handleStatusChange}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onHistoryClick={handleHistoryClickWrapper}
        onAddBay={addBay}
        onRateChange={handleRateChange}
        onDragEnd={handleDragEnd}
      />

      <DIYBayDialogs 
        editBay={editBay}
        isEditDialogOpen={isEditDialogOpen}
        onCloseEditDialog={() => setIsEditDialogOpen(false)}
        onSaveBay={handleSaveBay}
        calculateRate={calculateRate}
        settings={settings}
        isSaving={isSaving}
        selectedBay={selectedBay}
        rateHistory={rateHistory}
        isHistoryDialogOpen={isHistoryDialogOpen}
        onCloseHistoryDialog={() => setIsHistoryDialogOpen(false)}
      />
    </div>
  );
};

export default DIYBayRatesTab;
