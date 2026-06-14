import { useState } from "react";
import { Info, Lightbulb, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const SUGGESTION_TYPES = [
  "Field is confusing",
  "Field is missing",
  "Wording / label change",
  "Validation issue",
  "Layout / design",
  "Other suggestion",
] as const;

const schema = z.object({
  suggestion_type: z.string().min(1, "Pick a type"),
  message: z
    .string()
    .trim()
    .min(8, "Tell us a little more (at least 8 characters)")
    .max(2000, "Keep it under 2000 characters"),
  contact_email: z
    .string()
    .trim()
    .max(255)
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
});

/**
 * Reusable feedback affordance for ANY form on the site.
 *
 * Drop inside (or directly under) a form:
 *   <FormFeedbackLink formId="report-listing" />
 *
 * Renders a small "Submit form changes & suggestions" link with an info
 * tooltip and opens a lightweight dialog that writes to `form_feedback`.
 */
export function FormFeedbackLink({
  formId,
  label = "Submit form changes & suggestions",
  className,
}: {
  formId: string;
  label?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>(SUGGESTION_TYPES[0]);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse({
      suggestion_type: type,
      message,
      contact_email: email,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("form_feedback").insert({
      form_id: formId,
      page_path: typeof window !== "undefined" ? window.location.pathname : null,
      suggestion_type: parsed.data.suggestion_type,
      message: parsed.data.message,
      contact_email: parsed.data.contact_email || user?.email || null,
      user_id: user?.id ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Thanks! Your suggestion was sent to our team.");
    setMessage("");
    setEmail("");
    setOpen(false);
  };

  return (
    <>
      <div
        className={
          "flex items-center gap-1.5 text-[11px] text-muted-foreground " +
          (className ?? "")
        }
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {label}
        </button>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Why submit feedback?"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
              We love feedback. Input from users like yourself helps make this a
              better place for everyone — suggestions are welcomed and used.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Suggest a change to this form
            </DialogTitle>
            <DialogDescription>
              We love feedback. Tell us what's confusing, missing, or could work
              better — your input shapes the next update.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type of suggestion</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUGGESTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Your suggestion</Label>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. The 'Reason' dropdown is missing an option for duplicate listings."
                maxLength={2000}
              />
            </div>
            {!user && (
              <div>
                <Label>Email (optional, so we can follow up)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={255}
                />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Form: <code className="rounded bg-muted px-1">{formId}</code>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting}>
              <Send className="mr-1 h-4 w-4" />
              {submitting ? "Sending…" : "Send suggestion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
