import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, brandBar, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props {
  name?: string;
  clubName?: string;
  pct?: number;
  scopeLabel?: string;
  productLabel?: string;
  originalAmountPhp?: number;
  discountAmountPhp?: number;
  finalAmountPhp?: number;
}

const peso = (n: number | undefined) => `₱${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const ClubDiscountApplied = ({
  name,
  clubName,
  pct,
  scopeLabel,
  productLabel,
  originalAmountPhp,
  discountAmountPhp,
  finalAmountPhp,
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your {`${pct ?? 5}%`} club discount was applied.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Club discount applied</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, we` : "We"} applied your {`${pct ?? 5}%`} club-member discount to your
          recent {scopeLabel ?? "purchase"} at {SITE_NAME}.
        </Text>
        <Section style={card}>
          {productLabel && (
            <Text style={{ ...text, fontWeight: 600, margin: "0 0 8px" }}>{productLabel}</Text>
          )}
          <Text style={{ ...text, margin: "0 0 4px" }}>Subtotal: {peso(originalAmountPhp)}</Text>
          <Text style={{ ...text, margin: "0 0 4px", color: "#059669", fontWeight: 600 }}>
            Club discount ({`${pct ?? 5}%`}): −{peso(discountAmountPhp)}
          </Text>
          {typeof finalAmountPhp === "number" && (
            <Text style={{ ...text, fontSize: "18px", fontWeight: 700, color: "#0f172a", margin: "8px 0 0" }}>
              You paid: {peso(finalAmountPhp)}
            </Text>
          )}
          {clubName && <Text style={muted}>Eligibility: {clubName} (verified)</Text>}
        </Section>
        <Text style={footer}>
          You can review this discount anytime in your billing history. — {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: ClubDiscountApplied,
  subject: (d: Record<string, any>) =>
    `Your ${d?.pct ?? 5}% club discount was applied at ${SITE_NAME}`,
  displayName: "Club discount — applied",
  previewData: {
    name: "Juan",
    clubName: "Manila Riders Club",
    pct: 5,
    scopeLabel: "listing boost",
    productLabel: "Top-of-Search Boost — 7 days",
    originalAmountPhp: 500,
    discountAmountPhp: 25,
    finalAmountPhp: 475,
  },
} satisfies TemplateEntry;
