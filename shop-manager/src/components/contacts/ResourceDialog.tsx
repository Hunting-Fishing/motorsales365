import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
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
import { Resource, ContactCategory } from '@/types/contacts';

interface ResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: Resource | null;
  categories: ContactCategory[];
  onSave: (data: Partial<Resource>) => void;
}

export function ResourceDialog({ open, onOpenChange, resource, categories, onSave }: ResourceDialogProps) {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      resource_type: resource?.resource_type || 'website',
      name: resource?.name || '',
      description: resource?.description || '',
      url: resource?.url || '',
      username: resource?.username || '',
      notes: resource?.notes || '',
      category_id: resource?.category_id || '',
    }
  });

  React.useEffect(() => {
    if (resource) {
      reset({
        resource_type: resource.resource_type || 'website',
        name: resource.name || '',
        description: resource.description || '',
        url: resource.url || '',
        username: resource.username || '',
        notes: resource.notes || '',
        category_id: resource.category_id || '',
      });
    } else {
      reset({
        resource_type: 'website',
        name: '',
        description: '',
        url: '',
        username: '',
        notes: '',
        category_id: '',
      });
    }
  }, [resource, reset]);

  const onSubmit = (data: any) => {
    onSave({
      ...data,
      id: resource?.id,
      resource_type: data.resource_type as 'website' | 'document' | 'video' | 'tool' | 'api' | 'portal',
      category_id: data.category_id || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{resource ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Resource Type</Label>
              <Select
                value={watch('resource_type')}
                onValueChange={(value) => setValue('resource_type', value as 'website' | 'document' | 'video' | 'tool' | 'api' | 'portal')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Name *</Label>
              <Input {...register('name', { required: true })} placeholder="Resource name" />
            </div>

            <div className="col-span-2">
              <Label>Category</Label>
              <Select
                value={watch('category_id') || ''}
                onValueChange={(value) => setValue('category_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>URL</Label>
              <Input {...register('url')} placeholder="https://example.com" />
            </div>

            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea {...register('description')} placeholder="Brief description..." rows={2} />
            </div>

            <div className="col-span-2">
              <Label>Username / Login Info</Label>
              <Input {...register('username')} placeholder="Optional login reference" />
            </div>

            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea {...register('notes')} placeholder="Additional notes..." rows={2} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {resource ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
