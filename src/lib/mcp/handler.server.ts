/**
 * Self-hosted MCP (Model Context Protocol) endpoint — Streamable HTTP
 * transport in stateless JSON mode (no SSE, no sessions).
 *
 * Auth: OAuth 2.1 bearer tokens issued by this project's Supabase Auth
 * (Supabase OAuth server). Tokens are verified with supabase.auth.getClaims(),
 * which checks the signature against the project's JWKS, then issuer and
 * audience are enforced here. Discovery follows RFC 9728 via
 * /.well-known/oauth-protected-resource.
 */
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { McpServerConfig } from "./index";
import type { ToolContext, ToolResult } from "./define-tool";

export const MCP_RESOURCE_PATH = "/mcp";
export const MCP_METADATA_PATH = "/.well-known/oauth-protected-resource";

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const LATEST_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0];

const CORS_EXPOSE = "WWW-Authenticate, Mcp-Session-Id, Mcp-Protocol-Version";
const CORS_ALLOW_HEADERS =
  "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID";

type JsonRpcId = string | number | null;
type JsonRpcRequest = { jsonrpc: "2.0"; id?: JsonRpcId; method: string; params?: unknown };

function withCors(res: Response): Response {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Expose-Headers", CORS_EXPOSE);
  return res;
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return withCors(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
    }),
  );
}

function preflight(methods: string): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": methods,
      "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
      "Access-Control-Max-Age": "86400",
    },
  });
}

/** Public origin of this request, honouring proxy headers when present. */
export function publicOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || url.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

function wwwAuthenticate(request: Request, error?: string, description?: string): string {
  const q = (v: string) => `"${v.replace(/[\u0000-\u001F\u007F"\\]/g, "")}"`;
  const parts = [
    `realm=${q("mcp")}`,
    `resource_metadata=${q(publicOrigin(request) + MCP_METADATA_PATH)}`,
  ];
  if (error) parts.push(`error=${q(error)}`);
  if (description) parts.push(`error_description=${q(description)}`);
  return `Bearer ${parts.join(", ")}`;
}

function challenge(request: Request, error?: string, description?: string): Response {
  return json({ error: "unauthorized" }, 401, {
    "WWW-Authenticate": wwwAuthenticate(request, error, description),
  });
}

function parseBearer(request: Request): string | undefined {
  const m = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get("Authorization") ?? "");
  return m?.[1];
}

type Verified = { token: string; sub: string };

async function verifyToken(
  config: McpServerConfig,
  token: string,
): Promise<Verified | { error: string }> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { error: "server_misconfigured" };
  const supabase = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return { error: "invalid_token" };
  const claims = data.claims as Record<string, unknown>;
  if (claims.iss !== config.issuer) return { error: "invalid_token" };
  const aud = claims.aud;
  const audiences = Array.isArray(aud) ? aud : typeof aud === "string" ? [aud] : [];
  if (!audiences.some((a) => config.acceptedAudiences.includes(String(a)))) {
    return { error: "invalid_token" };
  }
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  if (!sub) return { error: "invalid_token" };
  return { token, sub };
}

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

function rpcError(id: JsonRpcId, code: number, message: string, data?: unknown) {
  return { jsonrpc: "2.0" as const, id, error: { code, message, ...(data ? { data } : {}) } };
}

function listTools(config: McpServerConfig) {
  return config.tools.map((t) => ({
    name: t.name,
    ...(t.title ? { title: t.title } : {}),
    description: t.description,
    inputSchema: z.toJSONSchema(z.object(t.inputSchema), { target: "draft-7" }),
    ...(t.annotations ? { annotations: t.annotations } : {}),
  }));
}

async function callTool(config: McpServerConfig, params: unknown, ctx: ToolContext) {
  const p = (params ?? {}) as { name?: unknown; arguments?: unknown };
  const tool = config.tools.find((t) => t.name === p.name);
  if (!tool) return { error: { code: -32602, message: `Unknown tool: ${String(p.name)}` } };
  const parsed = z.object(tool.inputSchema).safeParse(p.arguments ?? {});
  if (!parsed.success) {
    return {
      result: {
        content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
        isError: true,
      } satisfies ToolResult,
    };
  }
  try {
    return { result: await tool.handler(parsed.data, ctx) };
  } catch (err) {
    console.error("[mcp] tool failed", { tool: tool.name, error: String(err) });
    return {
      result: {
        content: [{ type: "text", text: "Tool execution failed." }],
        isError: true,
      } satisfies ToolResult,
    };
  }
}

async function handleMessage(config: McpServerConfig, msg: JsonRpcRequest, ctx: ToolContext) {
  const id = msg.id ?? null;
  const isNotification = msg.id === undefined;
  switch (msg.method) {
    case "initialize": {
      const requested = (msg.params as { protocolVersion?: string } | undefined)?.protocolVersion;
      const protocolVersion =
        requested && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : LATEST_PROTOCOL_VERSION;
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: config.name, title: config.title, version: config.version },
        instructions: config.instructions,
      });
    }
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: listTools(config) });
    case "tools/call": {
      const out = await callTool(config, msg.params, ctx);
      return "error" in out && out.error
        ? rpcError(id, out.error.code, out.error.message)
        : rpcResult(id, out.result);
    }
    default:
      if (isNotification || msg.method.startsWith("notifications/")) return null;
      return rpcError(id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function handleMcpRequest(config: McpServerConfig, request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return preflight("POST, GET, DELETE, OPTIONS");
  // Stateless server: no standalone SSE stream and no sessions to delete.
  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  const token = parseBearer(request);
  if (!token) return challenge(request);
  const verified = await verifyToken(config, token);
  if ("error" in verified) {
    if (verified.error === "server_misconfigured") return json({ error: "server_error" }, 500);
    return challenge(request, "invalid_token", "Invalid access token");
  }
  const ctx: ToolContext = {
    isAuthenticated: () => true,
    getToken: () => verified.token,
    getUserId: () => verified.sub,
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }

  const batch = Array.isArray(body);
  const messages = (batch ? body : [body]) as JsonRpcRequest[];
  if (messages.length === 0 || messages.some((m) => !m || m.jsonrpc !== "2.0" || typeof m.method !== "string")) {
    return json(rpcError(null, -32600, "Invalid Request"), 400);
  }

  const responses = (await Promise.all(messages.map((m) => handleMessage(config, m, ctx)))).filter(
    (r): r is NonNullable<typeof r> => r !== null,
  );
  if (responses.length === 0) return withCors(new Response(null, { status: 202 }));
  return json(batch ? responses : responses[0]);
}

export function handleProtectedResourceMetadata(config: McpServerConfig, request: Request): Response {
  if (request.method === "OPTIONS") return preflight("GET, OPTIONS");
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "method_not_allowed" }, 405, { Allow: "GET, OPTIONS" });
  }
  return json(
    {
      resource: publicOrigin(request) + MCP_RESOURCE_PATH,
      authorization_servers: [config.issuer],
      bearer_methods_supported: ["header"],
      resource_name: config.title,
    },
    200,
    { "Cache-Control": "public, max-age=300" },
  );
}
