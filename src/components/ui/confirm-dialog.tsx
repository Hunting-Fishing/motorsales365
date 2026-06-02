import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type Request = ConfirmOptions & { resolve: (v: boolean) => void };

const listeners = new Set<(r: Request) => void>();

/**
 * Replacement for window.confirm(). Returns a Promise<boolean>.
 * Requires <ConfirmDialogHost /> mounted once at the app root.
 *
 * Usage:
 *   if (!(await confirm({ title: "Delete this item?" }))) return;
 */
export function confirm(opts: ConfirmOptions | string): Promise<boolean> {
  const normalized: ConfirmOptions = typeof opts === "string" ? { title: opts } : opts;
  return new Promise<boolean>((resolve) => {
    if (listeners.size === 0) {
      // Fallback so the app doesn't silently no-op if host not mounted.
      if (typeof window !== "undefined") {
        resolve(window.confirm(normalized.title));
      } else {
        resolve(false);
      }
      return;
    }
    const req: Request = { ...normalized, resolve };
    listeners.forEach((l) => l(req));
  });
}

export function ConfirmDialogHost() {
  const [req, setReq] = useState<Request | null>(null);

  useEffect(() => {
    const handler = (r: Request) => setReq(r);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const close = (value: boolean) => {
    if (req) req.resolve(value);
    setReq(null);
  };

  return (
    <AlertDialog
      open={!!req}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{req?.title ?? ""}</AlertDialogTitle>
          {req?.description ? (
            <AlertDialogDescription className="whitespace-pre-line">
              {req.description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {req?.cancelText ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={cn(req?.destructive && buttonVariants({ variant: "destructive" }))}
          >
            {req?.confirmText ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
