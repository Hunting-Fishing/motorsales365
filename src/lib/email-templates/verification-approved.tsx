import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text, Link } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, button, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props { name?: string; legal_name?: string }

const VerificationApproved = ({ name, legal_name }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>You're verified on {SITE_NAME} — your Verified badge is now live.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>You're verified ✓</Heading>
        <Text style={text}>{name ? `Congrats ${name},` : "Congratulations,"}</Text>
        <Text style={text}>
          Your business credentials have been approved. A <strong>Verified</strong> badge now appears
          next to your listings and seller profile, giving buyers extra confidence in your business.
        </Text>
        <Section style={card}>
          <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{legal_name}</Text>
          <Text style={muted}>Status: Verified</Text>
        </Section>
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={`${SITE_URL}/dashboard/profile`} style={button}>View my profile</Button>
        </Section>
        <Text style={footer}>{SITE_NAME} · <Link href={SITE_URL}>{SITE_URL}</Link></Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: VerificationApproved,
  subject: () => `✓ You're verified on ${SITE_NAME}`,
  displayName: "Verification — approved",
  previewData: { name: "Juan", legal_name: "Quezon City Auto Repair Inc." },
} satisfies TemplateEntry;
