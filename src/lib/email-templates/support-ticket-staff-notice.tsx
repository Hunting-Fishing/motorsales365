import {
  Body,
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
  email?: string;
  subject?: string;
  topic?: string;
  message?: string;
  ticket_id?: string;
}

const SupportTicketStaffNotice = ({ name, email, subject, topic, message, ticket_id }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>New support ticket: {subject ?? "(no subject)"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>New support ticket</Heading>
        <Section style={card}>
          <Text style={{ ...text, margin: "0 0 8px", fontWeight: 600 }}>{subject}</Text>
          <Text style={muted}>
            From: {name} &lt;{email}&gt;
            {topic ? ` · Topic: ${topic}` : ""}
          </Text>
          {ticket_id && <Text style={muted}>Ref: {ticket_id}</Text>}
        </Section>
        <Text style={{ ...text, whiteSpace: "pre-wrap" }}>{message}</Text>
        <Text style={footer}>
          Reply directly to <a href={`mailto:${email}`}>{email}</a>. Manage tickets in the admin
          console. <br />
          {SITE_NAME} · {SITE_URL}
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SupportTicketStaffNotice,
  subject: (d: Record<string, any>) => `[Support] ${d?.subject ?? "New ticket"}`,
  displayName: "Support ticket staff notice",
  to: "support@365motorsales.com",
  previewData: {
    name: "Juan dela Cruz",
    email: "juan@example.com",
    subject: "Can't boost my listing",
    topic: "Selling & boosting",
    message: "Hi, I'm trying to boost my Toyota Vios listing but the payment keeps failing.",
    ticket_id: "a1b2c3d4-1234-5678-9abc-def012345678",
  },
} satisfies TemplateEntry;
