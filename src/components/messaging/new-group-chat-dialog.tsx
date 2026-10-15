import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { executeChatCommand } from "@/lib/chat-commands.functions";
import {
  CHAT_COMMAND_FAILURE,
  MAX_CHAT_MEMBERS,
  MAX_CHAT_TITLE_LENGTH,
  chatCommandInput,
  parseChatCommandResult,
  type ChatCommandInput,
  type ChatCommandResult,
} from "@/lib/chat-commands";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserSearch, type UserPick } from "./user-search";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onCreated: (threadId: string) => void;
}

// This fences UI callbacks, not database execution or session revocation.
// Each open/account/thread form gets a new instance; invalidation is synchronous.
// eslint-disable-next-line react-refresh/only-export-components -- Shared only by these two dialog forms.
export function useChatDialogCommand() {
  const command = useServerFn(executeChatCommand);
  const alive = useRef(true);
  const request = useRef<{ controller: AbortController } | null>(null);
  const [saving, setSaving] = useState(false);
  const invalidate = useCallback(() => {
    alive.current = false;
    request.current?.controller.abort();
    request.current = null;
  }, []);
  const isAlive = useCallback(() => alive.current, []);

  useLayoutEffect(() => {
    alive.current = true;
    return invalidate;
  }, [invalidate]);

  const run = async (
    input: ChatCommandInput,
    confirmed: (result: ChatCommandResult, isCurrent: () => boolean) => void,
  ) => {
    if (!alive.current || request.current) return;
    const current = { controller: new AbortController() };
    request.current = current;
    const isCurrent = () =>
      alive.current && request.current === current && !current.controller.signal.aborted;
    setSaving(true);
    try {
      let result: ChatCommandResult;
      try {
        if (!isCurrent()) return;
        const raw = await command({ data: input, signal: current.controller.signal });
        if (!isCurrent()) return;
        result = parseChatCommandResult(raw, input);
      } catch {
        if (isCurrent()) toast.error(CHAT_COMMAND_FAILURE);
        return;
      }
      if (isCurrent()) confirmed(result, isCurrent);
    } finally {
      if (isCurrent()) {
        request.current = null;
        setSaving(false);
      }
    }
  };

  return { saving, run, invalidate, isAlive };
}

export function NewGroupChatDialog(props: Props) {
  if (!props.open) return null;
  return <NewGroupChatSession key={props.currentUserId} {...props} />;
}

function NewGroupChatSession(props: Props) {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <NewGroupChatForm
      currentUserId={props.currentUserId}
      onCreated={props.onCreated}
      onClose={() => {
        setClosed(true);
        props.onOpenChange(false);
      }}
    />
  );
}

function NewGroupChatForm({
  currentUserId,
  onCreated,
  onClose,
}: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<UserPick[]>([]);
  const { saving, run, invalidate, isAlive } = useChatDialogCommand();
  const titleId = useId();
  const close = () => {
    if (!isAlive()) return;
    invalidate();
    onClose();
  };
  const submit = () => {
    if (!isAlive()) return;
    const parsed = chatCommandInput.safeParse({
      expectedAccountId: currentUserId,
      kind: "create",
      title: title.trim(),
      memberIds: members.map((member) => member.id),
    });
    if (!parsed.success) {
      toast.error(
        "Enter a group name of 1–" +
          MAX_CHAT_TITLE_LENGTH +
          " characters and select 1–" +
          MAX_CHAT_MEMBERS +
          " distinct people other than yourself.",
      );
      return;
    }
    void run(parsed.data, (result, isCurrent) => {
      if (result.kind !== "created" || !isCurrent()) return;
      toast.success("Group created; invitations recorded.");
      setTitle("");
      setMembers([]);
      if (isCurrent()) onCreated(result.threadId);
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
          aria-label="Create group chat"
        >
          <DialogHeader>
            <DialogTitle>New group chat</DialogTitle>
          </DialogHeader>
          <fieldset disabled={saving} className="space-y-4 py-4">
            <div>
              <label htmlFor={titleId} className="mb-1 block text-xs font-medium">
                Group name
              </label>
              <Input
                id={titleId}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Toyota Owners Club"
                maxLength={MAX_CHAT_TITLE_LENGTH}
              />
            </div>
            <div>
              <p className="mb-1 text-xs font-medium">Invite people</p>
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
                excludeIds={[currentUserId]}
                placeholder="Search by name or business…"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {members.length}/{MAX_CHAT_MEMBERS} people selected. Invitations are recorded, not
                delivery confirmations.
              </p>
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
