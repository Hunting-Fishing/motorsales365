import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  GOOGLE_OAUTH_FAILED,
  googleOAuthReturnUrl,
  requestGoogleAuthorization,
} from "@/lib/google-oauth";

type Options = {
  redirect?: string;
  scopeKey: string;
  blocked: boolean;
  // Shared with the password/email submit path to fence synchronous cross-flow clicks.
  flight: { current: boolean };
};

export function useGoogleOAuth({ redirect, scopeKey, blocked, flight }: Options) {
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const generation = useRef(0);
  const request = useRef<symbol | null>(null);
  const context = useMemo(() => ({ scopeKey, blocked, redirect }), [scopeKey, blocked, redirect]);
  const currentContext = useRef<typeof context | null>(null);
  useLayoutEffect(() => {
    currentContext.current = context;
    mounted.current = true;
    generation.current++;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, [context]);

  const start = async (prepare?: () => boolean) => {
    if (blocked || busy || flight.current || !mounted.current || currentContext.current !== context)
      return;
    const token = Symbol();
    const epoch = generation.current;
    const current = () =>
      mounted.current && generation.current === epoch && currentContext.current === context;
    request.current = token;
    flight.current = true;
    setBusy(true);
    let handedOff = false;
    try {
      if (prepare && !prepare()) return;
      const destination = await requestGoogleAuthorization(googleOAuthReturnUrl(redirect));
      if (!current()) return;
      globalThis.location.assign(destination);
      // Keep this form single-flight while the browser leaves. This does not
      // assert navigation completed or a Google/Supabase session was created.
      handedOff = true;
    } catch {
      if (current()) toast.error(GOOGLE_OAUTH_FAILED);
    } finally {
      if (!handedOff && request.current === token) {
        request.current = null;
        flight.current = false;
        if (mounted.current) setBusy(false);
      }
    }
  };
  return { busy, start };
}
