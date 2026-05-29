import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props {
  name?: string;
  subject?: string;
  topic?: string;
  ticket_id?: string;
}

const SupportTicketReceived = ({ name, subject, topic, ticket_id }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>We received your support request — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Thanks{name ? `, ${name}` : ""}!</Heading>
        <Text style={text}>
          We received your support request and our team will reply within 1 business day.
          Filipino and English support both available.
        </Text>
        {subject && (
          <Section style={card}>
            <Text style={{ ...text, margin: "0 0 4px", fontWeight: 600 }}>{subject}</Text>
            {topic && <Text style={muted}>Topic: {topic}</Text>}
            {ticket_id && <Text style={muted}>Reference: {ticket_id.slice(0, 8)}</Text>}
          </Section>
        )}
        <Text style={text}>
          Need to add more details? Just reply to this email — we'll attach your response to the same ticket.
        </Text>
        <Text style={footer}>
          {SITE_NAME} · <a href={`${SITE_URL}/support`}>{SITE_URL}/support</a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SupportTicketReceived,
  subject: `We received your support request — ${SITE_NAME}`,
  displayName: "Support ticket received",
  previewData: { name: "Juan", subject: "Can't boost my listing", topic: "Selling & boosting", ticket_id: "a1b2c3d4-1234-5678-9abc-def012345678" },
} satisfies TemplateEntry;
