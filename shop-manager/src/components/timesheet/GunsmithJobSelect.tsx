import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGunsmithJobs } from '@/hooks/useGunsmithJobs';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GunsmithJobSelectProps {
  value: string | null;
  onValueChange: (jobId: string | null) => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600',
  in_progress: 'bg-blue-500/10 text-blue-600',
  waiting_parts: 'bg-orange-500/10 text-orange-600',
  ready: 'bg-green-500/10 text-green-600',
};

export function GunsmithJobSelect({ value, onValueChange }: GunsmithJobSelectProps) {
  const { jobs, isLoading } = useGunsmithJobs();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>RO# / Job #</Label>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading jobs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="gunsmith_job">RO# / Job #</Label>
      <Select
        value={value || 'none'}
        onValueChange={(val) => onValueChange(val === 'none' ? null : val)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a job (optional)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No job selected</SelectItem>
          {jobs.map((job) => (
            <SelectItem key={job.id} value={job.id}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{job.job_number}</span>
                <span className="text-muted-foreground">-</span>
                <span className="truncate max-w-[150px]">
                  {job.customer_name || 'Unknown Customer'}
                </span>
                <span className="text-muted-foreground">-</span>
                <span className="truncate max-w-[120px] text-muted-foreground text-xs">
                  {job.firearm_info}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {jobs.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No active gunsmith jobs found
        </p>
      )}
    </div>
  );
}
