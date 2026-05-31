import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, container, footer, h1, main, text } from "./_styles";

interface Props {
  customer_name: string;
  business_name: string;
  business_slug: string;
  service_title: string;
  starts_at_human: string;
  status: "pending" | "confirmed";
}

const BookingCustomer = ({ customer_name, business_name, business_slug, service_title, starts_at_human, status }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>
      {status === "confirmed"
        ? `Your appointment with ${business_name} is confirmed`
        : `${business_name} received your booking request`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>
          {status === "confirmed" ? "Appointment confirmed" : "Booking request received"}
        </Heading>
        <Text style={text}>Hi {customer_name},</Text>
        <Text style={text}>
          {status === "confirmed"
            ? `Your appointment with ${business_name} is confirmed.`
            : `Thanks for booking with ${business_name}. They will review your request and confirm shortly.`}
        </Text>
        <Text style={text}>
          <strong>Service:</strong> {service_title}<br />
          <strong>When:</strong> {starts_at_human}
        </Text>
        <Text style={text}>
          View the business page: <a href={`${SITE_URL}/businesses/${business_slug}`}>{SITE_URL}/businesses/{business_slug}</a>
        </Text>
        <Text style={footer}>
          {SITE_NAME} · <a href={SITE_URL}>{SITE_URL}</a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BookingCustomer,
  subject: (d: Record<string, any>) =>
    d?.status === "confirmed"
      ? `Your appointment with ${d?.business_name ?? "the shop"} is confirmed`
      : `${d?.business_name ?? "Booking"} received your request`,
  displayName: "Booking — customer notice",
  previewData: {
    customer_name: "Maria",
    business_name: "uCatch Cook Fuels",
    business_slug: "ucatch-cook-fuels-mlpb8",
    service_title: "Oil change",
    starts_at_human: "Mon, Jun 2 2026 · 10:00 AM",
    status: "confirmed",
  },
} satisfies TemplateEntry;
