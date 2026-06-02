import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import {
  SITE_NAME,
  SITE_URL,
  brandBar,
  card,
  container,
  footer,
  h1,
  main,
  muted,
  text,
} from "./_styles";

interface Props {
  name?: string;
  legal_name?: string;
  business_kind?: string;
}

const VerificationSubmitted = ({ name, legal_name, business_kind }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your business verification request is under review at {SITE_NAME}.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Verification request received</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi,"}</Text>
        <Text style={text}>
          Thanks for submitting your business credentials. Our team typically reviews verification
          requests within 1–2 business days.
        </Text>
        <Section style={card}>
          <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{legal_name}</Text>
          {business_kind && (
            <Text style={muted}>Business type: {business_kind.replace(/_/g, " ")}</Text>
          )}
          <Text style={muted}>Status: Under review</Text>
        </Section>
        <Text style={text}>
          You can check status any time at{" "}
          <Link href={`${SITE_URL}/dashboard/verification`}>Verification</Link>.
        </Text>
        <Text style={footer}>
          {SITE_NAME} · <Link href={SITE_URL}>{SITE_URL}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: VerificationSubmitted,
  subject: () => `Your verification request is under review at ${SITE_NAME}`,
  displayName: "Verification — submitted",
  previewData: {
    name: "Juan",
    legal_name: "Quezon City Auto Repair Inc.",
    business_kind: "repair_shop",
  },
} satisfies TemplateEntry;
