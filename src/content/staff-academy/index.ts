// 365 Staff Academy — internal training content.
// Content lives in-repo so it's versioned and reviewable. Add new articles by
// appending to ARTICLES below. Keep entries concise (200-400 words of body).

export type ArticleCategory =
  | "playbook"
  | "feature"
  | "coming-soon"
  | "infographic"
  | "script"
  | "compliance";

export type ArticleStatus = "active" | "coming-soon" | "draft";

export type ArticleSection = {
  heading?: string;
  body?: string;
  bullets?: string[];
  cta?: { label: string; to: string; external?: boolean };
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  category: ArticleCategory;
  tags: string[];
  updatedAt: string; // ISO date
  status: ArticleStatus;
  heroEmoji?: string; // lightweight visual until real hero art lands
  sections: ArticleSection[];
};

export const CATEGORY_META: Record<
  ArticleCategory,
  { label: string; blurb: string; emoji: string }
> = {
  playbook: {
    label: "Selling Playbook",
    blurb: "How to pitch 365 and walk sellers through their first listing.",
    emoji: "📣",
  },
  feature: {
    label: "Feature Guides",
    blurb: "One-pagers on every major app area — Listings, Boosts, Businesses, Parts, Tow, QR, Passport, Ads.",
    emoji: "🧭",
  },
  "coming-soon": {
    label: "Coming Soon",
    blurb: "Roadmap items with expected windows so you can preview what's next.",
    emoji: "🛠️",
  },
  infographic: {
    label: "Infographics & Shareables",
    blurb: "Downloadable one-pagers, QR flyers, and social cards.",
    emoji: "🖼️",
  },
  script: {
    label: "Scripts & Objections",
    blurb: "Copy-paste sales scripts and objection-handling talking points.",
    emoji: "💬",
  },
  compliance: {
    label: "Compliance & Policy",
    blurb: "Terms, Privacy, Refund, Partner Program disclosure, Clubs accreditation.",
    emoji: "📜",
  },
};

export const ARTICLES: Article[] = [
  {
    slug: "welcome-to-365",
    title: "Welcome to 365 Motor Sales",
    description: "The 60-second overview every new staff member should read first.",
    category: "playbook",
    tags: ["onboarding", "overview"],
    updatedAt: "2026-07-06",
    status: "active",
    heroEmoji: "👋",
    sections: [
      {
        body:
          "365 Motor Sales is the Philippines-first marketplace for vehicles, parts, tow help, and automotive businesses. Your job as staff is to make sellers successful — the more sellers who post, boost, and close deals here, the healthier the whole ecosystem.",
      },
      {
        heading: "The three things we sell",
        bullets: [
          "Listings — free to post, optional Boosts and Bundles for reach.",
          "Business plans — verified profiles, service catalogs, lead capture.",
          "Passport & Ads — premium visibility for shops, clubs, and partners.",
        ],
      },
      {
        heading: "Where you fit",
        body:
          "You're the human bridge between a seller and the app. Answer questions, walk them through posting, and flag anything confusing to the product team — every friction point you surface saves the next 100 sellers.",
        cta: { label: "Read the Selling Playbook next", to: "/staff/academy/first-listing-walkthrough" },
      },
    ],
  },
  {
    slug: "first-listing-walkthrough",
    title: "Walk a seller through their first listing",
    description: "Step-by-step: from account creation to a boosted, live listing in under 10 minutes.",
    category: "playbook",
    tags: ["selling", "onboarding", "listings"],
    updatedAt: "2026-07-06",
    status: "active",
    heroEmoji: "🚗",
    sections: [
      {
        heading: "Before the call",
        bullets: [
          "Have the seller's phone number ready so you can send them a magic-link if needed.",
          "Know their region — if they serve the whole country, use 'All Philippines' in the region picker.",
          "Ask what they're selling: vehicle, part, service, or business profile — the flow differs.",
        ],
      },
      {
        heading: "During the call",
        bullets: [
          "Send them to /sell and screen-share if possible.",
          "Photos first — 4 clean photos beat 20 blurry ones.",
          "Price honestly — inflated prices tank engagement.",
          "Turn on GCash/COD as available; enable Boost only after they've seen at least 24h of organic reach.",
        ],
      },
      {
        heading: "After the listing goes live",
        body:
          "Follow up within 48 hours. If they've had views but no messages, offer a Boost. If they've had messages but no offers, coach them on response time — sub-1-hour replies convert dramatically better.",
        cta: { label: "See the objection-handling scripts", to: "/staff/academy/scripts-common-objections" },
      },
    ],
  },
  {
    slug: "feature-boosts-explained",
    title: "Feature guide: Boosts, Bundles, and Passport",
    description: "What each paid feature actually does, when to recommend it, and how the pricing works.",
    category: "feature",
    tags: ["boosts", "pricing", "monetization"],
    updatedAt: "2026-07-06",
    status: "active",
    heroEmoji: "🚀",
    sections: [
      {
        heading: "Boosts",
        body:
          "A Boost promotes a single listing to the top of relevant search and category pages for a fixed window (24h, 7d, 30d). Recommend a Boost when the listing is well-photographed, priced competitively, and has been live at least 24 hours.",
      },
      {
        heading: "Bundles",
        body:
          "Bundles group multiple Boosts at a discount for dealers or shops posting 5+ items. Reach out to dealers directly — bundles rarely sell themselves.",
      },
      {
        heading: "Passport",
        body:
          "Passport is our premium tier for verified businesses: unlimited listings, priority placement in the businesses directory, and a 5% club-member discount surface. Passport buyers are usually shops, tow companies, or parts outlets.",
        cta: { label: "See current Passport pricing", to: "/pricing" },
      },
    ],
  },
  {
    slug: "feature-businesses-directory",
    title: "Feature guide: Businesses directory & claims",
    description: "How business profiles work, what verification requires, and how to help owners claim theirs.",
    category: "feature",
    tags: ["businesses", "verification", "claims"],
    updatedAt: "2026-07-06",
    status: "active",
    heroEmoji: "🏪",
    sections: [
      {
        heading: "How business profiles are created",
        bullets: [
          "Owners can submit a new business at /businesses/submit.",
          "365 staff can pre-seed businesses from public data — the owner then claims it.",
          "Every business has a region, province, and city — or 'All Philippines' if they serve nationwide.",
        ],
      },
      {
        heading: "Verification checklist",
        bullets: [
          "Government ID matching the owner name.",
          "Proof of business (DTI/SEC/Mayor's permit) OR a utility bill at the business address.",
          "For clubs specifically: LTO/SEC/DTI accreditation is REQUIRED (see Clubs policy).",
        ],
      },
      {
        heading: "Common owner questions",
        body:
          "Owners usually ask: 'Can I have multiple locations?' (yes, one profile per branch), 'Can I hide my phone?' (yes, use the in-app inbox), and 'Why isn't my business showing?' (check region — nationwide businesses must select 'All Philippines').",
      },
    ],
  },
  {
    slug: "coming-soon-roadmap",
    title: "What's coming next (roadmap for staff)",
    description: "Roadmap features to hint at with sellers — with rough windows so you don't over-promise.",
    category: "coming-soon",
    tags: ["roadmap"],
    updatedAt: "2026-07-06",
    status: "coming-soon",
    heroEmoji: "🔭",
    sections: [
      {
        body:
          "Use this as a talking-point sheet. NEVER commit to dates — always say 'we're working on it' and let product confirm timelines.",
      },
      {
        heading: "Next 90 days",
        bullets: [
          "Parts catalog by VIN — PartSouq-style OEM lookup starting with PH-market vehicles.",
          "Vehicle history badges — accident-free / single-owner surfaced on listings.",
          "Trade-in offers — sellers get instant offers from partner dealers.",
        ],
      },
      {
        heading: "Later this year",
        bullets: [
          "Insurance comparison — quotes from partner providers, no leaving the app.",
          "Loan / financing match — pre-approvals from partner banks.",
          "Live auctions — timed sales for dealers moving inventory.",
        ],
      },
      {
        heading: "Exploring",
        bullets: [
          "Driver education hub — expanding /learn beyond parts and mechanics.",
          "Regional expansion — Vietnam and Indonesia after the PH parts catalog matures.",
        ],
      },
    ],
  },
  {
    slug: "infographics-download-pack",
    title: "Infographics & shareable assets",
    description: "QR flyers, referral cards, and social one-pagers you can send to sellers.",
    category: "infographic",
    tags: ["assets", "shareable", "qr"],
    updatedAt: "2026-07-06",
    status: "active",
    heroEmoji: "🖼️",
    sections: [
      {
        body:
          "All shareable assets live under /admin/staff-365 in the QR dialog and in the referral kit. When sending to a seller, always personalize the message — never just paste a link.",
      },
      {
        heading: "What we have today",
        bullets: [
          "Personal staff QR code — links your referrals back to your account.",
          "Business claim flyer — one-page PDF explaining how to claim a listing.",
          "Boost explainer card — 3 tiers side-by-side.",
        ],
      },
      {
        heading: "Coming",
        bullets: [
          "Region-specific launch posters (Metro Manila, Cebu, Davao).",
          "Parts outlet acquisition kit — for onboarding brick-and-mortar shops.",
        ],
        cta: { label: "Open your staff QR", to: "/admin/staff-365" },
      },
    ],
  },
  {
    slug: "scripts-common-objections",
    title: "Scripts: common seller objections",
    description: "Copy-paste responses to the five objections you'll hear every week.",
    category: "script",
    tags: ["scripts", "objections", "sales"],
    updatedAt: "2026-07-06",
    status: "active",
    heroEmoji: "💬",
    sections: [
      {
        heading: "\"Is it really free?\"",
        body:
          "Yes — posting a listing is 100% free. You only pay if you choose to Boost your listing for more visibility, or if you're a business signing up for Passport. No listing fees, no commissions on sales.",
      },
      {
        heading: "\"I'm already on Facebook Marketplace.\"",
        body:
          "Marketplace is great for reach, but 365 is built specifically for vehicles — buyers here are actively car-shopping, not scrolling. Plus your listing gets a real profile, verified badge, and the app handles messaging without you giving out your personal FB.",
      },
      {
        heading: "\"How do I know the buyer is real?\"",
        body:
          "Every buyer has a verified phone number and a trust score based on their history. You control what you share — start in-app, meet in public, and use GCash or COD when the deal closes.",
      },
      {
        heading: "\"Can you post it for me?\"",
        body:
          "I can walk you through it right now — takes about 5 minutes. Once it's live it's yours, and you can edit anytime. If you'd rather I draft it and you approve, that works too.",
      },
      {
        heading: "\"What if it doesn't sell?\"",
        body:
          "Most listings that don't sell have one of three fixes: better photos, more honest pricing, or faster replies to messages. If it's been live 7 days with no traction, ping me and we'll tune it together.",
      },
    ],
  },
  {
    slug: "compliance-must-knows",
    title: "Compliance: what every staff member must know",
    description: "The Terms, Privacy, Refund, Partner Program, and Clubs rules — summarized.",
    category: "compliance",
    tags: ["compliance", "policy", "legal"],
    updatedAt: "2026-07-06",
    status: "active",
    heroEmoji: "📜",
    sections: [
      {
        heading: "Never do these",
        bullets: [
          "Never promise a refund outside the published Refund Policy.",
          "Never describe the Partner Program as 'passive income', 'downline', or a wage — it is commission-only, independent contractor.",
          "Never grant a Club verified status without accreditation docs (LTO/SEC/DTI).",
          "Never share a seller's PII (phone, address, ID photo) with another user.",
        ],
      },
      {
        heading: "Always link, don't paraphrase",
        body:
          "When a user asks about legal terms, send them the link — don't summarize from memory. Terms and pricing change; the page is always current.",
      },
      {
        heading: "Policy links",
        bullets: [
          "Terms — /terms",
          "Privacy — /privacy",
          "Refund Policy — /refund-policy",
          "Partner Program — /partner-program",
          "Clubs accreditation — /clubs",
        ],
      },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function articlesByCategory(category: ArticleCategory): Article[] {
  return ARTICLES.filter((a) => a.category === category);
}

/** Convert a DB row (shape from staff-academy-articles.functions) to an Article. */
export function dbRowToArticle(row: {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  status: string;
  hero_emoji: string | null;
  sections: unknown;
  updated_at: string;
}): Article {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category as ArticleCategory,
    tags: row.tags ?? [],
    status: (row.status as ArticleStatus) ?? "active",
    heroEmoji: row.hero_emoji ?? undefined,
    sections: Array.isArray(row.sections) ? (row.sections as ArticleSection[]) : [],
    updatedAt: (row.updated_at ?? "").slice(0, 10),
  };
}

/**
 * Merge DB-authored articles with the in-repo defaults. DB rows override
 * static articles by slug; static rows remain as fallback. Drafts are
 * excluded unless `includeDrafts` is true (admins only).
 */
export function mergeArticles(
  dbRows: Array<Parameters<typeof dbRowToArticle>[0]> | undefined | null,
  opts?: { includeDrafts?: boolean },
): Article[] {
  const includeDrafts = !!opts?.includeDrafts;
  const bySlug = new Map<string, Article>();
  for (const s of ARTICLES) bySlug.set(s.slug, s);
  for (const r of dbRows ?? []) {
    const a = dbRowToArticle(r);
    if (a.status === "draft" && !includeDrafts) {
      bySlug.delete(a.slug);
      continue;
    }
    bySlug.set(a.slug, a);
  }
  return Array.from(bySlug.values());
}
