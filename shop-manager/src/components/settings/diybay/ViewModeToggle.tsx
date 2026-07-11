
import React from "react";
import { LayoutGrid, Table, Columns } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ViewModeToggleProps {
  viewMode: "table" | "cards" | "compact";
  setViewMode: (mode: "table" | "cards" | "compact") => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  setViewMode,
}) => {
  return (
    <div className="bg-white rounded-lg p-1 shadow-md border border-indigo-100">
      <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "table" | "cards" | "compact")}>
        <ToggleGroupItem
          value="cards"
          aria-label="Cards view"
          className={`rounded-md px-3 py-2 ${
            viewMode === "cards" 
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" 
              : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
          }`}
        >
          <LayoutGrid className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">Cards</span>
        </ToggleGroupItem>
        
        <ToggleGroupItem
          value="table"
          aria-label="Table view"
          className={`rounded-md px-3 py-2 ${
            viewMode === "table" 
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" 
              : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
          }`}
        >
          <Table className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">Table</span>
        </ToggleGroupItem>

        <ToggleGroupItem
          value="compact"
          aria-label="Compact view"
          className={`rounded-md px-3 py-2 ${
            viewMode === "compact" 
              ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
              : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
          }`}
        >
          <Columns className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">Compact</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
