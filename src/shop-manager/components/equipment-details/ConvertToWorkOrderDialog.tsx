import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ArrowRight } from 'lucide-react';

interface ConvertToWorkOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: any;
  onSuccess: () => void;
}

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string;
}

export function ConvertToWorkOrderDialog({ 
  open, 
  onOpenChange, 
  request, 
  onSuccess 
}: ConvertToWorkOrderDialogProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTechs, setLoadingTechs] = useState(true);

  useEffect(() => {
    if (open) {
      fetchTechnicians();
    }
  }, [open]);

  const fetchTechnicians = async () => {
    try {
      setLoadingTechs(true);
      console.log('🔍 Fetching technicians...');
      
      // Get current user's shop_id
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('👤 User:', user?.id);
      if (userError) {
        console.error('❌ User error:', userError);
        throw new Error(`User error: ${userError.message}`);
      }
      if (!user) {
        console.error('❌ No user found');
        throw new Error('No user found');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      console.log('🏪 Profile shop_id:', profile?.shop_id);
      if (profileError) {
        console.error('❌ Profile error:', profileError);
        throw new Error(`Profile error: ${profileError.message}`);
      }
      if (!profile?.shop_id) {
        console.error('❌ No shop found');
        throw new Error('No shop found');
      }

      // Get technicians for this shop
      const { data: techniciansData, error: techError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, job_title')
        .eq('shop_id', profile.shop_id);
      
      console.log('👷 Raw technicians data:', techniciansData);
      if (techError) {
        console.error('❌ Technicians error:', techError);
        throw new Error(`Technicians error: ${techError.message}`);
      }
      
      // List of roles to exclude (office/admin roles)
      const officeRoles = [
        'owner',
        'manager',
        'admin',
        'service advisor',
        'service writer',
        'receptionist',
        'accountant',
        'dispatcher',
        'office manager',
        'administrative assistant',
        'secretary',
        'office assistant',
        'office',
        'administrator'
      ];
      
      // Filter out office roles
      const filteredTechs = (techniciansData || []).filter((t: any) => {
        const jobTitle = (t.job_title || '').toLowerCase();
        return !officeRoles.some(role => jobTitle.includes(role));
      });
      
      console.log('✅ Filtered technicians:', filteredTechs.length);
      setTechnicians(filteredTechs);
    } catch (error: any) {
      console.error('❌ Error fetching technicians:', error);
      toast.error(`Failed to load technicians: ${error.message}`);
    } finally {
      setLoadingTechs(false);
    }
  };

  const handleConvert = async () => {
    console.log('🚀 Starting work order conversion...');
    
    if (!selectedTechnicianId) {
      console.warn('⚠️ No technician selected');
      toast.error('Please select a technician');
      return;
    }

    setLoading(true);
    
    try {
      console.log('👤 Step 1: Getting user data...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('❌ User error:', userError);
        throw new Error(`User error: ${userError.message}`);
      }
      if (!user) {
        console.error('❌ No user found');
        throw new Error('No user found - you must be logged in');
      }
      console.log('✅ User ID:', user.id);

      console.log('🏪 Step 2: Getting shop data...');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (profileError) {
        console.error('❌ Profile error:', profileError);
        throw new Error(`Profile error: ${profileError.message}`);
      }
      if (!profile?.shop_id) {
        console.error('❌ No shop found');
        throw new Error('No shop found for your profile');
      }
      console.log('✅ Shop ID:', profile.shop_id);

      // Get or create a generic "Internal Maintenance" customer for this shop
      console.log('👥 Step 3: Checking for existing Internal Maintenance customer...');
      
      let customerId: string;
      const { data: existingCustomer, error: customerCheckError } = await supabase
        .from('customers')
        .select('id')
        .eq('shop_id', profile.shop_id)
        .eq('email', 'internal.maintenance@shop.local')
        .single();

      if (customerCheckError && customerCheckError.code !== 'PGRST116') {
        console.error('❌ Customer check error:', customerCheckError);
        throw new Error(`Customer check error: ${customerCheckError.message}`);
      }

      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('✅ Using existing customer:', customerId);
      } else {
        console.log('➕ Step 4: Creating new Internal Maintenance customer...');
        
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            shop_id: profile.shop_id,
            first_name: 'Internal',
            last_name: 'Maintenance',
            email: 'internal.maintenance@shop.local',
            phone: 'N/A',
            notes: 'Auto-generated customer for internal equipment maintenance work orders'
          })
          .select('id')
          .single();

        if (customerError) {
          console.error('❌ Customer creation error:', customerError);
          throw new Error(`Failed to create customer: ${customerError.message}`);
        }
        customerId = newCustomer!.id;
        console.log('✅ Created new customer:', customerId);
      }

      // Validate and get selected technician details
      let validTechnicianId: string | null = null;
      let technicianFullName = 'Unassigned';
      
      if (selectedTechnicianId) {
        console.log('👷 Step 5: Validating technician...');
        const { data: techProfile, error: techError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', selectedTechnicianId)
          .single();
        
        if (techError || !techProfile) {
          console.warn('⚠️ Selected technician not found in profiles, proceeding without assignment');
        } else {
          validTechnicianId = techProfile.id;
          technicianFullName = `${techProfile.first_name} ${techProfile.last_name}`.trim();
          console.log('✅ Validated technician:', technicianFullName, validTechnicianId);
        }
      }
      
      console.log(`📝 Step 6: Creating work order${validTechnicianId ? ` for technician ${technicianFullName}` : ' (unassigned)'}...`);

      // Generate unique work order number
      const { data: latestWorkOrder } = await supabase
        .from('work_orders')
        .select('work_order_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      let workOrderNumber: string;
      if (latestWorkOrder?.work_order_number) {
        const match = latestWorkOrder.work_order_number.match(/\d+$/);
        const nextNum = match ? parseInt(match[0]) + 1 : 1;
        workOrderNumber = `WO-${String(nextNum).padStart(6, '0')}`;
      } else {
        workOrderNumber = 'WO-000001';
      }
      
      console.log('✅ Generated work order number:', workOrderNumber);

      // Create work order from maintenance request with all required fields
      const workOrderData: any = {
        work_order_number: workOrderNumber,
        customer_id: customerId,
        created_by: user.id,
        shop_id: profile.shop_id,
        description: request.title,
        status: 'in-progress',
        priority: request.priority || 'medium',
        service_type: 'Maintenance',
        equipment_id: request.equipment_id,
        additional_info: `Converted from Maintenance Request #${request.request_number}\n\n${request.description || ''}\n\n${additionalNotes}`.trim(),
        start_time: request.scheduled_date || new Date().toISOString(),
      };
      
      if (validTechnicianId) {
        workOrderData.technician_id = validTechnicianId;
      }

      console.log('📝 Creating work order with data:', workOrderData);

      const { data: workOrder, error: workOrderError } = await supabase
        .from('work_orders')
        .insert(workOrderData)
        .select()
        .single();

      if (workOrderError) {
        console.error('❌ Work order creation error:', workOrderError);
        console.error('Error details:', JSON.stringify(workOrderError, null, 2));
        throw new Error(`Database error: ${workOrderError.message || 'Unknown database error'}`);
      }

      console.log('✅ Work order created successfully:', workOrder);

      // Update maintenance request status
      console.log('📝 Step 7: Updating maintenance request status...');
      
      const { error: updateError } = await supabase
        .from('maintenance_requests')
        .update({ 
          status: 'in_progress',
          assigned_to: selectedTechnicianId,
          assigned_to_name: technicianFullName,
          work_order_id: workOrder.id
        })
        .eq('id', request.id);

      if (updateError) {
        console.error('⚠️ Maintenance request update error:', updateError);
      } else {
        console.log('✅ Maintenance request updated');
      }

      console.log('🎉 Success! Work order created and assigned to', technicianFullName);
      
      toast.success(`Work order created and assigned to ${technicianFullName}`);
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setSelectedTechnicianId('');
      setAdditionalNotes('');
    } catch (error: any) {
      console.error('❌❌❌ CRITICAL ERROR converting to work order:', error);
      console.error('Error stack:', error.stack);
      const errorMessage = error?.message || 'Failed to create work order';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      console.log('🏁 Work order conversion process completed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-primary" />
            Convert to Work Order
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Request Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div>
              <span className="text-sm font-medium">Request:</span>
              <p className="text-sm text-muted-foreground">{request?.title}</p>
            </div>
            {request?.description && (
              <div>
                <span className="text-sm font-medium">Description:</span>
                <p className="text-sm text-muted-foreground">{request.description}</p>
              </div>
            )}
            <div className="flex gap-4 text-xs">
              <span className="font-mono">#{request?.request_number}</span>
              <span className="capitalize">{request?.priority} priority</span>
            </div>
          </div>

          {/* Technician Selection */}
          <div className="space-y-2">
            <Label htmlFor="technician">Assign to Technician *</Label>
            {loadingTechs ? (
              <div className="flex items-center justify-center p-4 border rounded-md">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
                <SelectTrigger id="technician">
                  <SelectValue placeholder="Select a technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {`${tech.first_name} ${tech.last_name}`.trim()}
                      {tech.job_title && ` - ${tech.job_title}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Work Order Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional instructions or notes for the technician..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">What happens next:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>A new work order will be created with all request details</li>
              <li>The assigned technician will be notified</li>
              <li>The maintenance request status will update to "In Progress"</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConvert} 
            disabled={loading || !selectedTechnicianId}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Work Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
