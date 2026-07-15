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
];
