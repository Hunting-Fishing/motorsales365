import { Card } from "@/components/ui/card";
import { FileText, ClipboardCheck, Handshake, Rocket } from "lucide-react";

const STEPS = [
  { icon: FileText, title: "Apply", body: "Tell us about your shop — 5 minutes." },
  { icon: ClipboardCheck, title: "Review", body: "Our partnerships team reviews and may request docs." },
  { icon: Handshake, title: "Onboard", body: "Sign the agreement, get your kit, activate Shop Manager." },
  { icon: Rocket, title: "Launch", body: "Your shop goes live on the 365 network with your discount codes." },
];

export function HowItWorks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((s, i) => (
        <Card key={s.title} className="p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Step {i + 1}
          </div>
          <s.icon className="my-3 h-6 w-6 text-primary" />
          <h3 className="font-display text-base font-semibold">{s.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
        </Card>
      ))}
    </div>
  );
}
