import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload, X, Image, Video } from 'lucide-react';

interface CreateMaintenanceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentName: string;
  onSuccess: () => void;
}

export function CreateMaintenanceRequestDialog({
  open,
  onOpenChange,
  equipmentId,
  equipmentName,
  onSuccess
}: CreateMaintenanceRequestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [reportedByType, setReportedByType] = useState<'employee' | 'other'>('employee');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reported_by_person: '',
    reported_by_employee_id: '',
    priority: 'medium',
    request_type: 'repair',
    scheduled_date: '',
    notes: ''
  });

  // Fetch employees when dialog opens
  React.useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

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
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const generateRequestNumber = async (shopId: string): Promise<string> => {
    // Get max request number for this specific shop
    const { data: requests } = await supabase
      .from('maintenance_requests')
      .select('request_number')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastNumber = requests?.[0]?.request_number;
    const nextNumber = lastNumber 
      ? parseInt(lastNumber.replace('MR-', '')) + 1 
      : 1001;

    return `MR-${nextNumber.toString().padStart(4, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to submit a request');
        setLoading(false);
        return;
      }

      // Get user's shop_id and name from profile - handle both patterns
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, first_name, last_name')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) {
        toast.error('User profile not found or shop not assigned');
        setLoading(false);
        return;
      }

      // Get submitter name from profile
      const submitterName = profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : user.email?.split('@')[0] || 'Unknown';

      // Upload files to storage if any
      const attachments = [];
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

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('maintenance-attachments')
            .getPublicUrl(fileName);

          attachments.push({
            name: file.name,
            url: publicUrl,
            type: file.type,
            size: file.size
          });
        }
      }

      // Retry logic for race conditions on request number
      const maxAttempts = 3;
      let attempts = 0;
      let insertError: any = null;
      let insertSuccess = false;

      while (attempts < maxAttempts) {
        const requestNumber = await generateRequestNumber(profile.shop_id);

        const { data, error } = await supabase
          .from('maintenance_requests')
          .insert({
            request_number: requestNumber,
            shop_id: profile.shop_id,
            equipment_id: equipmentId,
            title: formData.title,
            description: formData.description,
            reported_by_person: formData.reported_by_person || null,
            priority: formData.priority,
            request_type: formData.request_type,
            status: 'pending',
            requested_at: new Date().toISOString(),
            requested_by: user.id,
            requested_by_name: submitterName,
            attachments: attachments
          })
          .select('id')
          .single();

        if (data && !error) {
          // True success - we got data back
          insertSuccess = true;
          break;
        }

        if (!data && !error) {
          // RLS silently blocked the insert - no data returned but no error
          insertError = new Error('Permission denied - unable to create request');
          break;
        }

        // Check if it's a duplicate key error (code 23505)
        if (error?.code === '23505' && attempts < maxAttempts - 1) {
          attempts++;
          continue;
        }

        insertError = error;
        break;
      }

      if (insertError) throw insertError;
      if (!insertSuccess) throw new Error('Failed to create maintenance request');

      toast.success('Maintenance request submitted successfully');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        reported_by_person: '',
        reported_by_employee_id: '',
        priority: 'medium',
        request_type: 'repair',
        scheduled_date: '',
        notes: ''
      });
      setFiles([]);
      setReportedByType('employee');
    } catch (error: any) {
      console.error('Error creating maintenance request:', error);
      if (error.message?.includes('Permission denied')) {
        toast.error('You don\'t have permission to create requests for this shop');
      } else if (error.code === '23505') {
        toast.error('Request number conflict - please try again');
      } else {
        toast.error(error.message || 'Failed to submit maintenance request');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Maintenance Request</DialogTitle>
          <DialogDescription>
            Request maintenance work for {equipmentName}
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
            <Label htmlFor="scheduled_date">Date of Problem Reporting (Optional)</Label>
            <Input
              id="scheduled_date"
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachments">Photos & Videos (Optional)</Label>
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
                  Click to upload photos or videos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, MP4, MOV up to 20MB
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
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
