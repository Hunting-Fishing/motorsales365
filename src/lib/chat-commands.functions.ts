import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CHAT_COMMAND_FAILURE,
  chatCommandInput,
  parseChatCommandResult,
  type ChatCommandInput,
  type ChatCommandResult,
} from "./chat-commands";

const MAX_RESPONSE_BYTES = 4096;

function endpoint(configured: string | undefined): string {
  if (!configured || /\s/.test(configured) || !/^https:\/\/[^/?#]+\/?$/i.test(configured))
    throw new Error();
  const url = new URL(configured);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.supabase\.co$/.test(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error();
  }
  return url.origin;
}

function command(input: ChatCommandInput) {
  switch (input.kind) {
    case "create":
      return {
        name: "create_group_chat",
        args: { p_title: input.title, p_member_ids: input.memberIds },
      };
    case "invite":
      return {
        name: "invite_to_thread",
        args: { p_thread_id: input.threadId, p_user_ids: input.memberIds },
      };
    case "respond":
      return {
        name: "respond_to_thread_invite",
        args: { p_thread_id: input.threadId, p_accept: input.accept },
      };
    case "leave":
      return { name: "leave_thread", args: { p_thread_id: input.threadId } };
    case "mark_read":
      return { name: "mark_thread_read", args: { p_thread_id: input.threadId } };
    case "mark_unread":
      return { name: "mark_thread_unread", args: { p_thread_id: input.threadId } };
  }
}

async function boundedBody(response: Response, signal: AbortSignal, ready: () => void) {
  ready();
  const body = response.body;
  ready();
  if (body === null) return "";
  const reader = body.getReader();
  const onAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", onAbort, { once: true });
  try {
    ready();
    let bytes = 0;
    let text = "";
    const decoder = new TextDecoder("utf-8", { fatal: true });
    while (true) {
      ready();
      const chunk = await reader.read();
      ready();
      if (chunk.done) break;
      if (!(chunk.value instanceof Uint8Array)) throw new Error();
      bytes += chunk.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error();
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    ready();
    return text;
  } catch {
    await reader.cancel().catch(() => undefined);
    throw new Error(CHAT_COMMAND_FAILURE);
  } finally {
    signal.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}

export const executeChatCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = chatCommandInput.safeParse(input);
    if (!parsed.success) throw new Error(CHAT_COMMAND_FAILURE);
    return parsed.data;
  })
  .handler(async ({ data, context }): Promise<ChatCommandResult> => {
    function assertActor() {
      if (
        typeof context?.userId !== "string" ||
        context.userId.toLowerCase() !== data.expectedAccountId.toLowerCase()
      ) {
        throw new Error(CHAT_COMMAND_FAILURE);
      }
    }
    // Before request, environment, header or fetch binding. Middleware validates
    // the original bearer; browser scope changes still need UI generation fences.
    assertActor();
    try {
      const request = getRequest();
      assertActor();
      const signal = request.signal;
      function ready() {
        assertActor();
        if (signal.aborted) throw new Error(CHAT_COMMAND_FAILURE);
      }
      ready();
      const authorization = request.headers.get("authorization");
      ready();
      if (
        !authorization ||
        !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization)
      )
        throw new Error();
      const origin = endpoint(process.env.SUPABASE_URL);
      ready();
      const key = process.env.SUPABASE_PUBLISHABLE_KEY;
      ready();
      if (!key || key !== key.trim() || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
        throw new Error();
      const selected = command(data);
      const fetchCaller = globalThis.fetch;
      ready();
      // Deliberate chat-only transport exception: same validated request bearer
      // and configured publishable key, NOT context.supabase or any admin client.
      // Raw status is required: the SDK can normalize empty HTTP404 into204/null.
      const response = await fetchCaller(`${origin}/rest/v1/rpc/${selected.name}`, {
        method: "POST",
        headers: {
          Authorization: authorization,
          apikey: key,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(selected.args),
        signal,
        redirect: "error",
      });
      ready();
      const status = response.status;
      ready();
      if (!response.ok || response.redirected || (status !== 200 && status !== 204)) {
        // Never read a backend error body or retry an outcome that may be unknown.
        void response.body?.cancel().catch(() => undefined);
        throw new Error();
      }
      ready();
      const text = await boundedBody(response, signal, ready);
      ready();
      let result: ChatCommandResult;
      if (data.kind === "create" || data.kind === "invite") {
        if (status !== 200) throw new Error();
        const payload: unknown = JSON.parse(text);
        ready();
        result =
          data.kind === "create"
            ? parseChatCommandResult({ kind: "created", threadId: payload }, data)
            : parseChatCommandResult(
                { kind: "invited", threadId: data.threadId, insertedCount: payload },
                data,
              );
      } else {
        // PostgREST void normally returns204/no body. Accept200 empty or JSON
        // null for transport compatibility, never arbitrary scalar/object data.
        if (status === 204 ? text !== "" : text !== "" && JSON.parse(text) !== null)
          throw new Error();
        ready();
        result = parseChatCommandResult(
          {
            kind: "acknowledged",
            operation: data.kind,
            threadId: data.threadId,
            effect: "unverified",
          },
          data,
        );
      }
      ready();
      return result;
    } catch {
      // Cancellation, malformed responses and transport errors can follow a
      // committed write. No rollback, automatic retry or delivery is inferred.
      throw new Error(CHAT_COMMAND_FAILURE);
    }
  });

// Hosted HTTPS *.supabase.co origins and modern publishable keys only. Custom
// domains/legacy anon keys require separate configuration review, not fallback.
// Actual HTTP/JWT/session/offboarding/hosting acceptance and database cancellation
// remain unverified; this adapter changes neither SQL permissions nor authority.
