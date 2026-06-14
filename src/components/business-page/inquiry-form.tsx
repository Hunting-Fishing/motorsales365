import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitBusinessInquiry } from "@/lib/business-pages.functions";
import { Button } from "@/components/ui/button";
import { FormFeedbackLink } from "@/components/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, CheckCircle2 } from "lucide-react";
import { PhoneInput } from "@/components/phone-input";
import { buildE164 } from "@/data/country-codes";

export function InquiryForm({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const submit = useServerFn(submitBusinessInquiry);
  const [name, setName] = useState("");
  const [phoneIso, setPhoneIso] = useState("PH");
  const [phoneNational, setPhoneNational] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 1 || message.trim().length < 1) {
      toast.error("Please add your name and message.");
      return;
    }
    setSending(true);
    try {
      await submit({
        data: {
          businessId,
          name: name.trim(),
          phone: buildE164(phoneIso, phoneNational) ?? null,
          email: email.trim() || null,
          message: message.trim(),
        },
      });
      setDone(true);
      toast.success(`Inquiry sent to ${businessName}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send. Try again.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
        <p className="mt-2 text-sm font-medium">Inquiry sent!</p>
        <p className="text-xs text-muted-foreground">{businessName} will be in touch shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          placeholder="Your name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="h-11 text-base"
          required
        />
        <PhoneInput
          iso={phoneIso}
          national={phoneNational}
          onChange={({ iso, national }) => {
            setPhoneIso(iso);
            setPhoneNational(national);
          }}
          placeholder="Phone (optional)"
        />
      </div>
      <Input
        type="email"
        placeholder="Email (optional)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={200}
        className="h-11 text-base"
      />
      <Textarea
        placeholder="What are you looking for?"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={4000}
        rows={4}
        required
      />
      <Button type="submit" disabled={sending} className="w-full sm:w-auto">
        <Send className="mr-2 h-4 w-4" />
        {sending ? "Sending…" : "Send inquiry"}
      </Button>
    </form>
  );
}
