// Fixed, read-only source evidence. No SQL, client, network or native execution.
// A selected frontier is not an AST scan or proof of deployed/external writers.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

// id, repository path, inclusive line span, whole LF SHA256, span SHA256, LF bytes.
// Span hashes cover joined selected lines WITHOUT an added final newline.
const sourceSpecs = [
  [
    "publicApp",
    "src/lib/business-inventory.functions.ts",
    70,
    287,
    "16551e1d1c51977a8a60043374e2fc8d803e1e144bed65d012716e341c9592c6",
    "bd43af2cb2f2fec0364ca9e317190c5af8cbc45b69530ff95a5da155dfe7d96c",
    10203,
  ],
  [
    "inquiryApp",
    "src/lib/network-stock.functions.ts",
    272,
    684,
    "cdbcb8e3b8c0e293cc2f007c32783a0ec99dd4bb660fe176110b25f1e080b40a",
    "1eda16e4c1eb02bf206c0cc7c7ca18eb6364c083ebf71a1b4649fe53bc34bc44",
    24692,
  ],
  [
    "b2bApp",
    "src/lib/parts-network-operations.functions.ts",
    333,
    747,
    "ab13e2fa5581038f57c0935fda65f58c7203f1c5b3bf273e50e6fd6cdcb6b576",
    "42ff0eba181c9ce9e2b17848fcb575888b7c5b326e9a41168a9a85057d8ed05c",
    27001,
  ],
  [
    "publicInvoiceApp",
    "src/lib/business-invoices.functions.ts",
    212,
    311,
    "83da4dead41ebed3aaeb366c1d214264783bc4c2d08dcd91c20e4674cf13bfc6",
    "ad4a869a071fae74f45ba4595806b768780626bfdb85feff578eaf8897b7833e",
    10762,
  ],
  [
    "authorityApp",
    "src/integrations/supabase/auth-middleware.ts",
    43,
    73,
    "3c16c38eda5e4213aaac23a16194722ca413ec454aa8006f4b48a7e586f51868",
    "4b55bd6c9fb29489504b70c04800e66ed8efdc74147113c32808e683e68cdf7a",
    2356,
  ],
  [
    "schemaApp",
    "src/lib/shop-manager/db.ts",
    1,
    16,
    "3ca5aa5a40b5393aa9cbe8c1a16ea7a1cf265ac19d3c5590e78b005d72ac41df",
    "da4b9df20ea0cf3a9be7f48c479c0376a728bd952f20d2b1475e44027c94ac1d",
    763,
  ],
  [
    "publicUI",
    "src/routes/dashboard.business.$businessId.inventory.tsx",
    189,
    585,
    "bc3bf6a5b10963eefdd4e55873eed332079759b637f767b8a94c81c73c448e1f",
    "d03916cbfea4515c60f6eaa8c60d3c9e9d7f7aaac4ffce5023acad25b5ada420",
    29444,
  ],
  [
    "b2bUI",
    "src/routes/dashboard.business.$businessId.parts-operations.tsx",
    107,
    1307,
    "af06064d5bcd70ef2a556c43bb6b3b2ad79e2a26552a9a9ae22e427ae7439192",
    "73222642b2046cebc852236c43ffee18bacdeaee0649eb71c60badaa81380998",
    55147,
  ],
  [
    "nativeAdjustApp",
    "src/routes/_authenticated/workspace.inventory.$id.tsx",
    282,
    340,
    "f57718a4327a98a9508bbbda07c281f9c26b35f3cfe57c8cc0556f1249e3cfba",
    "33e6bacf2d81231dffdf5f96eaf3b07a6b56e2d80974541a544f220dd9cfbf63",
    15362,
  ],
  [
    "counterApp",
    "src/routes/_authenticated/workspace.counter-sale.tsx",
    21,
    112,
    "6c3a7e6db00eeed566eb8875c84dc24eb7dd82a625aec3827d4860a63146ca27",
    "aa9ead04d3ae2b41518cf0b63c7a7cf6d188be8fbc60144d9a212e6498ea5f27",
    9583,
  ],
  [
    "nativePOApp",
    "src/routes/_authenticated/workspace.purchase-orders.$id.tsx",
    107,
    255,
    "4631f5aa24ea77e7cd8fffd75f588f399e9743e49447d77940bba32b5bcd064c",
    "f0c08cce557d445ca4b8b04f1f819ba3c79502a1ba2d3431243d95f099abf47c",
    11074,
  ],
  [
    "base",
    "supabase/migrations/20260616033348_a261b9e7-281d-4e16-bf61-1f3043a80d12.sql",
    143,
    224,
    "69afe9112531bd75d0bc68d4b31461d9e1c9aae41337ebdf79e6f40056447d62",
    "b9406d2377728742568d5bb6688de87999a91f3a69ecba89efdc0676fbe08ecf",
    10038,
  ],
  [
    "holds",
    "supabase/migrations/20260709033911_3dc415e7-4ec3-47e8-bafa-e2dc520d5f34.sql",
    54,
    162,
    "90fdbede35c8ac9f1e88f09b183ac7014ddee7455d029228b1121def6ee40726",
    "99b38c534b730f30c71bd6026073e81762b5b1c20b8fecedaeb6145f784a6fac",
    5248,
  ],
  [
    "lifecycle",
    "supabase/migrations/20260831041834_associate_parts_order_lifecycle.sql",
    457,
    1309,
    "3fc2cdc241821d00fb37d7c75684062ba5c01d0519092e76e37d09b82380f654",
    "2c324dcd3b3c7cc0336ad44bc18499f85321bc768c4e8ff93bd6e1d39c71c650",
    60352,
  ],
  [
    "publicInvoice",
    "supabase/migrations/20260716145553_ac1cd5fe-07aa-4ad1-b6ad-caf47c0e2886.sql",
    106,
    175,
    "50b8f806c0ba6be35dc2dfe2d460893d5623d860dfdf154f163e46b52ef1e11f",
    "52cd59cd5e8016d6c8cb3e750850476c68bd4947bf3f97e511cd26703db19408",
    9255,
  ],
  [
    "canonicalLink",
    "supabase/migrations/20260902151438_assistant_manager_temporary_canonical_permission.sql",
    102,
    158,
    "1ac1aaed2fb7fe17bd10a73a1f62f9eab4764248bf257518b84b14db23752522",
    "f2bf9360254bdb4f5d57a79f552bc0966b84724cb10ad1038f2e051739d6023f",
    10503,
  ],
  [
    "nativeInvoice",
    "supabase/migrations/20260715020120_bc5cc45c-4d3d-4e90-a555-cf44d6e11086.sql",
    13,
    196,
    "986072fe947cfd86be305f96379511fed826252d5e80af233c8482a7fb6559f5",
    "143fb565acc5446309c74547554977c89ae12bcf0f756e842101c13e886bdbba",
    7726,
  ],
  [
    "counterBase",
    "supabase/migrations/20260831193523_counter_sales_registers_pricebook.sql",
    3,
    30,
    "e2736908cc1e3343e4cb1a784c0f839ff198e0754c015f39b831fb3482f0327c",
    "d16e845e3b1a28e657ebbe9133202ec4dc80221718d80faaea663cc3448850ec",
    13800,
  ],
  [
    "counterCostPatch",
    "supabase/migrations/20260901021500_fix_counter_sale_inventory_cost.sql",
    1,
    18,
    "15e741d94f1fe43cd29ffcff6bb9afff8e1a9ba8be560ab7f4537c2b43483d06",
    "5b7fafaa03e5994cf8b03b85c491328d4df71dfc34186d015c1f0f356b86ef16",
    485,
  ],
  [
    "counterRolePatch",
    "supabase/migrations/20260901025813_enforce_counter_operator_roles.sql",
    1,
    46,
    "787ea0c006653a37c515482fc8748cc792f4a8e140dba5dc8d1bb15b94400608",
    "5118c5c3e2706fb019946a20b1ee7861f27d33860664d605881fab8b0b8b832c",
    3239,
  ],
  [
    "demoSeed",
    "supabase/migrations/20260901032848_test_tow_company_demo_workspace.sql",
    4,
    103,
    "cee2458aa9175efd5a91650bbdf498c1fb500bb869a16a9bb39e858aca690061",
    "a016f6da2c254230327f520a5f4c9814149cae1f4aac3718296387a8cb39cd2d",
    9519,
  ],
  [
    "quarantine",
    "supabase/migrations/20260910172000_enforce_receiving_exception_quarantine.sql",
    3,
    96,
    "aee5a7fce98c9d4d6d6bcfa596092031f94e8e99ce8bd7f5fe95aa414a7e3cd5",
    "3d01820d89242d67746fa544dbf889227a48053105487bfd9aac52603e266edc",
    5015,
  ],
];

// id, domain(s), writer names, evidence IDs, exact source-backed unresolved gap.
const inventorySpecs = [
  [
    "public-direct-stock",
    ["public"],
    ["upsertBusinessInventoryItem", "adjustBusinessInventory", "deleteBusinessInventoryItem"],
    ["publicApp", "publicUI", "base", "authorityApp"],
    "Absolute on-hand/hold/on-order edits and split movement/read/update compete independently; read error/affected-row and supplied-business bindings are incomplete in the adjustment adapter. getClaims is not fresh native authority; current SQL/RLS may separately restrict access.",
  ],
  [
    "inquiry-lifecycle",
    ["public"],
    [
      "submitNetworkPartInquiry",
      "updateNetworkInquiryStatus",
      "reserve_network_inquiry",
      "release_network_inquiry",
    ],
    ["inquiryApp", "publicUI", "holds", "authorityApp"],
    "App still invokes retained reserve_network_inquiry, not the private mixed-hold candidate. New UUID per inquiry attempt, optional Auth-to-guest fallback, separate status write and message-only failures do not provide durable unknown-outcome reconciliation.",
  ],
  [
    "parts-lifecycle",
    ["public"],
    [
      "create_parts_network_order",
      "transition_parts_network_order",
      "receive_parts_network_order",
      "create_parts_return",
      "transition_parts_return",
      "create_parts_receiving_exception",
      "transition_parts_receiving_exception",
      "record_installed_component",
      "create_parts_warranty_claim",
      "transition_parts_warranty_claim",
    ],
    ["b2bApp", "b2bUI", "lifecycle", "quarantine", "authorityApp"],
    "Selected inquiry/B2B acceptance/cancellation mechanics do not cover shipping, receiving, transfers, returns, quarantine, installed components or warranty writers. Global multi-item lock/phantom order, fresh authority and durable retry identity remain unverified.",
  ],
  [
    "public-invoice-stock",
    ["public"],
    [
      "addBusinessInvoiceItem",
      "updateBusinessInvoiceItem",
      "deleteBusinessInvoiceItem",
      "sync_invoice_item_inventory",
    ],
    ["publicInvoiceApp", "publicInvoice", "authorityApp"],
    "Adapter prechecks raw on-hand separately, while retained invoice-item triggers deduct/restore stock on insert/update/delete. Combined hold admission, compatible lock order, tenant binding and financial/durable outcomes require actual current-catalog and transaction proof.",
  ],
  [
    "native-manual-adjustment",
    ["shop_manager"],
    ["AdjustStockDialog"],
    ["nativeAdjustApp", "schemaApp"],
    "Cached currentQty produces an absolute native quantity, after a separate inventory_transactions insert. No shared transaction/CAS, fresh native admission or durable outcome receipt is established by this browser path; it is outside the public 14-table rehearsal.",
  ],
  [
    "native-counter-sale",
    ["shop_manager"],
    ["open_register", "complete_counter_sale", "close_register", "can_operate_counter"],
    ["counterApp", "schemaApp", "counterBase", "counterCostPatch", "counterRolePatch"],
    "Retained complete_counter_sale locks register and inventory, but cost/role patches dynamically rewrite provider-visible function text. Applied body/patch correspondence, all-writer ordering, native session/tenant authority and durable operation identity are not established by source or UI copy.",
  ],
  [
    "native-purchase-order-receiving",
    ["shop_manager"],
    ["receiveAll", "POItemRow.receive"],
    ["nativePOApp", "schemaApp"],
    "Per-item absolute received_quantity updates and later purchase_orders status update are separate requests based on cached quantities. Inventory posting triggers, partial/unknown outcomes, concurrent receipts and native authority need current SQL correspondence and atomic acceptance.",
  ],
  [
    "native-invoice-stock",
    ["shop_manager"],
    [
      "sm_apply_invoice_line_stock",
      "sm_apply_invoice_stock",
      "sm_trg_invoice_stock",
      "sm_trg_invoice_item_stock",
      "sm_post_journal",
      "sm_void_journal_by_source",
    ],
    ["nativeInvoice", "schemaApp"],
    "Retained native invoice stock uses integer quantity casts and GREATEST clamps and calls journal helpers. Current trigger/helper/ACL correspondence and concurrent stock/journal/reversal/durable recovery remain unverified; its UI and journal implementation are not pinned by this selected frontier.",
  ],
  [
    "canonical-inventory-identity",
    ["public"],
    ["linkBusinessInventoryCanonicalPart", "link_business_inventory_catalog_part"],
    ["publicApp", "publicUI", "canonicalLink", "authorityApp"],
    "Canonical identity changes lock selected inventory in retained SQL, but current grants/body/native permission revocation and compatibility with all financial/stock/claim/offboarding writers remain unverified.",
  ],
  [
    "demo-reset-cascades",
    ["public", "shop_manager"],
    ["seed_tow_demo_workspace", "reset_tow_demo_workspace", "retained ON DELETE cascades"],
    ["demoSeed", "base", "lifecycle"],
    "Demo reset deletes/recreates marked stock in both domains; retained cascade relationships affect movements/reservations. Source inventory is not authorization to execute resets/deletes, and deployed cascade/authority/recovery correspondence remains unverified.",
  ],
];
const hash = (text) => createHash("sha256").update(text).digest("hex");
function freezeDeep(value) {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

export function buildStockWriterFrontier() {
  if (arguments.length !== 0) throw new TypeError("Stock writer frontier accepts no arguments");
  const sources = sourceSpecs.map(([id, path, start, end, wholeSha256, spanSha256, lfBytes]) => {
    const text = readFileSync(new URL(`../../${path}`, import.meta.url), "utf8").replace(
      /\r\n/g,
      "\n",
    );
    const lines = text.split("\n");
    if (Buffer.byteLength(text) !== lfBytes || hash(text) !== wholeSha256 || text.includes("\r")) {
      throw new Error(`Stock writer frontier whole-source drift: ${id}`);
    }
    if (
      start < 1 ||
      end < start ||
      end > lines.length ||
      hash(lines.slice(start - 1, end).join("\n")) !== spanSha256
    ) {
      throw new Error(`Stock writer frontier selected-span drift: ${id}`);
    }
    return { id, path, start, end, wholeSha256, spanSha256, lfBytes };
  });
  const inventory = inventorySpecs.map(([id, domains, writers, evidenceIds, gap]) => ({
    id,
    domains: [...domains],
    writers: [...writers],
    gap,
    evidence: evidenceIds.map((sourceId) => {
      const source = sources.find((candidate) => candidate.id === sourceId);
      if (!source) throw new Error("Stock writer frontier missing fixed evidence");
      return { ...source };
    }),
  }));
  return freezeDeep({
    version: "365-stock-writer-frontier-v1",
    coverage:
      "Fixed selected local source inventory only; not all deployed, external or dynamic writers, AST exhaustiveness, current catalog or activation authority.",
    domains: {
      public: [
        "business_inventory_items",
        "business_inventory_movements",
        "network_part_inquiries",
        "parts_reservations",
        "parts_orders",
        "parts_order_lines",
        "business_invoice_items",
      ],
      shop_manager: [
        "inventory_items",
        "inventory_transactions",
        "counter_sales",
        "counter_sale_lines",
        "cash_registers",
        "register_sessions",
        "purchase_orders",
        "purchase_order_items",
        "invoice_items",
      ],
    },
    flags: {
      currentCatalogParity: false,
      allWritersCompatible: false,
      nativeAuthorityVerified: false,
      durableOutcomeReconciliation: false,
      globalNoOversell: false,
      appAdoptionReady: false,
      releaseReady: false,
    },
    sources,
    inventory,
  });
}
