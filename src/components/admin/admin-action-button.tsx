import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { logAdminAction } from "@/lib/admin-audit";

export type AdminActionButtonProps = ButtonProps & {
  /** Stable action key recorded in the audit log (e.g. "listing.approve"). */
  action: string;
  entityType?: string;
  entityId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  note?: string;
};

/**
 * Drop-in <Button> replacement that records an admin_audit_log row on
 * click before delegating to the original onClick. Failures in logging
 * never block the underlying action.
 */
export const AdminActionButton = React.forwardRef<HTMLButtonElement, AdminActionButtonProps>(
  ({ action, entityType, entityId, targetUserId, metadata, note, onClick, ...rest }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Fire-and-forget; the underlying action proceeds even if logging is slow.
      void logAdminAction({
        action,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
        target_user_id: targetUserId ?? null,
        metadata: metadata ?? null,
        note: note ?? null,
      });
      onClick?.(e);
    };
    return <Button ref={ref} onClick={handleClick} {...rest} />;
  },
);
AdminActionButton.displayName = "AdminActionButton";
