import { useState } from "react";
import { z } from "zod";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";
import { toast } from "sonner";

const TOPIC_OPTIONS = [
  { value: "buying", label: "Buying" },
  { value: "selling", label: "Selling & boosting" },
  { value: "account", label: "Account & verification" },
  { value: "business", label: "Business pages & shop" },
  { value: "payments", label: "Payments & billing" },
  { value: "other", label: "Something else" },
] as const;

const TopicValues = TOPIC_OPTIONS.map((t) => t.value) as [string, ...string[]];

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  topic: z.enum(TopicValues, { message: "Pick a topic" }),
  subject: z.string().trim().min(3, "Subject is too short").max(200),
  message: z.string().trim().min(5, "Please describe your issue").max(4000),
});

type FormState = {
  name: string;
  email: string;
  topic: string;
  subject: string;
  message: string;
};

export function SupportTicketForm({
  defaultTopic,
  compact,
}: {
  defaultTopic?: FormState["topic"];
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [state, setState] = useState<FormState>({
    name: (user?.user_metadata?.full_name as string) ?? "",
    email: user?.email ?? "",
    topic: defaultTopic ?? "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setState((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(state);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof FormState;
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .insert({
          name: parsed.data.name,
          email: parsed.data.email,
          topic: parsed.data.topic,
          subject: parsed.data.subject,
          message: parsed.data.message,
          user_id: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;

      const ticketId = data?.id as string;
      const topicLabel =
        TOPIC_OPTIONS.find((t) => t.value === parsed.data.topic)?.label ?? parsed.data.topic;

      // Send confirmation + staff notice (fire-and-forget; failures logged but don't block UX)
      await Promise.all([
        sendTransactionalEmail({
          templateName: "support-ticket-received",
          recipientEmail: parsed.data.email,
          idempotencyKey: `support-confirm-${ticketId}`,
          templateData: {
            name: parsed.data.name,
            subject: parsed.data.subject,
            topic: topicLabel,
            ticket_id: ticketId,
          },
        }),
        sendTransactionalEmail({
          templateName: "support-ticket-staff-notice",
          recipientEmail: "support@365motorsales.com",
          idempotencyKey: `support-staff-${ticketId}`,
          templateData: {
            name: parsed.data.name,
            email: parsed.data.email,
            subject: parsed.data.subject,
            topic: topicLabel,
            message: parsed.data.message,
            ticket_id: ticketId,
          },
        }),
      ]);

      setSent(true);
      toast.success("Support request sent — we'll reply within 1 business day.");
    } catch (err: any) {
      console.error("[support] submission failed", err);
      toast.error(err?.message ?? "Couldn't send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary" />
        <h3 className="text-lg font-semibold">Got it — your request is in.</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          We sent a confirmation to <strong>{state.email}</strong>. Our team typically replies
          within 1 business day.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setSent(false);
            setState({ name: state.name, email: state.email, topic: "", subject: "", message: "" });
          }}
        >
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <div>
          <Label htmlFor="support-name">Your name</Label>
          <Input
            id="support-name"
            value={state.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Juan dela Cruz"
            aria-invalid={!!errors.name}
            className="mt-1"
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </div>
        <div>
          <Label htmlFor="support-email">Email</Label>
          <Input
            id="support-email"
            type="email"
            value={state.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            className="mt-1"
          />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="support-topic">Topic</Label>
        <Select value={state.topic} onValueChange={(v) => update("topic", v)}>
          <SelectTrigger id="support-topic" className="mt-1" aria-invalid={!!errors.topic}>
            <SelectValue placeholder="Pick a topic" />
          </SelectTrigger>
          <SelectContent>
            {TOPIC_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.topic && <p className="mt-1 text-xs text-destructive">{errors.topic}</p>}
      </div>

      <div>
        <Label htmlFor="support-subject">Subject</Label>
        <Input
          id="support-subject"
          value={state.subject}
          onChange={(e) => update("subject", e.target.value)}
          placeholder="Short summary, e.g. Can't boost my Vios listing"
          aria-invalid={!!errors.subject}
          className="mt-1"
        />
        {errors.subject && <p className="mt-1 text-xs text-destructive">{errors.subject}</p>}
      </div>

      <div>
        <Label htmlFor="support-message">Message</Label>
        <Textarea
          id="support-message"
          value={state.message}
          onChange={(e) => update("message", e.target.value)}
          placeholder="Tell us what's happening, what you tried, and any error messages you saw."
          rows={5}
          aria-invalid={!!errors.message}
          className="mt-1"
        />
        <div className="mt-1 flex items-center justify-between">
          {errors.message ? (
            <p className="text-xs text-destructive">{errors.message}</p>
          ) : (
            <span className="text-xs text-muted-foreground">Min 5, max 4,000 characters.</span>
          )}
          <span className="text-xs text-muted-foreground">{state.message.length}/4000</span>
        </div>
      </div>

      <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Send support request
          </>
        )}
      </Button>
    </form>
  );
}
