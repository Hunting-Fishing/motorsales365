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
  amountPhp?: number;
  plan?: string;
  periodEnd?: string;
}

const SubscriptionRenewed = ({ name, amountPhp, plan, periodEnd }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your {SITE_NAME} subscription was renewed.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>Subscription renewed</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, your` : "Your"} {SITE_NAME} subscription has been renewed
          successfully.
        </Text>
        <Section style={card}>
          {plan && <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{plan}</Text>}
          <Text
            style={{
              ...text,
              fontSize: "22px",
              fontWeight: 700,
              color: "#0f172a",
              margin: "4px 0",
            }}
          >
            ₱{(amountPhp ?? 0).toLocaleString()}
          </Text>
          {periodEnd && <Text style={muted}>Next renewal: {periodEnd}</Text>}
        </Section>
        <Text style={footer}>Manage your plan anytime from your dashboard. — {SITE_NAME}</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SubscriptionRenewed,
  subject: `Your ${SITE_NAME} subscription was renewed`,
  displayName: "Subscription renewed",
  previewData: {
    name: "Juan",
    amountPhp: 999,
    plan: "Dealer Pro — Monthly",
    periodEnd: "June 10, 2026",
  },
} satisfies TemplateEntry;
