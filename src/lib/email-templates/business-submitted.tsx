import { Body, Container, Head, Heading, Html, Preview, Section, Text, Link } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props { name?: string; business_name?: string; business_slug?: string; status?: string }

const BusinessSubmitted = ({ name, business_name, status }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>We received your business submission "{business_name ?? "your business"}" on {SITE_NAME}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Thanks — we got your business</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi,"}</Text>
        <Text style={text}>
          Your submission is in our review queue. We typically respond within 1–2 business days
          and will email you again as soon as your page goes live.
        </Text>
        <Section style={card}>
          <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{business_name}</Text>
          <Text style={muted}>Status: {status === "active" ? "Active" : "Pending review"}</Text>
        </Section>
        <Text style={text}>
          While you wait, you can fine-tune your hours, photos, services, and contact channels here:{" "}
          <Link href={`${SITE_URL}/dashboard/businesses`}>Open my businesses</Link>.
        </Text>
        <Text style={footer}>{SITE_NAME} · <Link href={SITE_URL}>{SITE_URL}</Link></Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BusinessSubmitted,
  subject: ({ business_name }: Props) => `"${business_name ?? "Your business"}" is under review on ${SITE_NAME}`,
  displayName: "Business — submitted",
  previewData: { name: "Juan", business_name: "Quezon City Auto Repair", business_slug: "qc-auto-repair", status: "pending" },
} satisfies TemplateEntry;
