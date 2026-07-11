
import { Button } from "@/components/ui/button";

interface TeamViewToggleProps {
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
}

export function TeamViewToggle({ view, onViewChange }: TeamViewToggleProps) {
  return (
    <div className="flex justify-end">
      <div className="border rounded-md grid grid-cols-2 overflow-hidden">
        <Button 
          variant="ghost" 
          className={`rounded-none ${view === 'grid' ? 'bg-slate-100' : ''}`} 
          onClick={() => onViewChange('grid')}
        >
          Grid View
        </Button>
        <Button 
          variant="ghost" 
          className={`rounded-none ${view === 'list' ? 'bg-slate-100' : ''}`} 
          onClick={() => onViewChange('list')}
        >
          List View
        </Button>
      </div>
    </div>
  );
}
