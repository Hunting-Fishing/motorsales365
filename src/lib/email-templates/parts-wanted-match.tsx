import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface MatchItem {
  title: string;
  url: string;
  vehicle?: string;
  price?: string;
}

interface Props {
  recipientName?: string;
  matches?: MatchItem[];
  manageUrl?: string;
}

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px" };
const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "14px",
  margin: "8px 0",
};
const btn = {
  backgroundColor: "#0f172a",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "6px",
  textDecoration: "none",
  display: "inline-block",
};

const Email = ({ recipientName, matches = [], manageUrl = "https://365motorsales.com/dashboard/parts-wanted" }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {matches.length === 1
        ? `New match: ${matches[0].title}`
        : `${matches.length} new matches for your parts requests`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={{ fontSize: "20px", marginBottom: "8px" }}>
          {matches.length === 1 ? "We found a match" : `We found ${matches.length} matches`}
        </Heading>
        <Text>{recipientName ? `Hi ${recipientName},` : "Hi there,"}</Text>
        <Text>
          New listings just appeared on 365MotorSales that fit your saved parts request
          {matches.length > 1 ? "s" : ""}.
        </Text>
        <Section>
          {matches.map((m, i) => (
            <div key={i} style={card}>
              <Text style={{ fontWeight: 600, margin: 0 }}>{m.title}</Text>
              {m.vehicle && (
                <Text style={{ margin: "4px 0", color: "#6b7280", fontSize: "13px" }}>
                  {m.vehicle}
                </Text>
              )}
              {m.price && (
                <Text style={{ margin: "4px 0", fontSize: "13px" }}>{m.price}</Text>
              )}
              <Button href={m.url} style={btn}>
                View listing
              </Button>
            </div>
          ))}
        </Section>
        <Text style={{ marginTop: "20px", fontSize: "13px", color: "#6b7280" }}>
          Manage or close your requests at{" "}
          <a href={manageUrl} style={{ color: "#0f172a" }}>
            your dashboard
          </a>
          .
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => {
    const n = Array.isArray(d.matches) ? d.matches.length : 0;
    if (n === 1) return `Match found: ${d.matches[0].title}`;
    return `${n} matches for your parts requests`;
  },
  displayName: "Parts wanted: match found",
  previewData: {
    recipientName: "Alex",
    matches: [
      {
        title: "Mitsubishi 4D56T turbo engine — complete",
        url: "https://365motorsales.com/listing/demo",
        vehicle: "1991 Mitsubishi Pajero",
        price: "₱65,000",
      },
    ],
  },
} satisfies TemplateEntry;
