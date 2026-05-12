import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, button, card, container, footer, h1, main, text } from "./_styles";

interface Props {
  contact_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  placement?: string;
  budget_range?: string;
  start_date?: string;
  message?: string;
  inquiry_id?: string;
}

const AdInquiryStaffNotice = ({
  contact_name, company, email, phone, placement, budget_range, start_date, message,
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>New advertising inquiry from {contact_name ?? "advertiser"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>New advertising inquiry</Heading>
        <Section style={card}>
          <Text style={text}><b>Name:</b> {contact_name}</Text>
          {company && <Text style={text}><b>Company:</b> {company}</Text>}
          <Text style={text}><b>Email:</b> {email}</Text>
          {phone && <Text style={text}><b>Phone:</b> {phone}</Text>}
          <Text style={text}><b>Placement:</b> {placement}</Text>
          {budget_range && <Text style={text}><b>Budget:</b> {budget_range}</Text>}
          {start_date && <Text style={text}><b>Start date:</b> {start_date}</Text>}
          <Text style={text}><b>Message:</b><br />{message}</Text>
        </Section>
        <Section style={{ margin: "20px 0" }}>
          <Button href={`${SITE_URL}/admin/advertising`} style={button}>Open inbox</Button>
        </Section>
        <Text style={footer}>{SITE_NAME} partnerships</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AdInquiryStaffNotice,
  subject: (d) => `New ad inquiry — ${d.contact_name ?? "advertiser"}${d.company ? ` (${d.company})` : ""}`,
  displayName: "Ad inquiry staff notice",
  to: "partners@365motorsales.ph",
  previewData: {
    contact_name: "Maria Santos", company: "AutoParts PH", email: "maria@autoparts.ph",
    phone: "+63 917 555 0100", placement: "homepage_banner", budget_range: "₱20,000–50,000",
    start_date: "2026-06-01", message: "Looking to promote our brake pad line for 3 months.",
  },
} satisfies TemplateEntry;
