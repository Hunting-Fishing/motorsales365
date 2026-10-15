import React, { type ComponentType, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Route } from "./unsubscribe";

const mocks = vi.hoisted(() => ({
  search: { token: "synthetic-unsubscribe-token" },
  fetch: vi.fn(),
  reload: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useSearch: () => mocks.search,
  }),
}));
vi.mock("@/components/site-layout", () => ({
  SiteLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
const Page = Route.options.component as ComponentType;
const errorHeading = "We couldn't confirm your email preferences";
const consumedHeading = "This link has already been used";

beforeEach(() => {
  mocks.fetch.mockReset();
  mocks.reload.mockReset();
  mocks.search.token = "synthetic-unsubscribe-token";
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubGlobal("location", { reload: mocks.reload });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function response(body: unknown, status = 200) {
  return Response.json(body, { status });
}
function noSuccessAcknowledgment() {
  expect(screen.queryByRole("heading", { name: "Already unsubscribed" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "You're unsubscribed" })).not.toBeInTheDocument();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

describe("unsubscribe validation", () => {
  it("offers confirmation only for an explicit successful validation", async () => {
    mocks.fetch.mockResolvedValue(response({ valid: true }));
    render(<Page />);
    expect(await screen.findByRole("button", { name: "Confirm unsubscribe" })).toBeInTheDocument();
    expect(
      screen.getByText(/Request a marketing opt-out for this email address/),
    ).toBeInTheDocument();
  });

  it("shows already-unsubscribed only for an OK acknowledgment", async () => {
    mocks.fetch.mockResolvedValue(response({ valid: false, reason: "already_unsubscribed" }));
    render(<Page />);
    expect(
      await screen.findByRole("heading", { name: "Already unsubscribed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A marketing opt-out is already recorded for this email address."),
    ).toBeInTheDocument();
  });

  it.each([500, 503, 401, 403])(
    "shows retry rather than an invalid link or false success for HTTP %s",
    async (status) => {
      mocks.fetch.mockResolvedValue(response({ reason: "already_unsubscribed" }, status));
      render(<Page />);
      expect(await screen.findByRole("heading", { name: errorHeading })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(mocks.reload).toHaveBeenCalledOnce();
      expect(screen.queryByRole("heading", { name: "Invalid link" })).not.toBeInTheDocument();
      noSuccessAcknowledgment();
    },
  );

  it("does not turn a network error into an invalid link", async () => {
    mocks.fetch.mockRejectedValue(new Error("synthetic transport failure"));
    render(<Page />);
    expect(await screen.findByRole("heading", { name: errorHeading })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    noSuccessAcknowledgment();
  });

  it.each([400, 404])(
    "offers a newer link/support rather than retry for HTTP %s",
    async (status) => {
      mocks.fetch.mockResolvedValue(response({ error: "Invalid or expired token" }, status));
      render(<Page />);
      expect(await screen.findByRole("heading", { name: "Invalid link" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute(
        "href",
        "/contact",
      );
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
      noSuccessAcknowledgment();
    },
  );

  it("does not imply suppression or offer replay for a consumed-token conflict", async () => {
    mocks.fetch.mockResolvedValue(response({ reason: "token_consumed" }, 409));
    render(<Page />);
    expect(await screen.findByRole("heading", { name: consumedHeading })).toBeInTheDocument();
    expect(
      screen.getByText(/We cannot confirm your current email preferences/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact support" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    noSuccessAcknowledgment();
  });

  it("does not accept a truthy malformed validation acknowledgment", async () => {
    mocks.fetch.mockResolvedValue(response({ valid: "true" }));
    render(<Page />);
    expect(await screen.findByRole("heading", { name: errorHeading })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm unsubscribe" })).not.toBeInTheDocument();
  });
});

describe("unsubscribe submission", () => {
  async function confirm(body: unknown, status = 200) {
    mocks.fetch
      .mockResolvedValueOnce(response({ valid: true }))
      .mockResolvedValueOnce(response(body, status));
    render(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm unsubscribe" }));
  }

  it("acknowledges a confirmed successful request", async () => {
    await confirm({ success: true });
    expect(await screen.findByRole("heading", { name: "You're unsubscribed" })).toBeInTheDocument();
    expect(screen.getByText(/Your marketing opt-out has been recorded/)).toBeInTheDocument();
    expect(
      screen.queryByText(/We won't send you marketing emails anymore/),
    ).not.toBeInTheDocument();
  });

  it("acknowledges confirmed existing suppression", async () => {
    await confirm({ success: false, reason: "already_unsubscribed" });
    expect(
      await screen.findByRole("heading", { name: "Already unsubscribed" }),
    ).toBeInTheDocument();
  });

  it.each([500, 503, 401, 403])(
    "never displays success-looking POST acknowledgment for HTTP %s",
    async (status) => {
      await confirm({ success: true, reason: "already_unsubscribed" }, status);
      expect(await screen.findByRole("heading", { name: errorHeading })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
      noSuccessAcknowledgment();
    },
  );

  it("does not interpret non-OK already_unsubscribed as confirmed suppression", async () => {
    await confirm({ success: false, reason: "already_unsubscribed" }, 409);
    expect(await screen.findByRole("heading", { name: consumedHeading })).toBeInTheDocument();
    noSuccessAcknowledgment();
  });

  it.each([400, 404])("shows invalid-link support for rejected POST HTTP %s", async (status) => {
    await confirm({ reason: "already_unsubscribed" }, status);
    expect(await screen.findByRole("heading", { name: "Invalid link" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    noSuccessAcknowledgment();
  });

  it("does not accept a truthy malformed success acknowledgment", async () => {
    await confirm({ success: "yes" });
    expect(await screen.findByRole("heading", { name: errorHeading })).toBeInTheDocument();
    noSuccessAcknowledgment();
  });
});

describe("unsubscribe response lifetime", () => {
  it("ignores an older token GET after a newer token POST succeeded", async () => {
    const oldValidation = deferred<Response>();
    mocks.fetch
      .mockReturnValueOnce(oldValidation.promise)
      .mockResolvedValueOnce(response({ valid: true }))
      .mockResolvedValueOnce(response({ success: true }));
    const page = render(<Page />);
    mocks.search.token = "new-token";
    page.rerender(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm unsubscribe" }));
    expect(await screen.findByRole("heading", { name: "You're unsubscribed" })).toBeInTheDocument();
    await act(async () => oldValidation.resolve(response({ reason: "token_consumed" }, 409)));
    expect(screen.getByRole("heading", { name: "You're unsubscribed" })).toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(3);
  });

  it.each(["success", "failure"])(
    "ignores an older token POST %s after new-token validation",
    async (outcome) => {
      const oldSubmission = deferred<Response>();
      mocks.fetch
        .mockResolvedValueOnce(response({ valid: true }))
        .mockReturnValueOnce(oldSubmission.promise)
        .mockResolvedValueOnce(response({ error: "Temporary failure" }, 503));
      const page = render(<Page />);
      fireEvent.click(await screen.findByRole("button", { name: "Confirm unsubscribe" }));
      mocks.search.token = "new-token";
      page.rerender(<Page />);
      expect(await screen.findByRole("heading", { name: errorHeading })).toBeInTheDocument();
      await act(async () => {
        if (outcome === "success") oldSubmission.resolve(response({ success: true }));
        else oldSubmission.reject(new Error("Synthetic old transport failure"));
      });
      expect(screen.getByRole("heading", { name: errorHeading })).toBeInTheDocument();
      noSuccessAcknowledgment();
      expect(mocks.fetch).toHaveBeenCalledTimes(3);
    },
  );

  it("invalidates pending submission on unmount without starting a retry or another POST", async () => {
    const submission = deferred<Response>();
    mocks.fetch
      .mockResolvedValueOnce(response({ valid: true }))
      .mockReturnValueOnce(submission.promise);
    const page = render(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirm unsubscribe" }));
    page.unmount();
    await act(async () => submission.resolve(response({ success: true })));
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.reload).not.toHaveBeenCalled();
  });
});
