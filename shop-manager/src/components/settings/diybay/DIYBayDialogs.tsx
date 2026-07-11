
import React from "react";
import { Bay, RateSettings } from "@/services/diybay/diybayService";
import { RateHistory } from "@/services/diybay/diybayService";
import { EditBayDialog } from "./EditBayDialog";
import { RateHistoryDialog } from "./RateHistoryDialog";

interface DIYBayDialogsProps {
  editBay: Bay | null;
  isEditDialogOpen: boolean;
  onCloseEditDialog: () => void;
  onSaveBay: (bay: Bay) => Promise<boolean>;
  calculateRate: (type: 'daily' | 'weekly' | 'monthly', hourlyRate: number) => number;
  settings: RateSettings;
  isSaving: boolean;
  selectedBay: Bay | null;
  rateHistory: RateHistory[];
  isHistoryDialogOpen: boolean;
  onCloseHistoryDialog: () => void;
}

export const DIYBayDialogs: React.FC<DIYBayDialogsProps> = ({
  editBay,
  isEditDialogOpen,
  onCloseEditDialog,
  onSaveBay,
  calculateRate,
  settings,
  isSaving,
  selectedBay,
  rateHistory,
  isHistoryDialogOpen,
  onCloseHistoryDialog,
}) => {
  return (
    <>
      <EditBayDialog
        bay={editBay}
        isOpen={isEditDialogOpen}
        onClose={onCloseEditDialog}
        onSave={onSaveBay}
        calculateRate={calculateRate}
        settings={settings}
        isSaving={isSaving}
      />

      <RateHistoryDialog
        bay={selectedBay}
        rateHistory={rateHistory}
        isOpen={isHistoryDialogOpen}
        onClose={onCloseHistoryDialog}
      />
    </>
  );
};
