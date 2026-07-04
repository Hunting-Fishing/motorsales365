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

interface ClubDiscountBlock {
  clubName?: string | null;
  clubSlug?: string | null;
  pct?: number | null;
  scopeLabel?: string | null;
  originalAmountPhp?: number | null;
  discountAmountPhp?: number | null;
  finalAmountPhp?: number | null;
  appliedAt?: string | null;
  eligibilityReason?: string | null;
}

interface Props {
  name?: string;
  amountPhp?: number;
  description?: string;
  invoiceId?: string;
  paidAt?: string;
  clubDiscount?: ClubDiscountBlock | null;
}

const REASON_LABEL: Record<string, string> = {
  verified_club_membership: "Verified club membership",
};

function formatAppliedAt(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function fmtPeso(n?: number | null): string {
  const num = Math.round(Number(n ?? 0));
  return `₱${num.toLocaleString()}`;
}

const PaymentReceipt = ({
  name,
  amountPhp,
  description,
  invoiceId,
  paidAt,
  clubDiscount,
}: Props) => {
  const hasClub =
    !!clubDiscount &&
    (clubDiscount.pct ?? 0) > 0 &&
    (clubDiscount.discountAmountPhp ?? 0) > 0;
  const appliedAt = formatAppliedAt(clubDiscount?.appliedAt);
  const reasonLabel = clubDiscount?.eligibilityReason
    ? REASON_LABEL[clubDiscount.eligibilityReason] ?? "Verified club membership"
    : "Verified club membership";
  return (
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

          {hasClub && (
            <Section
              style={{
                border: "1px solid #10b98155",
                backgroundColor: "#ecfdf5",
                borderRadius: "12px",
                padding: "16px 18px",
                margin: "0 0 20px",
              }}
            >
              <Text
                style={{
                  ...text,
                  margin: "0 0 6px",
                  fontWeight: 700,
                  color: "#047857",
                  fontSize: "15px",
                }}
              >
                Club member {clubDiscount!.pct}% off applied — saved{" "}
                {fmtPeso(clubDiscount!.discountAmountPhp)}
              </Text>
              <Text style={{ ...text, margin: "0 0 4px", fontSize: "13px", color: "#065f46" }}>
                <strong>Eligibility reason:</strong> {reasonLabel}
                {clubDiscount?.clubName ? ` in ${clubDiscount.clubName}` : ""}.
              </Text>
              {clubDiscount?.scopeLabel && (
                <Text style={{ ...text, margin: "0 0 4px", fontSize: "13px", color: "#065f46" }}>
                  <strong>Applied to:</strong> {clubDiscount.scopeLabel}
                </Text>
              )}
              <Text style={{ ...text, margin: "0 0 4px", fontSize: "13px", color: "#065f46" }}>
                <strong>Subtotal:</strong> {fmtPeso(clubDiscount!.originalAmountPhp)} ·{" "}
                <strong>Discount:</strong> −{fmtPeso(clubDiscount!.discountAmountPhp)} ·{" "}
                <strong>Final:</strong> {fmtPeso(clubDiscount!.finalAmountPhp)}
              </Text>
              {appliedAt && (
                <Text style={{ ...muted, margin: "6px 0 0", color: "#047857" }}>
                  Discount applied {appliedAt}
                </Text>
              )}
            </Section>
          )}

          <Text style={footer}>Keep this receipt for your records. — {SITE_NAME}</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: PaymentReceipt,
  subject: (d: Record<string, any>) =>
    `Receipt: ₱${(d?.amountPhp ?? 0).toLocaleString()} paid to ${SITE_NAME}`,
  displayName: "Payment receipt",
  previewData: {
    name: "Juan",
    amountPhp: 475,
    description: "Featured listing — 7 days",
    invoiceId: "INV-2026-00012",
    paidAt: "May 10, 2026",
    clubDiscount: {
      clubName: "Manila Drift Club",
      clubSlug: "manila-drift-club",
      pct: 5,
      scopeLabel: "listing boost",
      originalAmountPhp: 500,
      discountAmountPhp: 25,
      finalAmountPhp: 475,
      appliedAt: "2026-05-10T08:12:00.000Z",
      eligibilityReason: "verified_club_membership",
    },
  },
} satisfies TemplateEntry;
