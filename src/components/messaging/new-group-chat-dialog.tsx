import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserSearch, type UserPick } from "./user-search";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onCreated: (threadId: string) => void;
}

export function NewGroupChatDialog({ open, onOpenChange, currentUserId, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<UserPick[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setMembers([]);
  };

  const submit = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Group name is required");
      return;
    }
    if (members.length === 0) {
      toast.error("Invite at least one person");
      return;
    }
    setSaving(true);
    const { data, error } = await (supabase.rpc as any)("create_group_chat", {
      p_title: cleanTitle,
      p_member_ids: members.map((m) => m.id),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Group "${cleanTitle}" created — invites sent`);
    reset();
    onOpenChange(false);
    if (data) onCreated(data as string);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New group chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium">Group name</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Toyota Owners Club"
              maxLength={80}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Invite people</label>
            <UserSearch
              selected={members}
              onChange={setMembers}
              excludeIds={[currentUserId]}
              placeholder="Search by name or business…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
