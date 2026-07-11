import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserSearch, type UserPick } from "./user-search";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  threadId: string;
  threadTitle: string;
  excludeIds: string[];
  onInvited?: () => void;
}

export function InviteToThreadDialog({
  open,
  onOpenChange,
  threadId,
  threadTitle,
  excludeIds,
  onInvited,
}: Props) {
  const [members, setMembers] = useState<UserPick[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (members.length === 0) {
      toast.error("Pick at least one person");
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase.rpc as any)("invite_to_thread", {
      p_thread_id: threadId,
      p_user_ids: members.map((m) => m.id),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Invited ${data ?? 0} to "${threadTitle}"`);
    setMembers([]);
    onOpenChange(false);
    onInvited?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {threadTitle}</DialogTitle>
        </DialogHeader>
        <UserSearch selected={members} onChange={setMembers} excludeIds={excludeIds} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Sending…" : "Send invites"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
