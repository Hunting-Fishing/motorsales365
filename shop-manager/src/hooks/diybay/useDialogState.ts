
import { useState } from "react";
import { Bay } from "@/services/diybay/diybayService";

export function useDialogState() {
  const [editBay, setEditBay] = useState<Bay | null>(null);
  const [selectedBay, setSelectedBay] = useState<Bay | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const handleEditClick = (bay: Bay) => {
    setEditBay(bay);
    setIsEditDialogOpen(true);
  };

  const handleHistoryClick = async (
    bay: Bay, 
    loadRateHistory: (bay: Bay) => Promise<void>
  ): Promise<void> => {
    setSelectedBay(bay);
    await loadRateHistory(bay);
    setIsHistoryDialogOpen(true);
  };

  return {
    editBay,
    isEditDialogOpen,
    selectedBay,
    isHistoryDialogOpen,
    setIsEditDialogOpen,
    setIsHistoryDialogOpen,
    handleEditClick,
    handleHistoryClick
  };
}
