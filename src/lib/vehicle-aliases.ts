// Vehicle make + model aliases and helpers to expand a user query into search alternates.
// Stacks with fuzzy matching: aliases handle known variants ("VW" -> "Volkswagen",
// "Civic FE" -> "Civic"), fuzzy handles typos ("Toyta" -> "Toyota").

import { CAR_MAKES, MOTORCYCLE_MAKES } from "@/data/vehicles";
import { fuzzyScore, normalize } from "@/lib/fuzzy";

/**
 * Map of canonical make -> known aliases (lowercased, no punctuation needed —
 * matching is done after normalize()).
 */
export const MAKE_ALIASES: Record<string, string[]> = {
  Volkswagen: ["vw", "v dub", "vee dub"],
  "Mercedes-Benz": ["mercedes", "benz", "merc", "mercedez", "mercedes benz"],
  BMW: ["beemer", "bimmer", "bee em double you"],
  Chevrolet: ["chevy", "chev"],
  "Lynk & Co": ["lynk and co", "lynk co", "lynkco", "link and co"],
  Mitsubishi: ["mitsu"],
  Volvo: ["volvo cars"],
  Mini: ["mini cooper"],
  "Land Rover": ["landrover", "land-rover", "rover"],
  "Range Rover": ["rangerover", "range-rover"],
  Porsche: ["porche"],
  Hyundai: ["hyu", "hyndai"],
  Kawasaki: ["kawa"],
  Yamaha: ["yam"],
  Suzuki: ["suzu"],
  Kymco: ["ky mco"],
};

/**
 * Map of canonical model name -> known variant codes / chassis codes / nicknames.
 * Keys are matched case-insensitively against the dataset; an entry only takes
 * effect if the canonical model exists for the picked make.
 *
 * Examples it solves:
 *   "Civic FE"   -> Civic       (FE = 11th-gen chassis code)
 *   "Civic FD"   -> Civic       (8th-gen)
 *   "Micra K14"  -> Micra       (K14 = 5th-gen chassis code)
 *   "Vios XP150" -> Vios
 *   "GR86 ZN8"   -> GR86
 */
export const MODEL_ALIASES: Record<string, string[]> = {
  // ---------- Honda ----------
  Civic: [
    "civic fe", "civic fl", "civic fc", "civic fd", "civic fb", "civic fa",
    "civic eg", "civic ek", "civic ef", "civic es", "civic fn", "civic fk",
    "civic rs", "civic vti", "civic sir", "civic ferio",
  ],
  "Civic Type R": ["type r", "ctr", "civic ctr", "fk8", "fl5", "ep3", "fd2", "fn2"],
  City: ["city gn", "city gm", "city rs", "city aspire", "city hatch"],
  Accord: ["accord cl", "accord cm", "accord cu", "accord cr", "accord cv", "accord cp"],
  Jazz: ["jazz ge", "jazz gk", "jazz gd", "fit ge", "fit gk", "fit gd"],
  Fit: ["fit ge", "fit gk", "fit gd", "fit gp", "fit gr"],
  "CR-V": ["crv", "cr v", "rd1", "rd5", "re4", "rm4", "rw1", "rs1"],
  "HR-V": ["hrv", "hr v", "vezel", "ru1", "rv1"],
  "BR-V": ["brv", "br v"],
  Integra: ["integra dc2", "integra dc5", "dc2", "dc5"],
  S2000: ["ap1", "ap2"],
  NSX: ["na1", "na2", "nc1"],

  // ---------- Toyota ----------
  Vios: ["vios xp40", "vios xp90", "vios xp150", "vios ncp42", "vios ncp93"],
  Corolla: ["corolla ae86", "corolla ae92", "corolla ae111", "corolla e210", "corolla e170"],
  "Corolla Altis": ["altis", "altis e170", "altis e210"],
  Camry: ["camry xv70", "camry xv50", "camry xv40"],
  Hilux: ["hilux revo", "hilux vigo", "hilux ln145", "hilux kun26"],
  Fortuner: ["fortuner an50", "fortuner an60", "fortuner gun156"],
  Innova: ["innova an40", "innova an140"],
  "Land Cruiser": ["lc", "lc70", "lc80", "lc100", "lc200", "lc250", "lc300", "land cruiser j70", "land cruiser j80", "land cruiser j100", "land cruiser j200", "land cruiser j300"],
  "Land Cruiser Prado": ["prado", "prado j120", "prado j150"],
  "GR86": ["zn8", "86 zn8"],
  "86": ["zn6", "ft86", "ft 86"],
  "GR Yaris": ["yaris gr", "gxpa16"],
  "GR Supra": ["supra a90", "j29", "db"],
  Supra: ["supra a70", "supra a80", "supra a90", "ma70", "jza80", "mk4", "mk5"],
  MR2: ["mr2 aw11", "mr2 sw20", "mr2 zzw30"],
  Celica: ["celica gt4", "celica st185", "celica st205"],
  Prius: ["prius xw20", "prius xw30", "prius xw50", "prius xw60"],
  RAV4: ["rav4 xa30", "rav4 xa40", "rav4 xa50"],
  "Hiace": ["hiace h100", "hiace h200", "hiace h300", "commuter", "super grandia"],

  // ---------- Nissan ----------
  Skyline: ["r32", "r33", "r34", "r35", "v35", "v36", "skyline gt-r", "skyline gtr"],
  "GT-R": ["gtr", "r35", "godzilla", "nissan gtr"],
  "Z": ["350z", "370z", "rz34", "fairlady"],
  "350Z": ["z33"],
  "370Z": ["z34"],
  Silvia: ["s13", "s14", "s15", "180sx", "200sx", "240sx"],
  Patrol: ["patrol y61", "patrol y62", "patrol gu", "super safari"],
  Navara: ["navara np300", "navara d23", "navara d40"],
  Almera: ["almera n17", "almera n18"],
  Sentra: ["sentra b13", "sentra b14", "sentra b15", "sentra b16", "sentra b17"],
  Micra: ["micra k11", "micra k12", "micra k13", "micra k14", "march k11", "march k12", "march k13", "march k14"],
  March: ["march k11", "march k12", "march k13", "march k14", "micra k11", "micra k12", "micra k13", "micra k14"],
  "X-Trail": ["xtrail", "x trail", "t30", "t31", "t32", "t33"],
  Juke: ["juke f15", "juke f16"],

  // ---------- Mitsubishi ----------
  "Lancer Evolution": ["evo", "evo x", "evo ix", "evo viii", "evo vii", "evo vi", "evo v", "evo iv", "cz4a", "ct9a"],
  Evo: ["evo x", "lancer evo", "evolution"],
  Lancer: ["lancer ex", "lancer cedia", "lancer cs", "lancer cy"],
  Montero: ["montero sport", "pajero sport"],
  "Montero Sport": ["montero", "pajero sport"],
  Pajero: ["pajero v6", "pajero nm", "pajero v60", "pajero v80"],
  "Pajero Sport": ["montero sport"],
  Strada: ["triton", "l200"],
  Triton: ["strada", "l200"],

  // ---------- Mazda ----------
  "MX-5": ["miata", "mx5", "roadster", "na", "nb", "nc", "nd"],
  RX7: ["rx-7", "fc", "fd", "fd3s", "fc3s"],
  "RX-7": ["rx7", "fc3s", "fd3s"],
  RX8: ["rx-8", "se3p"],
  "RX-8": ["rx8", "se3p"],
  Mazda3: ["3", "axela", "bk", "bl", "bm", "bp"],
  Mazda6: ["6", "atenza", "gg", "gh", "gj", "gl"],

  // ---------- Subaru ----------
  Impreza: ["gc8", "gd", "gh", "gr", "gp", "gj", "gk", "ge"],
  "WRX": ["impreza wrx", "wrx sti", "vab", "vag", "ve", "va", "gd"],
  "WRX STI": ["sti", "wrx sti", "vab"],
  BRZ: ["zc6", "zd8"],
  Forester: ["sg", "sh", "sj", "sk", "sf"],
  Legacy: ["bp", "bl", "bm", "br", "bn", "be", "bh"],

  // ---------- Suzuki ----------
  Swift: ["swift sport", "zc31", "zc32", "zc33"],
  Jimny: ["jimny jb23", "jimny jb43", "jimny jb64", "jimny jb74"],

  // ---------- Hyundai ----------
  Accent: ["accent rb", "accent hc"],
  Elantra: ["elantra ad", "elantra cn7", "avante"],
  Tucson: ["tucson nx4", "tucson tl"],
  "Santa Fe": ["santafe", "santa fe tm", "santa fe dm"],

  // ---------- BMW ----------
  M3: ["e30 m3", "e36 m3", "e46 m3", "e90 m3", "f80 m3", "g80 m3"],
  M5: ["e28 m5", "e34 m5", "e39 m5", "e60 m5", "f10 m5", "f90 m5"],
  "3 Series": ["3-series", "3er", "e30", "e36", "e46", "e90", "f30", "g20"],
  "5 Series": ["5-series", "5er", "e34", "e39", "e60", "f10", "g30"],

  // ---------- Motorcycles ----------
  Click: ["click 125i", "click 150i", "click 160"],
  ADV: ["adv 150", "adv 160", "adv 350"],
  PCX: ["pcx 125", "pcx 150", "pcx 160"],
  NMAX: ["nmax 155", "nmax connected", "n max"],
  Aerox: ["aerox 155", "aerox 155 abs"],
  Mio: ["mio i 125", "mio sporty", "mio soul i", "mio aerox"],
  Sniper: ["sniper 150", "sniper 155", "sniper mxking"],
  Raider: ["raider 150", "raider j", "raider r150"],
  Ninja: ["ninja 250", "ninja 300", "ninja 400", "ninja zx", "zx10r", "zx6r"],
  CBR: ["cbr 150", "cbr 250", "cbr 600", "cbr 1000", "cbr150r", "cbr250rr"],
  YZF: ["yzf r1", "yzf r3", "yzf r6", "yzf r15", "r1", "r3", "r6", "r15"],
  "MT-07": ["mt07"],
  "MT-09": ["mt09"],
  "MT-15": ["mt15"],
};

const ALL_MAKES = [
  ...new Set([...CAR_MAKES.map((m) => m.make), ...MOTORCYCLE_MAKES.map((m) => m.make)]),
];

/**
 * Given a raw user query, return the canonical make names it could refer to,
 * via alias lookup. Empty array if none match.
 */
export function expandMakeQuery(q: string): string[] {
  const nq = normalize(q);
  if (!nq) return [];
  const out: string[] = [];
  for (const [canonical, aliases] of Object.entries(MAKE_ALIASES)) {
    if (normalize(canonical) === nq) {
      out.push(canonical);
      continue;
    }
    for (const a of aliases) {
      if (normalize(a) === nq) {
        out.push(canonical);
        break;
      }
    }
  }
  return out;
}

/**
 * Look up aliases for a model option, case-insensitively.
 */
export function getModelAliases(model: string): string[] {
  const nm = model.toLowerCase();
  for (const [canonical, aliases] of Object.entries(MODEL_ALIASES)) {
    if (canonical.toLowerCase() === nm) return aliases;
  }
  return [];
}

/**
 * Build a list of search alternates for a free-text vehicle query, combining:
 * - the original query
 * - alias expansions (canonical make for "vw" -> "Volkswagen")
 * - fuzzy-close make names from the dataset (typo handling)
 *
 * Capped to keep DB ilike `or()` filters reasonable.
 */
export function buildTitleSearchTerms(q: string, max = 6): string[] {
  const original = q.trim();
  if (!original) return [];
  const set = new Set<string>([original]);

  for (const c of expandMakeQuery(original)) set.add(c);

  // Fuzzy-close makes
  const scored: { name: string; score: number }[] = [];
  for (const name of ALL_MAKES) {
    const s = fuzzyScore(original, name);
    if (s !== Infinity && s > 0) scored.push({ name, score: s });
  }
  scored.sort((a, b) => a.score - b.score);
  for (const { name } of scored) {
    if (set.size >= max) break;
    set.add(name);
  }

  return Array.from(set).slice(0, max);
}
