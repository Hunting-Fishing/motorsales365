import {
  Body,
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
import { SITE_NAME, brandBar, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props {
  name?: string;
  business_name?: string;
  business_slug?: string;
}

const BusinessArchived = ({ name, business_name, business_slug }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>
      Your business {business_name ?? "your business"} has been archived on {SITE_NAME}.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Your business has been archived</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi,"}</Text>
        <Section style={card}>
          <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{business_name}</Text>
          <Text style={muted}>Status: Archived</Text>
        </Section>
        <Text style={text}>
          While archived, this business is hidden from public search results, the directory map, and
          direct shared links. Existing bookings and inquiries are preserved.
        </Text>
        <Text style={text}>
          You can restore it at any time from your dashboard:{" "}
          <Link href="https://www.365motorsales.com/dashboard/businesses">My Businesses</Link>
          {business_slug ? ` (look for "${business_name}" and click Restore).` : "."}
        </Text>
        <Text style={footer}>If you didn't request this change, contact support right away.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BusinessArchived,
  subject: ({ business_name }: Props) =>
    `"${business_name ?? "Your business"}" has been archived on ${SITE_NAME}`,
  displayName: "Business archived",
  previewData: {
    name: "Juan",
    business_name: "Quezon City Auto Repair",
    business_slug: "qc-auto-repair",
  },
} satisfies TemplateEntry;
