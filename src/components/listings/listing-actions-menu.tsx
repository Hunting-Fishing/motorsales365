import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  MoreVertical,
  Flag,
  FileWarning,
  ShieldAlert,
  Banknote,
  Copy,
  TagsIcon,
  UserX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBlockUser } from "@/hooks/use-blocked-users";

export type ReportTargetType = "listing" | "business" | "seller" | "other";

interface ListingActionsMenuProps {
  listingId?: string;
  sellerUserId?: string | null;
  sellerName?: string | null;
  targetType?: ReportTargetType;
  className?: string;
  /** Visual variant. `overlay` floats over a card image. `inline` matches button text. */
  variant?: "overlay" | "inline";
}

const REPORT_ITEMS: { label: string; category: string; Icon: typeof Flag }[] = [
  { label: "Report listing", category: "Scam / fraud attempt", Icon: Flag },
  { label: "Report fake documents", category: "Fake / forged documents", Icon: FileWarning },
  { label: "Report stolen vehicle", category: "Stolen vehicle", Icon: ShieldAlert },
  { label: "Report scam payment", category: "Off-platform payment pressure", Icon: Banknote },
  { label: "Report duplicate listing", category: "Duplicate listing", Icon: Copy },
  { label: "Report price bait", category: "Price bait / hidden fees", Icon: TagsIcon },
];

export function ListingActionsMenu({
  listingId,
  sellerUserId,
  sellerName,
  targetType = "listing",
  className,
  variant = "overlay",
}: ListingActionsMenuProps) {
  const { user } = useAuth();
  const { block } = useBlockUser();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isSelf = !!user && !!sellerUserId && user.id === sellerUserId;

  const triggerClass =
    variant === "overlay"
      ? "flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
      : "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-secondary";

  const stop = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if ("preventDefault" in e) e.preventDefault();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={stop}>
          <button
            type="button"
            aria-label="More actions"
            className={`${triggerClass} ${className ?? ""}`}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Trust &amp; safety
          </DropdownMenuLabel>
          {REPORT_ITEMS.map((item) => (
            <DropdownMenuItem key={item.category} asChild>
              <Link
                to="/report"
                search={{
                  target_type: targetType,
                  category: item.category,
                  ...(listingId ? { listing_id: listingId } : {}),
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2"
              >
                <item.Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
          {sellerUserId && !isSelf && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  if (!user) {
                    toast.error("Sign in to block sellers.");
                    return;
                  }
                  setConfirmOpen(true);
                }}
                className="flex items-center gap-2 text-destructive focus:text-destructive"
              >
                <UserX className="h-4 w-4" />
                Block seller
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {sellerUserId && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Block {sellerName ?? "this seller"}?</AlertDialogTitle>
              <AlertDialogDescription>
                Their listings will be hidden from your feeds and search results. They won't be
                notified. You can unblock anytime from Dashboard → Blocked users.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      await block.mutateAsync({ blockedUserId: sellerUserId });
                      toast.success("Seller blocked.");
                      setConfirmOpen(false);
                    } catch (err: any) {
                      toast.error(err?.message ?? "Could not block seller.");
                    }
                  }}
                >
                  Block seller
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
