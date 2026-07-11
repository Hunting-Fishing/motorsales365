import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ServiceJob } from '@/types/service';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ServiceJobEditorProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  job?: ServiceJob;
  subcategoryId: string;
  onSave?: () => void;
}

export function ServiceJobEditor({ open, setOpen, job, subcategoryId, onSave }: ServiceJobEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (job) {
      setName(job.name);
      setDescription(job.description || '');
      setEstimatedTime(job.estimatedTime);
      setPrice(job.price);
    } else {
      setName('');
      setDescription('');
      setEstimatedTime(undefined);
      setPrice(undefined);
    }
  }, [job]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (job) {
        // Update existing job
        const { data, error } = await supabase
          .from('service_jobs')
          .update({ name, description, estimatedTime, price })
          .eq('id', job.id);

        if (error) {
          console.error('Error updating service job:', error);
          toast({
            title: "Error updating service",
            description: "Failed to update the service job.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Service Updated",
            description: "Service job updated successfully.",
          });
          onSave?.();
        }
      } else {
        // Create new job
        const { data, error } = await supabase
          .from('service_jobs')
          .insert([{ name, description, estimatedTime, price, subcategory_id: subcategoryId }]);

        if (error) {
          console.error('Error creating service job:', error);
          toast({
            title: "Error creating service",
            description: "Failed to create the service job.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Service Created",
            description: "Service job created successfully.",
          });
          onSave?.();
        }
      }
      setOpen(false);
    } catch (error) {
      console.error('Error saving service job:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!job) return;

    const confirmDelete = window.confirm("Are you sure you want to delete this service job?");
    if (!confirmDelete) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('service_jobs')
        .delete()
        .eq('id', job.id);

      if (error) {
        console.error('Error deleting service job:', error);
        toast({
          title: "Error deleting service",
          description: "Failed to delete the service job.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Service Deleted",
          description: "Service job deleted successfully.",
        });
        onSave?.();
        setOpen(false);
      }
    } catch (error) {
      console.error('Error deleting service job:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while deleting.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{job ? "Edit Service Job" : "Create New Service Job"}</DialogTitle>
          <DialogDescription>
            {job ? "Update the details of the service job." : "Create a new service job."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right mt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="estimatedTime" className="text-right">
              Estimated Time (minutes)
            </Label>
            <Input
              type="number"
              id="estimatedTime"
              value={estimatedTime === undefined ? '' : String(estimatedTime)}
              onChange={(e) => setEstimatedTime(e.target.value === '' ? undefined : Number(e.target.value))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price
            </Label>
            <Input
              type="number"
              id="price"
              value={price === undefined ? '' : String(price)}
              onChange={(e) => setPrice(e.target.value === '' ? undefined : Number(e.target.value))}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          {job && (
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSaving} className="mr-auto">
              Delete
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
