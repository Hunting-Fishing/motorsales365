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
import { SITE_NAME, SITE_URL, brandBar, container, footer, h1, main, text } from "./_styles";

interface Props {
  owner_name?: string;
  business_name: string;
  business_id: string;
  service_title: string;
  starts_at_human: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  notes?: string | null;
  status: "pending" | "confirmed";
}

const BookingOwner = ({
  owner_name,
  business_name,
  business_id,
  service_title,
  starts_at_human,
  customer_name,
  customer_phone,
  customer_email,
  notes,
  status,
}: Props) => (
  <Html lang="en">
    <Head />
    <Preview>
      New {status === "pending" ? "booking request" : "booking"} for {business_name}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>{status === "pending" ? "New booking request" : "New booking"}</Heading>
        <Text style={text}>{owner_name ? `Hi ${owner_name},` : "Hi,"}</Text>
        <Text style={text}>
          You have a new {status === "pending" ? "booking request" : "confirmed booking"} on{" "}
          {business_name}.
        </Text>
        <Text style={text}>
          <strong>Service:</strong> {service_title}
          <br />
          <strong>When:</strong> {starts_at_human}
          <br />
          <strong>Customer:</strong> {customer_name}
          <br />
          {customer_phone ? (
            <>
              <strong>Phone:</strong> {customer_phone}
              <br />
            </>
          ) : null}
          {customer_email ? (
            <>
              <strong>Email:</strong> {customer_email}
              <br />
            </>
          ) : null}
          {notes ? (
            <>
              <strong>Notes:</strong> {notes}
            </>
          ) : null}
        </Text>
        <Text style={text}>
          Manage bookings:{" "}
          <a href={`${SITE_URL}/dashboard/businesses/${business_id}/edit`}>
            {SITE_URL}/dashboard/businesses/{business_id}/edit
          </a>
        </Text>
        <Text style={footer}>
          {SITE_NAME} · <a href={SITE_URL}>{SITE_URL}</a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: BookingOwner,
  subject: (d: Record<string, any>) =>
    d?.status === "pending"
      ? `New booking request — ${d?.business_name ?? ""}`
      : `New booking — ${d?.business_name ?? ""}`,
  displayName: "Booking — owner notice",
  previewData: {
    owner_name: "Alex",
    business_name: "uCatch Cook Fuels",
    business_id: "00000000-0000-0000-0000-000000000000",
    service_title: "Oil change",
    starts_at_human: "Mon, Jun 2 2026 · 10:00 AM",
    customer_name: "Maria",
    customer_phone: "+63 969 606 3830",
    customer_email: "maria@example.com",
    notes: "Diesel engine, please prepare 5W-40.",
    status: "pending",
  },
} satisfies TemplateEntry;
