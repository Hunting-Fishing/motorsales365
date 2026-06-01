import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Link } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, button, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props { name?: string; business_name?: string; business_slug?: string }

const BusinessApproved = ({ name, business_name, business_slug }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your business "{business_name ?? "your business"}" is now live on {SITE_NAME}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>You're live 🎉</Heading>
        <Text style={text}>{name ? `Congrats ${name},` : "Congratulations,"}</Text>
        <Text style={text}>
          Your business page on {SITE_NAME} has been approved and is now visible to buyers and sellers nationwide.
        </Text>
        <Section style={card}>
          <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{business_name}</Text>
          <Text style={muted}>Status: Active</Text>
        </Section>
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={`${SITE_URL}/businesses/${business_slug ?? ""}`} style={button}>
            View your public page
          </Button>
        </Section>
        <Text style={text}>
          Boost your visibility by upgrading your tier or adding photos, services, and bookings:{" "}
          <Link href={`${SITE_URL}/dashboard/businesses`}>Manage my businesses</Link>.
        </Text>
        <Text style={footer}>{SITE_NAME} · <Link href={SITE_URL}>{SITE_URL}</Link></Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BusinessApproved,
  subject: ({ business_name }: Props) => `🎉 "${business_name ?? "Your business"}" is now live on ${SITE_NAME}`,
  displayName: "Business — approved & live",
  previewData: { name: "Juan", business_name: "Quezon City Auto Repair", business_slug: "qc-auto-repair" },
} satisfies TemplateEntry;
