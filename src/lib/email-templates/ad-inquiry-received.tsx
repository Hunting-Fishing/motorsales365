import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, container, footer, h1, main, text } from "./_styles";

interface Props { contact_name?: string; placement?: string }

const AdInquiryReceived = ({ contact_name, placement }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>We received your advertising inquiry — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Thanks{contact_name ? `, ${contact_name}` : ""}!</Heading>
        <Text style={text}>
          We received your advertising inquiry{placement ? ` for ${placement.replace(/_/g, " ")}` : ""}. Our
          partnerships team will reply within 1–2 business days with a tailored proposal.
        </Text>
        <Text style={text}>
          In the meantime, feel free to reply to this email with any extra context — creatives, campaign goals,
          or target regions — and we'll factor it in.
        </Text>
        <Text style={footer}>
          {SITE_NAME} · <a href={`${SITE_URL}/advertise`}>{SITE_URL}/advertise</a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AdInquiryReceived,
  subject: `We received your advertising inquiry — ${SITE_NAME}`,
  displayName: "Ad inquiry received",
  previewData: { contact_name: "Maria", placement: "homepage_banner" },
} satisfies TemplateEntry;
