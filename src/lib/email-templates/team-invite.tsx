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
import { SITE_NAME, SITE_URL, brandBar, container, footer, h1, main, text } from "./_styles";

interface Props {
  org_name?: string;
  inviter_name?: string;
  role?: string;
  invite_url?: string;
}

const TeamInvite = ({ org_name, inviter_name, role, invite_url }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>
      {inviter_name ?? "Your teammate"} invited you to {org_name ?? "their team"} on {SITE_NAME}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Heading style={h1}>You're invited to join {org_name ?? "a team"}</Heading>
        <Text style={text}>
          {inviter_name ?? "A teammate"} added you as a <strong>{role ?? "member"}</strong> on{" "}
          {SITE_NAME}. Accept the invite to start handling shared customer leads from your team's
          inbox.
        </Text>
        <Section style={{ textAlign: "center", margin: "28px 0" }}>
          <Button
            href={invite_url ?? `${SITE_URL}/dashboard/team`}
            style={{
              background: "#0f172a",
              color: "#fff",
              padding: "12px 22px",
              borderRadius: 8,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Accept invite
          </Button>
        </Section>
        <Text style={text}>
          If the button doesn't work, paste this link into your browser:
          <br />
          <a href={invite_url}>{invite_url}</a>
        </Text>
        <Text style={footer}>
          {SITE_NAME} · <a href={SITE_URL}>{SITE_URL}</a>
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: TeamInvite,
  subject: (d: Record<string, any>) =>
    `You're invited to ${d?.org_name ?? "a team"} on ${SITE_NAME}`,
  displayName: "Team invite",
  previewData: {
    org_name: "Quezon Auto",
    inviter_name: "Maria",
    role: "manager",
    invite_url: `${SITE_URL}/invites/sample-token`,
  },
} satisfies TemplateEntry;
