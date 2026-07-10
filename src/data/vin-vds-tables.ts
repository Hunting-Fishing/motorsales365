// Structural VIN Vehicle-Descriptor-Section (VDS) tables for Asia + Europe
// market vehicles that NHTSA doesn't index. Keyed by WMI (first 3 chars),
// then a per-make VDS regex against vin[3..8] (positions 4–9).
//
// Adding a row here is the cheapest way to teach the decoder a new nameplate:
// no external API call, no AI spend, immediate hit for every seller with that
// VIN. Keep matches specific — a too-broad regex will misidentify a car.

export type Region = "NA" | "Asia" | "Europe" | "Other";

export type VdsRow = {
  /** Regex applied to vin[3..8] (VDS). Anchor with ^ / $. */
  vds: RegExp;
  model: string;
  bodyType?: string;      // canonical BODY_TYPES value
  drivetrain?: string;    // canonical DRIVETRAINS value
  fuel?: string;          // "Gasoline" | "Diesel" | "Hybrid" | "Electric"
  transmission?: string;  // "Automatic" | "Manual" | "CVT"
  engine?: string;        // "1.5L 4-cyl L15A"
  category?: "car" | "motorcycle";
  trim?: string;
  yearMin?: number;
  yearMax?: number;
  notes?: string;
};

export type WmiRow = {
  wmi: RegExp;       // matches vin[0..2]
  make: string;
  region: Region;
  country?: string;  // e.g. "PH", "TH", "JP"
  vds?: VdsRow[];    // ordered — first match wins
};

// Compact engine/body/trans shorthands — one place to tweak.
const HONDA: WmiRow[] = [
  {
    // Honda Cars Philippines (Sta. Rosa, Laguna). Test VIN PADFD15107V101467.
    wmi: /^PAD$/,
    make: "Honda",
    region: "Asia",
    country: "PH",
    vds: [
      // City GD/FD (2003–2008): "FD1..", "FD2.."; 1.3L (L13A) or 1.5L (L15A)
      { vds: /^FD1/, model: "City", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline", engine: "1.5L 4-cyl L15A", yearMin: 2003, yearMax: 2008 },
      { vds: /^FD2/, model: "City", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline", engine: "1.3L 4-cyl L13A", yearMin: 2003, yearMax: 2008 },
      // Civic FD (2006–2011)
      { vds: /^FD/, model: "Civic", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline", yearMin: 2006, yearMax: 2011 },
      // Jazz/Fit GE (2008–2013): "GE8.."
      { vds: /^GE/, model: "Jazz", bodyType: "hatchback", drivetrain: "fwd", fuel: "Gasoline" },
      // CR-V RE (2007–2011): "RE3", "RE4"
      { vds: /^RE/, model: "CR-V", bodyType: "suv", drivetrain: "awd", fuel: "Gasoline" },
      // BR-V DG: "DG1.."
      { vds: /^DG/, model: "BR-V", bodyType: "mpv", drivetrain: "fwd", fuel: "Gasoline" },
      // Mobilio DD: "DD1.."
      { vds: /^DD/, model: "Mobilio", bodyType: "mpv", drivetrain: "fwd", fuel: "Gasoline" },
      // HR-V RU (2015–2021): "RU"
      { vds: /^RU/, model: "HR-V", bodyType: "suv", drivetrain: "fwd", fuel: "Gasoline" },
    ],
  },
  {
    // Honda Motorcycles Philippines
    wmi: /^ME4$/,
    make: "Honda",
    region: "Asia",
    country: "PH",
    vds: [{ vds: /./, model: "Motorcycle", category: "motorcycle", drivetrain: "rwd", fuel: "Gasoline" }],
  },
  {
    // Honda Thailand cars — e.g. Brio, City (GM6), Civic
    wmi: /^MRH$/,
    make: "Honda",
    region: "Asia",
    country: "TH",
    vds: [
      { vds: /^GM6/, model: "City", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline", engine: "1.5L 4-cyl L15Z", yearMin: 2014, yearMax: 2019 },
      { vds: /^GN[12]/, model: "City", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline", engine: "1.5L 4-cyl", yearMin: 2020 },
      { vds: /^DB/, model: "Brio", bodyType: "hatchback", drivetrain: "fwd", fuel: "Gasoline" },
      { vds: /^FC/, model: "Civic", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline", yearMin: 2016, yearMax: 2021 },
    ],
  },
];

const TOYOTA: WmiRow[] = [
  {
    // Toyota Motor Philippines (Sta. Rosa) — Vios, Innova
    wmi: /^MR0$/,
    make: "Toyota",
    region: "Asia",
    country: "PH",
    vds: [
      // Vios NCP93/150/151/170 — "FB..", "FS..", "BT..", NSP150 etc.
      { vds: /^FB/, model: "Vios", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline", engine: "1.5L 4-cyl 1NZ-FE" },
      { vds: /^BT/, model: "Vios", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline" },
      // Innova TGN140 / GUN140 (2016+)
      { vds: /^GB/, model: "Innova", bodyType: "mpv", drivetrain: "rwd", fuel: "Diesel", engine: "2.8L 4-cyl 1GD-FTV" },
      { vds: /^ZS/, model: "Fortuner", bodyType: "suv", drivetrain: "4x4", fuel: "Diesel" },
      // Hilux GUN125/135
      { vds: /^HA/, model: "Hilux", bodyType: "pickup", drivetrain: "4x4", fuel: "Diesel" },
      // Wigo B10
      { vds: /^B1/, model: "Wigo", bodyType: "hatchback", drivetrain: "fwd", fuel: "Gasoline" },
    ],
  },
  {
    // Toyota Motor Thailand — Hilux, Fortuner, Vios exports
    wmi: /^MR[12]$/,
    make: "Toyota",
    region: "Asia",
    country: "TH",
    vds: [
      { vds: /^HA/, model: "Hilux", bodyType: "pickup", drivetrain: "4x4", fuel: "Diesel" },
      { vds: /^GB/, model: "Innova", bodyType: "mpv", drivetrain: "rwd", fuel: "Diesel" },
      { vds: /^ZS/, model: "Fortuner", bodyType: "suv", drivetrain: "4x4", fuel: "Diesel" },
    ],
  },
];

const NISSAN: WmiRow[] = [
  {
    // Nissan Philippines / Thailand
    wmi: /^MNT$/,
    make: "Nissan",
    region: "Asia",
    country: "TH",
    vds: [
      { vds: /^AT/, model: "Almera", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline" },
      { vds: /^BT/, model: "Navara", bodyType: "pickup", drivetrain: "4x4", fuel: "Diesel" },
      { vds: /^CA/, model: "Terra", bodyType: "suv", drivetrain: "4x4", fuel: "Diesel" },
    ],
  },
];

const MITSUBISHI: WmiRow[] = [
  {
    wmi: /^MMB$/,
    make: "Mitsubishi",
    region: "Asia",
    country: "TH",
    vds: [
      { vds: /^KS/, model: "Montero Sport", bodyType: "suv", drivetrain: "4x4", fuel: "Diesel" },
      { vds: /^KR/, model: "Strada", bodyType: "pickup", drivetrain: "4x4", fuel: "Diesel" },
      { vds: /^GS/, model: "Mirage G4", bodyType: "sedan", drivetrain: "fwd", fuel: "Gasoline" },
      { vds: /^BT/, model: "Xpander", bodyType: "mpv", drivetrain: "fwd", fuel: "Gasoline" },
    ],
  },
];

const SUZUKI: WmiRow[] = [
  {
    wmi: /^MA3$/,
    make: "Suzuki",
    region: "Asia",
    country: "IN",
    vds: [
      { vds: /^E/, model: "Ertiga", bodyType: "mpv", drivetrain: "fwd", fuel: "Gasoline" },
      { vds: /^S/, model: "Swift", bodyType: "hatchback", drivetrain: "fwd", fuel: "Gasoline" },
    ],
  },
];

const HYUNDAI_KIA: WmiRow[] = [
  { wmi: /^KMH$/, make: "Hyundai", region: "Asia", country: "KR" },
  { wmi: /^KNA$/, make: "Kia",     region: "Asia", country: "KR" },
  { wmi: /^KND$/, make: "Kia",     region: "Asia", country: "KR" },
  { wmi: /^MAL$/, make: "Hyundai", region: "Asia", country: "IN" },
];

const EUROPE: WmiRow[] = [
  { wmi: /^WBA$/, make: "BMW",          region: "Europe", country: "DE" },
  { wmi: /^WBS$/, make: "BMW M",        region: "Europe", country: "DE" },
  { wmi: /^WBY$/, make: "BMW i",        region: "Europe", country: "DE" },
  { wmi: /^WDD$/, make: "Mercedes-Benz",region: "Europe", country: "DE" },
  { wmi: /^WDB$/, make: "Mercedes-Benz",region: "Europe", country: "DE" },
  { wmi: /^W1K$/, make: "Mercedes-Benz",region: "Europe", country: "DE" },
  { wmi: /^WAU$/, make: "Audi",         region: "Europe", country: "DE" },
  { wmi: /^WA1$/, make: "Audi",         region: "Europe", country: "DE" },
  { wmi: /^WVW$/, make: "Volkswagen",   region: "Europe", country: "DE" },
  { wmi: /^WV[12]$/, make: "Volkswagen",region: "Europe", country: "DE" },
  { wmi: /^WP[01]$/, make: "Porsche",   region: "Europe", country: "DE" },
  { wmi: /^VF[137]$/, make: "Peugeot",  region: "Europe", country: "FR" },
  { wmi: /^VF[38]$/, make: "Citroen",   region: "Europe", country: "FR" },
  { wmi: /^VF1$/, make: "Renault",      region: "Europe", country: "FR" },
  { wmi: /^ZFA$/, make: "Fiat",         region: "Europe", country: "IT" },
  { wmi: /^ZFF$/, make: "Ferrari",      region: "Europe", country: "IT" },
  { wmi: /^ZAR$/, make: "Alfa Romeo",   region: "Europe", country: "IT" },
  { wmi: /^SAL$/, make: "Land Rover",   region: "Europe", country: "GB" },
  { wmi: /^SAJ$/, make: "Jaguar",       region: "Europe", country: "GB" },
  { wmi: /^YV[14]$/, make: "Volvo",     region: "Europe", country: "SE" },
  { wmi: /^TMB$/, make: "Skoda",        region: "Europe", country: "CZ" },
];

// JDM domestic-market codes (imports to PH).
const JDM: WmiRow[] = [
  { wmi: /^JHM$/, make: "Honda",      region: "Asia", country: "JP" },
  { wmi: /^JHL$/, make: "Honda",      region: "Asia", country: "JP" },
  { wmi: /^JT[A-Z]$/, make: "Toyota", region: "Asia", country: "JP" },
  { wmi: /^JN[1568]$/, make: "Nissan",region: "Asia", country: "JP" },
  { wmi: /^JM[123]$/, make: "Mazda",  region: "Asia", country: "JP" },
  { wmi: /^JF[12]$/, make: "Subaru",  region: "Asia", country: "JP" },
  { wmi: /^JA[3467]$/, make: "Mitsubishi", region: "Asia", country: "JP" },
  { wmi: /^JS[123]$/, make: "Suzuki", region: "Asia", country: "JP" },
];

export const WMI_TABLE: WmiRow[] = [
  ...HONDA, ...TOYOTA, ...NISSAN, ...MITSUBISHI, ...SUZUKI,
  ...HYUNDAI_KIA, ...EUROPE, ...JDM,
];

/** Returns the WMI row for a VIN, if known. */
export function lookupWmi(vin: string): WmiRow | null {
  const head = vin.slice(0, 3);
  for (const row of WMI_TABLE) if (row.wmi.test(head)) return row;
  return null;
}

/** Returns the best-matching VDS row for this VIN under the given WMI. */
export function lookupVds(wmi: WmiRow, vin: string): VdsRow | null {
  if (!wmi.vds) return null;
  const vds = vin.slice(3, 9);
  for (const row of wmi.vds) if (row.vds.test(vds)) return row;
  return null;
}

/** Region hint from just the WMI, even when we can't identify the make. */
export function regionFromWmi(vin: string): Region {
  const c = vin[0];
  if ("1234 5".includes(c)) return "NA";
  if ("JKLMNPR".includes(c)) return "Asia";  // Japan/Korea/India/SE-Asia
  if ("STUVWXYZ".includes(c)) return "Europe";
  if ("6789".includes(c)) return "Other";     // Oceania/S.America/rest
  return "Other";
}
