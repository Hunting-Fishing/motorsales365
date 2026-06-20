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
  slot_labels?: string[];
  notes?: string;
}

const AdCreativeApproved = ({
  uploader_name,
  headline,
  image_url,
  slot_labels,
  notes,
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>Your ad creative is approved and live on {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>
          {uploader_name ? `${uploader_name}, your` : "Your"} ad creative is approved
        </Heading>
        <Text style={text}>
          Good news — your creative{headline ? ` "${headline}"` : ""} passed review and is now live
          in the rotation.
        </Text>
        {image_url ? (
          <Section style={{ textAlign: "center", margin: "16px 0" }}>
            <Img
              src={image_url}
              alt={headline ?? "Approved creative"}
              width="480"
              style={{ maxWidth: "100%", height: "auto", borderRadius: 6, border: "1px solid #e5e7eb" }}
            />
          </Section>
        ) : null}
        <Section style={card}>
          {slot_labels && slot_labels.length > 0 ? (
            <Text style={text}>
              <strong>Showing in:</strong> {slot_labels.join(", ")}
            </Text>
          ) : null}
          {notes ? (
            <Text style={text}>
              <strong>Reviewer note:</strong> {notes}
            </Text>
          ) : null}
        </Section>
        <Section style={{ margin: "20px 0" }}>
          <Button href={`${SITE_URL}/dashboard/ads`} style={button}>
            View my ad campaigns
          </Button>
        </Section>
        <Text style={footer}>{SITE_NAME} advertising team</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: AdCreativeApproved,
  subject: ({ headline }: Props = {}) =>
    headline
      ? `Approved: "${headline}" is now live on ${SITE_NAME}`
      : `Your ad creative is approved on ${SITE_NAME}`,
  displayName: "Ad creative approved",
  previewData: {
    uploader_name: "Alex",
    headline: "Spring trade-in event",
    image_url: "https://placehold.co/1600x600",
    slot_labels: ["Home hero", "Cars category banner"],
  },
} satisfies TemplateEntry;
