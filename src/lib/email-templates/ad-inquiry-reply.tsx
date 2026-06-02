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
  sender_name?: string;
  body?: string;
}

const AdInquiryReply = ({ contact_name, sender_name, body }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>{sender_name ?? "Our partnerships team"} replied to your advertising inquiry</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>You have a reply{contact_name ? `, ${contact_name}` : ""}</Heading>
        <Text style={text}>
          {sender_name ?? "Our partnerships team"} responded to your advertising inquiry:
        </Text>
        <Section style={card}>
          <Text style={{ ...text, whiteSpace: "pre-wrap" as const }}>{body}</Text>
        </Section>
        <Section style={{ margin: "20px 0" }}>
          <Button href={`${SITE_URL}/advertise`} style={button}>
            Reply on our site
          </Button>
        </Section>
        <Text style={footer}>{SITE_NAME} partnerships</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AdInquiryReply,
  subject: (d) => `New reply from ${SITE_NAME} partnerships`,
  displayName: "Ad inquiry staff reply",
  previewData: {
    contact_name: "Maria",
    sender_name: "Alex (365 MotorSales)",
    body: "Hi Maria! Thanks for reaching out. Here's a draft proposal for the homepage banner…",
  },
} satisfies TemplateEntry;
