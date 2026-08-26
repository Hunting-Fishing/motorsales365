// Compatibility wrapper retained so existing login/signup imports do not need to change.
// This implementation is standalone and uses Supabase Auth directly; it does not call Lovable Cloud Auth.

import { supabase } from "../supabase/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type SupportedOAuthProvider = "google" | "apple" | "azure";

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      opts?: SignInOptions,
    ) => {
      if (provider === "lovable") {
        return {
          redirected: false,
          error: new Error("Lovable OAuth is not available in the standalone deployment."),
        };
      }

      const nativeProvider: SupportedOAuthProvider = provider === "microsoft" ? "azure" : provider;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: nativeProvider,
        options: {
          redirectTo: opts?.redirect_uri,
          queryParams: opts?.extraParams,
        },
      });

      if (error) return { redirected: false, error };
      return { redirected: Boolean(data?.url), error: null };
    },
  },
};
