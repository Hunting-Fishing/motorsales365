import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { executeChatCommand } from "@/lib/chat-commands.functions";
import {
  CHAT_COMMAND_FAILURE,
  chatCommandInput,
  parseChatCommandResult,
  type ChatCommandInput,
  type ChatCommandResult,
} from "@/lib/chat-commands";

type Flight = { controller: AbortController; epoch: object };
type Scope = {
  accountId: string;
  contextKey: string | null;
  alive: boolean;
  epoch: object;
  flight: Flight | null;
};

/** Callback/cancellation fence, not database rollback or immutable authority. */
export function useChatCommandRequest(accountId: string, contextKey: string | null) {
  const command = useServerFn(executeChatCommand);
  const current = useRef<Scope | null>(null);
  const [pendingFlight, setPendingFlight] = useState<Flight | null>(null);

  // A new identity is allocated for EVERY observed transition, including A→B→A.
  // Invalidate before passive effects or callbacks can dispatch in an old scope.
  if (
    current.current === null ||
    current.current.accountId !== accountId ||
    current.current.contextKey !== contextKey
  ) {
    const previous = current.current;
    if (previous) {
      previous.alive = false;
      previous.flight?.controller.abort();
      previous.flight = null;
    }
    current.current = { accountId, contextKey, alive: false, epoch: {}, flight: null };
  }
  const scope = current.current;

  useLayoutEffect(() => {
    scope.alive = true;
    // StrictMode cleanup/setup must never revive an earlier pending request.
    scope.epoch = {};
    scope.flight = null;
    setPendingFlight(null);
    return () => {
      scope.alive = false;
      scope.epoch = {};
      scope.flight?.controller.abort();
      scope.flight = null;
    };
  }, [scope]);

  // Null is a valid workspace context, distinct from every selected thread.
  // This is scope liveness only; run additionally checks its own flight/epoch.
  const isCurrent = useCallback(
    () => current.current === scope && scope.alive && scope.accountId.length > 0,
    [scope],
  );

  const run = useCallback(
    async (input: ChatCommandInput): Promise<ChatCommandResult | null> => {
      if (!isCurrent() || scope.flight !== null) return null;
      const flight: Flight = { controller: new AbortController(), epoch: scope.epoch };
      // The ref is set before any await/state flush, blocking synchronous doubles.
      scope.flight = flight;
      const ready = () =>
        isCurrent() &&
        scope.epoch === flight.epoch &&
        scope.flight === flight &&
        !flight.controller.signal.aborted;
      setPendingFlight(flight);
      try {
        if (!ready()) return null;
        const parsed = chatCommandInput.safeParse(input);
        if (
          !parsed.success ||
          parsed.data.expectedAccountId.toLowerCase() !== scope.accountId.toLowerCase()
        ) {
          throw new Error(CHAT_COMMAND_FAILURE);
        }
        if (!ready()) return null;
        const raw = await command({ data: parsed.data, signal: flight.controller.signal });
        if (!ready()) return null;
        const result = parseChatCommandResult(raw, parsed.data);
        if (!ready()) return null;
        return result;
      } catch {
        if (!ready()) return null;
        throw new Error(CHAT_COMMAND_FAILURE);
      } finally {
        // A late old request must not clear a newer request's pending state.
        if (ready()) {
          scope.flight = null;
          setPendingFlight((pending) => (pending === flight ? null : pending));
        }
      }
    },
    [command, isCurrent, scope],
  );

  return { run, pending: pendingFlight !== null && pendingFlight === scope.flight, isCurrent };
}
