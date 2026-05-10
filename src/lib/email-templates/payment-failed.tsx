import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, button, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props { name?: string; amountPhp?: number; reason?: string; description?: string }

const PaymentFailed = ({ name, amountPhp, reason, description }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>We couldn't process your payment to {SITE_NAME}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Payment failed</Heading>
        <Text style={text}>{name ? `Hi ${name}, we` : "We"} tried to charge your payment method but it didn't go through.</Text>
        <Section style={card}>
          <Text style={{ ...text, margin: "0 0 4px", fontWeight: 600 }}>{description ?? "Marketplace payment"}</Text>
          <Text style={{ ...text, fontSize: "22px", fontWeight: 700, color: "#0f172a", margin: "4px 0" }}>₱{(amountPhp ?? 0).toLocaleString()}</Text>
          {reason && <Text style={muted}>Reason: {reason}</Text>}
        </Section>
        <Text style={text}>Please update your payment method to keep your listing or subscription active.</Text>
        <Section style={{ margin: "24px 0" }}>
          <Button href={`${SITE_URL}/dashboard/billing`} style={button}>Update payment method</Button>
        </Section>
        <Text style={footer}>Need help? Reply to this email. — {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: PaymentFailed,
  subject: `Payment failed — action required`,
  displayName: "Payment failed",
  previewData: { name: "Juan", amountPhp: 499, reason: "Card declined", description: "Featured listing — 7 days" },
} satisfies TemplateEntry;
