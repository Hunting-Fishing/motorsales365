import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface TeamMemberInvitationStatusProps {
  profile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    has_auth_account: boolean;
    invitation_sent_at?: string;
    invitation_accepted_at?: string;
  };
  roleId?: string;
  shopId?: string;
}

export function TeamMemberInvitationStatus({ 
  profile, 
  roleId,
  shopId 
}: TeamMemberInvitationStatusProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);

  const handleResendInvitation = async () => {
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          email: profile.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          profileId: profile.id,
          roleId: roleId,
          shopId: shopId
        }
      });

      if (error) throw error;

      toast({
        title: "Invitation Sent",
        description: `Invitation email resent to ${profile.email}`,
      });
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // User has accepted invitation and has auth account
  if (profile.has_auth_account && profile.invitation_accepted_at) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="default" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Active
        </Badge>
      </div>
    );
  }

  // User has auth account but no invitation tracking
  if (profile.has_auth_account) {
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    );
  }

  // Invitation sent but not accepted yet
  if (profile.invitation_sent_at) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending Invite
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResendInvitation}
          disabled={isSending}
          className="h-7 text-xs"
        >
          <Mail className="h-3 w-3 mr-1" />
          {isSending ? 'Sending...' : 'Resend'}
        </Button>
      </div>
    );
  }

  // No invitation sent yet
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline">No Invitation</Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleResendInvitation}
        disabled={isSending}
        className="h-7 text-xs"
      >
        <Mail className="h-3 w-3 mr-1" />
        {isSending ? 'Sending...' : 'Send Invite'}
      </Button>
    </div>
  );
}
