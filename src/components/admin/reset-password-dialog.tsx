import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound, RefreshCw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { adminSetUserPassword } from "@/lib/admin-password.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function generatePassword(len = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("");
}

export function ResetPasswordDialog({
  user,
}: {
  user: { id: string; full_name?: string | null };
}) {
  const setPwd = useServerFn(adminSetUserPassword);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(() => generatePassword());
  const [saving, setSaving] = useState(false);
  const [savedFor, setSavedFor] = useState<string | null>(null);

  const reset = () => {
    setPassword(generatePassword());
    setSavedFor(null);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const submit = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await setPwd({ data: { targetUserId: user.id, newPassword: password } });
      setSavedFor(res.email ?? user.id);
      toast.success("Password updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to set password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" title="Set a new password for this user">
          <KeyRound className="mr-1 h-3.5 w-3.5" />
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Sets a specific password for <strong>{user.full_name ?? user.id}</strong>. You can paste
            any value the user wants to reuse — Supabase's no-reuse check is bypassed for admin
            resets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>New password</Label>
          <div className="flex gap-2">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono"
              autoComplete="off"
            />
            <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPassword(generatePassword())}
              aria-label="Regenerate"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            8+ characters. The user can change it after they sign in.
          </p>
          {savedFor && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
              ✅ Password updated for <strong>{savedFor}</strong>. Share it securely.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Close
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
