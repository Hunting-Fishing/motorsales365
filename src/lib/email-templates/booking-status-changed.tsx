import { Body, Container, Head, Heading, Html, Preview, Section, Text, Link } from "@react-email/components";
import type { TemplateEntry } from "./registry";
import { SITE_NAME, SITE_URL, brandBar, card, container, footer, h1, main, muted, text } from "./_styles";

interface Props {
  customer_name?: string;
  business_name?: string;
  business_slug?: string;
  service_title?: string;
  starts_at_human?: string;
  status?: "confirmed" | "cancelled" | "completed" | "no_show";
}

function statusHeadline(status?: string) {
  switch (status) {
    case "confirmed": return "Your appointment is confirmed";
    case "cancelled": return "Your appointment was cancelled";
    case "completed": return "Thanks for your visit";
    case "no_show":   return "We missed you";
    default:          return "Booking update";
  }
}

const BookingStatusChanged = ({ customer_name, business_name, business_slug, service_title, starts_at_human, status }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>{business_name ?? "Your booking"} — {status ?? "update"}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>{statusHeadline(status)}</Heading>
        <Text style={text}>{customer_name ? `Hi ${customer_name},` : "Hi,"}</Text>
        <Text style={text}>
          {status === "confirmed" && `${business_name} confirmed your booking.`}
          {status === "cancelled" && `${business_name} cancelled your booking. Reach out to reschedule if you'd like.`}
          {status === "completed" && `${business_name} marked your visit as completed.`}
          {status === "no_show"   && `${business_name} marked your appointment as a no-show. Contact them if this was a mistake.`}
        </Text>
        <Section style={card}>
          <Text style={{ ...text, fontWeight: 600, margin: "0 0 4px" }}>{service_title}</Text>
          <Text style={muted}>When: {starts_at_human}</Text>
          <Text style={muted}>Status: {status}</Text>
        </Section>
        {business_slug && (
          <Text style={text}>
            View the business page:{" "}
            <Link href={`${SITE_URL}/businesses/${business_slug}`}>{SITE_URL}/businesses/{business_slug}</Link>
          </Text>
        )}
        <Text style={footer}>{SITE_NAME} · <Link href={SITE_URL}>{SITE_URL}</Link></Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BookingStatusChanged,
  subject: (d: Props) => {
    const biz = d?.business_name ?? "Your booking";
    if (d?.status === "confirmed") return `${biz} confirmed your appointment`;
    if (d?.status === "cancelled") return `${biz} cancelled your appointment`;
    if (d?.status === "completed") return `Thanks for your visit to ${biz}`;
    if (d?.status === "no_show")   return `${biz}: we missed you`;
    return `${biz}: booking update`;
  },
  displayName: "Booking — status changed",
  previewData: {
    customer_name: "Maria",
    business_name: "Quezon City Auto Repair",
    business_slug: "qc-auto-repair",
    service_title: "Oil change",
    starts_at_human: "Mon, Jun 2 2026 · 10:00 AM",
    status: "confirmed",
  },
} satisfies TemplateEntry;
