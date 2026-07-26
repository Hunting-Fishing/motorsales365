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
  inquiry_id?: string;
  inquiry_type?: string;
  contact_name?: string;
  email?: string;
  phone?: string | null;
  vehicle_summary?: string | null;
  message?: string | null;
  source_url?: string | null;
}

const ServiceInquiryStaffNotice = ({
  inquiry_id,
  inquiry_type,
  contact_name,
  email,
  phone,
  vehicle_summary,
  message,
  source_url,
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>New service inquiry: {inquiry_type ?? "general"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>New service inquiry</Heading>
        <Section style={card}>
          <Text style={{ ...text, margin: "0 0 8px", fontWeight: 600 }}>
            {inquiry_type ?? "general"}
          </Text>
          <Text style={muted}>
            From: {contact_name} &lt;{email}&gt;
            {phone ? ` · ${phone}` : ""}
          </Text>
          {vehicle_summary && <Text style={muted}>Vehicle: {vehicle_summary}</Text>}
          {inquiry_id && <Text style={muted}>Ref: {inquiry_id}</Text>}
          {source_url && <Text style={muted}>Source: {source_url}</Text>}
        </Section>
        {message && <Text style={{ ...text, whiteSpace: "pre-wrap" }}>{message}</Text>}
        <Text style={footer}>
          Reply directly to <a href={`mailto:${email}`}>{email}</a>.<br />
          {SITE_NAME} · {SITE_URL}
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: ServiceInquiryStaffNotice,
  subject: (d: Record<string, any>) => `New service inquiry — ${d?.inquiry_type ?? "general"}`,
  displayName: "Service inquiry (staff notice)",
  previewData: {
    inquiry_id: "8f0c0f2e-1234-4a1b-9c8d-abcdef123456",
    inquiry_type: "financing",
    contact_name: "Juan dela Cruz",
    email: "juan@example.com",
    phone: "+63 917 000 0000",
    vehicle_summary: "2018 Toyota Vios 1.3 E",
    message: "Looking for financing options with 20% down.",
    source_url: "https://www.365motorsales.com/services",
  },
} satisfies TemplateEntry;

export default ServiceInquiryStaffNotice;
