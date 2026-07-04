import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import searchListingsTool from "./tools/search-listings";
import listMyListingsTool from "./tools/list-my-listings";

// OAuth issuer MUST be the direct supabase.co host — the proxy form
// (process.env.SUPABASE_URL on publish) fails RFC 8414 issuer matching.
// VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "365motorsales-mcp",
  title: "365 MotorSales",
  version: "0.1.0",
  instructions:
    "Tools for 365 MotorSales Philippines — the Philippines' vehicle and parts marketplace. Use `search_listings` to browse the public marketplace by category, location, and price. Signed-in users can call `list_my_listings` to see their own listings. Use `echo` to verify connectivity.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [echoTool, searchListingsTool, listMyListingsTool],
});
