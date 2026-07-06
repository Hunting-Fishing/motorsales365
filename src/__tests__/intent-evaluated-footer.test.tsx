import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IntentEvaluatedFooter } from "@/components/admin/intent-evaluated-footer";

// Stub the router Link to a plain anchor so we can assert href/search encoding
// without wiring a full router in tests.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, search, children, ...rest }: any) => {
    const qs = new URLSearchParams(search as Record<string, string>).toString();
    return (
      <a href={`${to}${qs ? `?${qs}` : ""}`} data-testid="audit-link" {...rest}>
        {children}
      </a>
    );
  },
}));

const AT = "2026-01-15T10:30:00.000Z";
const USER = "11111111-2222-3333-4444-555555555555";
const ADMIN = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

describe("IntentEvaluatedFooter — Auto vs Manual label derivation", () => {
  it("renders nothing when evaluatedAt is missing (never evaluated)", () => {
    const { container } = render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={null}
        evaluatedBy={null}
        evaluatorName={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Auto badge when evaluatedBy is null (system trigger)", () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={null}
        evaluatorName={null}
      />,
    );
    const badge = screen.getByTestId("intent-source-badge");
    expect(badge).toHaveTextContent("Auto");
    expect(badge).toHaveAttribute("data-source", "auto");
    expect(screen.getByText(/by system trigger/i)).toBeInTheDocument();
    // Should NOT render an evaluator-name node like "by <Name>"
    expect(screen.queryByText(/^by [A-Z]/)).not.toBeInTheDocument();
  });

  it("renders Manual badge when evaluatedBy is a uuid (admin action)", () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={ADMIN}
        evaluatorName="Jane Admin"
      />,
    );
    const badge = screen.getByTestId("intent-source-badge");
    expect(badge).toHaveTextContent("Manual");
    expect(badge).toHaveAttribute("data-source", "manual");
    expect(screen.getByText("Jane Admin")).toBeInTheDocument();
    expect(screen.queryByText(/system trigger/i)).not.toBeInTheDocument();
  });

  it('falls back to "an admin" when the evaluator name is missing (null)', () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={ADMIN}
        evaluatorName={null}
      />,
    );
    expect(screen.getByTestId("intent-source-badge")).toHaveAttribute("data-source", "manual");
    expect(screen.getByText("an admin")).toBeInTheDocument();
    // No raw uuid fragment leaks into the label.
    expect(screen.queryByText(new RegExp(ADMIN.slice(0, 8)))).not.toBeInTheDocument();
  });

  it('falls back to "an admin" when the evaluator name is a blank string', () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={ADMIN}
        evaluatorName="   "
      />,
    );
    expect(screen.getByText("an admin")).toBeInTheDocument();
  });

  it("still shows the Auto label clearly when no name/evaluator is available", () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={null}
        evaluatorName={null}
      />,
    );
    const badge = screen.getByTestId("intent-source-badge");
    expect(badge).toHaveTextContent("Auto");
    expect(screen.getByText(/by system trigger/i)).toBeInTheDocument();
  });

  it("Auto badge links to the auto-filtered audit view for this user", () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={null}
        evaluatorName={null}
      />,
    );
    const link = screen.getByTestId("audit-link");
    expect(link).toHaveAttribute(
      "href",
      `/admin/audit?action=intent_recomputed_auto&q=${USER}`,
    );
  });

  it("Manual badge links to the manual-filtered audit view for this user", () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={ADMIN}
        evaluatorName="Jane Admin"
      />,
    );
    const link = screen.getByTestId("audit-link");
    expect(link).toHaveAttribute(
      "href",
      `/admin/audit?action=intent_recomputed_manual&q=${USER}`,
    );
  });

  it("Auto link exposes a descriptive aria-label including the user id", () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={null}
        evaluatorName={null}
      />,
    );
    const link = screen.getByRole("link", {
      name: new RegExp(`automatic.*intent recompute.*${USER}`, "i"),
    });
    expect(link).toBeInTheDocument();
  });

  it("Manual link aria-label names the evaluator when available", () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={ADMIN}
        evaluatorName="Jane Admin"
      />,
    );
    const link = screen.getByRole("link", {
      name: /manual intent recompute.*Jane Admin/i,
    });
    expect(link).toBeInTheDocument();
  });

  it("Manual link aria-label falls back to the user id when evaluator name is missing", () => {
    render(
      <IntentEvaluatedFooter
        userId={USER}
        evaluatedAt={AT}
        evaluatedBy={ADMIN}
        evaluatorName={null}
      />,
    );
    // Falls back to displayName "an admin" (from the missing-name fallback).
    const link = screen.getByRole("link", {
      name: /manual intent recompute.*an admin/i,
    });
    expect(link).toBeInTheDocument();
  });
});
