import type { ToolDefinition } from "./define-tool";
import echoTool from "./tools/echo";
import searchListingsTool from "./tools/search-listings";
import listMyListingsTool from "./tools/list-my-listings";

// OAuth issuer MUST be the direct supabase.co host so RFC 8414 issuer
// matching works. VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export interface McpServerConfig {
  name: string;
  title: string;
  version: string;
  instructions: string;
  issuer: string;
  acceptedAudiences: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: ToolDefinition<any>[];
}

const mcp: McpServerConfig = {
  name: "365motorsales-mcp",
  title: "365 MotorSales",
  version: "0.2.0",
  instructions:
    "Tools for 365 MotorSales Philippines — the Philippines' vehicle and parts marketplace. Use `search_listings` to browse the public marketplace by category, location, and price. Signed-in users can call `list_my_listings` to see their own listings. Use `echo` to verify connectivity.",
  issuer: `https://${projectRef}.supabase.co/auth/v1`,
  acceptedAudiences: ["authenticated"],
  tools: [echoTool, searchListingsTool, listMyListingsTool],
};

export default mcp;
