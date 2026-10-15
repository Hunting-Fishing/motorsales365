import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AddUserDialog } from "./add-user-dialog";

// Actual component/React lifetimes with mocked auth, fetch and UI primitives.
// No API handler, HTTP/JWT/RLS, role authority, database cancellation/rollback,
// account provisioning, credential delivery or durable audit is executed here.
const accountA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const accountB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const createdId = "11111111-1111-4111-8111-111111111111";
const email = "new.person@example.test";
const secret = "Do-not-toast-this-password-42!";
const acknowledgment =
  "Creation request acknowledged. Role assignments, profile fields and audit were not confirmed.";
const unknownOutcome =
  "Creation may be partial or its outcome unknown. Inspect account records outside this dialog. Creation controls remain locked for this mounted account session; closing or reopening does not clear this lock.";
const preparationFailure =
  "Could not prepare account creation. Check your sign-in before trying again.";
const state = vi.hoisted(() => ({
  account: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as string | null,
  loading: false,
  getSession: vi.fn(),
  fetch: vi.fn(),
  copy: vi.fn(),
  message: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: state.account ? { id: state.account } : null,
    loading: state.loading,
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => state.getSession() } },
}));
vi.mock("sonner", () => ({
  toast: {
    message: state.message,
    success: state.success,
    warning: state.warning,
    error: state.error,
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: React.PropsWithChildren) => <a href="#routing">{children}</a>,
}));
vi.mock("@/components/ui/dialog", async () => {
  const R = await import("react");
  const Context = R.createContext({ open: false, onOpenChange: (_open: boolean) => {} });
  const Plain = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return {
    Dialog: ({
      open,
      onOpenChange,
      children,
    }: React.PropsWithChildren<{
      open: boolean;
      onOpenChange: (value: boolean) => void;
    }>) => <Context.Provider value={{ open, onOpenChange }}>{children}</Context.Provider>,
    DialogTrigger: ({ children }: { children: React.ReactElement<{ onClick?: () => void }> }) => {
      const scope = R.useContext(Context);
      return R.cloneElement(children, { onClick: () => scope.onOpenChange(true) });
    },
    DialogContent: ({ children }: React.PropsWithChildren) => {
      const scope = R.useContext(Context);
      return scope.open ? <section role="dialog">{children}</section> : null;
    },
    DialogHeader: Plain,
    DialogFooter: Plain,
    DialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
    DialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  };
});
vi.mock("@/components/ui/tabs", async () => {
  const R = await import("react");
  const Context = R.createContext({ value: "identity", change: (_value: string) => {} });
  return {
    Tabs: ({
      value,
      onValueChange,
      children,
    }: React.PropsWithChildren<{
      value: string;
      onValueChange: (value: string) => void;
    }>) => <Context.Provider value={{ value, change: onValueChange }}>{children}</Context.Provider>,
    TabsList: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    TabsTrigger: ({
      value,
      disabled,
      children,
    }: React.PropsWithChildren<{
      value: string;
      disabled?: boolean;
    }>) => {
      const scope = R.useContext(Context);
      return (
        <button type="button" disabled={disabled} onClick={() => scope.change(value)}>
          {children}
        </button>
      );
    },
    TabsContent: ({ value, children }: React.PropsWithChildren<{ value: string }>) =>
      R.useContext(Context).value === value ? <div>{children}</div> : null,
  };
});
vi.mock("@/components/ui/select", async () => {
  const R = await import("react");
  const Context = R.createContext({ change: (_value: string) => {}, disabled: false });
  const Plain = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return {
    Select: ({
      onValueChange,
      disabled = false,
      children,
    }: React.PropsWithChildren<{
      onValueChange: (value: string) => void;
      disabled?: boolean;
    }>) => (
      <Context.Provider value={{ change: onValueChange, disabled }}>{children}</Context.Provider>
    ),
    SelectContent: Plain,
    SelectTrigger: Plain,
    SelectValue: () => null,
    SelectItem: ({
      value,
      disabled,
      children,
    }: React.PropsWithChildren<{
      value: string;
      disabled?: boolean;
    }>) => {
      const scope = R.useContext(Context);
      return (
        <button
          type="button"
          disabled={disabled || scope.disabled}
          onClick={() => scope.change(value)}
        >
          {children}
        </button>
      );
    },
  };
});
vi.mock("@/components/ui/tooltip", () => {
  const Plain = ({ children }: React.PropsWithChildren) => <>{children}</>;
  return {
    Tooltip: Plain,
    TooltipProvider: Plain,
    TooltipTrigger: Plain,
    TooltipContent: () => null,
  };
});
vi.mock("@/components/admin/user-form-tabs", () => ({
  STAFF_ROLES: ["admin", "moderator", "support", "sales", "advertising"],
  compactInput: () => "",
  Field: ({ label, children }: React.PropsWithChildren<{ label: string }>) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  ),
  RoleChips: ({
    roles,
    onToggle,
    disabled,
  }: {
    roles: string[];
    onToggle: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      {["admin", "moderator", "support", "sales", "advertising"].map((role) => (
        <button
          key={role}
          type="button"
          disabled={disabled}
          aria-pressed={roles.includes(role)}
          onClick={() => onToggle(role)}
        >
          {role}
        </button>
      ))}
    </div>
  ),
  AddressSection: ({
    value,
    onChange,
  }: {
    value: Record<string, string>;
    onChange: (patch: Record<string, string>) => void;
  }) => (
    <div>
      {["street_address", "signup_city", "signup_province", "signup_region", "postal_code"].map(
        (name) => (
          <label key={name}>
            {name}
            <input
              value={value[name]}
              onChange={(event) => onChange({ [name]: event.target.value })}
            />
          </label>
        ),
      )}
    </div>
  ),
  BusinessKindSelect: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      aria-label="Business kind"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

type Props = React.ComponentProps<typeof AddUserDialog>;
function session(subject = accountA) {
  return {
    data: { session: { access_token: "synthetic-token", user: { id: subject } } },
    error: null,
  };
}
function response(status = 200, body: unknown = { ok: true, userId: createdId, email }) {
  return { status, ok: status >= 200 && status < 300, json: vi.fn(async () => body) };
}
function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function finish<T>(pending: ReturnType<typeof deferred<T>>, value: T, rejected = false) {
  await act(async () => {
    if (rejected) pending.reject(value);
    else pending.resolve(value);
    await pending.promise.catch(() => undefined);
  });
}
function show(initial: Props = {}, strict = false) {
  const created = vi.fn();
  let props = { onCreated: created, ...initial };
  const view = () =>
    strict ? (
      <React.StrictMode>
        <AddUserDialog {...props} />
      </React.StrictMode>
    ) : (
      <AddUserDialog {...props} />
    );
  const rendered = render(view());
  return {
    ...rendered,
    created,
    update: (next: Partial<Props> = {}) => {
      props = { ...props, ...next };
      rendered.rerender(view());
    },
  };
}
function open(label = "Add user") {
  fireEvent.click(screen.getByRole("button", { name: label }));
}
function fill(options: { work?: boolean; addressOnly?: boolean } = {}) {
  fireEvent.change(
    screen.getByRole("textbox", { name: options.work ? "Work email local part" : "Email" }),
    {
      target: { value: options.work ? "New.Person" : " NEW.Person@example.test " },
    },
  );
  fireEvent.change(screen.getByRole("textbox", { name: "First name" }), {
    target: { value: "New" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Last name" }), {
    target: { value: "Person" },
  });
  fireEvent.change(screen.getByLabelText("Temporary password"), { target: { value: secret } });
  if (!options.addressOnly)
    fireEvent.change(screen.getByRole("textbox", { name: "Phone" }), {
      target: { value: "+639123456789" },
    });
}
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Create user" }));
async function dispatched() {
  await waitFor(() => expect(state.fetch).toHaveBeenCalledTimes(1));
}
function request() {
  const [url, init] = state.fetch.mock.calls[0] as [string, RequestInit];
  expect(typeof init.body).toBe("string");
  return { url, init, body: JSON.parse(init.body as string) as Record<string, unknown> };
}
function noAcknowledgment(shown: ReturnType<typeof show>) {
  expect(shown.created).not.toHaveBeenCalled();
  expect(state.message).not.toHaveBeenCalled();
  expect(state.success).not.toHaveBeenCalled();
  expect(state.warning).not.toHaveBeenCalled();
}
async function locked(shown: ReturnType<typeof show>) {
  expect(await screen.findByRole("alert")).toHaveTextContent(unknownOutcome);
  expect(screen.getByRole("button", { name: "Create user" })).toBeDisabled();
  noAcknowledgment(shown);
}
const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
beforeEach(() => {
  vi.clearAllMocks();
  state.account = accountA;
  state.loading = false;
  state.getSession.mockReset().mockResolvedValue(session());
  state.fetch.mockReset().mockResolvedValue(response());
  state.copy.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("fetch", state.fetch);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: state.copy },
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard);
  else Reflect.deleteProperty(navigator, "clipboard");
});

describe("account creation caller acknowledgment and private lifetimes", () => {
  it("has no private form or dispatch while signed out, loading or given a malformed account id", () => {
    state.account = null;
    const shown = show();
    for (const [account, loading] of [
      [null, false],
      [accountA, true],
      ["not-a-uuid", false],
    ] as const) {
      state.account = account;
      state.loading = loading;
      shown.update();
      expect(screen.getByRole("button", { name: "Add user" })).toBeDisabled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Temporary password")).not.toBeInTheDocument();
    }
    expect(state.getSession).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it("acknowledges only the exact 200 contract and captures the original request without credential/success toasts", async () => {
    const shown = show();
    open();
    fill();
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    const sent = request();
    expect(sent.url).toBe("/api/admin/create-user");
    expect(sent.init.method).toBe("POST");
    expect(sent.init.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer synthetic-token",
    });
    expect(sent.init.signal).toBeInstanceOf(AbortSignal);
    expect(sent.body).toEqual({
      email,
      full_name: "New Person",
      first_name: "New",
      last_name: "Person",
      phone: "+639123456789",
      password: secret,
      account_type: "staff",
      roles: ["support"],
    });
    expect(state.message).toHaveBeenCalledExactlyOnceWith(acknowledgment);
    expect(state.success).not.toHaveBeenCalled();
    expect(state.warning).not.toHaveBeenCalled();
    expect(JSON.stringify(state.message.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(state.message.mock.calls)).not.toContain(email);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("classifies both actual 207 role/profile envelopes as partial, never as successful account setup", async () => {
    for (const body of [
      { error: "User created but role assignment failed: private diagnostic", userId: createdId },
      {
        ok: true,
        userId: createdId,
        email,
        warning: "Profile fields not saved: private diagnostic",
      },
    ]) {
      state.fetch.mockClear().mockResolvedValue(response(207, body));
      const shown = show();
      open();
      fill();
      submit();
      await locked(shown);
      expect(state.error).not.toHaveBeenCalled();
      expect(screen.queryByText(/private diagnostic/)).not.toBeInTheDocument();
      expect(state.fetch).toHaveBeenCalledTimes(1);
      shown.unmount();
    }
  });

  it("refuses malformed/mismatched/extra-field 200 bodies rather than treating any 2xx as confirmation", async () => {
    for (const body of [
      null,
      [],
      {},
      { ok: true },
      { ok: "true", userId: createdId, email },
      { ok: true, userId: "not-a-uuid", email },
      { ok: true, userId: createdId, email: "other@example.test" },
      { ok: true, userId: createdId, email, warning: "partial" },
      { ok: true, userId: createdId, email, error: null },
      { ok: true, userId: createdId, email, roles: ["admin"] },
    ]) {
      state.fetch.mockClear().mockResolvedValue(response(200, body));
      const shown = show();
      open();
      fill();
      submit();
      await locked(shown);
      expect(state.fetch).toHaveBeenCalledTimes(1);
      shown.unmount();
    }
  });

  it("locks after non-200 responses without publishing raw diagnostics or automatically retrying", async () => {
    for (const status of [201, 204, 400, 401, 403, 500]) {
      state.fetch
        .mockClear()
        .mockResolvedValue(response(status, { error: "private auth/backend diagnostic" }));
      const shown = show();
      open();
      fill();
      submit();
      await locked(shown);
      submit();
      expect(state.fetch).toHaveBeenCalledTimes(1);
      expect(state.error).not.toHaveBeenCalled();
      shown.unmount();
    }
  });

  it("locks after a rejected fetch without showing the transport error or claiming rollback", async () => {
    state.fetch.mockRejectedValue(new Error("private transport details"));
    const shown = show();
    open();
    fill();
    submit();
    await locked(shown);
    expect(state.fetch).toHaveBeenCalledTimes(1);
    expect(state.error).not.toHaveBeenCalled();
    expect(screen.queryByText(/private transport/)).not.toBeInTheDocument();
  });

  it("locks after JSON parsing failure even on status 200 rather than fabricating an empty success envelope", async () => {
    const reply = response();
    reply.json.mockRejectedValue(new Error("private invalid JSON diagnostic"));
    state.fetch.mockResolvedValue(reply);
    const shown = show();
    open();
    fill();
    submit();
    await locked(shown);
    expect(reply.json).toHaveBeenCalledTimes(1);
    expect(state.error).not.toHaveBeenCalled();
  });

  it("rejects missing/mismatched sessions and preparation errors before sending any creation request", async () => {
    for (const value of [
      { data: { session: null }, error: null },
      { data: { session: { access_token: "", user: { id: accountA } } }, error: null },
      session(accountB),
      { ...session(), error: { message: "private session diagnostic" } },
    ]) {
      state.getSession.mockClear().mockResolvedValue(value);
      state.error.mockClear();
      const shown = show();
      open();
      fill();
      submit();
      await waitFor(() => expect(state.error).toHaveBeenCalledExactlyOnceWith(preparationFailure));
      expect(state.fetch).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create user" })).not.toBeDisabled();
      noAcknowledgment(shown);
      shown.unmount();
    }
  });

  it("catches a preparation rejection generically and permits a later explicit attempt because nothing was issued", async () => {
    state.getSession.mockRejectedValueOnce(new Error("private session transport"));
    const shown = show();
    open();
    fill();
    submit();
    await waitFor(() => expect(state.error).toHaveBeenCalledExactlyOnceWith(preparationFailure));
    expect(state.fetch).not.toHaveBeenCalled();
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    expect(state.getSession).toHaveBeenCalledTimes(2);
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });

  it("captures email, names, password and roles before awaiting the session even if input events arrive later", async () => {
    const pending = deferred();
    state.getSession.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    expect(screen.getByPlaceholderText("user@example.com")).toBeDisabled();
    // Forced test events are not normal interaction with a disabled fieldset.
    // They ensure transport still uses the immutable pre-await snapshot.
    fireEvent.change(screen.getByPlaceholderText("user@example.com"), {
      target: { value: "late@example.test" },
    });
    fireEvent.change(screen.getByPlaceholderText("Billy"), { target: { value: "Late" } });
    fireEvent.change(screen.getByLabelText("Temporary password"), {
      target: { value: "late-secret" },
    });
    await finish(pending, session());
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    expect(request().body).toMatchObject({
      email,
      first_name: "New",
      password: secret,
      roles: ["support"],
    });
  });

  it("blocks synchronous double submission before React state has flushed", async () => {
    const pending = deferred();
    state.getSession.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    const button = screen.getByRole("button", { name: "Create user" });
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(state.getSession).toHaveBeenCalledTimes(1);
    await finish(pending, session());
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });

  it("keeps one flight while fetch is pending without retries or parallel creations", async () => {
    const pending = deferred();
    state.fetch.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    await dispatched();
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Creating…" }));
    expect(state.getSession).toHaveBeenCalledTimes(1);
    expect(state.fetch).toHaveBeenCalledTimes(1);
    await finish(pending, response());
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
  });

  it("clears private inputs on close before preparation finishes and never dispatches that old attempt", async () => {
    const pending = deferred();
    state.getSession.mockReturnValueOnce(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    open();
    expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("");
    expect(screen.getByLabelText("Temporary password")).not.toHaveValue(secret);
    await finish(pending, session());
    expect(state.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    noAcknowledgment(shown);
    fill();
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
  });

  it("aborts and locks an issued request across close/reopen, ignoring its late acknowledgment", async () => {
    const pending = deferred();
    state.fetch.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    await dispatched();
    const signal = request().init.signal as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(signal.aborted).toBe(true);
    open();
    await locked(shown);
    expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("");
    expect(screen.getByLabelText("Temporary password")).not.toHaveValue(secret);
    await finish(pending, response());
    await locked(shown);
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });

  it("retains a partial/unknown lock after closing rather than resetting it with the form", async () => {
    state.fetch.mockResolvedValue(response(207, { error: "role failure", userId: createdId }));
    const shown = show();
    open();
    fill();
    submit();
    await locked(shown);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    open();
    await locked(shown);
    expect(screen.getByPlaceholderText("Billy")).toHaveValue("");
    submit();
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not dispatch after unmount while session preparation is pending", async () => {
    const pending = deferred();
    state.getSession.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    shown.unmount();
    await finish(pending, session());
    expect(state.fetch).not.toHaveBeenCalled();
    noAcknowledgment(shown);
    expect(state.error).not.toHaveBeenCalled();
  });

  it("aborts an issued fetch on unmount and ignores late success/error without assuming database rollback", async () => {
    for (const rejected of [false, true]) {
      state.fetch.mockClear();
      const pending = deferred();
      state.fetch.mockReturnValue(pending.promise);
      const shown = show();
      open();
      fill();
      submit();
      await dispatched();
      const signal = request().init.signal as AbortSignal;
      shown.unmount();
      expect(signal.aborted).toBe(true);
      await finish(pending, rejected ? new Error("private old request") : response(), rejected);
      noAcknowledgment(shown);
      expect(state.error).not.toHaveBeenCalled();
    }
  });

  it("fences account A -> B -> A during preparation and never revives the original request", async () => {
    const pending = deferred();
    state.getSession.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    state.account = accountB;
    shown.update();
    open();
    expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("");
    state.account = accountA;
    shown.update();
    open();
    await finish(pending, session());
    expect(state.fetch).not.toHaveBeenCalled();
    noAcknowledgment(shown);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("fences account A -> B -> A after dispatch for both late resolution and rejection", async () => {
    for (const rejected of [false, true]) {
      state.fetch.mockClear();
      state.account = accountA;
      const pending = deferred();
      state.fetch.mockReturnValue(pending.promise);
      const shown = show();
      open();
      fill();
      submit();
      await dispatched();
      const signal = request().init.signal as AbortSignal;
      state.account = accountB;
      shown.update();
      open();
      expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("");
      state.account = accountA;
      shown.update();
      open();
      await finish(
        pending,
        rejected ? new Error("private account A request") : response(),
        rejected,
      );
      expect(signal.aborted).toBe(true);
      noAcknowledgment(shown);
      expect(state.error).not.toHaveBeenCalled();
      expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("");
      shown.unmount();
    }
  });

  it("does not let an old finally clear another account's new pending request", async () => {
    const old = deferred();
    const next = deferred();
    state.fetch.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const shown = show();
    open();
    fill();
    submit();
    await dispatched();
    state.account = accountB;
    state.getSession.mockResolvedValue(session(accountB));
    shown.update();
    open();
    fill();
    submit();
    await waitFor(() => expect(state.fetch).toHaveBeenCalledTimes(2));
    await finish(old, response());
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    noAcknowledgment(shown);
    await finish(next, response());
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    expect(state.message).toHaveBeenCalledExactlyOnceWith(acknowledgment);
  });

  it("locks the same account when domain configuration changes during an issued request", async () => {
    const pending = deferred();
    state.fetch.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    await dispatched();
    shown.update({ enforceDomain: "@365motorsales.com", lockStaff: true });
    open();
    await locked(shown);
    expect(screen.getByPlaceholderText("firstname.lastname")).toHaveValue("");
    expect(screen.getByLabelText("Temporary password")).not.toHaveValue(secret);
    await finish(pending, response());
    await locked(shown);
  });

  it("allows a new configuration after pre-dispatch cancellation but never sends the old prepared form", async () => {
    const pending = deferred();
    state.getSession.mockReturnValueOnce(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    shown.update({ lockStaff: true });
    open();
    await finish(pending, session());
    expect(state.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fill();
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
  });

  it("clears private state and prevents any late publication when signing out during fetch", async () => {
    const pending = deferred();
    state.fetch.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    await dispatched();
    state.account = null;
    shown.update();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add user" })).toBeDisabled();
    await finish(pending, response());
    noAcknowledgment(shown);
  });

  it("retains the same-account uncertainty lock through temporary loading after dispatch", async () => {
    const pending = deferred();
    state.fetch.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    await dispatched();
    state.loading = true;
    shown.update();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add user" })).toBeDisabled();
    state.loading = false;
    shown.update();
    open();
    await locked(shown);
    await finish(pending, response());
    await locked(shown);
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not issue or lock a preparation-only attempt after temporary loading loses its form scope", async () => {
    const pending = deferred();
    state.getSession.mockReturnValueOnce(pending.promise);
    const shown = show();
    open();
    fill();
    submit();
    state.loading = true;
    shown.update();
    state.loading = false;
    shown.update();
    open();
    await finish(pending, session());
    expect(state.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fill();
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
  });

  it("fences a delayed JSON response after close just like a delayed fetch response", async () => {
    const pending = deferred();
    const reply = response();
    reply.json.mockImplementation(
      () => pending.promise as Promise<{ ok: boolean; userId: string; email: string }>,
    );
    state.fetch.mockResolvedValue(reply);
    const shown = show();
    open();
    fill();
    submit();
    await waitFor(() => expect(reply.json).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    open();
    await finish(pending, { ok: true, userId: createdId, email });
    await locked(shown);
  });

  it("closes a known acknowledgment even if the consumer callback throws without mislabeling it as unknown", async () => {
    const created = vi.fn(() => {
      throw new Error("private refresh exception");
    });
    const shown = show({ onCreated: created });
    open();
    fill();
    submit();
    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(state.message).toHaveBeenCalledExactlyOnceWith(acknowledgment);
    expect(state.error).not.toHaveBeenCalled();
    open();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("");
    expect(state.fetch).toHaveBeenCalledTimes(1);
    shown.unmount();
  });

  it("does not close or reset a new account's form when an acknowledgment callback changes account", async () => {
    const created = vi.fn(() => {
      state.account = accountB;
      shown.update();
      open();
    });
    const shown: ReturnType<typeof show> = show({ onCreated: created });
    open();
    fill();
    submit();
    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("user@example.com")).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("consumes an asynchronous refresh callback rejection without reopening a confirmed request or leaking its error", async () => {
    const pending = deferred();
    const consumed = vi.spyOn(pending.promise, "catch");
    const created = vi.fn(() => pending.promise);
    show({ onCreated: created });
    open();
    fill();
    submit();
    await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Assert the component attached its handler before rejecting. This test
    // deliberately does not attach its own catch to mask a missing consumer.
    expect(consumed).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
    await act(async () => {
      pending.reject(new Error("private asynchronous refresh failure"));
      await Promise.resolve();
    });
    open();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(state.message).toHaveBeenCalledExactlyOnceWith(acknowledgment);
    expect(state.error).not.toHaveBeenCalled();
    expect(state.fetch).toHaveBeenCalledTimes(1);
  });

  it("fences an explicit clipboard result after close without retaining a credential toast", async () => {
    const pending = deferred();
    state.copy.mockReturnValue(pending.promise);
    const shown = show();
    open();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Copy password" }));
    expect(state.copy).toHaveBeenCalledExactlyOnceWith(secret);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    open();
    await finish(pending, undefined);
    expect(state.message).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Temporary password")).not.toHaveValue(secret);
    noAcknowledgment(shown);
  });

  it("keeps explicit copying available but never includes the password in copy success/error text", async () => {
    const shown = show();
    open();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Copy password" }));
    await waitFor(() => expect(state.message).toHaveBeenCalledExactlyOnceWith("Password copied."));
    state.copy.mockRejectedValue(new Error("private clipboard diagnostic"));
    fireEvent.click(screen.getByRole("button", { name: "Copy password" }));
    await waitFor(() =>
      expect(state.error).toHaveBeenCalledExactlyOnceWith("Could not copy password."),
    );
    expect(JSON.stringify([...state.message.mock.calls, ...state.error.mock.calls])).not.toContain(
      secret,
    );
    expect(state.fetch).not.toHaveBeenCalled();
    expect(shown.created).not.toHaveBeenCalled();
  });

  it("runs local required-field and blank-contact confirmation checks without dispatch", () => {
    const shown = show();
    open();
    submit();
    expect(state.error).toHaveBeenCalledWith("Fill email, first/last name and password");
    fill({ addressOnly: true });
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    submit();
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(state.getSession).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
    noAcknowledgment(shown);
  });

  it("rejects known API password bounds before session lookup without locking an unissued attempt", async () => {
    for (const value of ["x".repeat(7), "x".repeat(73)]) {
      state.getSession.mockClear();
      state.fetch.mockClear();
      state.error.mockClear();
      const shown = show();
      open();
      fill();
      fireEvent.change(screen.getByRole("textbox", { name: "Temporary password" }), {
        target: { value },
      });
      submit();
      expect(state.error).toHaveBeenCalledExactlyOnceWith(
        "Password must contain 8 to 72 characters.",
      );
      expect(state.getSession).not.toHaveBeenCalled();
      expect(state.fetch).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create user" })).not.toBeDisabled();
      shown.unmount();
    }
  });

  it("rejects known identity API formats/limits locally without interpreting an HTTP 400 as safe to retry", () => {
    for (const [name, value] of [
      ["Email", "not-an-email"],
      ["Email", "x".repeat(250) + "@example.test"],
      ["First name", "x".repeat(81)],
      ["Last name", "x".repeat(81)],
      ["Full name", "x".repeat(121)],
      ["Phone", "x".repeat(41)],
      ["Personal email", "invalid"],
      ["Personal email", "x".repeat(250) + "@example.test"],
    ]) {
      state.error.mockClear();
      const shown = show();
      open();
      fill();
      fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
      submit();
      expect(state.error).toHaveBeenCalledTimes(1);
      expect(state.getSession).not.toHaveBeenCalled();
      expect(state.fetch).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      noAcknowledgment(shown);
      shown.unmount();
    }
  });

  it("rejects known address/business limits and unknown business categories before any creation request", () => {
    for (const [tab, name, value] of [
      ["Address", "street_address", "x".repeat(201)],
      ["Address", "signup_city", "x".repeat(121)],
      ["Address", "signup_province", "x".repeat(121)],
      ["Address", "signup_region", "x".repeat(121)],
      ["Address", "postal_code", "x".repeat(21)],
      ["Business", "Business name", "x".repeat(161)],
      ["Business", "Business address", "x".repeat(301)],
      ["Business", "Business city", "x".repeat(121)],
      ["Business", "Business province", "x".repeat(121)],
      ["Business", "Business region", "x".repeat(121)],
      ["Business", "Business postal code", "x".repeat(21)],
      ["Business", "Business kind", "not-a-known-kind"],
    ]) {
      state.error.mockClear();
      const shown = show();
      open();
      fill();
      fireEvent.click(screen.getByRole("button", { name: tab }));
      if (tab === "Business")
        fireEvent.click(screen.getByRole("button", { name: "Business / Customer" }));
      fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
      submit();
      expect(state.error).toHaveBeenCalledExactlyOnceWith(
        "Check account details and field limits before submitting.",
      );
      expect(state.getSession).not.toHaveBeenCalled();
      expect(state.fetch).not.toHaveBeenCalled();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      noAcknowledgment(shown);
      shown.unmount();
    }
  });

  it("preserves domain-locked captured staff input without claiming routing or delivery", async () => {
    const workEmail = "new.person@365motorsales.com";
    state.fetch.mockResolvedValue(response(200, { ok: true, userId: createdId, email: workEmail }));
    const shown = show({
      enforceDomain: "@365motorsales.com",
      lockStaff: true,
      triggerLabel: "Create Employee",
    });
    open("Create Employee");
    fill({ work: true });
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    expect(request().body).toMatchObject({
      email: workEmail,
      enforce_domain: "@365motorsales.com",
      account_type: "staff",
      roles: ["support"],
      password: secret,
    });
    expect(state.message).toHaveBeenCalledExactlyOnceWith(acknowledgment);
    expect(state.success).not.toHaveBeenCalled();
  });

  it("preserves business request fields and empty staff-role input without asserting saved profile rows", async () => {
    const shown = show();
    open();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Business" }));
    fireEvent.click(screen.getByRole("button", { name: "Business / Customer" }));
    fireEvent.change(screen.getByLabelText("Business name"), {
      target: { value: "  Repair shop  " },
    });
    fireEvent.change(screen.getByLabelText("Business kind"), { target: { value: "repair_shop" } });
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    expect(request().body).toMatchObject({
      account_type: "business",
      roles: [],
      seller_type: "private",
      business_name: "Repair shop",
      business_kind: "repair_shop",
      mark_verified: true,
    });
    expect(state.message).toHaveBeenCalledExactlyOnceWith(acknowledgment);
  });

  it("blocks the known unsupported historical seller type locally without remapping it or locking an unissued request", async () => {
    const shown = show();
    open();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Business" }));
    fireEvent.click(screen.getByRole("button", { name: "Business / Customer" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Business (not supported by this creation workflow)" }),
    );
    submit();
    expect(state.error).toHaveBeenCalledExactlyOnceWith(
      "This seller type is not supported by account creation. Select Private before submitting.",
    );
    expect(state.getSession).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Private" }));
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    expect(request().body).toMatchObject({ account_type: "business", seller_type: "private" });
  });

  it("retains the existing reserved-domain staff coercion rather than inventing a new role authority rule", async () => {
    const workEmail = "new.person@365motorsales.com";
    state.fetch.mockResolvedValue(response(200, { ok: true, userId: createdId, email: workEmail }));
    const shown = show();
    open();
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Business" }));
    fireEvent.click(screen.getByRole("button", { name: "Business / Customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Identity" }));
    fireEvent.change(screen.getByPlaceholderText("user@example.com"), {
      target: { value: workEmail },
    });
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    expect(request().body).toMatchObject({
      email: workEmail,
      account_type: "staff",
      roles: ["support"],
    });
    expect(request().body).not.toHaveProperty("seller_type");
  });

  it("retains 16-character password generation and explicit regeneration without any automatic copy/send", () => {
    show();
    open();
    const input = screen.getByLabelText("Temporary password");
    expect((input as HTMLInputElement).value).toMatch(
      /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%]{16}$/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Regenerate password" }));
    expect((input as HTMLInputElement).value).toMatch(
      /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%]{16}$/,
    );
    expect(state.copy).not.toHaveBeenCalled();
    expect(state.fetch).not.toHaveBeenCalled();
    expect(state.message).not.toHaveBeenCalled();
  });

  it("works under StrictMode without duplicated dispatch or revival of a cleaned-up flight", async () => {
    const shown = show({}, true);
    open();
    fill();
    submit();
    await waitFor(() => expect(shown.created).toHaveBeenCalledTimes(1));
    expect(state.getSession).toHaveBeenCalledTimes(1);
    expect(state.fetch).toHaveBeenCalledTimes(1);
    expect(state.message).toHaveBeenCalledExactlyOnceWith(acknowledgment);
  });
});
