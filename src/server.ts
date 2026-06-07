// Worker entry wrapper. Catches catastrophic SSR errors and — critically —
// detects stale/missing server-action IDs so the client gets a friendly JSON
// error instead of a crashed dev server. Each occurrence is logged to
// `ops_alerts` so admins can review them in the Errors / Alerts tab.
import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function isServerFnRequest(request: Request): boolean {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith("/_serverFn") ||
    url.searchParams.has("_serverFnId") ||
    request.headers.get("x-tsr-redirect") !== null ||
    url.pathname.includes("/__server")
  );
}

function extractServerFnId(request: Request): string | null {
  const url = new URL(request.url);
  return (
    url.searchParams.get("_serverFnId") ||
    url.pathname.split("/").filter(Boolean).pop() ||
    null
  );
}

function isMissingActionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /Cannot read properties of undefined \(reading 'method'\)/.test(msg);
}

async function logToOpsAlerts(payload: {
  event: string;
  severity: "warning" | "error" | "critical";
  details: Record<string, unknown>;
}): Promise<void> {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return;
    await fetch(`${url}/rest/v1/ops_alerts`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        event: payload.event,
        severity: payload.severity,
        source: "ssr-wrapper",
        details: payload.details,
      }),
    });
  } catch (e) {
    console.error("[ssr-wrapper] failed to log ops_alert", e);
  }
}

async function handleMissingAction(
  request: Request,
  error: unknown,
): Promise<Response> {
  const fnId = extractServerFnId(request);
  const url = request.url;
  console.error("[ssr-wrapper] missing server action handler", {
    fnId,
    url,
    error: error instanceof Error ? error.message : String(error),
  });
  await logToOpsAlerts({
    event: "missing_server_action",
    severity: "error",
    details: {
      fn_id: fnId,
      url,
      method: request.method,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
      user_agent: request.headers.get("user-agent"),
      hint: "Stale client bundle requested a server action ID the current deployment does not export. Have the user reload.",
    },
  });
  return new Response(
    JSON.stringify({
      error: "stale_client",
      message:
        "This page is out of date. Please refresh to load the latest version.",
      fnId,
    }),
    {
      status: 410,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    },
  );
}

async function normalizeCatastrophicSsrResponse(
  request: Request,
  response: Response,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError();
  if (captured && isMissingActionError(captured) && isServerFnRequest(request)) {
    return handleMissingAction(request, captured);
  }

  console.error(captured ?? new Error(`h3 swallowed SSR error: ${body}`));
  await logToOpsAlerts({
    event: "ssr_swallowed_error",
    severity: "error",
    details: {
      url: request.url,
      method: request.method,
      body,
      error: captured instanceof Error
        ? { name: captured.name, message: captured.message, stack: captured.stack }
        : captured,
    },
  });

  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(request, response);
    } catch (error) {
      if (isMissingActionError(error) && isServerFnRequest(request)) {
        return handleMissingAction(request, error);
      }
      console.error(error);
      await logToOpsAlerts({
        event: "ssr_wrapper_throw",
        severity: "critical",
        details: {
          url: request.url,
          method: request.method,
          error: error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : String(error),
        },
      });
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
