import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Mail, Loader2, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SiteLayout } from "@/components/site-layout";
import { PhoneInput } from "@/components/phone-input";
import { buildE164 } from "@/data/country-codes";
import { siteOrigin } from "@/lib/site-config";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

const EMAIL_COOLDOWN_SECONDS = 60;
const SMS_COOLDOWN_SECONDS = 30;
const COOLDOWN_KEY = "fp:emailCooldownUntil";

function useCooldown(persistKey?: string) {
  const [until, setUntil] = useState<number>(0);
  const [now, setNow] = useState<number>(() => Date.now());

  // Hydrate from sessionStorage
  useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;
    const raw = sessionStorage.getItem(persistKey);
    const v = raw ? Number(raw) : 0;
    if (v && v > Date.now()) setUntil(v);
  }, [persistKey]);

  useEffect(() => {
    if (until <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [until]);

  const start = (seconds: number) => {
    const next = Date.now() + seconds * 1000;
    setUntil(next);
    if (persistKey && typeof window !== "undefined") {
      sessionStorage.setItem(persistKey, String(next));
    }
  };

  const remaining = Math.max(0, Math.ceil((until - now) / 1000));
  const active = remaining > 0;
  return { active, remaining, start };
}

function ForgotPasswordPage() {
  const navigate = useNavigate();

  // ------- Email tab state -------
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailCooldown = useCooldown(COOLDOWN_KEY);

  const sendEmailReset = async (targetEmail: string) => {
    setEmailStatus("sending");
    setEmailError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${siteOrigin()}/reset-password`,
    });
    if (error) {
      const msg = error.message || "Could not send the reset link.";
      const isRate =
        /rate limit|too many/i.test(msg) || (error as any)?.status === 429;
      setEmailStatus("error");
      setEmailError(
        isRate
          ? "Too many requests. Please wait before trying again."
          : msg,
      );
      if (isRate) emailCooldown.start(EMAIL_COOLDOWN_SECONDS);
      toast.error(isRate ? "Too many requests — slow down." : msg);
      return;
    }
    setEmailStatus("sent");
    emailCooldown.start(EMAIL_COOLDOWN_SECONDS);
    toast.success("Reset link sent.");
  };

  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = email.trim();
    if (!target) return;
    await sendEmailReset(target);
  };

  // ------- SMS tab state -------
  const [phoneIso, setPhoneIso] = useState("PH");
  const [phoneNational, setPhoneNational] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [smsStatus, setSmsStatus] = useState<
    "idle" | "sending" | "sent" | "verifying" | "error"
  >("idle");
  const [smsError, setSmsError] = useState<string | null>(null);
  const smsCooldown = useCooldown();

  const sendSmsOtp = async () => {
    const e164 = buildE164(phoneIso, phoneNational);
    if (!e164) {
      setSmsError("Enter a valid mobile number.");
      setSmsStatus("error");
      return;
    }
    setSmsStatus("sending");
    setSmsError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    if (error) {
      const msg = error.message || "Could not send OTP.";
      const isRate =
        /rate limit|too many/i.test(msg) || (error as any)?.status === 429;
      setSmsStatus("error");
      setSmsError(isRate ? "Too many requests. Please wait before trying again." : msg);
      if (isRate) smsCooldown.start(SMS_COOLDOWN_SECONDS);
      toast.error(isRate ? "Too many requests — slow down." : msg);
      return;
    }
    setOtpStep(true);
    setSmsStatus("sent");
    smsCooldown.start(SMS_COOLDOWN_SECONDS);
    toast.success("OTP sent to your phone.");
  };

  const handleSendSmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendSmsOtp();
  };

  const handleVerifySmsOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const e164 = buildE164(phoneIso, phoneNational);
    if (!e164) return;
    setSmsStatus("verifying");
    setSmsError(null);
    const { error } = await supabase.auth.verifyOtp({
      phone: e164,
      token: otp,
      type: "sms",
    });
    if (error) {
      setSmsStatus("error");
      setSmsError(error.message || "Code is invalid or expired.");
      toast.error(error.message || "Code is invalid or expired.");
      return;
    }
    toast.success("Verified. Set a new password.");
    navigate({ to: "/reset-password", hash: "type=recovery" });
  };

  // ------- Render -------
  return (
    <SiteLayout>
      <div className="container mx-auto flex max-w-md flex-col px-4 py-16">
        <h1 className="font-display text-3xl font-bold">Forgot password</h1>
        <p className="text-muted-foreground">
          Recover your account by email or PH mobile number.
        </p>

        <Tabs defaultValue="email" className="mt-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email link</TabsTrigger>
            <TabsTrigger value="sms">SMS OTP</TabsTrigger>
          </TabsList>

          {/* EMAIL TAB */}
          <TabsContent value="email" className="space-y-4">
            {emailStatus === "sent" ? (
              <div className="space-y-4">
                <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle>Reset link sent</AlertTitle>
                  <AlertDescription>
                    We sent a link to <strong>{email}</strong>. It expires in 1 hour. Check
                    your spam folder if you don't see it within a minute.
                  </AlertDescription>
                </Alert>

                {emailCooldown.active && (
                  <CooldownNotice
                    remaining={emailCooldown.remaining}
                    label="Resend available in"
                  />
                )}

                <Button
                  type="button"
                  className="w-full"
                  variant={emailCooldown.active ? "outline" : "secondary"}
                  disabled={emailCooldown.active || (emailStatus as string) === "sending"}
                  aria-disabled={emailCooldown.active || (emailStatus as string) === "sending"}
                  onClick={() => sendEmailReset(email)}
                >
                  {(emailStatus as string) === "sending" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : emailCooldown.active ? (
                    `Resend in ${formatTimer(emailCooldown.remaining)}`
                  ) : (
                    "Resend reset link"
                  )}
                </Button>

                {emailCooldown.active && (
                  <p className="text-center text-xs text-muted-foreground">
                    You can request another link once the timer ends.
                  </p>
                )}

                <button
                  type="button"
                  className="w-full text-xs text-muted-foreground hover:underline"
                  onClick={() => {
                    setEmailStatus("idle");
                    setEmailError(null);
                  }}
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailReset} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={emailStatus === "sending"}
                  />
                </div>

                {emailStatus === "error" && emailError && (
                  <Alert variant="destructive" aria-live="polite">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Couldn't send reset link</AlertTitle>
                    <AlertDescription>{emailError}</AlertDescription>
                  </Alert>
                )}

                {emailCooldown.active && (
                  <CooldownNotice
                    remaining={emailCooldown.remaining}
                    label="Resend available in"
                  />
                )}

                <Button
                  type="submit"
                  disabled={emailStatus === "sending" || emailCooldown.active || !email.trim()}
                  aria-disabled={emailStatus === "sending" || emailCooldown.active || !email.trim()}
                  className="w-full"
                >
                  {emailStatus === "sending" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : emailCooldown.active ? (
                    `Try again in ${formatTimer(emailCooldown.remaining)}`
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" /> Send reset link
                    </>
                  )}
                </Button>

                {emailCooldown.active && (
                  <p className="text-center text-xs text-muted-foreground">
                    You can request another link once the timer ends.
                  </p>
                )}
              </form>
            )}
          </TabsContent>

          {/* SMS TAB */}
          <TabsContent value="sms" className="space-y-4">
            {!otpStep ? (
              <form onSubmit={handleSendSmsOtp} className="space-y-4">
                <div>
                  <Label htmlFor="phone">Mobile number</Label>
                  <PhoneInput
                    id="phone"
                    iso={phoneIso}
                    national={phoneNational}
                    onChange={({ iso, national }) => {
                      setPhoneIso(iso);
                      setPhoneNational(national);
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Must be a phone you've already added to your account.
                  </p>
                </div>

                {smsStatus === "error" && smsError && (
                  <Alert variant="destructive" aria-live="polite">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Couldn't send OTP</AlertTitle>
                    <AlertDescription>{smsError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={smsStatus === "sending" || smsCooldown.active}
                  className="w-full"
                >
                  {smsStatus === "sending" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : smsCooldown.active ? (
                    `Try again in ${formatTimer(smsCooldown.remaining)}`
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifySmsOtp} className="space-y-4">
                <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription>
                    OTP sent. Enter the 6-digit code below to continue.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="otp">6-digit code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                    disabled={smsStatus === "verifying"}
                  />
                </div>

                {smsStatus === "error" && smsError && (
                  <Alert variant="destructive" aria-live="polite">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Verification failed</AlertTitle>
                    <AlertDescription>{smsError}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={smsStatus === "verifying" || otp.length < 6}
                  className="w-full"
                >
                  {smsStatus === "verifying" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying…
                    </>
                  ) : (
                    "Verify & continue"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  disabled={smsCooldown.active || smsStatus === "sending"}
                  onClick={sendSmsOtp}
                >
                  {smsCooldown.active
                    ? `Resend OTP in ${formatTimer(smsCooldown.remaining)}`
                    : "Resend OTP"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setOtpStep(false);
                    setSmsStatus("idle");
                    setSmsError(null);
                  }}
                  className="w-full text-xs text-muted-foreground hover:underline"
                >
                  Use a different number
                </button>
              </form>
            )}
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
