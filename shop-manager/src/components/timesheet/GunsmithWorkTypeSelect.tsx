import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useModuleWorkTypes } from '@/hooks/useModuleWorkTypes';
import { useWorkTypeRequests } from '@/hooks/useWorkTypeRequests';
import { Loader2 } from 'lucide-react';

interface GunsmithWorkTypeSelectProps {
  value: string | null;
  customValue: string;
  onValueChange: (workTypeId: string | null, customValue: string) => void;
}

export function GunsmithWorkTypeSelect({ 
  value, 
  customValue,
  onValueChange 
}: GunsmithWorkTypeSelectProps) {
  const { workTypes, isLoading } = useModuleWorkTypes('gunsmith');
  const { submitRequest, isSubmitting } = useWorkTypeRequests();
  const [requestAsPermanent, setRequestAsPermanent] = useState(false);
  const [hasSubmittedRequest, setHasSubmittedRequest] = useState(false);

  const isOtherSelected = value === 'other';

  const handleSelectChange = (newValue: string) => {
    if (newValue === 'other') {
      onValueChange('other', customValue);
    } else {
      onValueChange(newValue, '');
      setRequestAsPermanent(false);
      setHasSubmittedRequest(false);
    }
  };

  const handleCustomValueChange = (newCustomValue: string) => {
    onValueChange('other', newCustomValue);
  };

  const handleRequestSubmit = () => {
    if (customValue.trim() && requestAsPermanent && !hasSubmittedRequest) {
      submitRequest({
        name: customValue.trim(),
        moduleType: 'gunsmith',
        description: `User requested: ${customValue.trim()}`,
      });
      setHasSubmittedRequest(true);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Work Type *</Label>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading work types...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="work_type">Work Type *</Label>
        <Select
          value={value || ''}
          onValueChange={handleSelectChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select work type" />
          </SelectTrigger>
          <SelectContent>
            {workTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
            <SelectItem value="other" className="border-t mt-1 pt-1">
              Other (Custom Entry)
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isOtherSelected && (
        <div className="space-y-3 pl-4 border-l-2 border-primary/20">
          <div className="space-y-2">
            <Label htmlFor="custom_work_type">Custom Work Type *</Label>
            <Input
              id="custom_work_type"
              value={customValue}
              onChange={(e) => handleCustomValueChange(e.target.value)}
              placeholder="Enter custom work type..."
            />
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="request_permanent"
              checked={requestAsPermanent}
              onCheckedChange={(checked) => setRequestAsPermanent(checked as boolean)}
              disabled={hasSubmittedRequest || isSubmitting}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="request_permanent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Request as permanent selection
              </label>
              <p className="text-xs text-muted-foreground">
                {hasSubmittedRequest 
                  ? 'Request submitted for review' 
                  : 'Submit this work type for approval by admin'}
              </p>
            </div>
          </div>

          {requestAsPermanent && customValue.trim() && !hasSubmittedRequest && (
            <button
              type="button"
              onClick={handleRequestSubmit}
              disabled={isSubmitting}
              className="text-xs text-primary hover:underline"
            >
              {isSubmitting ? 'Submitting...' : 'Submit request now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
