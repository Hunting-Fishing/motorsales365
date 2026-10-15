import * as React from "react";

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

interface EmailChangeEmailProps {
  siteName: string;
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW". The trusted planner
  // supplies an explicit empty oldEmail when adding the account's first address.
  oldEmail: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => {
  const firstAddress = oldEmail === "";
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {firstAddress ? "Confirm your email address" : "Confirm your email change"} for {siteName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {firstAddress ? "Confirm your email address" : "Confirm your email change"}
          </Heading>
          <Text style={text}>
            {firstAddress ? (
              <>
                You requested to add the email address{" "}
                <Link href={`mailto:${newEmail}`} style={link}>
                  {newEmail}
                </Link>{" "}
                for {siteName}.
              </>
            ) : (
              <>
                You requested to change your email address for {siteName} from{" "}
                <Link href={`mailto:${oldEmail}`} style={link}>
                  {oldEmail}
                </Link>{" "}
                to{" "}
                <Link href={`mailto:${newEmail}`} style={link}>
                  {newEmail}
                </Link>
                .
              </>
            )}
          </Text>
          <Text style={text}>
            {firstAddress
              ? "Click the button below to confirm your email address:"
              : "Click the button below to confirm this change:"}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {firstAddress ? "Confirm Email Address" : "Confirm Email Change"}
          </Button>
          <Text style={footer}>
            {firstAddress
              ? "If you didn't request to add this email address, please secure your account immediately."
              : "If you didn't request this change, please secure your account immediately."}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default EmailChangeEmail;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "20px 25px" };
const h1 = {
  fontSize: "22px",
  fontWeight: "bold" as const,
  color: "#000000",
  margin: "0 0 20px",
};
const text = {
  fontSize: "14px",
  color: "#55575d",
  lineHeight: "1.5",
  margin: "0 0 25px",
};
const link = { color: "inherit", textDecoration: "underline" };
const button = {
  backgroundColor: "#000000",
  color: "#ffffff",
  fontSize: "14px",
  borderRadius: "8px",
  padding: "12px 20px",
  textDecoration: "none",
};
const footer = { fontSize: "12px", color: "#999999", margin: "30px 0 0" };
