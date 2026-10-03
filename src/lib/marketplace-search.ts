// Search-shelf planner for Part Picks.
// Builds marketplace search URLs (not scraped SKUs) and splits them into
// Budget / Everyday / Professional lanes.

export const GRADE_IDS = ["budget", "everyday", "professional"] as const;
export type GradeId = (typeof GRADE_IDS)[number];

export const GRADE_META: Record<GradeId, { label: string; blurb: string }> = {
  budget: {
    label: "Budget",
    blurb: "Opens the cheaper end of that marketplace's results.",
  },
  everyday: {
    label: "Everyday",
    blurb: "A normal match for daily use. Sorted by relevance.",
  },
  professional: {
    label: "Professional",
    blurb: "Biased toward shop-grade and OEM-style listings.",
  },
};

export const KNOWN_MARKETPLACES = [
  { slug: "shopee", label: "Shopee" },
  { slug: "lazada", label: "Lazada" },
  { slug: "aliexpress", label: "AliExpress" },
  { slug: "alibaba", label: "Alibaba" },
  { slug: "amazon", label: "Amazon" },
] as const;

export type SortMode = "price_asc" | "relevance";

export type NetworkForSearch = {
  id: string;
  slug: string;
  name: string;
  tag_param?: string | null;
  tag_value?: string | null;
  deeplink_template?: string | null;
  active?: boolean;
};

export type PlannedLink = {
  networkId: string;
  networkSlug: string;
  networkName: string;
  grade: GradeId;
  gradeLabel: string;
  title: string;
  query: string;
  url: string;
  tagged: boolean;
  note: string | null;
};

function enc(q: string) {
  return encodeURIComponent(q);
}

function builtinUrl(slug: string, query: string, sort: SortMode): string | null {
  switch (slug) {
    case "shopee": {
      const u = new URL("https://shopee.ph/search");
      u.searchParams.set("keyword", query);
      if (sort === "price_asc") u.searchParams.set("sortBy", "price");
      return u.toString();
    }
    case "lazada": {
      const u = new URL("https://www.lazada.com.ph/catalog/");
      u.searchParams.set("q", query);
      if (sort === "price_asc") u.searchParams.set("sort", "priceasc");
      return u.toString();
    }
    case "aliexpress": {
      const u = new URL("https://www.aliexpress.com/wholesale");
      u.searchParams.set("SearchText", query);
      if (sort === "price_asc") u.searchParams.set("SortType", "price_asc");
      return u.toString();
    }
    case "alibaba": {
      const u = new URL("https://www.alibaba.com/trade/search");
      u.searchParams.set("SearchText", query);
      if (sort === "price_asc") u.searchParams.set("sortType", "price_asc");
      return u.toString();
    }
    case "amazon": {
      const u = new URL("https://www.amazon.com/s");
      u.searchParams.set("k", query);
      if (sort === "price_asc") u.searchParams.set("s", "price-asc-rank");
      return u.toString();
    }
    default:
      return null;
  }
}

export function queryForGrade(term: string, grade: GradeId): { query: string; sort: SortMode } {
  const base = term.trim().replace(/\s+/g, " ");
  if (grade === "budget") return { query: base, sort: "price_asc" };
  if (grade === "professional") {
    const hasPro = /\b(professional|oem|shop grade|diagnostic)\b/i.test(base);
    return { query: hasPro ? base : `${base} professional`, sort: "relevance" };
  }
  return { query: base, sort: "relevance" };
}

export function applyAffiliateTag(url: string, network: NetworkForSearch): { url: string; tagged: boolean } {
  const template = (network.deeplink_template ?? "").trim();
  // A {QUERY} template is a search template, handled before this. A {URL} template wraps the destination.
  if (template.includes("{URL}") && !template.includes("{QUERY}")) {
    return {
      url: template.replaceAll("{URL}", encodeURIComponent(url)),
      tagged: true,
    };
  }
  const param = (network.tag_param ?? "").trim();
  const value = (network.tag_value ?? "").trim();
  if (!param || !value) return { url, tagged: false };
  try {
    const u = new URL(url);
    if (!u.searchParams.get(param)) u.searchParams.set(param, value);
    return { url: u.toString(), tagged: true };
  } catch {
    return { url, tagged: false };
  }
}

export function searchUrlForNetwork(
  network: NetworkForSearch,
  query: string,
  sort: SortMode,
): string | null {
  const template = (network.deeplink_template ?? "").trim();
  if (template.includes("{QUERY}")) {
    return template
      .replaceAll("{QUERY}", enc(query))
      .replaceAll("{SORT}", sort)
      .replaceAll("{RAW_QUERY}", query);
  }
  return builtinUrl(network.slug, query, sort);
}

export function planSearchShelf(input: {
  term: string;
  count: number;
  networks: NetworkForSearch[];
}): { links: PlannedLink[]; skipped: string[] } {
  const term = input.term.trim().replace(/\s+/g, " ");
  const count = Math.min(10, Math.max(3, Math.floor(input.count)));
  const skipped: string[] = [];
  const usable: NetworkForSearch[] = [];
  for (const n of input.networks) {
    if (n.active === false) {
      skipped.push(`${n.name}: this store is turned off under Networks.`);
      continue;
    }
    const probe = searchUrlForNetwork(n, "test", "relevance");
    if (!probe) {
      skipped.push(
        `${n.name}: no search template. Add a deeplink template containing {QUERY}, or use Shopee, Lazada, AliExpress, Alibaba, or Amazon.`,
      );
      continue;
    }
    usable.push(n);
  }
  if (usable.length === 0) {
    return { links: [], skipped };
  }

  const pairs: Array<{ network: NetworkForSearch; grade: GradeId }> = [];
  for (const network of usable) {
    for (const grade of GRADE_IDS) pairs.push({ network, grade });
  }
  const chosen = pairs.slice(0, count);
  if (pairs.length < count) {
    skipped.push(
      `Asked for ${count} links, but ${usable.length} store${usable.length === 1 ? "" : "s"} × 3 grades only makes ${pairs.length} unique links.`,
    );
  }

  const links: PlannedLink[] = chosen.map(({ network, grade }) => {
    const meta = GRADE_META[grade];
    const { query, sort } = queryForGrade(term, grade);
    const raw = searchUrlForNetwork(network, query, sort)!;
    const tagged = applyAffiliateTag(raw, network);
    let note: string | null = null;
    if (!tagged.tagged && network.slug === "amazon") {
      note = "Amazon link has no tracking tag yet. Set tag_param to tag and tag_value to your Store ID on the Amazon network.";
    } else if (!tagged.tagged && !(network.deeplink_template ?? "").includes("{QUERY}")) {
      note = "No affiliate tag on this network yet. The link still opens the search.";
    }
    if (network.slug === "alibaba") {
      note = note
        ? `${note} Alibaba is wholesale.`
        : "Alibaba is a wholesale search, not a retail checkout.";
    }
    return {
      networkId: network.id,
      networkSlug: network.slug,
      networkName: network.name,
      grade,
      gradeLabel: meta.label,
      title: `${term} · ${meta.label}`,
      query,
      url: tagged.url,
      tagged: tagged.tagged,
      note,
    };
  });

  return { links, skipped };
}

export function shelfSlug(term: string) {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function gradeFromTags(tags: string[] | null | undefined): GradeId | null {
  const hit = (tags ?? []).find((t) => t.startsWith("grade:"));
  const id = hit?.slice("grade:".length) as GradeId | undefined;
  return id && (GRADE_IDS as readonly string[]).includes(id) ? id : null;
}

export function marketFromTags(tags: string[] | null | undefined): string | null {
  const hit = (tags ?? []).find((t) => t.startsWith("market:"));
  return hit ? hit.slice("market:".length) : null;
}
