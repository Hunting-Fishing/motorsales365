
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

interface HeaderActionsProps {
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export function HeaderActions({ onEditClick, onDeleteClick }: HeaderActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={onEditClick}
      >
        <Edit className="h-4 w-4" />
        Edit Profile
      </Button>
      
      <Button 
        variant="destructive" 
        className="flex items-center gap-2"
        onClick={onDeleteClick}
      >
        <Trash className="h-4 w-4" />
        Remove
      </Button>
    </div>
  );
}
