
import { Button } from "@/components/ui/button";

interface BrandingActionsProps {
  onReset: () => void;
  onSave: () => void;
}

export function BrandingActions({ onReset, onSave }: BrandingActionsProps) {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-bold">Custom Branding</h2>
      <div className="space-x-2">
        <Button variant="outline" onClick={onReset}>Reset to Default</Button>
        <Button onClick={onSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
