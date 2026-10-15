import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "./admin.claims";

// Real React Query and component lifetimes; transport/auth/router are mocked.
// No HTTP/JWT/RLS, actual handler execution, changed-row confirmation, atomic
// ownership/reviewer attribution or database cancellation/rollback is proved.
type Request = {
  data?: { id?: string; decision?: string; notes?: string; claimId?: string; evidenceId?: string };
  signal: AbortSignal;
};
const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const claimA = "11111111-1111-4111-8111-111111111111";
const claimB = "22222222-2222-4222-8222-222222222222";
const businessA = "33333333-3333-4333-8333-333333333333";
const businessB = "44444444-4444-4444-8444-444444444444";
const claimantA = "55555555-5555-4555-8555-555555555555";
const claimantB = "66666666-6666-4666-8666-666666666666";
const evidenceA = "77777777-7777-4777-8777-777777777777";
const auditA = "88888888-8888-4888-8888-888888888888";
const state = vi.hoisted(() => ({
  account: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as string | null,
  loading: false,
  list: vi.fn(),
  review: vi.fn(),
  audit: vi.fn(),
  url: vi.fn(),
  message: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: state.account ? { id: state.account } : null, loading: state.loading }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ children }: React.PropsWithChildren) => <a href="#business">{children}</a>,
}));
vi.mock("@/lib/business-claims.functions", () => ({
  listPendingClaims: (request: Request) => state.list(request),
  reviewBusinessClaim: (request: Request) => state.review(request),
  getClaimAuditLog: (request: Request) => state.audit(request),
  getEvidenceSignedUrl: (request: Request) => state.url(request),
}));
vi.mock("sonner", () => ({
  toast: { message: state.message, success: state.success, error: state.error },
}));
vi.mock("@/components/business-page/evidence-uploader", () => ({
  EVIDENCE_TYPE_LABELS: { id_document: "ID document" },
  formatBytes: (size: number) => size + " bytes",
}));
const ClaimsPage = Route.options.component as React.ComponentType;
const clients: QueryClient[] = [];
const unknownCopy =
  "Review outcome is not confirmed. Refresh and inspect the records before reopening review controls.";
const acknowledgedCopy =
  "Review request acknowledged. Recorded status, ownership and audit were not confirmed.";
function payload(label = "A") {
  const claims = [
    {
      id: claimA,
      business_id: businessA,
      claimant_user_id: claimantA,
      contact_method: "document",
      contact_value: null,
      evidence_url: null,
      notes: "Private claim notes " + label,
      status: "pending" as const,
      kind: "claim" as const,
      created_at: "2026-10-01T01:00:00Z",
      businesses: {
        name: "Business " + label,
        slug: "workshop-a",
        city: null,
        region: null,
        phone: null,
        email: null,
        owner_id: null as string | null,
      },
    },
    {
      id: claimB,
      business_id: businessB,
      claimant_user_id: claimantB,
      contact_method: "email",
      contact_value: "claimant-b@example.test",
      evidence_url: null,
      notes: null,
      status: "pending" as const,
      kind: "transfer" as const,
      created_at: "2026-10-01T02:00:00Z",
      businesses: {
        name: "Business second",
        slug: "workshop-b",
        city: null,
        region: null,
        phone: null,
        email: null,
        owner_id: accountB as string | null,
      },
    },
  ];
  return {
    claims,
    evidenceByClaim: {
      [claimA]: [
        {
          id: evidenceA,
          claim_id: claimA,
          evidence_type: "id_document",
          file_name: "Private evidence " + label + ".png",
          file_size: 12,
          mime_type: "image/png",
          storage_path: "private/" + label,
          notes: null,
          created_at: "2026-10-01T00:00:00Z",
          uploader_user_id: claimantA,
        },
      ],
    },
    claimantById: {
      [claimantA]: {
        id: claimantA,
        email: "private-" + label + "@example.test",
        email_confirmed: true,
        phone: null as string | null,
        phone_confirmed: false,
        full_name: "Private claimant " + label,
        avatar_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      [claimantB]: {
        id: claimantB,
        email: null,
        email_confirmed: false,
        phone: null,
        phone_confirmed: false,
        full_name: "Second claimant",
        avatar_url: null,
        created_at: null,
      },
    },
  };
}
function auditSnapshot(claimId = claimA, notes = "Stored private audit") {
  return {
    entries: [
      {
        id: auditA,
        claim_id: claimId,
        actor_user_id: null,
        action: "approved",
        notes,
        details: {},
        created_at: "2026-10-01T03:00:00Z",
      },
    ],
    actorById: {},
  };
}
function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function finish(pending: ReturnType<typeof deferred>, value: unknown, rejected = false) {
  await act(async () => {
    if (rejected) pending.reject(value);
    else pending.resolve(value);
    await pending.promise.catch(() => undefined);
  });
}
function show({ client = new QueryClient(), strict = false } = {}) {
  clients.push(client);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const view = () => {
    const content = (
      <QueryClientProvider client={client}>
        <ClaimsPage />
      </QueryClientProvider>
    );
    return strict ? <React.StrictMode>{content}</React.StrictMode> : content;
  };
  const shown = render(view());
  return { ...shown, client, invalidate, update: () => shown.rerender(view()) };
}
const card = (name = "Business A") =>
  screen.getByRole("region", { name: "Claim review for " + name });
async function loaded(name = "Business A") {
  await screen.findByRole("region", { name: "Claim review for " + name });
}
function decide(decision = "approval", name = "Business A") {
  fireEvent.click(within(card(name)).getByRole("button", { name: "Request " + decision }));
}
const noPublication = (shown: ReturnType<typeof show>) => {
  expect(state.message).not.toHaveBeenCalled();
  expect(state.success).not.toHaveBeenCalled();
  expect(shown.invalidate).not.toHaveBeenCalled();
};
beforeEach(() => {
  vi.clearAllMocks();
  state.account = accountA;
  state.loading = false;
  state.list.mockResolvedValue(payload());
  state.review.mockResolvedValue({ ok: true });
  state.audit.mockResolvedValue({ entries: [], actorById: {} });
  state.url.mockImplementation(async ({ data }: Request) => ({
    url: "https://private.example.test/" + data?.evidenceId,
  }));
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

describe("Private claim review acknowledgement boundary", () => {
  it.each(["signed out", "loading"])("does not read or render private data while %s", (mode) => {
    if (mode === "signed out") state.account = null;
    else state.loading = true;
    const client = new QueryClient();
    client.setQueryData(["admin-claims", accountA], payload("seeded"));
    show({ client });
    expect(screen.queryByText(/Private claimant/)).not.toBeInTheDocument();
    expect(state.list).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
    expect(state.url).not.toHaveBeenCalled();
    expect(state.review).not.toHaveBeenCalled();
  });
  it("uses private account keys, consumed abort signals and fresh-only query options", async () => {
    const shown = show();
    await loaded();
    await waitFor(() => expect(state.audit).toHaveBeenCalledTimes(2));
    const listQuery = shown.client
      .getQueryCache()
      .find({ queryKey: ["admin-claims", accountA], exact: true })!;
    const auditQuery = shown.client
      .getQueryCache()
      .find({ queryKey: ["claim-audit", accountA, claimA], exact: true })!;
    for (const query of [listQuery, auditQuery]) {
      expect(Reflect.get(query.options, "staleTime")).toBe(0);
      expect(query.options.gcTime).toBe(0);
      expect(query.options.retry).toBe(false);
      expect(Reflect.get(query.options, "refetchOnMount")).toBe("always");
      expect(Reflect.get(query.options, "placeholderData")).toBeUndefined();
    }
    expect((state.list.mock.calls[0][0] as Request).signal).toBeInstanceOf(AbortSignal);
    for (const [request] of state.audit.mock.calls)
      expect((request as Request).signal).toBeInstanceOf(AbortSignal);
    expect((state.url.mock.calls[0][0] as Request).signal).toBeInstanceOf(AbortSignal);
    expect(
      screen.queryByText(/Approve & transfer|Approving will reassign/),
    ).not.toBeInTheDocument();
  });
  it("captures claim, decision and notes; strict acknowledgement is neutral, not an approval claim", async () => {
    const shown = show({ strict: true });
    await loaded();
    fireEvent.change(screen.getByLabelText("Review notes for claim " + claimA), {
      target: { value: "Captured notes" },
    });
    decide();
    await waitFor(() => expect(state.message).toHaveBeenCalledWith(acknowledgedCopy));
    expect((state.review.mock.calls[0][0] as Request).data).toEqual({
      id: claimA,
      decision: "approve",
      notes: "Captured notes",
    });
    expect(state.success).not.toHaveBeenCalled();
    expect(shown.invalidate.mock.calls.map(([input]) => input?.queryKey)).toEqual([
      ["claim-audit", accountA, claimA],
      ["admin-claims", accountA],
    ]);
    await loaded();
    expect(within(card()).getByRole("button", { name: "Request approval" })).toBeDisabled();
    expect(within(card()).getByRole("button", { name: "Request rejection" })).toBeDisabled();
    expect(
      within(card("Business second")).getByRole("button", { name: "Request approval" }),
    ).not.toBeDisabled();
  });
  it("one flight blocks opposite decisions, other claims, double clicks and note changes", async () => {
    const pending = deferred();
    state.review.mockReturnValue(pending.promise);
    show();
    await loaded();
    fireEvent.change(screen.getByLabelText("Review notes for claim " + claimA), {
      target: { value: "Original notes" },
    });
    const approve = within(card()).getByRole("button", { name: "Request approval" });
    act(() => {
      fireEvent.click(approve);
      fireEvent.click(approve);
    });
    decide("rejection");
    decide("approval", "Business second");
    fireEvent.change(screen.getByLabelText("Review notes for claim " + claimA), {
      target: { value: "Later notes" },
    });
    expect(state.review).toHaveBeenCalledTimes(1);
    expect((state.review.mock.calls[0][0] as Request).data).toEqual({
      id: claimA,
      decision: "approve",
      notes: "Original notes",
    });
    for (const button of screen.getAllByRole("button", { name: /Request (approval|rejection)/ }))
      expect(button).toBeDisabled();
    await finish(pending, { ok: true });
  });
  it.each([null, {}, { ok: false }, { ok: true, id: claimA }, { ok: "true" }, []])(
    "locks the session for malformed acknowledgement %j without invalidating",
    async (response) => {
      const shown = show();
      state.review.mockResolvedValue(response);
      await loaded();
      decide();
      await waitFor(() => expect(state.error).toHaveBeenCalledWith(unknownCopy));
      noPublication(shown);
      expect(state.list).toHaveBeenCalledTimes(1);
      for (const button of screen.getAllByRole("button", { name: /Request (approval|rejection)/ }))
        expect(button).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Refresh snapshot" }));
      await loaded();
      for (const button of screen.getAllByRole("button", { name: /Request (approval|rejection)/ }))
        expect(button).toBeDisabled();
      expect(state.review).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["synchronous", "rejected"])(
    "sanitizes %s review errors, locks decisions and never retries the mutation",
    async (mode) => {
      if (mode === "synchronous")
        state.review.mockImplementation(() => {
          throw new Error("private service diagnostic");
        });
      else state.review.mockRejectedValue(new Error("private transport diagnostic"));
      const shown = show();
      await loaded();
      decide("rejection");
      await waitFor(() => expect(state.error).toHaveBeenCalledWith(unknownCopy));
      noPublication(shown);
      expect(state.review).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(/private.*diagnostic/)).not.toBeInTheDocument();
    },
  );
  it.each(["resolve", "reject"])(
    "fences late %s after account change and removes old private data/URLs",
    async (mode) => {
      const pending = deferred();
      state.review.mockReturnValue(pending.promise);
      const shown = show();
      await loaded();
      await screen.findByAltText("Private evidence A.png");
      decide();
      const signal = (state.review.mock.calls[0][0] as Request).signal;
      state.list.mockResolvedValue(payload("B"));
      state.account = accountB;
      shown.update();
      expect(signal.aborted).toBe(true);
      await loaded("Business B");
      expect(screen.queryByText("Private claimant A")).not.toBeInTheDocument();
      expect(screen.queryByAltText("Private evidence A.png")).not.toBeInTheDocument();
      await finish(
        pending,
        mode === "resolve" ? { ok: true } : new Error("private old error"),
        mode === "reject",
      );
      noPublication(shown);
      expect(state.error).not.toHaveBeenCalled();
      expect(
        within(card("Business B")).getByRole("button", { name: "Request approval" }),
      ).not.toBeDisabled();
      await waitFor(() =>
        expect(
          shown.client.getQueryCache().find({ queryKey: ["admin-claims", accountA], exact: true }),
        ).toBeUndefined(),
      );
    },
  );
  it("A→B→A old finally cannot unlock a new pending request", async () => {
    const old = deferred();
    const fresh = deferred();
    state.review.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const shown = show();
    await loaded();
    decide();
    state.account = accountB;
    shown.update();
    await loaded();
    state.account = accountA;
    shown.update();
    await loaded();
    decide("rejection");
    await finish(old, { ok: true });
    noPublication(shown);
    expect(within(card()).getByRole("button", { name: "Request approval" })).toBeDisabled();
    await finish(fresh, { ok: true });
    expect(state.message).toHaveBeenCalledTimes(1);
    expect((state.review.mock.calls[1][0] as Request).data?.decision).toBe("reject");
  });
  it("a changed claim target locks the session and cannot publish or invalidate an old review", async () => {
    const pending = deferred();
    state.review.mockReturnValue(pending.promise);
    const shown = show();
    await loaded();
    decide();
    const changed = payload();
    changed.claims[0].businesses.owner_id = accountB;
    act(() => {
      shown.client.setQueryData(["admin-claims", accountA], changed);
    });
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(unknownCopy));
    await finish(pending, { ok: true });
    noPublication(shown);
    expect(state.error).not.toHaveBeenCalled();
    expect(within(card()).getByRole("button", { name: "Request approval" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(unknownCopy);
  });
  it("same-account target A→B→A cannot revive a pending response or permit another decision", async () => {
    const pending = deferred();
    state.review.mockReturnValue(pending.promise);
    const shown = show();
    await loaded();
    decide();
    const changed = payload();
    changed.claims[0].businesses.owner_id = accountB;
    changed.claims[0].businesses.name = "Business changed target";
    act(() => {
      shown.client.setQueryData(["admin-claims", accountA], changed);
    });
    await loaded("Business changed target");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(unknownCopy));
    act(() => {
      shown.client.setQueryData(["admin-claims", accountA], payload());
    });
    await loaded();
    await finish(pending, { ok: true });
    noPublication(shown);
    expect(state.error).not.toHaveBeenCalled();
    for (const button of screen.getAllByRole("button", { name: /Request (approval|rejection)/ }))
      expect(button).toBeDisabled();
    decide();
    decide("rejection", "Business second");
    expect(state.review).toHaveBeenCalledTimes(1);
  });
  it.each(["resolve", "reject"])(
    "a pending review %s during background masking stays locked after the same claim returns",
    async (mode) => {
      const pending = deferred();
      const refill = deferred();
      state.review.mockReturnValue(pending.promise);
      const shown = show();
      await loaded();
      decide();
      state.list.mockReturnValueOnce(refill.promise);
      let refreshing!: Promise<unknown>;
      act(() => {
        refreshing = shown.client.refetchQueries({
          queryKey: ["admin-claims", accountA],
          exact: true,
        });
      });
      await waitFor(() => expect(screen.queryByText("Private claimant A")).not.toBeInTheDocument());
      await finish(
        pending,
        mode === "resolve" ? { ok: true } : new Error("private masked response"),
        mode === "reject",
      );
      noPublication(shown);
      expect(state.error).not.toHaveBeenCalled();
      await finish(refill, payload());
      await act(async () => {
        await refreshing;
      });
      await loaded();
      for (const button of screen.getAllByRole("button", { name: /Request (approval|rejection)/ }))
        expect(button).toBeDisabled();
      decide();
      expect(state.review).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("alert")).toHaveTextContent(unknownCopy);
    },
  );
  it("labels a confirmed phone as Phone confirmed, not another confirmed email", async () => {
    const snapshot = payload();
    snapshot.claimantById[claimantA].phone = "+639001234567";
    snapshot.claimantById[claimantA].phone_confirmed = true;
    state.list.mockResolvedValue(snapshot);
    show();
    await loaded();
    expect(within(card()).getByText("Phone confirmed")).toBeInTheDocument();
    expect(within(card()).getAllByText("Email confirmed")).toHaveLength(1);
  });
  it.each(["signed out", "unmount"])(
    "suppresses pending review publication after %s",
    async (mode) => {
      const pending = deferred();
      state.review.mockReturnValue(pending.promise);
      const shown = show();
      await loaded();
      decide();
      const signal = (state.review.mock.calls[0][0] as Request).signal;
      if (mode === "signed out") {
        state.account = null;
        shown.update();
      } else shown.unmount();
      expect(signal.aborted).toBe(true);
      await finish(pending, { ok: true });
      noPublication(shown);
      expect(state.error).not.toHaveBeenCalled();
    },
  );
  it("masks prefilled current/unscoped list cache until a fresh mount read", async () => {
    const pending = deferred();
    state.list.mockReturnValue(pending.promise);
    const client = new QueryClient();
    client.setQueryData(["admin-claims", accountA], payload("seeded"));
    client.setQueryData(["admin-claims"], payload("legacy"));
    show({ client });
    expect(screen.queryByText(/Private claimant/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Request approval/ })).not.toBeInTheDocument();
    await finish(pending, payload());
    await loaded();
    expect(screen.queryByText(/seeded|legacy/)).not.toBeInTheDocument();
  });
  it.each(["transport error", "malformed payload"])(
    "list %s is generic, never cached private data or an empty-queue assertion",
    async (mode) => {
      const client = new QueryClient();
      client.setQueryData(["admin-claims", accountA], payload("seeded"));
      if (mode === "transport error") state.list.mockRejectedValue(new Error("private list SQL"));
      else state.list.mockResolvedValue({ claims: [] });
      show({ client });
      await screen.findByText("Could not load pending claims.");
      expect(screen.queryByText(/Private claimant/)).not.toBeInTheDocument();
      expect(
        screen.queryByText("No visible pending claims in this snapshot."),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/private list SQL/)).not.toBeInTheDocument();
    },
  );
  it("masks the body immediately during manual refresh without unlocking an uncertain request", async () => {
    const shown = show();
    await loaded();
    state.review.mockResolvedValue({ ok: false });
    decide();
    await waitFor(() => expect(state.error).toHaveBeenCalled());
    const pending = deferred();
    state.list.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh snapshot" }));
    expect(screen.queryByText("Private claimant A")).not.toBeInTheDocument();
    await finish(pending, payload());
    await loaded();
    expect(within(card()).getByRole("button", { name: "Request rejection" })).toBeDisabled();
    expect(shown.invalidate).not.toHaveBeenCalled();
  });
  it("a late list result cannot replace a newer account snapshot", async () => {
    const old = deferred();
    state.list.mockReturnValueOnce(old.promise).mockResolvedValue(payload("B"));
    const shown = show();
    const signal = (state.list.mock.calls[0][0] as Request).signal;
    state.account = accountB;
    shown.update();
    await loaded("Business B");
    await finish(old, payload("A"));
    expect(signal.aborted).toBe(true);
    expect(screen.queryByText("Private claimant A")).not.toBeInTheDocument();
    expect(card("Business B")).toBeInTheDocument();
  });
  it("audit cache is account/claim scoped and NULL actors are not labelled System", async () => {
    const pending = deferred();
    state.audit.mockImplementation(({ data }: Request) =>
      data?.claimId === claimA ? pending.promise : Promise.resolve({ entries: [], actorById: {} }),
    );
    const client = new QueryClient();
    client.setQueryData(
      ["claim-audit", accountA, claimA],
      auditSnapshot(claimA, "Seeded audit private"),
    );
    show({ client });
    await loaded();
    expect(screen.queryByText("Seeded audit private")).not.toBeInTheDocument();
    await finish(pending, auditSnapshot());
    await screen.findByText("Stored private audit");
    expect(screen.getByText("Stored actor label: Actor not recorded")).toBeInTheDocument();
    expect(screen.queryByText("System")).not.toBeInTheDocument();
  });
  it.each(["success", "error"])(
    "late audit %s never leaks into a new account's card",
    async (mode) => {
      const old = deferred();
      state.audit.mockImplementationOnce(() => old.promise);
      const shown = show();
      await loaded();
      const signal = (state.audit.mock.calls[0][0] as Request).signal;
      state.account = accountB;
      state.list.mockResolvedValue(payload("B"));
      shown.update();
      await loaded("Business B");
      await finish(
        old,
        mode === "success"
          ? auditSnapshot(claimA, "Old private audit")
          : new Error("Old private audit"),
        mode === "error",
      );
      expect(signal.aborted).toBe(true);
      expect(screen.queryByText("Old private audit")).not.toBeInTheDocument();
    },
  );
  it.each(["transport error", "wrong claim"])(
    "audit %s is distinct from visible empty entries and suppresses seeded data",
    async (mode) => {
      if (mode === "transport error")
        state.audit.mockRejectedValue(new Error("private audit diagnostic"));
      else
        state.audit.mockImplementation(({ data }: Request) =>
          Promise.resolve(auditSnapshot(data?.claimId === claimA ? claimB : claimA)),
        );
      const client = new QueryClient();
      client.setQueryData(["claim-audit", accountA, claimA], auditSnapshot());
      show({ client });
      await loaded();
      await waitFor(() =>
        expect(screen.getAllByText("Could not load this audit snapshot.")).toHaveLength(2),
      );
      expect(screen.queryByText("Stored private audit")).not.toBeInTheDocument();
      expect(screen.queryByText(/private audit diagnostic/)).not.toBeInTheDocument();
    },
  );
  it("clears an already visible private evidence URL on target change and fences a late URL", async () => {
    const old = deferred();
    const fresh = deferred();
    state.url.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    const shown = show();
    await loaded();
    const oldSignal = (state.url.mock.calls[0][0] as Request).signal;
    const changed = payload("updated");
    act(() => {
      shown.client.setQueryData(["admin-claims", accountA], changed);
    });
    await finish(old, { url: "https://private.example.test/old-secret" });
    expect(oldSignal.aborted).toBe(true);
    expect(screen.queryByRole("img", { name: /Private evidence/ })).not.toBeInTheDocument();
    await finish(fresh, { url: "https://private.example.test/new-secret" });
    expect(await screen.findByAltText("Private evidence updated.png")).toHaveAttribute(
      "src",
      "https://private.example.test/new-secret",
    );
    expect(document.querySelector('[src="https://private.example.test/old-secret"]')).toBeNull();
  });
  it("removes a resolved private URL immediately on account switch, not just late-response fencing", async () => {
    const shown = show();
    await loaded();
    await screen.findByAltText("Private evidence A.png");
    const pending = deferred();
    state.url.mockReturnValueOnce(pending.promise);
    state.account = accountB;
    state.list.mockResolvedValue(payload("B"));
    shown.update();
    expect(screen.queryByAltText("Private evidence A.png")).not.toBeInTheDocument();
    await loaded("Business B");
    expect(screen.queryByAltText("Private evidence B.png")).not.toBeInTheDocument();
    await finish(pending, { url: "https://private.example.test/b" });
    await screen.findByAltText("Private evidence B.png");
  });
  it.each([
    { url: "javascript:alert(1)" },
    { url: "https://private.example.test/a", extra: true },
    null,
  ])("rejects malformed/unsafe private URL %j without showing diagnostics", async (value) => {
    state.url.mockResolvedValue(value);
    show();
    await loaded();
    await screen.findByText("Evidence preview unavailable.");
    expect(screen.queryByRole("link", { name: /Open full file/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Private evidence/ })).not.toBeInTheDocument();
  });
  it("accepts a visible empty snapshot without claiming a global queue and keeps StrictMode usable", async () => {
    state.list.mockResolvedValue({ claims: [], evidenceByClaim: {}, claimantById: {} });
    show({ strict: true });
    await screen.findByText("No visible pending claims in this snapshot.");
    expect(state.review).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
  });
});
