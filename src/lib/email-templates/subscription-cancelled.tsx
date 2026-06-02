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
import { SITE_NAME, brandBar, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props {
  name?: string;
  plan?: string;
  periodEnd?: string;
}

const SubscriptionCancelled = ({ name, plan, periodEnd }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your {SITE_NAME} subscription has been cancelled.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Subscription cancelled</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, we've` : "We've"} cancelled your {SITE_NAME} subscription as
          requested.
        </Text>
        <Section style={card}>
          {plan && <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{plan}</Text>}
          {periodEnd && <Text style={muted}>You'll keep access until: {periodEnd}</Text>}
        </Section>
        <Text style={text}>
          Changed your mind? You can reactivate anytime before the period ends.
        </Text>
        <Text style={footer}>Thanks for being part of {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SubscriptionCancelled,
  subject: `Your ${SITE_NAME} subscription has been cancelled`,
  displayName: "Subscription cancelled",
  previewData: { name: "Juan", plan: "Dealer Pro — Monthly", periodEnd: "June 10, 2026" },
} satisfies TemplateEntry;
