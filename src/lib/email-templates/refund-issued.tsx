import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, brandBar, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props {
  name?: string;
  amountPhp?: number;
  reason?: string;
  originalInvoiceId?: string;
}

const RefundIssued = ({ name, amountPhp, reason, originalInvoiceId }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Refund of ₱{(amountPhp ?? 0).toLocaleString()} issued.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Refund issued</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, your` : "Your"} refund from {SITE_NAME} has been processed and should
          appear on your statement within 5–10 business days.
        </Text>
        <Section style={card}>
          <Text
            style={{
              ...text,
              fontSize: "28px",
              fontWeight: 700,
              color: "#0f172a",
              margin: "0 0 8px",
            }}
          >
            ₱{(amountPhp ?? 0).toLocaleString()}
          </Text>
          {originalInvoiceId && <Text style={muted}>Original invoice: {originalInvoiceId}</Text>}
          {reason && <Text style={muted}>Reason: {reason}</Text>}
        </Section>
        <Text style={footer}>
          If you didn't request this refund, reply to this email immediately. — {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: RefundIssued,
  subject: `Refund issued — ${SITE_NAME}`,
  displayName: "Refund issued",
  previewData: {
    name: "Juan",
    amountPhp: 499,
    reason: "Listing cancelled",
    originalInvoiceId: "INV-2026-00012",
  },
} satisfies TemplateEntry;
