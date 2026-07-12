import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating Save button — mirrors FloatingHelpWidget positioning but sits above
 * the help widget so both are always reachable. Submits the form identified by
 * `formId` via requestSubmit(), so the parent's onSubmit handler runs and all
 * existing validation still fires.
 */
export function FloatingSaveWidget({
  formId,
  busy,
  label = "Save",
  busyLabel = "Saving…",
}: {
  formId: string;
  busy?: boolean;
  label?: string;
  busyLabel?: string;
}) {
  const trigger = () => {
    if (busy) return;
    const el = document.getElementById(formId);
    if (el && "requestSubmit" in el && typeof (el as HTMLFormElement).requestSubmit === "function") {
      (el as HTMLFormElement).requestSubmit();
    }
  };

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={busy}
      aria-label={busy ? busyLabel : label}
      className={cn(
        "fixed z-40 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-xl ring-1 ring-primary/30 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70",
        // Sit above the help widget (which uses bottom-[calc(72px+safe)] on mobile, bottom-6 on desktop)
        "right-4 bottom-[calc(132px+env(safe-area-inset-bottom))] md:bottom-24 md:right-6",
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      <span>{busy ? busyLabel : label}</span>
    </button>
  );
}
