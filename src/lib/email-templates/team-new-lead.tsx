import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, container, footer, h1, main, text } from "./_styles";

interface Props {
  org_name?: string;
  customer_name?: string;
  subject?: string;
  preview?: string;
  source?: string;
  lead_id?: string;
}

const SOURCE_LABEL: Record<string, string> = {
  listing_message: "Listing inquiry",
  business_inquiry: "Business inquiry",
  service_inquiry: "Service inquiry",
  tow_request: "Tow request",
};

const TeamNewLead = ({ org_name, customer_name, subject, preview, source, lead_id }: Props) => {
  const url = `${SITE_URL}/dashboard/team/leads_/${lead_id ?? ""}`;
  return (
    <Html lang="en">
      <Head />
      <Preview>New lead for {org_name ?? "your team"}: {subject ?? "Inquiry"}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar} />
          <Heading style={h1}>New lead in {org_name ?? "your inbox"}</Heading>
          <Text style={text}>
            <strong>{customer_name ?? "A customer"}</strong> just sent a {SOURCE_LABEL[source ?? ""] ?? "new inquiry"}.
          </Text>
          <Section style={{ background: "#f5f7fb", borderRadius: 8, padding: "14px 16px", margin: "16px 0" }}>
            <Text style={{ ...text, margin: 0, fontWeight: 600 }}>{subject}</Text>
            {preview ? <Text style={{ ...text, margin: "6px 0 0", color: "#475569" }}>{preview}</Text> : null}
          </Section>
          <Section style={{ textAlign: "center", margin: "24px 0" }}>
            <Button
              href={url}
              style={{
                background: "#0f172a",
                color: "#fff",
                padding: "12px 22px",
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Open lead
            </Button>
          </Section>
          <Text style={footer}>
            You're getting this because you manage {org_name ?? "this team"} on {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: TeamNewLead,
  subject: (d: Record<string, any>) => `New lead: ${d?.subject ?? "Customer inquiry"}`,
  displayName: "Team — new lead",
  previewData: {
    org_name: "Quezon Auto",
    customer_name: "Juan Dela Cruz",
    subject: "Listing inquiry",
    preview: "Hi, is this still available? Can I view it this weekend?",
    source: "listing_message",
    lead_id: "00000000-0000-0000-0000-000000000000",
  },
} satisfies TemplateEntry;
