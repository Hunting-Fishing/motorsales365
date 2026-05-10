import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, button, container, footer, h1, main, text } from "./_styles";

interface Props { name?: string }

const SignupWelcome = ({ name }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Welcome to {SITE_NAME} — start buying, selling, and connecting.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>{name ? `Welcome, ${name}!` : `Welcome to ${SITE_NAME}!`}</Heading>
        <Text style={text}>Your account is ready. {SITE_NAME} is the Philippines' marketplace for cars, parts, services, and tow assistance — all in one place.</Text>
        <Text style={text}>Here's what you can do next:</Text>
        <Text style={text}>• Post your first listing in minutes<br />• Browse vehicles near you<br />• Message verified sellers safely</Text>
        <Section style={{ margin: "24px 0" }}>
          <Button href={`${SITE_URL}/sell`} style={button}>Post a listing</Button>
        </Section>
        <Text style={footer}>Questions? Reply to this email or visit our help center. — The {SITE_NAME} team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SignupWelcome,
  subject: `Welcome to ${SITE_NAME}`,
  displayName: "Signup welcome",
  previewData: { name: "Juan" },
} satisfies TemplateEntry;
