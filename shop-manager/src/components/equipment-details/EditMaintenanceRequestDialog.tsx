import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, X, Image, Video } from 'lucide-react';

interface EditMaintenanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  onSuccess: () => void;
}

export function EditMaintenanceRequestDialog({
  open,
  onOpenChange,
  request,
  onSuccess
}: EditMaintenanceRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [reportedByType, setReportedByType] = useState<'employee' | 'other'>('employee');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reported_by_person: '',
    reported_by_employee_id: '',
    priority: 'medium',
    request_type: 'repair',
    change_summary: ''
  });

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');

      if (error) throw error;

      const employeeList = data?.map(emp => ({
        id: emp.id,
        name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unnamed Employee'
      })) || [];

      setEmployees(employeeList);
      return employeeList;
    } catch (error) {
      console.error('Error fetching employees:', error);
      return [];
    }
  };

  // Load request data when dialog opens
  useEffect(() => {
    if (open && request) {
      fetchEmployees().then(employeeList => {
        // Check if the reported_by_person matches an employee name
        const matchingEmployee = employeeList.find(
          emp => emp.name.toLowerCase() === (request.reported_by_person || '').toLowerCase()
        );

        if (matchingEmployee) {
          setReportedByType('employee');
          setFormData({
            title: request.title || '',
            description: request.description || '',
            reported_by_person: matchingEmployee.name,
            reported_by_employee_id: matchingEmployee.id,
            priority: request.priority || 'medium',
            request_type: request.request_type || 'repair',
            change_summary: ''
          });
        } else {
          setReportedByType(request.reported_by_person ? 'other' : 'employee');
          setFormData({
            title: request.title || '',
            description: request.description || '',
            reported_by_person: request.reported_by_person || '',
            reported_by_employee_id: '',
            priority: request.priority || 'medium',
            request_type: request.request_type || 'repair',
            change_summary: ''
          });
        }
      });
      setExistingAttachments(request.attachments || []);
      setFiles([]);
    }
  }, [open, request]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index: number) => {
    setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to edit');
        return;
      }

      // Verify user is the original submitter
      if (user.id !== request.requested_by) {
        toast.error('Only the original submitter can edit this request');
        return;
      }

      // Get user's name from profile - handle both patterns
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      const editorName = profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : user.email?.split('@')[0] || 'Unknown';

      // Upload new files if any
      const newAttachments = [...existingAttachments];
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('maintenance-attachments')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            toast.error(`Failed to upload ${file.name}`);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('maintenance-attachments')
            .getPublicUrl(fileName);

          newAttachments.push({
            name: file.name,
            url: publicUrl,
            type: file.type,
            size: file.size
          });
        }
      }

      // Get current version number
      const { data: historyData } = await supabase
        .from('maintenance_request_history')
        .select('version_number')
        .eq('maintenance_request_id', request.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (historyData?.version_number || 0) + 1;

      // Save current state to history before updating
      const { error: historyError } = await supabase
        .from('maintenance_request_history')
        .insert({
          maintenance_request_id: request.id,
          version_number: nextVersion,
          title: formData.title,
          description: formData.description,
          reported_by_person: formData.reported_by_person || null,
          priority: formData.priority,
          request_type: formData.request_type,
          attachments: newAttachments,
          edited_by: user.id,
          edited_by_name: editorName,
          change_summary: formData.change_summary || 'Updated request details'
        });

      if (historyError) throw historyError;

      // Update the main request
      const { error: updateError } = await supabase
        .from('maintenance_requests')
        .update({
          title: formData.title,
          description: formData.description,
          reported_by_person: formData.reported_by_person || null,
          priority: formData.priority,
          request_type: formData.request_type,
          attachments: newAttachments,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      toast.success('Request updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Maintenance Request</DialogTitle>
          <DialogDescription>
            Update request details - all changes are tracked in version history
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the issue"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the issue or work needed"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Reported By (Optional)</Label>
            <Select
              value={reportedByType}
              onValueChange={(value: 'employee' | 'other') => {
                setReportedByType(value);
                setFormData({ 
                  ...formData, 
                  reported_by_person: '',
                  reported_by_employee_id: ''
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="other">Other (Non-Employee)</SelectItem>
              </SelectContent>
            </Select>

            {reportedByType === 'employee' ? (
              <Select
                value={formData.reported_by_employee_id}
                onValueChange={(value) => {
                  const employee = employees.find(e => e.id === value);
                  setFormData({ 
                    ...formData, 
                    reported_by_employee_id: value,
                    reported_by_person: employee?.name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.reported_by_person}
                onChange={(e) => setFormData({ ...formData, reported_by_person: e.target.value })}
                placeholder="e.g., John - Visitor, Customer Name, etc."
              />
            )}
            <p className="text-xs text-muted-foreground">
              Person who initially noticed the problem
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request_type">Request Type *</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value) => setFormData({ ...formData, request_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="change_summary">Change Summary (Optional)</Label>
            <Input
              id="change_summary"
              value={formData.change_summary}
              onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
              placeholder="e.g., Added more details about the problem"
            />
          </div>

          {/* Existing Attachments */}
          {existingAttachments.length > 0 && (
            <div className="space-y-2">
              <Label>Current Attachments</Label>
              <div className="space-y-2">
                {existingAttachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {attachment.type?.startsWith('image/') ? (
                        <Image className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate max-w-[200px]">
                        {attachment.name}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExistingAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Attachments */}
          <div className="space-y-2">
            <Label htmlFor="attachments">Add Photos & Videos (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <input
                id="attachments"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="attachments"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload additional files
                </p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mt-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      {file.type.startsWith('image/') ? (
                        <Image className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Video className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate max-w-[200px]">
                        {file.name}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
