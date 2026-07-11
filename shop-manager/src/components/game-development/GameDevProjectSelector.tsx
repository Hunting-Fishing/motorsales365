import { useGameDevStore } from '@/stores/game-dev-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gamepad2 } from 'lucide-react';

export function GameDevProjectSelector() {
  const { projects, activeProjectId, setActiveProject } = useGameDevStore();

  if (projects.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Gamepad2 className="h-4 w-4 text-primary" />
      <Select value={activeProjectId || ''} onValueChange={setActiveProject}>
        <SelectTrigger className="h-8 w-[200px] text-xs">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map(p => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
