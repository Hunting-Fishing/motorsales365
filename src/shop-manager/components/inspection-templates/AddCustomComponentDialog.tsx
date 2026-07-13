import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCustomComponent, CreateCustomComponentInput } from '@/hooks/useCustomComponents';
import { Loader2 } from 'lucide-react';

interface AddCustomComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryName: string;
}

const COMPONENT_TYPES = [
  { value: 'hour_meter', label: 'Hour Meter' },
  { value: 'fluid_level', label: 'Fluid Level' },
  { value: 'gyr_status', label: 'G/Y/R Status' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
] as const;

export function AddCustomComponentDialog({
  open,
  onOpenChange,
  categoryId,
  categoryName,
}: AddCustomComponentDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<CreateCustomComponentInput['type']>('gyr_status');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('');

  const createMutation = useCreateCustomComponent();

  const generateKey = (componentName: string) => {
    return componentName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    const key = `custom_${categoryId}_${generateKey(name)}`;

    await createMutation.mutateAsync({
      name: name.trim(),
      key,
      type,
      category: categoryId,
      description: description.trim() || undefined,
      unit: unit.trim() || undefined,
    });

    // Reset form and close dialog on success
    setName('');
    setType('gyr_status');
    setDescription('');
    setUnit('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setName('');
      setType('gyr_status');
      setDescription('');
      setUnit('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Custom Component</DialogTitle>
          <DialogDescription>
            Add a custom component to the "{categoryName}" category. This will be available for all inspection templates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Component Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Deck Wash Pump Hours"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Component Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as CreateCustomComponentInput['type'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {COMPONENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit (optional)</Label>
            <Input
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., hours, gallons, psi"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this component"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Component
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
