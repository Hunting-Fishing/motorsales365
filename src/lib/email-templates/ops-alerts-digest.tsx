import {
  Body,
  Button as EButton,
  Container,
  Head,
  Heading,
  Html,
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
  muted,
  text,
} from "./_styles";

interface AlertRow {
  event: string;
  severity: string;
  source?: string | null;
  count: number;
  oldest_at: string;
}

interface Props {
  total?: number;
  alerts?: AlertRow[];
  oldest_at?: string;
}

const sevColor: Record<string, string> = {
  critical: "#b91c1c",
  error: "#dc2626",
  warning: "#d97706",
  info: "#2563eb",
};

const OpsAlertsDigest = ({ total = 0, alerts = [], oldest_at }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>
      {total} unacknowledged ops alert{total === 1 ? "" : "s"} on {SITE_NAME}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>
          {total} unacknowledged alert{total === 1 ? "" : "s"}
        </Heading>
        <Text style={text}>
          Backend errors have been piling up in the Ops Alerts queue. Open the admin console to
          investigate and acknowledge.
        </Text>
        {oldest_at && (
          <Text style={muted}>Oldest unacknowledged alert: {new Date(oldest_at).toUTCString()}</Text>
        )}
        <Section style={card}>
          {alerts.map((a) => (
            <Text key={`${a.event}-${a.severity}-${a.source ?? ""}`} style={{ ...text, margin: "0 0 10px" }}>
              <span style={{ color: sevColor[a.severity] ?? "#334155", fontWeight: 700 }}>
                [{a.severity}]
              </span>{" "}
              <span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{a.event}</span>
              {a.source ? <span style={muted}> · {a.source}</span> : null}
              <span style={muted}>
                {" · "}
                {a.count} occurrence{a.count === 1 ? "" : "s"}
              </span>
            </Text>
          ))}
        </Section>
        <Section style={{ textAlign: "center", margin: "24px 0" }}>
          <EButton href={`${SITE_URL}/admin/alerts`} style={button}>
            Open Ops Alerts
          </EButton>
        </Section>
        <Text style={footer}>
          You're receiving this because you have the admin role on {SITE_NAME}. Digest sent every 15
          minutes while unacknowledged alerts exist.
          <br />
          {SITE_NAME} · {SITE_URL}
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: OpsAlertsDigest,
  subject: (d: Record<string, any>) =>
    `[Ops] ${d?.total ?? 0} unacknowledged alert${(d?.total ?? 0) === 1 ? "" : "s"}`,
  displayName: "Ops alerts digest",
  previewData: {
    total: 3,
    oldest_at: new Date(Date.now() - 47 * 60_000).toISOString(),
    alerts: [
      {
        event: "payments.webhook.handler_error",
        severity: "error",
        source: "server",
        count: 2,
        oldest_at: new Date(Date.now() - 47 * 60_000).toISOString(),
      },
      {
        event: "email.auth.enqueue_failed",
        severity: "warning",
        source: "server",
        count: 1,
        oldest_at: new Date(Date.now() - 22 * 60_000).toISOString(),
      },
    ],
  },
} satisfies TemplateEntry;
