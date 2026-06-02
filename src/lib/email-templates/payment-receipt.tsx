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
  description?: string;
  invoiceId?: string;
  paidAt?: string;
}

const PaymentReceipt = ({ name, amountPhp, description, invoiceId, paidAt }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>
      Receipt from {SITE_NAME} — ₱{(amountPhp ?? 0).toLocaleString()}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Payment received</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, thanks` : "Thanks"} for your payment to {SITE_NAME}. Here's your
          receipt.
        </Text>
        <Section style={card}>
          <Text style={{ ...text, margin: "0 0 4px", fontWeight: 600 }}>
            {description ?? "Marketplace payment"}
          </Text>
          <Text
            style={{
              ...text,
              fontSize: "28px",
              fontWeight: 700,
              color: "#0f172a",
              margin: "8px 0",
            }}
          >
            ₱{(amountPhp ?? 0).toLocaleString()}
          </Text>
          {invoiceId && <Text style={muted}>Invoice ID: {invoiceId}</Text>}
          {paidAt && <Text style={muted}>Paid on: {paidAt}</Text>}
        </Section>
        <Text style={footer}>Keep this receipt for your records. — {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: PaymentReceipt,
  subject: (d: Record<string, any>) =>
    `Receipt: ₱${(d?.amountPhp ?? 0).toLocaleString()} paid to ${SITE_NAME}`,
  displayName: "Payment receipt",
  previewData: {
    name: "Juan",
    amountPhp: 499,
    description: "Featured listing — 7 days",
    invoiceId: "INV-2026-00012",
    paidAt: "May 10, 2026",
  },
} satisfies TemplateEntry;
