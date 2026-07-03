import { Body, Container, Head, Heading, Html, Preview, Section, Text, Link } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props {
  name?: string;
  clubName?: string;
  pct?: number;
  reason?: "club_verified" | "membership_approved";
}

const ClubDiscountEligible = ({ name, clubName, pct, reason }: Props) => {
  const reasonText =
    reason === "club_verified"
      ? `${clubName ?? "Your club"} was just verified by our admins`
      : `Your membership in ${clubName ?? "your club"} was approved`;
  return (
    <Html lang="en">
      <Head />
      <Preview>You're now eligible for the {`${pct ?? 5}%`} club-member discount.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar} />
          <Heading style={h1}>You're eligible for {`${pct ?? 5}%`} off</Heading>
          <Text style={text}>
            {name ? `Hi ${name}, ` : "Hi there, "}good news — {reasonText}. As a verified club
            member, you now get a {`${pct ?? 5}%`} discount on internal {SITE_NAME} purchases.
          </Text>
          <Section style={card}>
            <Text style={{ ...text, fontWeight: 600, margin: "0 0 6px" }}>What's included</Text>
            <Text style={{ ...text, margin: "0 0 4px" }}>• Listing boosts</Text>
            <Text style={{ ...text, margin: "0 0 4px" }}>• Business subscription plans</Text>
            <Text style={{ ...text, margin: "0 0 4px" }}>• Listing bundles</Text>
            <Text style={{ ...text, margin: "0 0 4px" }}>• Passport Premium</Text>
            <Text style={muted}>
              The discount is applied automatically at checkout. It doesn't apply to third-party
              purchases (parts, dealer inventory, or affiliate items).
            </Text>
          </Section>
          <Text style={text}>
            <Link href={SITE_URL} style={{ color: "hsl(220 90% 50%)", fontWeight: 600 }}>
              Explore {SITE_NAME} →
            </Link>
          </Text>
          <Text style={footer}>You're receiving this because you're a member of {clubName ?? "a verified club"} on {SITE_NAME}.</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: ClubDiscountEligible,
  subject: (d: Record<string, any>) => `You're eligible for ${d?.pct ?? 5}% off at ${SITE_NAME}`,
  displayName: "Club discount — eligible",
  previewData: {
    name: "Juan",
    clubName: "Manila Riders Club",
    pct: 5,
    reason: "club_verified",
  },
} satisfies TemplateEntry;
