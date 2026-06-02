import {
  Body,
  Button,
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
  button,
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
  review_notes?: string;
}

const VerificationRejected = ({ name, legal_name, review_notes }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your verification request needs another look.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Verification update needed</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi,"}</Text>
        <Text style={text}>
          We weren't able to approve your verification this time. The good news: you can update and
          resubmit at any time — most requests are approved on the second try.
        </Text>
        <Section style={card}>
          <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{legal_name}</Text>
          <Text style={muted}>Status: Needs update</Text>
          {review_notes && (
            <Text style={{ ...text, margin: "12px 0 0" }}>
              <strong>Reviewer notes:</strong>
              <br />
              {review_notes}
            </Text>
          )}
        </Section>
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <Button href={`${SITE_URL}/dashboard/verification`} style={button}>
            Update my application
          </Button>
        </Section>
        <Text style={footer}>
          {SITE_NAME} · <Link href={SITE_URL}>{SITE_URL}</Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: VerificationRejected,
  subject: () => `Action needed: your verification on ${SITE_NAME}`,
  displayName: "Verification — needs update",
  previewData: {
    name: "Juan",
    legal_name: "Quezon City Auto Repair Inc.",
    review_notes: "DTI certificate was unreadable — please re-upload a clearer scan.",
  },
} satisfies TemplateEntry;
