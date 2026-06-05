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

const BusinessRestored = ({ name, business_name, business_slug }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>
      Your business {business_name ?? "your business"} is live again on {SITE_NAME}.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Your business is live again</Heading>
        <Text style={text}>{name ? `Hi ${name},` : "Hi,"}</Text>
        <Section style={card}>
          <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{business_name}</Text>
          <Text style={muted}>Status: Active</Text>
        </Section>
        <Text style={text}>
          It's now visible in search, on the map, and via its public link
          {business_slug ? (
            <>
              :{" "}
              <Link href={`https://www.365motorsales.com/businesses/${business_slug}`}>
                View it here
              </Link>
            </>
          ) : null}
          .
        </Text>
        <Text style={footer}>Thanks for being part of {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BusinessRestored,
  subject: ({ business_name }: Props) =>
    `"${business_name ?? "Your business"}" is live again on ${SITE_NAME}`,
  displayName: "Business restored",
  previewData: {
    name: "Juan",
    business_name: "Quezon City Auto Repair",
    business_slug: "qc-auto-repair",
  },
} satisfies TemplateEntry;
