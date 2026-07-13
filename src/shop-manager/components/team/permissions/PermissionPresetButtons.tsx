
import { Button } from "@sm/components/ui/button";
import { RolePreset } from "@sm/types/permissions";

interface PermissionPresetsProps {
  onApplyPreset: (role: RolePreset) => void;
}

export function PermissionPresetButtons({ onApplyPreset }: PermissionPresetsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApplyPreset("Owner")}
      >
        Owner Preset
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApplyPreset("Administrator")}
      >
        Admin Preset
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApplyPreset("Technician")}
      >
        Technician Preset
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApplyPreset("Customer Service")}
      >
        CS Preset
      </Button>
    </div>
  );
}
