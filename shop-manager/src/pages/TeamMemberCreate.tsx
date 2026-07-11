
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeamMemberForm } from '@/components/team/TeamMemberForm';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useShopId } from '@/hooks/useShopId';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function TeamMemberCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shopId } = useShopId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendInvitation, setSendInvitation] = useState(true);

  const handleSubmit = async (formData: any) => {
    if (!shopId) {
      toast({
        title: "Error",
        description: "No shop ID available. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate a UUID for the profile
      const profileId = crypto.randomUUID();
      
      // Create profile first
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: profileId,
          email: formData.email,
          first_name: formData.firstName,
          middle_name: formData.middleName || null,
          last_name: formData.lastName,
          phone: formData.phone,
          job_title: formData.jobTitle,
          department: formData.department,
          shop_id: shopId,
          has_auth_account: false
        }]);

      if (profileError) throw profileError;

      // Assign role if provided
      if (formData.roleId) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{
            user_id: profileId,
            role_id: formData.roleId
          }]);

        if (roleError) {
          console.error('Error assigning role:', roleError);
        }
      }

      // Create auth account with password or send invitation
      if (formData.password) {
        // Create user with password directly
        try {
          const { data, error: authError } = await supabase.functions.invoke('invite-team-member', {
            body: {
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
              profileId: profileId,
              roleId: formData.roleId,
              shopId: shopId,
              password: formData.password
            }
          });

          console.log('Auth response:', { data, error: authError });

          if (authError) {
            console.error('Error creating auth account:', authError);
            toast({
              title: "Error",
              description: `Account setup failed: ${authError.message}`,
              variant: "destructive"
            });
            throw authError;
          } else {
            toast({
              title: "Success",
              description: "Team member created with login access!",
            });
          }
        } catch (error: any) {
          console.error('Error creating auth account:', error);
          throw new Error(`Failed to create auth account: ${error.message}`);
        }
      } else if (sendInvitation) {
        // Send invitation email
        try {
          const { error: inviteError } = await supabase.functions.invoke('invite-team-member', {
            body: {
              email: formData.email,
              firstName: formData.firstName,
              middleName: formData.middleName || null,
              lastName: formData.lastName,
              profileId: profileId,
              roleId: formData.roleId,
              shopId: shopId
            }
          });

          if (inviteError) {
            console.error('Error sending invitation:', inviteError);
            toast({
              title: "Team Member Created",
              description: "Team member created but invitation email failed to send. You can resend it from the team list.",
              variant: "default"
            });
          } else {
            toast({
              title: "Success",
              description: "Team member created and invitation email sent!",
            });
          }
        } catch (inviteError) {
          console.error('Error sending invitation:', inviteError);
          toast({
            title: "Team Member Created",
            description: "Team member created but invitation email failed to send.",
            variant: "default"
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Team member created successfully. No invitation sent.",
        });
      }

      navigate('/settings/team');
    } catch (error: any) {
      console.error('Error creating team member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create team member",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Add New Team Member</h1>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <TeamMemberForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
          
          <div className="flex items-center space-x-2 mt-6 pt-6 border-t">
            <Checkbox 
              id="send-invitation" 
              checked={sendInvitation}
              onCheckedChange={(checked) => setSendInvitation(checked as boolean)}
            />
            <Label 
              htmlFor="send-invitation"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Send invitation email (only if no password is set)
            </Label>
          </div>
          <p className="text-sm text-muted-foreground mt-2 ml-6">
            If a password is provided above, the user will be created with immediate login access. Otherwise, an invitation email will be sent.
          </p>
        </div>
      </div>
    </div>
  );
}
