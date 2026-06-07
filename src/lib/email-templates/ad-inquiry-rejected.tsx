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

const AdInquiryRejected = ({ contact_name, company, placement }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Update on your {SITE_NAME} advertising inquiry</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>
          Thanks for reaching out{contact_name ? `, ${contact_name}` : ""}
        </Heading>
        <Text style={text}>
          We've reviewed your advertising / sponsorship submission
          {company ? ` for ${company}` : ""} and unfortunately we aren't able to move forward with
          it at this time.
        </Text>
        <Section style={card}>
          <Text style={text}>
            <strong>Requested placement:</strong> {placement ?? "—"}
          </Text>
          <Text style={text}>
            This decision isn't permanent — placements, inventory, and partnership criteria change
            often. You're welcome to submit a new inquiry in the future, especially if your
            offering, format, or budget changes.
          </Text>
        </Section>
        <Text style={text}>
          You can also edit your existing submission and resubmit it for another review from your
          dashboard.
        </Text>
        <Section style={{ margin: "20px 0" }}>
          <Button href={`${SITE_URL}/dashboard/sponsorships`} style={button}>
            Edit & resubmit
          </Button>
        </Section>
        <Text style={footer}>{SITE_NAME} partnerships</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AdInquiryRejected,
  subject: () => `Update on your ${SITE_NAME} advertising inquiry`,
  displayName: "Ad inquiry rejected",
  previewData: {
    contact_name: "Maria",
    company: "Bright Auto Academy",
    placement: "sponsored_post",
  },
} satisfies TemplateEntry;
