import { useState } from "react";
import { toast } from "sonner";
import { MAX_CHAT_MEMBERS, chatCommandInput } from "@/lib/chat-commands";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserSearch, type UserPick } from "./user-search";
import { useChatDialogCommand } from "./new-group-chat-dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  threadId: string;
  threadTitle: string;
  excludeIds: string[];
  onInvited?: () => void;
}

export function InviteToThreadDialog(props: Props) {
  if (!props.open) return null;
  return <InviteToThreadSession key={props.currentUserId + ":" + props.threadId} {...props} />;
}

function InviteToThreadSession(props: Props) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <InviteToThreadForm
      {...props}
      onClose={() => {
        setClosed(true);
        props.onOpenChange(false);
      }}
    />
  );
}

function InviteToThreadForm({
  currentUserId,
  threadId,
  threadTitle,
  excludeIds,
  onInvited,
  onClose,
}: Props & { onClose: () => void }) {
  const [members, setMembers] = useState<UserPick[]>([]);
  const { saving, run, invalidate, isAlive } = useChatDialogCommand();
  const close = () => {
    if (!isAlive()) return;
    invalidate();
    onClose();
  };
  const submit = () => {
    if (!isAlive()) return;
    const parsed = chatCommandInput.safeParse({
      expectedAccountId: currentUserId,
      kind: "invite",
      threadId,
      memberIds: members.map((member) => member.id),
    });
    if (!parsed.success) {
      toast.error(
        "Select 1–" + MAX_CHAT_MEMBERS + " distinct people other than yourself for a valid group.",
      );
      return;
    }
    void run(parsed.data, (result, isCurrent) => {
      if (result.kind !== "invited" || !isCurrent()) return;
      toast.success(
        result.insertedCount === 0
          ? "No new memberships added."
          : result.insertedCount +
              " invitation" +
              (result.insertedCount === 1 ? "" : "s") +
              " recorded.",
      );
      setMembers([]);
      if (isCurrent()) onInvited?.();
      if (isCurrent()) close();
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          aria-label="Invite group members"
        >
          <DialogHeader>
            <DialogTitle>Invite to {threadTitle}</DialogTitle>
          </DialogHeader>
          <fieldset disabled={saving} className="py-4">
            <UserSearch
              selected={members}
              onChange={(next) => {
                if (!isAlive()) return;
                if (next.length > MAX_CHAT_MEMBERS) {
                  toast.error("Select at most " + MAX_CHAT_MEMBERS + " people.");
                  return;
                }
                setMembers(next);
              }}
              excludeIds={[...excludeIds, currentUserId]}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {members.length}/{MAX_CHAT_MEMBERS} people selected. Recorded invitations do not
              confirm delivery.
            </p>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Recording…" : "Send invites"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
