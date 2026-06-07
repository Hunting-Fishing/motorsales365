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
  text,
} from "./_styles";

interface Props {
  contact_name?: string;
  company?: string;
  placement?: string;
}

const AdInquiryApproved = ({ contact_name, company, placement }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your sponsorship with {SITE_NAME} has been approved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>
          Great news{contact_name ? `, ${contact_name}` : ""} — you're approved!
        </Heading>
        <Text style={text}>
          Your advertising / sponsorship submission{company ? ` for ${company}` : ""} has been
          reviewed and <strong>approved</strong> by our partnerships team.
        </Text>
        <Section style={card}>
          <Text style={text}>
            <strong>Requested placement:</strong> {placement ?? "—"}
          </Text>
          <Text style={text}>
            We'll be in touch shortly to confirm creative, scheduling, and billing details. Reply
            to this email if you have anything to share in the meantime.
          </Text>
        </Section>
        <Section style={{ margin: "20px 0" }}>
          <Button href={`${SITE_URL}/advertise`} style={button}>
            View advertising page
          </Button>
        </Section>
        <Text style={footer}>{SITE_NAME} partnerships</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AdInquiryApproved,
  subject: () => `Your sponsorship with ${SITE_NAME} is approved 🎉`,
  displayName: "Ad inquiry approved",
  previewData: {
    contact_name: "Maria",
    company: "Bright Auto Academy",
    placement: "sponsored_post",
  },
} satisfies TemplateEntry;
