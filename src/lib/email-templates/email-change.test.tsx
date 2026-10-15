// @vitest-environment node
import * as React from "react";
import { render } from "@react-email/components";
import { describe, expect, it, vi } from "vitest";
import { EmailChangeEmail } from "./email-change";

const current = "current@example.invalid";
const next = "new@example.invalid";
const confirmationUrl = "https://example.invalid/synthetic-confirm?token=synthetic-token";
const siteName = "Synthetic MotorSales";

async function output(oldEmail: string, email: string, newEmail = next, name = siteName) {
  const element = (
    <EmailChangeEmail
      siteName={name}
      oldEmail={oldEmail}
      email={email}
      newEmail={newEmail}
      confirmationUrl={confirmationUrl}
    />
  );
  return {
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}

describe("email-change actual HTML and plain-text rendering", () => {
  for (const recipient of [current, next]) {
    it(`keeps from CURRENT to NEW copy for secure-change recipient ${recipient}`, async () => {
      const { html, text } = await output(current, recipient);
      expect(html).toContain("Confirm your email change");
      expect(html).toContain(`href="mailto:${current}"`);
      expect(html).toContain(`href="mailto:${next}"`);
      expect(html).toContain("Confirm Email Change");
      expect(html).not.toContain("requested to add");
      const readable = text.replace(/\s+/g, " ");
      expect(readable).toContain(`for ${siteName} from ${current} to ${next}.`);
      expect(readable).not.toContain(`from ${next} to ${next}`);
      expect(readable).toContain("Click the button below to confirm this change:");
      expect(readable).toContain("Confirm Email Change");
      expect(text).toContain(confirmationUrl);
    });
  }

  it("renders first-address confirmation without an empty old-address link or from line", async () => {
    const { html, text } = await output("", next);
    expect(html).toContain("Confirm your email address");
    expect(html).toContain("You requested to add the email address");
    expect(html).toContain(`href="mailto:${next}"`);
    expect(html.match(/href="mailto:/g)).toHaveLength(1);
    expect(html).not.toContain('href="mailto:"');
    expect(html).not.toContain("Confirm your email change");
    expect(html).toContain("Confirm Email Address");
    expect(html).toContain(`href="${confirmationUrl.replace(/&/g, "&amp;")}"`);
    const readable = text.replace(/\s+/g, " ");
    expect(readable).toContain(`You requested to add the email address ${next} for ${siteName}.`);
    expect(readable).toContain("Click the button below to confirm your email address:");
    expect(readable).toContain("Confirm Email Address");
    expect(readable).not.toContain(" from ");
    expect(readable).not.toContain("change your email address");
    expect(text).toContain(confirmationUrl);
  });

  it("uses only explicit empty current address for first-address wording", async () => {
    // The planner owns input validation; the renderer does not reinterpret a
    // nonempty current address or infer account state from the recipient.
    const { html } = await output(" ", next);
    expect(html).toContain("Confirm your email change");
    expect(html).not.toContain("You requested to add");
  });

  for (const oldEmail of [current, ""]) {
    it(`React-escapes malicious display text with ${oldEmail ? "existing" : "first"} address`, async () => {
      const name = '<img src="x" onerror="synthetic-injection()"> & Synthetic';
      const maliciousNext = '<svg onload="synthetic-injection()">@example.invalid';
      const maliciousOld = oldEmail ? '<b onclick="synthetic-injection()">@example.invalid' : "";
      const { html, text } = await output(maliciousOld, maliciousNext, maliciousNext, name);
      expect(html).not.toContain("<img");
      expect(html).not.toContain("<svg");
      expect(html).not.toContain("<b onclick");
      expect(html).not.toMatch(/\sonerror="/);
      expect(html).not.toMatch(/\sonload="/);
      expect(html).not.toMatch(/\sonclick="/);
      expect(html).toContain("&lt;img");
      expect(html).toContain("&lt;svg");
      expect(html).toContain("&amp; Synthetic");
      if (oldEmail) expect(html).toContain("&lt;b");
      expect(text).toContain(name);
      expect(text).toContain(maliciousNext);
      if (oldEmail) expect(text).toContain(maliciousOld);
    });
  }

  it("renders locally without fetching or sending anything", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("Unexpected network call from local template rendering");
    });
    try {
      await output(current, next);
      await output("", next);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
});
