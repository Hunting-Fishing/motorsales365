import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SiteLayout } from "@/components/site-layout";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("63") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+63${digits.slice(1)}`;
  if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
  return null;
}

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Check your email for the reset link.");
  };

  const handleSendSmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const e164 = normalizePhPhone(phone);
    if (!e164) return toast.error("Enter a valid PH phone number (e.g. 0917...)");
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setOtpStep(true);
    toast.success("OTP sent to your phone.");
  };

  const handleVerifySmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const e164 = normalizePhPhone(phone);
    if (!e164) return;
    setSubmitting(true);
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: "sms" });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Verified. Set a new password.");
    navigate({ to: "/reset-password", hash: "type=recovery" });
  };

  return (
    <SiteLayout>
      <div className="container mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Forgot password</h1>
        <p className="text-muted-foreground">Recover your account by email or PH mobile number.</p>

        <Tabs defaultValue="email" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email link</TabsTrigger>
            <TabsTrigger value="sms">SMS OTP</TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <form onSubmit={handleEmailReset} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="sms">
            {!otpStep ? (
              <form onSubmit={handleSendSmsOtp} className="space-y-4">
                <div>
                  <Label htmlFor="phone">PH mobile number</Label>
                  <Input id="phone" placeholder="09XX XXX XXXX" required value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <p className="mt-1 text-xs text-muted-foreground">Must be a phone you've already added to your account.</p>
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Sending…" : "Send OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifySmsOtp} className="space-y-4">
                <div>
                  <Label htmlFor="otp">6-digit code</Label>
                  <Input id="otp" inputMode="numeric" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} />
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Verifying…" : "Verify & continue"}
                </Button>
                <button type="button" onClick={() => setOtpStep(false)} className="w-full text-xs text-muted-foreground hover:underline">
                  Use a different number
                </button>
              </form>
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </SiteLayout>
  );
}
