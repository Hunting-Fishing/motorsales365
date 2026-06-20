import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";
import {
  SITE_NAME,
  SITE_URL,
  brandBar,
  button,
  card,
  container,
  footer,
  h1,
  main,
  text,
} from "./_styles";

interface Props {
  uploader_name?: string;
  headline?: string;
  image_url?: string;
  reason?: string;
}

const AdCreativeRejected = ({ uploader_name, headline, image_url, reason }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your ad creative needs changes before it can go live</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>
          {uploader_name ? `${uploader_name}, your` : "Your"} ad creative needs changes
        </Heading>
        <Text style={text}>
          We reviewed your creative{headline ? ` "${headline}"` : ""} and it can't go live as
          submitted. Please update it based on the note below and re-upload.
        </Text>
        {image_url ? (
          <Section style={{ textAlign: "center", margin: "16px 0" }}>
            <Img
              src={image_url}
              alt={headline ?? "Rejected creative"}
              width="480"
              style={{ maxWidth: "100%", height: "auto", borderRadius: 6, border: "1px solid #e5e7eb", opacity: 0.85 }}
            />
          </Section>
        ) : null}
        <Section style={card}>
          <Text style={text}>
            <strong>Reason:</strong> {reason ?? "Did not meet placement requirements."}
          </Text>
        </Section>
        <Section style={{ margin: "20px 0" }}>
          <Button href={`${SITE_URL}/dashboard/ads`} style={button}>
            Update my creative
          </Button>
        </Section>
        <Text style={footer}>{SITE_NAME} advertising team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AdCreativeRejected,
  subject: ({ headline }: Props = {}) =>
    headline
      ? `Changes needed: "${headline}" on ${SITE_NAME}`
      : `Your ad creative needs changes on ${SITE_NAME}`,
  displayName: "Ad creative rejected",
  previewData: {
    uploader_name: "Alex",
    headline: "Spring trade-in event",
    image_url: "https://placehold.co/1600x600",
    reason: "Image is 720px wide — this slot requires at least 1600px wide.",
  },
} satisfies TemplateEntry;
