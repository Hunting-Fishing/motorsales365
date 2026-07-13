
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export interface WorkOrderNotesProps {
  workOrderId: string;
  notes: string;
  onUpdateNotes: (notes: string) => void;
}

export const WorkOrderNotes: React.FC<WorkOrderNotesProps> = ({ 
  workOrderId, 
  notes, 
  onUpdateNotes 
}) => {
  const [localNotes, setLocalNotes] = React.useState(notes);
  
  const handleSave = () => {
    onUpdateNotes(localNotes);
  };
  
  return (
    <div className="space-y-4">
      <Textarea
        value={localNotes}
        onChange={(e) => setLocalNotes(e.target.value)}
        placeholder="Add notes about this work order..."
        className="min-h-[200px]"
      />
      <Button onClick={handleSave}>Save Notes</Button>
    </div>
  );
};
