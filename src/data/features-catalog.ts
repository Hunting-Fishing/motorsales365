/**
 * Master catalog for the /features page.
 * Each entry powers one expandable row: title, pitch, how-it-works,
 * why-useful bullets, competitive positioning, and a deep link into the app.
 *
 * Screenshots are optional. If present they reference an .asset.json pointer
 * under src/assets/features/. Missing screenshots render a designed placeholder.
 */

export type FeatureStatus = "live" | "beta" | "new" | "roadmap";

export type FeatureModule =
  | "marketplace"
  | "shop-manager"
  | "parts-network"
  | "franchise"
  | "partner-program"
  | "clubs"
  | "learning"
  | "dispatch"
  | "qr-referrals"
  | "trust-safety"
  | "buyer-tools";

export type Feature = {
  id: string;
  module: FeatureModule;
  name: string;
  pitch: string;
  howItWorks: string;
  whyUseful: string[];
  vsCompetition: string[];
  route?: string; // link to the actual in-app page
  status: FeatureStatus;
};

export const MODULES: {
  id: FeatureModule;
  label: string;
  intro: string;
  icon: string; // lucide-react icon name (resolved in the component)
}[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    icon: "Car",
    intro: "Buy, sell, and discover vehicles, parts, and services — nationwide.",
  },
  {
    id: "shop-manager",
    label: "Shop Manager",
    icon: "Wrench",
    intro: "A full shop OS: work orders, inventory, invoicing, staff, and accounting.",
  },
  {
    id: "parts-network",
    label: "Parts Network",
    icon: "PackageSearch",
    intro: "Live cross-shop OEM catalog, VIN search, and real-time stock.",
  },
  {
    id: "franchise",
    label: "Franchise & Partner Shops",
    icon: "Building2",
    intro: "Join the 365 network — shared CRM, discounted parts, marketing lift.",
  },
  {
    id: "partner-program",
    label: "Partner Program",
    icon: "Handshake",
    intro: "Commission-only affiliates promoting 365 with QR-tracked referrals.",
  },
  {
    id: "clubs",
    label: "Clubs",
    icon: "Users",
    intro: "Accredited motoring clubs with member perks and discounts.",
  },
  {
    id: "learning",
    label: "Learning & Education",
    icon: "GraduationCap",
    intro: "Flashcards, courses, and mechanic training built into the platform.",
  },
  {
    id: "dispatch",
    label: "Dispatch, Tow & Rides",
    icon: "Truck",
    intro: "On-demand towing, delivery, and ride coordination.",
  },
  {
    id: "qr-referrals",
    label: "QR & Referrals",
    icon: "QrCode",
    intro: "Printable QR ads, staff codes, and full-funnel attribution.",
  },
  {
    id: "trust-safety",
    label: "Trust & Safety",
    icon: "ShieldCheck",
    intro: "LTO document verification, tier badges, moderation, and safe-meet spots.",
  },
  {
    id: "buyer-tools",
    label: "Buyer Tools",
    icon: "Sparkles",
    intro: "Saved searches, favorites, price trends, messenger inbox, offers.",
  },
];

/**
 * Plain-language ("what does this actually mean?") explanations, keyed by
 * feature id. Rendered above the technical pitch on the /features page so
 * non-technical readers understand each row before opening it.
 */
export const PLAIN_LANGUAGE: Record<string, string> = {
  // Marketplace
  "post-listing": "Post a car, bike, or part in a few steps — we auto-fill most details from the VIN so you don't have to type them.",
  "smart-map": "See every listing near you on a map, filter by what you want, and click a pin to jump to the ad.",
  "tier-rings": "The glow around each listing tells you at a glance who you're dealing with — verified shop, dealership, or private seller.",
  "messenger-inbox": "A real inbox like Messenger, but built for buying and selling — separate tabs for your buys, sales, and saved chats.",
  "wanted-listings": "Instead of hunting, post what you need and sellers come to you.",
  "boosts": "Pay a small amount to push your listing to the top for a set number of days — you know exactly what you're paying for.",
  "business-microsite": "Every verified business gets its own free page like 365motorsales.com/laoagtires — your listings, hours, map, and reviews all in one shareable link.",
  "custom-domain": "Later, point your own domain (like laoagtires.com) at your 365 microsite for free.",
  "slug-history": "If you rename your business page, the old link still works — no broken shares or dead QR codes.",

  // Shop Manager
  "work-orders": "One screen tracks every repair from drop-off to pickup — vehicle, jobs, parts, labor time, and the invoice at the end.",
  "inventory": "Track every part on your shelf — cost, price, quantity — and get pinged before you run out.",
  "invoices-quotes": "Give the customer a quote, and when they say yes, turn it into an invoice with one click.",
  "accounting": "Every peso in and out is recorded twice so your books balance automatically. See sales, expenses, and 'am I making money?' on one page.",
  "pnl-plain": "A one-page report that answers 'did I make money this month?' — sales, minus costs, equals profit. Nothing fancier.",
  "gl-drilldown": "Click any number in a report and see the exact invoices, receipts, or expenses behind it — nothing hidden.",
  "technicians": "See who's working today, who's overloaded, and how much billable work each tech finished this week.",
  "expenses": "Snap the receipt, pick a category, done. It shows up in your P&L the same day.",
  "loyalty-promos": "Reward repeat customers automatically and run 'first-visit 10% off' promos without any coupon site.",
  "automation": "Send oil-change reminders to customers automatically based on mileage or months since last visit — set once, runs forever.",
  "hr-leave": "Handle staff leave requests, balances, and certification expiries without a spreadsheet.",
  "free-inventory": "Any verified business gets our full Shop Manager inventory module for free — no per-seat fee, no paywall. Competitors charge $199+/month.",
  "invoice-from-inventory": "Pick parts from your shelf, click one button, and out comes a printable invoice — stock is subtracted and your books update themselves.",
  "digital-inspections": "Instead of paper, technicians walk the car on a tablet, take photos of what they find, and text the customer a link to approve extra work.",

  // Parts Network
  "vin-parts": "Type in a plate or VIN and see every part that fits, in stock, across the whole network.",
  "network-stock": "See which shop actually has the part on the shelf right now — no more calling five places.",
  "inquiry-lifecycle": "Every parts request shows up as Pending → Accepted → Rejected so both sides know where it stands.",
  "wanted-parts": "Post the part you need. Shops with it in stock reply with a price and ETA.",
  "wash-sale": "Shops don't pay to list parts. We only earn a small margin when a part actually sells — so we're incentivized to help you sell, not to charge rent.",
  "cross-shop-share": "If you don't have the part, another 365 shop probably does. Sell it to your customer anyway and split the margin.",

  // Franchise
  "franchise-tiers": "Two ways to join: keep your own brand (Partner) or co-brand with 365 (Franchise). Both get parts discounts and shared customers.",
  "franchise-apply": "A clean application with document upload — no vague DMs, no back-channel deals.",
  "shared-crm": "With the customer's OK, any partner shop can see prior service history — so nothing gets missed at the next visit.",

  // Partner Program
  "partner-apply": "Refer people to 365 with your own QR code and earn commissions on real activity. Independent contractor, no MLM, no downline.",
  "partner-dashboard": "Every scan, signup, and commission in one dashboard — no guessing what you earned.",

  // Clubs
  "clubs-directory": "Real motoring clubs only — they submit LTO/SEC/DTI docs before they can list.",
  "club-discount": "Verified club members get 5% off ads, boosts, and passport purchases — applied automatically at checkout.",

  // Learning
  "flashcards": "Bite-sized study cards for mechanics — engines, brakes, electrical, marine, ag — free to use, great for training new hires.",
  "courses": "Structured video courses with progress tracking. Watch on any device; pick up where you left off.",

  // Dispatch
  "dispatch-tow": "One-tap tow request; local providers accept and you see ETA in real time.",
  "rides": "Local ride and transport listings focused on motoring, not general Grab-style trips.",

  // QR & Referrals
  "qr-ads": "Print your QR on shirts, banners, or arm bands. Every scan is tracked back to you.",
  "referral-attribution": "We track a QR scan all the way through signup and purchase — so partners get paid on real conversions, not just clicks.",

  // Trust & Safety
  "lto-verify": "Sellers upload their OR/CR. Our AI reads it and flags fakes before the ad goes live. Buyers see a green 'LTO Verified' badge.",
  "safe-meet": "Every vehicle ad shows a short pre-meetup checklist — meet in daylight, verify OR/CR, bring someone with you.",
  "reports-moderation": "Flag anything sketchy. Moderators review with real severity levels (including 'no penalty') and there's an appeals path.",
  "realtime-everything": "Inventory, inquiries, messages, and stock update on your screen the moment they change — no refresh, no waiting.",
  "ph-first": "Built for Philippine plates, roads, and payment habits (like GCash) first — not a US template forced to fit.",
  "ad-free-buyers": "No third-party display ads on any listing page. What you see is what shops are actually selling.",

  // Buyer Tools
  "saved-favorites": "Star an ad you like. Save a search once, and we tell you when new matches show up or the price drops.",
  "price-trends": "Every listing shows whether the asking price is above, at, or below what similar units nearby are going for.",

  // Roadmap
  "rm-driver-ed": "Coming soon: full driver-education courses tied to LTO renewal, with proof of completion stored on your profile.",
  "rm-insurance": "Coming soon: compare CTPL and comprehensive insurance quotes side by side without calling five brokers.",
  "rm-auctions": "Coming soon: live and timed bidding rooms for vehicles and parts.",
  "rm-trade-in": "Coming soon: enter your car and get same-day binding offers from multiple dealers.",
  "rm-vhistory": "Coming soon: accident, flood, and service history badges surfaced right on the listing.",
  "rm-loans": "Coming soon: pre-qualify for a car loan in-app with partner banks — know your budget before you shop.",
};

export const FEATURES: Feature[] = [
  // ─────────────── Marketplace ───────────────
  {
    id: "post-listing",
    module: "marketplace",
    name: "Post a listing in minutes",
    pitch: "Guided listing form with VIN decode, OR/CR upload, and video support.",
    howItWorks:
      "The /sell form auto-fills vehicle specs from VIN, validates mandatory fields inline (orange/green highlights), and saves drafts so you never lose progress. Upload up to 20 photos plus a walk-around video.",
    whyUseful: [
      "Drafts auto-save — close the tab, come back later",
      "Video thumbnails and progress bars for large uploads",
      "Region-scoped visibility and pricing on the same page",
    ],
    vsCompetition: [
      "Carousell / OLX force you to restart if your session drops",
      "Facebook Marketplace has no VIN decode or CR verification field",
      "AutoDeal focuses on dealers — private sellers get a stripped form",
    ],
    route: "/sell",
    status: "live",
  },
  {
    id: "smart-map",
    module: "marketplace",
    name: "Smart map with live listings",
    pitch: "Split-view map that syncs pins with a listings sidebar and filters.",
    howItWorks:
      "OpenStreetMap-powered map (/map) with legend, info button, and filters. Panning updates the sidebar; clicking a pin scrolls the card into view.",
    whyUseful: [
      "See supply density in your city at a glance",
      "Filter by category, price, tier, and radius",
      "Legend explains ring colors and tier badges",
    ],
    vsCompetition: [
      "Carousell has no proper map view for vehicles",
      "Philkotse map is static and dealer-only",
      "OLX doesn't cluster or filter geographically",
    ],
    route: "/map",
    status: "live",
  },
  {
    id: "tier-rings",
    module: "marketplace",
    name: "Priority accents on listing cards",
    pitch: "Cards glow by tier: dealership, business, verified, featured, or caution.",
    howItWorks:
      "Every ListingCard reads seller tier, boost status, and reputation to render a colored ring/glow. A legend on the browse pages explains what each color means.",
    whyUseful: [
      "Verified sellers stand out visually",
      "Featured boosts are unmistakable",
      "Caution rings warn on strike-heavy accounts",
    ],
    vsCompetition: [
      "No PH marketplace visualizes seller reputation this way",
      "Shopmonkey/Tekmetric aren't marketplaces — no equivalent",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "messenger-inbox",
    module: "marketplace",
    name: "Messenger-style inbox",
    pitch: "Full inbox with folders, offers, and a floating message widget.",
    howItWorks:
      "Facebook-style inbox at /dashboard/messages with Buying, Selling, Sold, and Starred folders. A floating message widget on every listing page keeps conversations one click away.",
    whyUseful: [
      "Make Offer flow with counter-offer history",
      "Folder tabs keep buying and selling separate",
      "Unread badges and typing indicators",
    ],
    vsCompetition: [
      "Carousell's chat is basic — no folders, no offers ledger",
      "OLX makes you leave the app for real conversations",
    ],
    route: "/dashboard/messages",
    status: "live",
  },
  {
    id: "wanted-listings",
    module: "marketplace",
    name: "Wanted listings",
    pitch: "Post what you're looking for — sellers come to you.",
    howItWorks:
      "Buyers describe the vehicle or part they need at /wanted/new. Matching sellers get notified and can respond directly.",
    whyUseful: [
      "Reverse the search — sellers hunt for you",
      "Great for rare parts and specific trims",
      "Region-scoped so local shops see it first",
    ],
    vsCompetition: [
      "Carousell has no wanted board for vehicles",
      "Facebook Marketplace has no structured wanted flow",
    ],
    route: "/wanted",
    status: "live",
  },
  {
    id: "boosts",
    module: "marketplace",
    name: "Listing boosts",
    pitch: "Push your listing to the top of results for a set window.",
    howItWorks:
      "Choose a boost duration at checkout. Boosted listings get the Featured ring, higher search placement, and appear on category landings.",
    whyUseful: [
      "Time-boxed — you pay for exactly the exposure you want",
      "Featured ring visually differentiates the boost",
      "Analytics show impressions gained during the boost",
    ],
    vsCompetition: [
      "Carousell 'Bump' vanishes in hours; ours has clear duration windows",
      "AutoDeal boosts are dealer-only",
    ],
    route: "/dashboard/boosts",
    status: "live",
  },

  // ─────────────── Shop Manager ───────────────
  {
    id: "work-orders",
    module: "shop-manager",
    name: "Work orders with jobs, parts, labor",
    pitch: "Full RO lifecycle: intake → estimate → approval → invoice.",
    howItWorks:
      "Each work order tracks vehicle, customer, job list, parts, technician time entries, and status. Real-time updates via Supabase channels.",
    whyUseful: [
      "One screen for the whole repair, not five tabs",
      "Labor entries roll straight into the invoice",
      "Status changes notify the customer automatically",
    ],
    vsCompetition: [
      "Shopmonkey ($199+/mo) — comparable, but Western pricing",
      "Tekmetric — US-only, no PH parts network integration",
      "Mitchell1 — powerful but heavy, desktop-first",
    ],
    route: "/shop",
    status: "live",
  },
  {
    id: "inventory",
    module: "shop-manager",
    name: "Inventory with stock adjustments",
    pitch: "SKU-level stock with movements, alerts, and cost tracking.",
    howItWorks:
      "Add parts with cost/sell prices, adjust quantities with reason codes, and get low-stock alerts. Consumption from work orders auto-decrements stock.",
    whyUseful: [
      "Alerts prevent surprise out-of-stocks",
      "Movements ledger for audits",
      "Ties directly into Parts Network sharing",
    ],
    vsCompetition: [
      "AutoLeap has inventory but no cross-shop network",
      "Mitchell1 inventory is enterprise-priced",
    ],
    route: "/shop/inventory",
    status: "live",
  },
  {
    id: "invoices-quotes",
    module: "shop-manager",
    name: "Invoices, quotes, and payments",
    pitch: "Generate quotes, convert to invoices, and record payments.",
    howItWorks:
      "Line-item quotes convert to invoices with one click. Record partial or full payments; the ledger tracks receivables.",
    whyUseful: [
      "One-click quote → invoice",
      "Partial payments and refunds handled",
      "Ties to accounting P&L automatically",
    ],
    vsCompetition: [
      "Comparable to Shopmonkey/Tekmetric — at a PH-friendly price",
    ],
    route: "/shop/invoices",
    status: "live",
  },
  {
    id: "accounting",
    module: "shop-manager",
    name: "Double-entry accounting & P&L",
    pitch: "General ledger, journal entries, and a full profit & loss statement.",
    howItWorks:
      "Every invoice, expense, and payment posts to the ledger. Drill into any account for running balances. Export P&L to CSV.",
    whyUseful: [
      "Real books, not just a KPI dashboard",
      "CSV export for your accountant",
      "Tracks receivables and payables",
    ],
    vsCompetition: [
      "Most shop tools stop at KPIs — ours has a real GL",
      "QuickBooks would cost extra and doesn't integrate",
    ],
    route: "/shop/accounting",
    status: "live",
  },
  {
    id: "technicians",
    module: "shop-manager",
    name: "Technician roster & performance",
    pitch: "Weekly schedules, time entries, and per-tech performance.",
    howItWorks:
      "Manage roster at /shop/technicians. Each tech has a weekly schedule, certifications, and rolled-up billable hours.",
    whyUseful: [
      "See who's overloaded before it becomes a problem",
      "Certifications tracked with expiry alerts",
      "Time entries feed labor billing",
    ],
    vsCompetition: [
      "Shopmonkey has staff — ours adds shift templates and swap requests",
    ],
    route: "/shop/technicians",
    status: "live",
  },
  {
    id: "expenses",
    module: "shop-manager",
    name: "Expense tracker with receipts",
    pitch: "Categorized expenses with receipt uploads and P&L integration.",
    howItWorks:
      "Log expenses with categories and attach receipt photos. Everything posts to the ledger and appears on the P&L.",
    whyUseful: [
      "Paperless receipt trail",
      "Categorized reporting",
      "No re-entry into accounting software",
    ],
    vsCompetition: [
      "Most PH shops use spreadsheets — this is a step-change",
    ],
    route: "/shop/expenses",
    status: "live",
  },
  {
    id: "loyalty-promos",
    module: "shop-manager",
    name: "Loyalty & promo codes",
    pitch: "Reward returning customers and run targeted promos.",
    howItWorks:
      "Loyalty dashboard shows point balances; promo codes support percent/flat/first-visit rules with usage limits.",
    whyUseful: [
      "Retention lift without a third-party tool",
      "Promo codes work at invoice time",
      "Points balance visible on the customer profile",
    ],
    vsCompetition: [
      "AutoLeap and Shopmonkey have loyalty add-ons that cost extra",
    ],
    route: "/shop/loyalty",
    status: "live",
  },
  {
    id: "automation",
    module: "shop-manager",
    name: "Service-reminder automation",
    pitch: "Automatic reminders based on mileage, time, or last-service rules.",
    howItWorks:
      "Rules engine at /shop/automations fires reminders through SMS/email/in-app when customer records match a trigger.",
    whyUseful: [
      "Bring customers back on schedule",
      "Zero manual reminder work",
      "Rules editable by shop owners",
    ],
    vsCompetition: [
      "Comparable to Shopmonkey's Marketing Suite — included, not add-on",
    ],
    route: "/shop/automations",
    status: "live",
  },
  {
    id: "hr-leave",
    module: "shop-manager",
    name: "HR & leave management",
    pitch: "Certificates, leave requests, and balance tracking for staff.",
    howItWorks:
      "Leave request workflow with manager approval; approved leave auto-decrements the balance. Certificate expiry alerts keep compliance current.",
    whyUseful: [
      "Small shops finally get real HR",
      "No spreadsheet for leave balances",
      "Audit trail for approvals",
    ],
    vsCompetition: [
      "None of the US shop tools include PH-friendly HR",
    ],
    route: "/shop/hr",
    status: "live",
  },

  // ─────────────── Parts Network ───────────────
  {
    id: "vin-parts",
    module: "parts-network",
    name: "VIN-based OEM parts catalog",
    pitch: "Enter a VIN, see every fitting OEM part across the network.",
    howItWorks:
      "The catalog resolves a VIN to make/model/year and fitment codes, then queries the shared parts index for compatible SKUs with live stock.",
    whyUseful: [
      "No more phone-tag hunting for a part",
      "Fitment-checked — no wrong-part returns",
      "Sorted by distance and price",
    ],
    vsCompetition: [
      "PartSouq covers Europe/US; we own the PH catalog",
      "Local shops today rely on Viber groups — this replaces them",
    ],
    route: "/parts/search",
    status: "live",
  },
  {
    id: "network-stock",
    module: "parts-network",
    name: "Live cross-shop inventory",
    pitch: "See which shop has the part, and how many, updated in real time.",
    howItWorks:
      "Shops that opt in share stock into a network_stock view; buyers see live counts and reserve stock for 1–168 hours.",
    whyUseful: [
      "No wasted drives — the part is confirmed on-shelf",
      "Reservations avoid double-selling",
      "Owner controls exposure via admin approval",
    ],
    vsCompetition: [
      "No PH marketplace has real-time cross-shop stock",
      "Shopmonkey inventory is per-shop, not networked",
    ],
    route: "/parts/network",
    status: "live",
  },
  {
    id: "inquiry-lifecycle",
    module: "parts-network",
    name: "Inquiry workflow (Pending → Accepted → Rejected)",
    pitch: "Track every parts inquiry with status, ETA, price, and quantity.",
    howItWorks:
      "Customer submits an inquiry; shops respond with a fulfillment update. Both sides get real-time in-app notifications on status changes.",
    whyUseful: [
      "Both parties always know where the request stands",
      "Fulfillment updates prevent miscommunication",
      "History log for disputes",
    ],
    vsCompetition: [
      "Viber/Messenger have no structured lifecycle",
    ],
    route: "/parts/network",
    status: "live",
  },
  {
    id: "wanted-parts",
    module: "parts-network",
    name: "Wanted parts board",
    pitch: "Post the part you need — the network finds it for you.",
    howItWorks:
      "Post at /wanted-parts/new. Shops with matching SKUs get notified and can reply with a fulfillment quote.",
    whyUseful: [
      "Rare parts surface faster",
      "Multiple shops can compete on price",
      "Buyer chooses the best offer",
    ],
    vsCompetition: [
      "No PH platform reverses the parts search this way",
    ],
    route: "/wanted-parts",
    status: "live",
  },

  // ─────────────── Franchise ───────────────
  {
    id: "franchise-tiers",
    module: "franchise",
    name: "Two-tier program (Partner & Franchise)",
    pitch: "Keep your brand as a Partner, or co-brand as a full Franchise.",
    howItWorks:
      "Tiers are admin-editable (/admin/franchise-tiers). Both include parts discounts, shared CRM, and marketing lift; Franchise adds co-branding.",
    whyUseful: [
      "Choose the tier that fits your shop",
      "Transparent, admin-editable pricing",
      "No downline/MLM — clean commercial terms",
    ],
    vsCompetition: [
      "NAPA AutoCare inspired — adapted for PH shops",
      "AutoLeap/Shopmonkey have no franchise offering",
    ],
    route: "/franchise",
    status: "live",
  },
  {
    id: "franchise-apply",
    module: "franchise",
    name: "Apply & onboarding workflow",
    pitch: "Structured application with docs, review, and go-live checklist.",
    howItWorks:
      "Apply at /franchise/apply. Admin reviews in /admin/franchise; approved shops get a dashboard, discounted parts, and network visibility.",
    whyUseful: [
      "Predictable onboarding path",
      "Docs stored, review audit-logged",
      "Live dashboard from day one",
    ],
    vsCompetition: [
      "Most franchise programs are opaque; ours is transparent end-to-end",
    ],
    route: "/franchise/apply",
    status: "live",
  },
  {
    id: "shared-crm",
    module: "franchise",
    name: "Shared customer CRM",
    pitch: "One customer profile across every partner shop (with consent).",
    howItWorks:
      "Franchise members opt-in to the shared CRM. See prior service history and quotes from any partner shop, if the customer has consented.",
    whyUseful: [
      "No lost history when a customer switches shops",
      "Consent-based — privacy respected",
      "Cross-shop upsell without cold outreach",
    ],
    vsCompetition: [
      "Unique in PH — no competitor offers a networked CRM",
    ],
    route: "/franchise",
    status: "live",
  },

  // ─────────────── Partner Program ───────────────
  {
    id: "partner-apply",
    module: "partner-program",
    name: "Commission-only affiliate program",
    pitch: "Independent contractors earning on tracked referrals.",
    howItWorks:
      "Apply at /partner-program/apply. Approved partners get a unique QR code and a dashboard with referrals, commissions, and payouts.",
    whyUseful: [
      "No wage-style pay — clean 1099-style terms",
      "No downline / no MLM structure",
      "Transparent commission ledger",
    ],
    vsCompetition: [
      "Ethically differentiated from MLM 'opportunity' schemes",
    ],
    route: "/partner-program",
    status: "live",
  },
  {
    id: "partner-dashboard",
    module: "partner-program",
    name: "Partner dashboard & ledger",
    pitch: "See every scan, referral, and commission in one place.",
    howItWorks:
      "Dashboard at /dashboard/partner shows QR analytics, inbox, referrals, and performance. Ledger at /admin/partner-program/ledger for admins.",
    whyUseful: [
      "Real-time attribution",
      "Payout ledger with export",
      "Performance metrics per partner",
    ],
    vsCompetition: [
      "Most affiliate tools are Western and expensive",
    ],
    route: "/dashboard/partner",
    status: "live",
  },

  // ─────────────── Clubs ───────────────
  {
    id: "clubs-directory",
    module: "clubs",
    name: "Accredited club directory",
    pitch: "Formally accredited motoring clubs — verified before they list.",
    howItWorks:
      "Clubs submit LTO/SEC/DTI docs at /clubs/apply. Admins review; approved clubs appear in the directory with a verified badge.",
    whyUseful: [
      "No fake or predatory clubs",
      "Members see who's real",
      "Accreditation docs on file",
    ],
    vsCompetition: [
      "Facebook Groups have no accreditation — anything goes",
    ],
    route: "/clubs",
    status: "live",
  },
  {
    id: "club-discount",
    module: "clubs",
    name: "Member discount (5% on 365 purchases)",
    pitch: "Verified club members get 5% off ads, boosts, plans, and passport.",
    howItWorks:
      "Discount applies at checkout on internal 365 purchases only. Audit log in /admin/club-discount and /admin/discount-audits.",
    whyUseful: [
      "Real, redeemable perk — not aspirational",
      "Tracks who got what discount and when",
      "Automatic — no coupon codes",
    ],
    vsCompetition: [
      "Membership perks elsewhere are unenforceable IOUs",
    ],
    route: "/clubs",
    status: "live",
  },

  // ─────────────── Learning ───────────────
  {
    id: "flashcards",
    module: "learning",
    name: "Mechanic flashcards",
    pitch: "System-by-system flashcard decks for engines, brakes, and more.",
    howItWorks:
      "Categorized decks at /learn/flashcards cover small-engine, marine, agricultural, heavy-duty, motorcycle and more. Assets managed via admin.",
    whyUseful: [
      "Train new hires in-app",
      "Bite-sized study for certification",
      "Categorized by system and vehicle type",
    ],
    vsCompetition: [
      "Nothing comparable inside a shop platform globally",
    ],
    route: "/learn/flashcards",
    status: "live",
  },
  {
    id: "courses",
    module: "learning",
    name: "Courses with video lessons",
    pitch: "Full course pages with lessons, progress, and watch history.",
    howItWorks:
      "Courses at /learn/$slug with per-lesson watch pages. Progress persists per user.",
    whyUseful: [
      "In-app learning path",
      "Progress synced across devices",
      "Great for franchise onboarding",
    ],
    vsCompetition: [
      "Shopmonkey has 'Shopmonkey University' — ours is public and PH-focused",
    ],
    route: "/learn",
    status: "live",
  },

  // ─────────────── Dispatch ───────────────
  {
    id: "dispatch-tow",
    module: "dispatch",
    name: "Tow & delivery dispatch",
    pitch: "Request a tow or delivery; providers accept in real time.",
    howItWorks:
      "Customers request at /tow or /dispatch. Provider dashboards accept jobs, track status, and settle billing.",
    whyUseful: [
      "One tap tow request",
      "Providers get instant leads",
      "Billing handled in-platform",
    ],
    vsCompetition: [
      "Traditional 'call a tow guy' has no visibility or ETA",
    ],
    route: "/tow",
    status: "live",
  },
  {
    id: "rides",
    module: "dispatch",
    name: "Rides directory",
    pitch: "Coordinate rides and vehicle-related transport in your area.",
    howItWorks:
      "Browse rides at /rides; each listing has full details, photos, and messenger contact.",
    whyUseful: [
      "Local, motor-focused ride discovery",
      "Familiar messenger for coordination",
    ],
    vsCompetition: [
      "Grab is not vehicle-industry focused",
    ],
    route: "/rides",
    status: "live",
  },

  // ─────────────── QR & Referrals ───────────────
  {
    id: "qr-ads",
    module: "qr-referrals",
    name: "Printable QR ad templates",
    pitch: "Apply your QR to arm bands, shirts, banners, and posters.",
    howItWorks:
      "Choose a template in /dashboard/qr-ads. The system renders your QR onto the template; download and print.",
    whyUseful: [
      "Turn any partner into a walking billboard",
      "Templates managed by admins",
      "Every scan tracks back to the partner",
    ],
    vsCompetition: [
      "Custom-print shops don't attribute scans",
    ],
    route: "/dashboard/qr-ads",
    status: "live",
  },
  {
    id: "referral-attribution",
    module: "qr-referrals",
    name: "Full-funnel referral attribution",
    pitch: "Track scans, signups, purchases, and commissions per QR code.",
    howItWorks:
      "Every /r/$code and /c/$code redirect logs the scan and stamps the signup. Admin sees per-code funnels at /admin/referrals.",
    whyUseful: [
      "Know which QR actually converts",
      "Fair commission payout",
      "Detects fraud attempts",
    ],
    vsCompetition: [
      "Bit.ly-style tools stop at click; we track through purchase",
    ],
    route: "/admin/referrals",
    status: "live",
  },

  // ─────────────── Trust & Safety ───────────────
  {
    id: "lto-verify",
    module: "trust-safety",
    name: "LTO document verification (AI-assisted)",
    pitch: "Upload OR/CR; Gemini audits it and flags mismatches or forgeries.",
    howItWorks:
      "Docs upload to a private bucket. Gemini extracts fields, compares to the listing, and admins finalize the verdict at /admin/verifications.",
    whyUseful: [
      "Buyers see LTO-Verified badges",
      "Reduces stolen-vehicle risk",
      "AI + human review, not just one",
    ],
    vsCompetition: [
      "No PH marketplace does AI-assisted CR verification",
    ],
    route: "/document-check",
    status: "live",
  },
  {
    id: "safe-meet",
    module: "trust-safety",
    name: "Safe meet-up guidance",
    pitch: "Curated safe meeting spots and a buyer safety checklist.",
    howItWorks:
      "Every vehicle listing shows a checklist at the bottom; safe-meet locations are surfaced by region.",
    whyUseful: [
      "New buyers get real guidance",
      "Reduces scam surface",
      "Baked into the listing UX",
    ],
    vsCompetition: [
      "Facebook Marketplace tells you nothing",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "reports-moderation",
    module: "trust-safety",
    name: "Reports, moderation & appeals",
    pitch: "Users flag listings; moderators resolve with severity options.",
    howItWorks:
      "Report at /report. Moderators triage in /admin/reports with severity (including a no-penalty option) and disputes.",
    whyUseful: [
      "Structured moderation, not ad-hoc",
      "Appeals process for wrongly-reported sellers",
      "Audit trail",
    ],
    vsCompetition: [
      "OLX/Carousell moderation is opaque and slow",
    ],
    route: "/report",
    status: "live",
  },

  // ─────────────── Buyer Tools ───────────────
  {
    id: "saved-favorites",
    module: "buyer-tools",
    name: "Favorites, saved searches, price alerts",
    pitch: "Save a listing, save a search, get notified on matches.",
    howItWorks:
      "Star a listing to save it. Save any search query; new matches ping the notifications feed.",
    whyUseful: [
      "Never lose a listing you liked",
      "Passive hunting for the right unit",
      "Alerts on price drops",
    ],
    vsCompetition: [
      "Facebook Marketplace has no saved searches",
    ],
    route: "/dashboard/favorites",
    status: "live",
  },
  {
    id: "price-trends",
    module: "buyer-tools",
    name: "Price trend on every listing",
    pitch: "See if the asking price is above/below the local trend.",
    howItWorks:
      "Each listing shows a price-trend indicator built from comparable local listings.",
    whyUseful: [
      "Objective, data-driven negotiation",
      "New buyers understand fair value",
    ],
    vsCompetition: [
      "AutoDeal price guides exist but only for new dealers",
    ],
    route: "/",
    status: "live",
  },

  // ─────────────── Roadmap ───────────────
  {
    id: "rm-driver-ed",
    module: "learning",
    name: "Driver education hub",
    pitch: "Full driver-ed curriculum with certification tracking.",
    howItWorks:
      "Planned: multi-module courses tied to LTO renewal requirements, with proof-of-completion.",
    whyUseful: [
      "Meet LTO training requirements online",
      "Certification stored on your profile",
    ],
    vsCompetition: [
      "First PH platform to bundle driver ed with a marketplace",
    ],
    status: "roadmap",
  },
  {
    id: "rm-insurance",
    module: "buyer-tools",
    name: "Insurance comparison",
    pitch: "Compare CTPL and comprehensive quotes in-platform.",
    howItWorks:
      "Planned: quote engine plugging into local insurers with side-by-side comparison.",
    whyUseful: ["No more calling five brokers", "Bind coverage before pickup"],
    vsCompetition: ["Comparable to iChoose.ph — embedded in the marketplace"],
    status: "roadmap",
  },
  {
    id: "rm-auctions",
    module: "marketplace",
    name: "Live auctions",
    pitch: "Timed and live-bidding auctions for vehicles and parts.",
    howItWorks:
      "Planned: real-time bidding rooms with reserve prices and proxy bids.",
    whyUseful: ["Discover-price efficiently", "Sellers get competitive bids"],
    vsCompetition: ["Copart-style, tuned for PH"],
    status: "roadmap",
  },
  {
    id: "rm-trade-in",
    module: "marketplace",
    name: "Instant trade-in offers",
    pitch: "Enter your car; multiple dealers make a same-day offer.",
    howItWorks:
      "Planned: submit unit details; approved dealers respond with binding offers.",
    whyUseful: ["Skip the haggle", "See real market value fast"],
    vsCompetition: ["Instabuy/Carsome model, marketplace-integrated"],
    status: "roadmap",
  },
  {
    id: "rm-vhistory",
    module: "trust-safety",
    name: "Vehicle history badges",
    pitch: "Accident, flood, and service history surfaced on the listing.",
    howItWorks:
      "Planned: aggregate LTO records, insurance claims, and shop service history (opt-in) into a badge set.",
    whyUseful: ["Buy with confidence", "Sellers with clean history stand out"],
    vsCompetition: ["Carfax model, PH-native"],
    status: "roadmap",
  },
  {
    id: "rm-loans",
    module: "buyer-tools",
    name: "Loan & financing match",
    pitch: "Pre-qualify with partner banks in-app.",
    howItWorks:
      "Planned: soft-pull pre-qualification with multiple lenders and downpayment calculator.",
    whyUseful: ["Know your budget before shopping", "Skip the branch visit"],
    vsCompetition: ["Comparable to eCompareMo, marketplace-embedded"],
    status: "roadmap",
  },

  // ─────────────── New differentiators ───────────────
  {
    id: "business-microsite",
    module: "marketplace",
    name: "Free hosted business microsite",
    pitch: "Every verified business gets 365motorsales.com/<slug> — listings, hours, map, gallery, reviews.",
    howItWorks:
      "When a business is verified, its slug becomes a public page (e.g. /laoagtires) that aggregates all their listings, contact info, hours, staff, gallery, and reviews into one shareable link. Zero web-dev, zero hosting fees.",
    whyUseful: [
      "One link for cards, SMS, and social — no separate website to build",
      "Automatically updated as you post listings",
      "SEO-friendly URL that's easier to remember than a UUID",
    ],
    vsCompetition: [
      "Shopify/Wix charge $30–$150/mo for the same reach",
      "Facebook Pages aren't indexable the same way",
      "Carousell/OLX don't give businesses a branded landing page",
    ],
    route: "/businesses",
    status: "live",
  },
  {
    id: "custom-domain",
    module: "marketplace",
    name: "Custom domain on your microsite",
    pitch: "Point yourdomain.com at your 365 microsite — coming soon.",
    howItWorks:
      "Planned: verified businesses will be able to attach their own domain (e.g. laoagtires.com) to their microsite via CNAME, keeping the 365 features underneath.",
    whyUseful: [
      "Keep your brand while using 365's tools",
      "No hosting, SSL, or maintenance to worry about",
      "Move your domain in or out at any time",
    ],
    vsCompetition: [
      "Most marketplaces trap you inside their subdomain forever",
    ],
    status: "roadmap",
  },
  {
    id: "slug-history",
    module: "marketplace",
    name: "Business slug history & redirects",
    pitch: "Rename your business page and old links still work.",
    howItWorks:
      "Every business slug change is recorded in business_slug_history, and old URLs 301-redirect to the current slug. Nothing you've printed or shared ever 404s.",
    whyUseful: [
      "Rebrand without losing SEO or QR codes",
      "Old flyers and business cards keep working",
      "Zero customer confusion",
    ],
    vsCompetition: [
      "Facebook Pages break inbound links when renamed",
      "Most marketplaces treat renames as brand-new pages",
    ],
    status: "live",
  },
  {
    id: "free-inventory",
    module: "shop-manager",
    name: "Free Shop Manager inventory for businesses",
    pitch: "Every verified business gets our full inventory module — free, no per-seat fee.",
    howItWorks:
      "Sign up as a business and you get the same inventory module our paid shops use: add parts, cost, price, quantity, alerts, movements, and receipt uploads — with no tier upgrade required.",
    whyUseful: [
      "Replace your spreadsheet at zero cost",
      "Ready the moment you're verified",
      "Same module the pros use — scales when you grow",
    ],
    vsCompetition: [
      "Shopmonkey starts at $199/mo for the same thing",
      "Tekmetric $199–$399/mo per location",
      "Orderry $39–$189/mo",
    ],
    route: "/shop/inventory",
    status: "live",
  },
  {
    id: "invoice-from-inventory",
    module: "shop-manager",
    name: "Invoice directly from inventory",
    pitch: "Pick parts from your shelf → invoice prints → stock and books update themselves.",
    howItWorks:
      "On any work order or standalone invoice, pick lines straight from inventory. Stock decrements automatically, COGS posts to the general ledger, and the invoice reflects live pricing — all in one click.",
    whyUseful: [
      "No double entry — inventory, invoice, and books move together",
      "COGS is always right; margin reports are trustworthy",
      "Cashier flow works on a phone or tablet",
    ],
    vsCompetition: [
      "Shopmonkey has it — at $199+/mo",
      "ARI has invoices but no auto-COGS to a real GL",
      "Spreadsheet workflows can't do this at all",
    ],
    route: "/shop/invoices",
    status: "live",
  },
  {
    id: "cross-shop-share",
    module: "shop-manager",
    name: "Cross-shop stock visibility",
    pitch: "Don't have the part? Another 365 shop probably does — sell it anyway.",
    howItWorks:
      "Your Shop Manager inventory can (with admin approval) be shared into the Parts Network. Other 365 shops see live counts and can quote your parts to their walk-ins — with margin split rules configured up front.",
    whyUseful: [
      "Turn stagnant stock into revenue",
      "Serve customers even when you're out",
      "Optional — you control what's shared and to whom",
    ],
    vsCompetition: [
      "No other shop platform networks stock across independent shops",
    ],
    route: "/parts/network",
    status: "live",
  },
  {
    id: "digital-inspections",
    module: "shop-manager",
    name: "Digital vehicle inspections (DVI)",
    pitch: "Tech walks the car on a tablet, snaps photos, customer approves extra work via link.",
    howItWorks:
      "Launch a DVI from any work order. Techs check off items, upload photos to a private bucket, and the customer gets a shareable link to review findings and approve additional work.",
    whyUseful: [
      "Fewer disputes — everything photographed and time-stamped",
      "Higher approved-work rates when customers see the photos",
      "Templates keep inspections consistent shop-wide",
    ],
    vsCompetition: [
      "AutoLeap DVI is bundled in $199+/mo plans",
      "Most PH shops still use paper checklists",
    ],
    route: "/shop",
    status: "live",
  },
  {
    id: "pnl-plain",
    module: "shop-manager",
    name: "Plain-English P&L statement",
    pitch: "A one-page 'am I making money?' report — sales minus costs, month by month.",
    howItWorks:
      "Pick a date range (this month, last 30 days, YTD). We tally sales, expenses, vendor payments, and net cash. Every number is clickable — drill into the exact invoices behind it.",
    whyUseful: [
      "Understand your business without an accounting degree",
      "Export to CSV for your bookkeeper",
      "Drill down means you can always answer 'where did that number come from?'",
    ],
    vsCompetition: [
      "Most shop tools stop at KPI tiles",
      "QuickBooks costs extra and doesn't know your work orders",
    ],
    route: "/shop/accounting/pnl",
    status: "live",
  },
  {
    id: "gl-drilldown",
    module: "shop-manager",
    name: "General ledger drilldown",
    pitch: "Click any number in any report and see the exact documents behind it.",
    howItWorks:
      "The general ledger and P&L are both clickable — every account row opens the journal entries, and every journal entry links to the source invoice, receipt, or expense.",
    whyUseful: [
      "Answer 'where did that number come from?' in two clicks",
      "Audits and disputes become easy",
      "Full trace from customer receipt → sale → ledger",
    ],
    vsCompetition: [
      "Most shop tools show KPIs but hide the raw journal",
    ],
    route: "/shop/accounting",
    status: "live",
  },
  {
    id: "wash-sale",
    module: "parts-network",
    name: "Wash-sale margin (no listing fees for shops)",
    pitch: "Shops don't pay to list. 365 earns only when a part actually sells.",
    howItWorks:
      "When a customer buys a networked part, 365 books the sale, pays the sourcing shop their agreed price, and keeps a small margin — the 'wash sale'. No SaaS fee, no per-listing fee.",
    whyUseful: [
      "Zero risk for shops to opt in",
      "Aligns 365 with shops selling — not with charging rent",
      "Predictable revenue without paywalls",
    ],
    vsCompetition: [
      "Marketplaces charge listing or subscription fees regardless of sales",
      "Facebook Marketplace has no revenue alignment at all",
    ],
    route: "/parts/network",
    status: "live",
  },
  {
    id: "realtime-everything",
    module: "trust-safety",
    name: "Real-time updates everywhere",
    pitch: "Inventory, inquiries, messages, and stock update live — no refresh needed.",
    howItWorks:
      "Supabase Realtime channels power live updates across Shop Manager, the Parts Network, and Messenger. When a stock qty changes or a new inquiry arrives, every subscribed screen updates within a second.",
    whyUseful: [
      "Two staff on the same work order never overwrite each other",
      "Buyers see stock changes as they happen",
      "Feels like a native app, not a form-and-refresh site",
    ],
    vsCompetition: [
      "Most PH tools are page-refresh workflows",
    ],
    route: "/shop",
    status: "live",
  },
  {
    id: "ph-first",
    module: "trust-safety",
    name: "PH-first, not a US template",
    pitch: "Built for Philippine plates, roads, and payment habits — including GCash.",
    howItWorks:
      "Region-scoped listings, PHP-native pricing, GCash + Stripe payments, LTO/OR/CR verification, DTI/SEC/LGU-aware business docs, and PH regional maps out of the box.",
    whyUseful: [
      "Nothing to translate or 'work around' for local rules",
      "Payments match how customers actually pay",
      "Support and docs written for PH users",
    ],
    vsCompetition: [
      "Shopmonkey / Tekmetric / AutoLeap are US-first",
      "Carousell is generic C2C, not motor-specific",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "ad-free-buyers",
    module: "trust-safety",
    name: "Ad-free listing pages for buyers",
    pitch: "No third-party display ads. What you see is what shops actually sell.",
    howItWorks:
      "Listing detail pages, browse pages, and the marketplace map never serve display ads from ad networks. Featured placements are always in-network 365 listings, clearly labeled.",
    whyUseful: [
      "No banner spam distracting from vehicle details",
      "Faster page loads",
      "No creepy tracking beacons",
    ],
    vsCompetition: [
      "OLX/Carousell/Facebook are ad-first experiences",
    ],
    route: "/",
    status: "live",
  },

  // ─────────────── Expanded capabilities (v2) ───────────────
  {
    id: "vin-decoder",
    module: "marketplace",
    name: "Global VIN & plate decoder",
    pitch: "Type a VIN or PH plate and auto-fill make, model, year, trim, and engine.",
    howItWorks:
      "Server-side decoder normalizes 17-char VINs (WMI/VDS/VIS), cross-references PH LTO plate patterns, and pre-fills the /sell form. Falls back to manual entry if decode fails.",
    whyUseful: [
      "Cuts listing time from minutes to seconds",
      "Reduces typos in critical specs",
      "Standardizes trims across sellers so search is accurate",
    ],
    vsCompetition: [
      "Carousell/OLX have no VIN decode",
      "Philkotse is dealer-form driven, no VIN handling",
    ],
    route: "/sell",
    status: "live",
  },
  {
    id: "multi-photo-video",
    module: "marketplace",
    name: "20 photos + walk-around video",
    pitch: "Bulk-upload photos and a video with progress bars and auto-thumbnails.",
    howItWorks:
      "Chunked uploads to storage, client-side video frame extraction for a thumbnail, and reorderable gallery. Draft-safe — refresh doesn't lose media.",
    whyUseful: [
      "Buyers trust ads with real walk-around video",
      "Auto-thumbnails so previews load fast",
      "Reordering fixes accidental first-photo bloopers",
    ],
    vsCompetition: [
      "Facebook Marketplace caps videos and drops uploads mid-way",
      "OLX has no in-app video walk-around",
    ],
    route: "/sell",
    status: "live",
  },
  {
    id: "safe-drafts",
    module: "marketplace",
    name: "Safe drafts that never disappear",
    pitch: "Every field autosaves to a private draft — close the tab and pick up later.",
    howItWorks:
      "Debounced writes to listing_drafts on every field change; drafts are RLS-scoped to the owner and can be resumed from /sell or the dashboard.",
    whyUseful: [
      "Peace of mind on flaky mobile connections",
      "Come back the next day without retyping",
      "One draft per listing — no confusion",
    ],
    vsCompetition: [
      "Most marketplaces reset your form on refresh",
    ],
    route: "/sell",
    status: "live",
  },
  {
    id: "saved-searches",
    module: "buyer-tools",
    name: "Saved searches with alerts",
    pitch: "Save a search once — get pinged when new matches or price drops appear.",
    howItWorks:
      "Persist filter combinations (make, model, region, price, tier). A background job diffs new listings against saved searches and sends in-app + email alerts.",
    whyUseful: [
      "Never miss a rare listing that lasts hours",
      "Price-drop alerts on shortlisted units",
      "Cuts constant refresh behavior",
    ],
    vsCompetition: [
      "Carousell has no saved-search alerts for vehicles",
    ],
    route: "/dashboard/saved",
    status: "live",
  },
  {
    id: "compare-listings",
    module: "buyer-tools",
    name: "Side-by-side listing compare",
    pitch: "Pin up to 4 listings and compare specs, prices, and seller trust.",
    howItWorks:
      "Add listings to a compare tray from the card or detail page. Compare view lines up specs, distance, tier badges, and price vs market.",
    whyUseful: [
      "Faster shortlist decisions",
      "Highlights meaningful spec gaps",
      "Great for parts too, not just vehicles",
    ],
    vsCompetition: [
      "No PH marketplace ships a real compare view",
    ],
    route: "/compare",
    status: "new",
  },
  {
    id: "make-offer",
    module: "marketplace",
    name: "Make-offer with counter history",
    pitch: "Structured offers — counter, accept, or decline with a full audit trail.",
    howItWorks:
      "Offers live inside the message thread. Each counter is timestamped and reversible until acceptance. Both sides see the full history.",
    whyUseful: [
      "No 'you said what?' arguments",
      "Cleaner than DM back-and-forth",
      "Attaches to the deal record if the sale completes",
    ],
    vsCompetition: [
      "Carousell offers are one-shot; ours is a proper ladder",
    ],
    route: "/dashboard/messages",
    status: "live",
  },
  {
    id: "views-counter",
    module: "marketplace",
    name: "Accurate view counter",
    pitch: "Every listing view is counted server-side — no inflated numbers.",
    howItWorks:
      "Unique-visitor counts with bot filtering. Sellers see today, week, and lifetime views per listing.",
    whyUseful: [
      "Real signal on which photo/title works",
      "Helps price and boost decisions",
      "Trusted metric for negotiations",
    ],
    vsCompetition: [
      "Many sites inflate view counts to look busy",
    ],
    route: "/dashboard",
    status: "live",
  },
  {
    id: "buyer-safety-checklist",
    module: "trust-safety",
    name: "Buyer safety checklist on every ad",
    pitch: "Meet-in-daylight, verify OR/CR, bring someone — printed on every vehicle ad.",
    howItWorks:
      "Rendered at the bottom of vehicle listing pages. Pulls localized tips for PH (LTO OR/CR checks, safe-meet zones near LGU halls, GCash escrow tips).",
    whyUseful: [
      "Reduces scam meet-ups",
      "Educates first-time buyers",
      "Cheap, high-impact trust signal",
    ],
    vsCompetition: [
      "No PH marketplace bakes safety guidance into the listing itself",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "safe-meet-spots",
    module: "trust-safety",
    name: "Safe-meet spots directory",
    pitch: "Curated LGU-adjacent meet-up spots with CCTV coverage.",
    howItWorks:
      "Verified locations (city halls, police precincts, mall parking) mapped by region. Suggested in the meet-up flow from a listing chat.",
    whyUseful: [
      "One-tap suggest a safe location",
      "Independent list, not sponsored",
      "Reduces buyer anxiety on high-value deals",
    ],
    vsCompetition: [
      "Facebook Marketplace has this in the US only",
    ],
    route: "/safe-meet",
    status: "beta",
  },
  {
    id: "dispute-appeals",
    module: "trust-safety",
    name: "Dispute & appeals workflow",
    pitch: "Every moderation action is appealable within 14 days.",
    howItWorks:
      "Sellers file a dispute per report; moderators review with severity tiers (including 'no penalty'). Overturns refund reputation points automatically.",
    whyUseful: [
      "Fair process, not black-box bans",
      "Score refunds if we got it wrong",
      "Filed and tracked from /account/disputes",
    ],
    vsCompetition: [
      "Most classifieds have no formal appeal path",
    ],
    route: "/account/disputes",
    status: "live",
  },
  {
    id: "blocked-users",
    module: "trust-safety",
    name: "Block & mute controls",
    pitch: "Block anyone from messaging or seeing your listings.",
    howItWorks:
      "Per-user block list enforced at RLS. Blocked users can't DM, can't offer, and don't see your listings surfaced.",
    whyUseful: [
      "Personal safety",
      "Removes repeat lowballers",
      "Silent — the other side isn't notified",
    ],
    vsCompetition: [
      "Carousell block is soft; ours is enforced server-side",
    ],
    route: "/dashboard/blocked",
    status: "live",
  },
  {
    id: "seller-tiers",
    module: "trust-safety",
    name: "Seller tier badges",
    pitch: "Verified, business, dealership, franchise, and caution badges.",
    howItWorks:
      "Tiers are earned from LTO/DTI/SEC docs, listing volume, and moderation history. Badges render on cards, chat, and profile.",
    whyUseful: [
      "At-a-glance trust",
      "Rewards diligent sellers",
      "Flags high-strike accounts",
    ],
    vsCompetition: [
      "Carousell 'CarouPay' is limited; ours ties to real docs",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "profile-completeness",
    module: "trust-safety",
    name: "100% profile completion meter",
    pitch: "Guided profile with a completeness bar — no missed fields.",
    howItWorks:
      "Every profile field maps to a completion percentage. Mobile-friendly sticky save bar, orange/green validation, and a resume-later save.",
    whyUseful: [
      "Higher-trust sellers show up first",
      "Reduces support tickets for missing info",
      "Better matches on wanted listings",
    ],
    vsCompetition: [
      "Most marketplaces bury profile fields in settings",
    ],
    route: "/complete-profile",
    status: "live",
  },
  {
    id: "region-scoping",
    module: "marketplace",
    name: "Nationwide PH region scoping",
    pitch: "Filter by region, province, or city with real centroids.",
    howItWorks:
      "PH region/province/city centroids power radius searches, map defaults, and 'listings near me' feeds.",
    whyUseful: [
      "Local-first browsing by default",
      "Accurate distance calculations",
      "Cross-region search when you want to travel for the right unit",
    ],
    vsCompetition: [
      "Global marketplaces default to city-only search",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "gcash-stripe",
    module: "shop-manager",
    name: "GCash + Stripe payments",
    pitch: "Take payment the way PH customers actually pay.",
    howItWorks:
      "Stripe checkout for cards and international; GCash rails for local. Payments post to the ledger and update invoice status automatically.",
    whyUseful: [
      "Match how customers already pay",
      "One reconciliation view for both",
      "Automatic AR aging",
    ],
    vsCompetition: [
      "Shopmonkey/Tekmetric are card-first, US-centric",
    ],
    route: "/shop/invoices",
    status: "live",
  },
  {
    id: "ar-aging",
    module: "shop-manager",
    name: "A/R aging & receivables",
    pitch: "Know exactly who owes you and how overdue they are.",
    howItWorks:
      "Buckets receivables into 0–30, 31–60, 61–90, 90+ days with per-customer drilldown to source invoices.",
    whyUseful: [
      "Faster collections",
      "Cash-flow forecasting",
      "Direct link to send a reminder or make a call",
    ],
    vsCompetition: [
      "QuickBooks does this but doesn't integrate with your work orders",
    ],
    route: "/shop/accounting",
    status: "live",
  },
  {
    id: "chart-of-accounts",
    module: "shop-manager",
    name: "Editable chart of accounts",
    pitch: "Standard chart preloaded; add or rename accounts to fit your books.",
    howItWorks:
      "Seeded 1000–6000 range chart with asset, liability, equity, revenue, and expense accounts. Rename, add, or archive without breaking postings.",
    whyUseful: [
      "Grows with the business",
      "Accountant-friendly out of the box",
      "Nothing hardcoded",
    ],
    vsCompetition: [
      "Most shop tools hardcode account labels",
    ],
    route: "/shop/accounting",
    status: "live",
  },
  {
    id: "journal-drill",
    module: "shop-manager",
    name: "Journal-entry drilldown",
    pitch: "Click any figure and see the exact DR/CR posting behind it.",
    howItWorks:
      "P&L and GL reports link every number down to the individual journal entries and source documents (invoice, payment, expense).",
    whyUseful: [
      "Full audit trail",
      "Faster month-end close",
      "Trust the numbers",
    ],
    vsCompetition: [
      "Most shop KPI dashboards hide the source data",
    ],
    route: "/shop/accounting/pnl",
    status: "live",
  },
  {
    id: "estimates-to-work",
    module: "shop-manager",
    name: "Estimate approval → work order",
    pitch: "Text the estimate, get customer approval, auto-open the WO.",
    howItWorks:
      "Estimates are sent via SMS/email link; customer taps approve/decline. Approved estimates convert to work orders with parts and labor pre-populated.",
    whyUseful: [
      "No verbal approvals to argue about later",
      "Signed record for warranty",
      "Reduces service-writer friction",
    ],
    vsCompetition: [
      "Comparable to Tekmetric, at PH pricing",
    ],
    route: "/shop",
    status: "live",
  },
  {
    id: "tech-calendar",
    module: "shop-manager",
    name: "Technician calendar & bay scheduling",
    pitch: "Drag-and-drop scheduler with tech workload and bay conflicts.",
    howItWorks:
      "Weekly and day views by technician and bay. Conflicts flagged in red; drag to reschedule; syncs to work-order status.",
    whyUseful: [
      "See who's over- or under-booked",
      "No double-booked bays",
      "Better promised-time estimates",
    ],
    vsCompetition: [
      "AutoLeap has this — we ship it at PH price",
    ],
    route: "/shop/schedule",
    status: "live",
  },
  {
    id: "customer-portal",
    module: "shop-manager",
    name: "Customer portal for approvals & invoices",
    pitch: "Customers view estimates, approve work, and pay online.",
    howItWorks:
      "Magic-link portal — no account needed. Shows estimate, approve/decline buttons, DVI photos, invoice, and pay-now.",
    whyUseful: [
      "No app install for customers",
      "Faster approvals by SMS",
      "Records every interaction on the WO",
    ],
    vsCompetition: [
      "Shopmonkey does this at $199/mo; we include it",
    ],
    route: "/shop",
    status: "live",
  },
  {
    id: "reviews-ratings",
    module: "trust-safety",
    name: "Reviews & ratings",
    pitch: "Post-transaction reviews on shops, sellers, and dispatch providers.",
    howItWorks:
      "Only verified transactions can review. Reviews cannot be deleted by the reviewee; disputes go through moderation.",
    whyUseful: [
      "Hard-earned trust signal",
      "No pay-to-remove reviews",
      "Featured on microsite and profile",
    ],
    vsCompetition: [
      "Facebook lets pages hide reviews; we don't",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "microsite-hours",
    module: "marketplace",
    name: "Microsite hours, map, and contact",
    pitch: "Each shop's page shows hours, a map pin, phone, and live listings.",
    howItWorks:
      "Business microsite (e.g., /laoagtires) renders hours, map, socials, current listings, reviews, and services in one shareable link.",
    whyUseful: [
      "Replaces needing a separate website",
      "Free and always up to date",
      "SEO-indexed by the platform",
    ],
    vsCompetition: [
      "Most shops still rely on a Facebook page or nothing",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "slug-redirects",
    module: "marketplace",
    name: "Rename-safe slug history",
    pitch: "Rename your shop slug — old QR codes and shared links still work.",
    howItWorks:
      "Every rename adds an entry to a slug-history table. Old URLs 301 to the new one automatically.",
    whyUseful: [
      "Rebrand without breaking prints",
      "SEO-safe redirects",
      "No dead QR codes",
    ],
    vsCompetition: [
      "Most CMSs break links on rename",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "seo-json-ld",
    module: "marketplace",
    name: "SEO-ready pages with JSON-LD",
    pitch: "Every listing and microsite ships with structured data for Google.",
    howItWorks:
      "Route-level head() sets unique title/description/og tags. Listings emit Vehicle/Product JSON-LD; shops emit LocalBusiness.",
    whyUseful: [
      "Better Google surfacing",
      "Rich snippets in results",
      "Free organic traffic to your listings",
    ],
    vsCompetition: [
      "Carousell listings rank poorly in PH Google",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "pwa-offline",
    module: "buyer-tools",
    name: "Installable PWA with offline fallback",
    pitch: "Add to home screen; keep browsing when the signal dies.",
    howItWorks:
      "Service worker caches shell + last-seen listings. offline.html renders when the network fails. manifest.webmanifest is installable on iOS/Android.",
    whyUseful: [
      "Feels like a native app without the App Store",
      "Works in weak-signal areas",
      "No install size penalty",
    ],
    vsCompetition: [
      "Carousell/OLX apps are 100MB+ installs",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "notifications",
    module: "buyer-tools",
    name: "In-app notification center",
    pitch: "One bell for messages, offers, inquiries, and status changes.",
    howItWorks:
      "Realtime notification stream with read/unread state, deep links, and a mobile-friendly panel. Grouped by type.",
    whyUseful: [
      "Nothing important slips through",
      "No email overload",
      "One-tap jump to the thread or listing",
    ],
    vsCompetition: [
      "Most marketplaces rely on email only",
    ],
    route: "/dashboard",
    status: "live",
  },
  {
    id: "admin-console",
    module: "trust-safety",
    name: "Full admin console",
    pitch: "Moderation queues, referrals, flags, and platform health in one place.",
    howItWorks:
      "Admin-scoped routes at /admin cover moderation, referrals, franchise tiers, QR analytics, and system flags — all RLS-enforced.",
    whyUseful: [
      "Ops team runs the platform without SQL",
      "Auditable actions",
      "Fast triage on abuse",
    ],
    vsCompetition: [
      "Internal-only for us — but the depth beats what off-the-shelf marketplace platforms ship",
    ],
    route: "/admin",
    status: "live",
  },
  {
    id: "rls-security",
    module: "trust-safety",
    name: "Row-level security on every table",
    pitch: "Your data can only be read by you and roles you allow.",
    howItWorks:
      "All public tables have RLS enabled with policies per role (anon, authenticated, service). Sensitive schemas (auth, shop_manager) never leak across shops.",
    whyUseful: [
      "Multi-tenant safety by design",
      "Passes basic security audits",
      "No accidental cross-shop leaks",
    ],
    vsCompetition: [
      "Custom-built shop tools often skip proper multi-tenant isolation",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "ai-listing-assist",
    module: "marketplace",
    name: "AI listing description helper",
    pitch: "Draft a compelling ad copy from your specs and photos.",
    howItWorks:
      "Uses Lovable AI Gateway to draft a 3–5 line description from make/model/year/mileage and detected condition. You edit, then post.",
    whyUseful: [
      "Faster listings",
      "Better-written ads sell faster",
      "Free for sellers",
    ],
    vsCompetition: [
      "None of the PH marketplaces ship AI copy assistance",
    ],
    route: "/sell",
    status: "beta",
  },
  {
    id: "ai-doc-check",
    module: "trust-safety",
    name: "AI OR/CR document check",
    pitch: "AI reads the uploaded document and flags likely fakes before it goes live.",
    howItWorks:
      "Server-side Gemini pass on the OR/CR image extracts fields, cross-checks the plate/VIN in the listing, and raises confidence flags for reviewers.",
    whyUseful: [
      "Catches obvious tampering",
      "Green 'LTO Verified' badge on the ad",
      "Doesn't replace human review — augments it",
    ],
    vsCompetition: [
      "No PH marketplace runs AI on trust docs",
    ],
    route: "/lto-check",
    status: "live",
  },
  {
    id: "sms-email-notify",
    module: "buyer-tools",
    name: "Email + in-app notifications",
    pitch: "Choose email, in-app, or both — per event type.",
    howItWorks:
      "Per-channel preferences (new message, offer, inquiry status, price drop). Emails render from templated MJML.",
    whyUseful: [
      "You get pinged where you actually look",
      "Silence categories you don't care about",
      "No spam",
    ],
    vsCompetition: [
      "Most sites are all-or-nothing on emails",
    ],
    route: "/dashboard/settings",
    status: "live",
  },
  {
    id: "csv-export",
    module: "shop-manager",
    name: "CSV export everywhere it matters",
    pitch: "Export P&L, GL, invoices, inventory, and customer lists to CSV.",
    howItWorks:
      "One-click CSV downloads from every report and list view. Encoded for Excel/Google Sheets/PH accountants.",
    whyUseful: [
      "Your accountant gets what they need",
      "Backup insurance",
      "No lock-in",
    ],
    vsCompetition: [
      "Some tools gate exports behind higher tiers",
    ],
    route: "/shop/accounting",
    status: "live",
  },
  {
    id: "audit-logs",
    module: "trust-safety",
    name: "Audit logs on sensitive actions",
    pitch: "Every price change, role grant, and moderation action is logged.",
    howItWorks:
      "DB-level audit triggers append immutable rows on changes to key tables. Admin console shows who did what, when.",
    whyUseful: [
      "Accountability across shop teams",
      "Investigate suspicious activity",
      "Regulatory posture",
    ],
    vsCompetition: [
      "Rare in PH-focused SaaS at this price",
    ],
    route: "/admin",
    status: "live",
  },
  {
    id: "role-based-access",
    module: "shop-manager",
    name: "Role-based staff access",
    pitch: "Owner, manager, service writer, technician, and viewer roles.",
    howItWorks:
      "Roles stored in a dedicated user_roles table (never on profiles) and enforced through security-definer functions in RLS.",
    whyUseful: [
      "Techs see their WOs, not the P&L",
      "Managers approve refunds",
      "Owner sees everything",
    ],
    vsCompetition: [
      "Most PH shop tools have one 'admin' role",
    ],
    route: "/shop/staff",
    status: "live",
  },
  {
    id: "multi-location",
    module: "shop-manager",
    name: "Multi-location & multi-bay",
    pitch: "Run several branches under one account with per-location inventory.",
    howItWorks:
      "Each location has its own inventory, staff, and P&L, rolled up to a group view for owners.",
    whyUseful: [
      "Franchise-ready from day one",
      "Move stock between branches",
      "Compare branch performance",
    ],
    vsCompetition: [
      "Tekmetric charges heavily per additional location",
    ],
    route: "/shop",
    status: "beta",
  },
  {
    id: "loyalty-points",
    module: "shop-manager",
    name: "Loyalty points & repeat rewards",
    pitch: "Auto-issue points on paid invoices; redeem on future service.",
    howItWorks:
      "Rules-based: X points per PHP spent, birthday bonuses, tier thresholds. Redemption applies as an invoice discount that posts cleanly to accounting.",
    whyUseful: [
      "Keeps customers coming back",
      "No coupon printers or third-party apps",
      "Books stay clean",
    ],
    vsCompetition: [
      "Loyalty is a separate SaaS ($50/mo+) for most shops",
    ],
    route: "/shop/loyalty",
    status: "live",
  },
  {
    id: "campaigns",
    module: "shop-manager",
    name: "Marketing campaigns to your customer list",
    pitch: "Segment customers and blast targeted SMS/email campaigns.",
    howItWorks:
      "Filters (last visit, vehicle age, total spend) build audiences. Templated messages send via provider, tracked to redemptions.",
    whyUseful: [
      "Reactivate lapsed customers",
      "Fill slow days",
      "Measurable ROI",
    ],
    vsCompetition: [
      "Mailchimp doesn't know your service history; we do",
    ],
    route: "/shop/marketing",
    status: "new",
  },
  {
    id: "recall-lookups",
    module: "shop-manager",
    name: "OEM recall lookups by VIN",
    pitch: "Warn customers about open recalls before you start service.",
    howItWorks:
      "VIN checked against public recall feeds. Flags shown on the work order and communicated via portal.",
    whyUseful: [
      "Safer service",
      "Upsell opportunities on recall-adjacent work",
      "Trust-building with customer",
    ],
    vsCompetition: [
      "Enterprise DMSs have this; most PH shops don't",
    ],
    route: "/shop",
    status: "roadmap",
  },
  {
    id: "tire-treads-tracking",
    module: "shop-manager",
    name: "Tire tread depth & service history per vehicle",
    pitch: "Track tread, brake pad, and fluid measurements over time.",
    howItWorks:
      "DVI captures readings per corner; charts show wear rate; predicts replacement date.",
    whyUseful: [
      "Data-driven upsells",
      "Owner sees value in returning",
      "Safety-relevant maintenance",
    ],
    vsCompetition: [
      "Only US enterprise tools ship this today",
    ],
    route: "/shop",
    status: "beta",
  },
  {
    id: "warranty-tracking",
    module: "shop-manager",
    name: "Parts & labor warranty tracking",
    pitch: "Log warranty terms per part; auto-honor within window.",
    howItWorks:
      "Warranty period stored per invoice line. Warranty-covered comebacks post to a warranty expense account, not COGS.",
    whyUseful: [
      "Honest 'is it still covered?' answers",
      "Clean warranty P&L visibility",
      "Reduces disputes",
    ],
    vsCompetition: [
      "Rarely surfaced this cleanly outside enterprise",
    ],
    route: "/shop",
    status: "live",
  },
  {
    id: "purchase-orders",
    module: "shop-manager",
    name: "Purchase orders & vendor management",
    pitch: "Raise POs to suppliers; receive stock; auto-post to A/P.",
    howItWorks:
      "PO → GRN (goods received note) → vendor bill flow. Received qty updates inventory; bills post to accounts payable.",
    whyUseful: [
      "Real supply chain, not spreadsheets",
      "Cost visibility per supplier",
      "Prevents phantom inventory",
    ],
    vsCompetition: [
      "Purchase orders are a paid add-on in most shop tools",
    ],
    route: "/shop/purchasing",
    status: "new",
  },
  {
    id: "barcode-scanning",
    module: "shop-manager",
    name: "Barcode / QR scanning for inventory",
    pitch: "Scan a part with your phone camera to check stock or add to invoice.",
    howItWorks:
      "Web-based scanner uses the phone camera. Scans open the SKU or line-adds it to the active invoice/WO.",
    whyUseful: [
      "Faster stock counts",
      "Fewer typos on part numbers",
      "Works on any modern phone",
    ],
    vsCompetition: [
      "Barcode scanning is usually a paid tier upgrade",
    ],
    route: "/shop/inventory",
    status: "beta",
  },
  {
    id: "fleet-accounts",
    module: "shop-manager",
    name: "Fleet & corporate accounts",
    pitch: "Bill an LGU, taxi op, or delivery fleet as one master account.",
    howItWorks:
      "Group vehicles under an org account with a monthly billing cycle and PO reference support.",
    whyUseful: [
      "Wins commercial customers",
      "Cleaner invoicing for accounting departments",
      "One relationship, many vehicles",
    ],
    vsCompetition: [
      "Requires custom code in most PH shop tools",
    ],
    route: "/shop",
    status: "beta",
  },
  {
    id: "parts-cross-ref",
    module: "parts-network",
    name: "Cross-reference & OEM-to-aftermarket lookup",
    pitch: "Type an OEM number, see every aftermarket equivalent in stock.",
    howItWorks:
      "Cross-reference table maps OEM ↔ aftermarket SKUs. Search returns fitment-verified equivalents across the network.",
    whyUseful: [
      "Faster quotes on obscure parts",
      "Lower cost options for the customer",
      "Grows organically as shops upload",
    ],
    vsCompetition: [
      "PartSouq is the gold standard globally — this is our PH-first take",
    ],
    route: "/parts/network",
    status: "beta",
  },
  {
    id: "stock-reservations",
    module: "parts-network",
    name: "Short-window stock reservations",
    pitch: "Lock a part for 1–168 hours while your customer decides.",
    howItWorks:
      "Reservation adjusts available_qty on the network view. Auto-expires; explicit cancel returns stock immediately.",
    whyUseful: [
      "No 'sorry, just sold' calls",
      "Time-boxed so stock isn't hoarded",
      "Fair to all shops",
    ],
    vsCompetition: [
      "Facebook Marketplace has no concept of holds",
    ],
    route: "/parts/network",
    status: "live",
  },
  {
    id: "network-inquiries",
    module: "parts-network",
    name: "Inquiry lifecycle: Pending → Accepted → Rejected",
    pitch: "Structured request/response so both sides know where things stand.",
    howItWorks:
      "Customer sends an inquiry; each shop can Accept with price/qty/ETA or Reject with a reason. Realtime updates on both dashboards.",
    whyUseful: [
      "Ends 'did they see my message?'",
      "Comparable quotes side by side",
      "Notifications drive fast responses",
    ],
    vsCompetition: [
      "DIY messaging on Facebook is chaos",
    ],
    route: "/parts/network",
    status: "live",
  },
  {
    id: "exposure-approval",
    module: "parts-network",
    name: "Admin approval to expose inventory",
    pitch: "Shops opt in — an admin reviews before their stock hits the network.",
    howItWorks:
      "Businesses toggle exposure; admins approve or revoke with audit history. Revocation is instant.",
    whyUseful: [
      "Quality bar for the public catalog",
      "Reversible if a shop misbehaves",
      "Clear paper trail",
    ],
    vsCompetition: [
      "Networks like PartSouq are curated but slow; we're curated and fast",
    ],
    route: "/admin",
    status: "live",
  },
  {
    id: "franchise-directory",
    module: "franchise",
    name: "Franchise & partner directory",
    pitch: "Public map of every partner and franchise shop.",
    howItWorks:
      "Directory of active partners with map, filters by service, and links to each microsite.",
    whyUseful: [
      "Customers find nearby trusted shops",
      "Cross-shop referrals",
      "Marketing lift for members",
    ],
    vsCompetition: [
      "NAPA/independent PH networks aren't visible online in one place",
    ],
    route: "/franchise",
    status: "live",
  },
  {
    id: "franchise-messaging",
    module: "franchise",
    name: "In-app messaging with the franchise office",
    pitch: "Application, docs, and follow-ups in one thread — no email chains.",
    howItWorks:
      "franchise_application_messages thread per applicant; RLS locks to owner + admins; email fallback where the applicant hasn't verified yet.",
    whyUseful: [
      "Nothing lost in email",
      "Faster onboarding",
      "Auditable process",
    ],
    vsCompetition: [
      "Most franchise pitches are DM back-channels",
    ],
    route: "/franchise",
    status: "live",
  },
  {
    id: "partner-qr-codes",
    module: "qr-referrals",
    name: "Personal QR codes for every partner",
    pitch: "One QR per partner — scan, sign up, and the partner gets credited.",
    howItWorks:
      "QR encodes canonical URL with attribution token. Full-funnel tracking from scan → signup → activity → commission.",
    whyUseful: [
      "Print on shirts, banners, business cards",
      "No manual referral codes to remember",
      "Fraud-resistant server-side attribution",
    ],
    vsCompetition: [
      "MLM apps track shallow — ours goes to real conversions",
    ],
    route: "/promoter",
    status: "live",
  },
  {
    id: "qr-rescue",
    module: "qr-referrals",
    name: "QR rescue for legacy prints",
    pitch: "If a printed QR points at an old URL, we still route the visitor correctly.",
    howItWorks:
      "Redirect table maps deprecated preview URLs to canonical production URLs so printed materials keep working.",
    whyUseful: [
      "No wasted print runs",
      "Legacy shirts and banners still work",
      "Immediate fix without reprints",
    ],
    vsCompetition: [
      "Unique — most platforms just break the QR",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "referral-dashboard",
    module: "qr-referrals",
    name: "Referral & commission dashboard",
    pitch: "Every scan, signup, and peso earned in one page.",
    howItWorks:
      "Daily and lifetime views of scans, activations, and commissions with drilldowns to individual referrals.",
    whyUseful: [
      "Transparent earnings",
      "Motivates partners to promote",
      "No 'trust me' — the numbers are visible",
    ],
    vsCompetition: [
      "MLM tools obfuscate; we don't",
    ],
    route: "/promoter/dashboard",
    status: "live",
  },
  {
    id: "learning-cross-domain",
    module: "learning",
    name: "Cross-domain flashcards & courses",
    pitch: "Automotive, motorcycle, marine, small engine, agricultural, industrial, EV.",
    howItWorks:
      "Categorized flashcards with images, taxonomy per system (engine, brakes, electrical), and progress tracking across devices.",
    whyUseful: [
      "Great for training new hires",
      "Free for shop owners to use with staff",
      "Grows as we add cards",
    ],
    vsCompetition: [
      "Motor Age courses cost hundreds; ours is free to start",
    ],
    route: "/flashcards",
    status: "live",
  },
  {
    id: "learning-certifications",
    module: "learning",
    name: "Certifications & badges on profile",
    pitch: "Earn badges by completing courses — displayed on your public profile.",
    howItWorks:
      "Completion issues a verifiable badge stored on the user's profile and shown on their microsite.",
    whyUseful: [
      "Distinguishes serious techs",
      "Marketing signal for shops",
      "Skills portfolio that follows the tech",
    ],
    vsCompetition: [
      "LinkedIn learning isn't automotive-focused",
    ],
    route: "/flashcards",
    status: "roadmap",
  },
  {
    id: "dispatch-network",
    module: "dispatch",
    name: "Tow & delivery provider network",
    pitch: "Local providers accept tow/delivery jobs in real time.",
    howItWorks:
      "Broadcast a job to nearby providers; first accept wins; live ETA and status back to the customer.",
    whyUseful: [
      "No calling five tow yards",
      "Transparent pricing",
      "Ratings pick the best",
    ],
    vsCompetition: [
      "Grab doesn't do tows; local yards don't do apps",
    ],
    route: "/dispatch",
    status: "beta",
  },
  {
    id: "keyboard-shortcuts",
    module: "buyer-tools",
    name: "Keyboard shortcuts for power users",
    pitch: "Navigate listings, inbox, and dashboards without touching the mouse.",
    howItWorks:
      "Common shortcuts (/ to search, j/k to move, e to edit) throughout Shop Manager and the marketplace inbox.",
    whyUseful: [
      "Faster ops for service writers",
      "Power-user friendly",
      "No learning curve — shows a cheat sheet",
    ],
    vsCompetition: [
      "Almost no PH SaaS ships shortcuts",
    ],
    route: "/",
    status: "beta",
  },
  {
    id: "dark-mode",
    module: "buyer-tools",
    name: "Dark mode across the whole app",
    pitch: "Consistent dark theme — including the Shop Manager screens.",
    howItWorks:
      "Semantic design tokens applied globally; images and badges tuned for both themes.",
    whyUseful: [
      "Easier on the eyes in the shop office",
      "Battery-friendly on OLED phones",
      "Consistent — no half-dark pages",
    ],
    vsCompetition: [
      "Many shop tools have no dark mode at all",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "mobile-first",
    module: "buyer-tools",
    name: "True mobile-first UX",
    pitch: "Sticky action bars, tap-friendly targets, and mobile-optimized layouts everywhere.",
    howItWorks:
      "Every high-friction flow (sell, complete profile, checkout, inquiry) is tested at mobile viewports first; sticky save bars replace hidden buttons.",
    whyUseful: [
      "Most PH users are on mobile",
      "No pinch-and-zoom to hit a button",
      "Higher completion rates",
    ],
    vsCompetition: [
      "Shopmonkey/Tekmetric are desktop-first",
    ],
    route: "/",
    status: "live",
  },
  {
    id: "developer-mcp",
    module: "shop-manager",
    name: "MCP endpoint for developer integrations",
    pitch: "Machine-readable tool interface at /.mcp for integrations and agents.",
    howItWorks:
      "OAuth-protected MCP server exposes a curated tool surface for AI agents and third-party integrations, with per-tool auth.",
    whyUseful: [
      "Future-proof integrations",
      "Agent-ready data access",
      "Curated, safe surface",
    ],
    vsCompetition: [
      "Cutting-edge — few competitors ship MCP",
    ],
    route: "/",
    status: "new",
  },

  // ─────────────── Roadmap additions ───────────────
  {
    id: "rm-obd-integration",
    module: "shop-manager",
    name: "OBD-II scanner integration",
    pitch: "Coming soon: attach diagnostic codes and freeze frames to work orders.",
    howItWorks:
      "Pair a supported OBD dongle; codes and PID snapshots attach automatically to the WO.",
    whyUseful: [
      "Skip retyping DTCs",
      "Evidence for warranty claims",
      "Faster diagnosis",
    ],
    vsCompetition: [
      "Enterprise-only today",
    ],
    status: "roadmap",
  },
  {
    id: "rm-service-history-api",
    module: "shop-manager",
    name: "Portable customer service history",
    pitch: "Coming soon: customers carry their service history across 365 shops.",
    howItWorks:
      "With customer consent, service history from one 365 shop is visible to the next — no duplicated diagnostic work.",
    whyUseful: [
      "Better care for the vehicle",
      "Faster next-shop visits",
      "Customer owns the data",
    ],
    vsCompetition: [
      "Doesn't exist in PH today",
    ],
    status: "roadmap",
  },
  {
    id: "rm-live-auctions",
    module: "marketplace",
    name: "Live auctions for vehicles & parts",
    pitch: "Coming soon: timed and live-room bidding on select inventory.",
    howItWorks:
      "Auction rooms with anti-snipe extensions, deposit holds, and post-auction contract flows.",
    whyUseful: [
      "Discovers real market price",
      "Great for dealers moving trade-ins",
      "Excitement drives engagement",
    ],
    vsCompetition: [
      "Copart is US-first and heavy; ours is PH-first",
    ],
    status: "roadmap",
  },
  {
    id: "rm-vehicle-history",
    module: "trust-safety",
    name: "Vehicle history badges",
    pitch: "Coming soon: accident, flood, and service history badges on listings.",
    howItWorks:
      "Aggregates 365 service history plus optional third-party feeds into public badges (green/yellow/red).",
    whyUseful: [
      "Buyer trust before the test drive",
      "Sellers with clean history stand out",
      "Cuts scammer supply",
    ],
    vsCompetition: [
      "Carfax equivalent doesn't exist yet in PH",
    ],
    status: "roadmap",
  },
  {
    id: "rm-loans",
    module: "buyer-tools",
    name: "Pre-qualify for car loans in-app",
    pitch: "Coming soon: know your budget before you shop.",
    howItWorks:
      "Soft pre-qualification with partner banks; monthly payment calculators; connect to dealer inventory.",
    whyUseful: [
      "Realistic budgets",
      "Faster deal closings",
      "Less time wasted on unaffordable units",
    ],
    vsCompetition: [
      "Bank websites make you leave the marketplace",
    ],
    status: "roadmap",
  },
];

