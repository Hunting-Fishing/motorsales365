
import React, { useState } from "react";
import { Bay } from "@/services/diybay/diybayService";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface AddBayButtonProps {
  onAddBay: () => Promise<boolean>;
  isSaving: boolean;
}

export const AddBayButton: React.FC<AddBayButtonProps> = ({ onAddBay, isSaving }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bayName, setBayName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!bayName.trim()) return;
    
    setIsAdding(true);
    try {
      await onAddBay();
      setBayName("");
      setIsOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)} 
        className="mb-6" 
        disabled={isSaving}
      >
        <Plus className="h-4 w-4 mr-2" /> Add Bay
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Bay</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label htmlFor="bay-name" className="text-sm font-medium block mb-2">
              Bay Name
            </label>
            <Input
              id="bay-name"
              value={bayName}
              onChange={(e) => setBayName(e.target.value)}
              placeholder="Enter bay name"
              className="w-full"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!bayName.trim() || isAdding || isSaving}>
              {isAdding ? "Adding..." : "Add Bay"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
