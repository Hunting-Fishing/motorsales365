/* =====================================================================
 * 365 Flash Cards Training — TAXONOMY  (v2: industry + fuel + era split)
 * ---------------------------------------------------------------------
 * Six dimensions every card can be classified on. The game reads this to
 * build filters and level progressions.
 *
 *   1. industries  WHAT machine/industry (automotive, marine, ag, ...)
 *   2. fuels       HOW it's powered    (gas, diesel, electric, hybrid...)
 *   3. systems     WHICH system        (cooling, electrical, drivetrain...)
 *   4. eras        WHEN in history     (pioneer → modern → emerging + obsolete)
 *   5. regions     WHERE / standard    (NA, Europe, ...)
 *   6. levels      learner skill level (pre-apprentice → master)
 *
 * Loaded as a plain script (no build step). Defines window.TAXONOMY.
 * ===================================================================== */
window.TAXONOMY = {
  // 1) INDUSTRY / APPLICATION — what kind of machine / which industry.
  industries: [
    { id: "small-engine",    name: "Small Engines",            desc: "Lawn, garden, generators, OPE, single/twin cylinder." },
    { id: "automotive",      name: "Automotive",               desc: "Cars & light trucks (any fuel, incl. EV/hybrid)." },
    { id: "motorcycle",      name: "Motorcycle & Powersports", desc: "Bikes, ATVs, UTVs, snowmobiles." },
    { id: "heavy-duty",      name: "Heavy Duty / Commercial",  desc: "Class 7-8 trucks, buses, construction." },
    { id: "marine-inboard",  name: "Marine — Inboard",         desc: "Sterndrive & inboard marine." },
    { id: "marine-outboard", name: "Marine — Outboard",        desc: "Outboard marine engines." },
    { id: "agricultural",    name: "Agricultural",             desc: "Tractors, harvesters, implements." },
    { id: "industrial",      name: "Industrial / Stationary",  desc: "Gensets, pumps, compressors, plant equipment." }
  ],

  // 2) FUEL / POWER TYPE — how the machine is powered. "any" = applies to all.
  fuels: [
    { id: "any",       name: "Any / Universal", desc: "Applies regardless of fuel (shows under every fuel filter)." },
    { id: "gasoline",  name: "Gasoline / Petrol", desc: "Spark-ignition gasoline engines." },
    { id: "diesel",    name: "Diesel",          desc: "Compression-ignition diesel engines." },
    { id: "electric",  name: "Electric (BEV)",  desc: "Battery-electric drive, no engine." },
    { id: "hybrid",    name: "Hybrid",          desc: "Combined engine + electric (HEV/PHEV)." },
    { id: "hydrogen",  name: "Hydrogen / Fuel Cell", desc: "H2 combustion or fuel-cell electric." },
    { id: "alt-gas",   name: "LPG / CNG / Propane", desc: "Gaseous alternative fuels." },
    { id: "steam",     name: "Steam / External", desc: "Steam & other historical external-combustion." }
  ],

  // 3) SYSTEM — the functional system on the machine.
  systems: [
    { id: "engine-mechanical",   name: "Engine Mechanical",   desc: "Block, pistons, valvetrain, timing." },
    { id: "cooling",             name: "Cooling System",      desc: "Radiators, pumps, thermostats, raw/closed loop." },
    { id: "lubrication",         name: "Lubrication",         desc: "Oil pumps, filters, galleries, viscosity." },
    { id: "fuel",                name: "Fuel System",         desc: "Tanks, pumps, injectors, carburetors, rails." },
    { id: "ignition",            name: "Ignition",            desc: "Spark, coils, magnetos, glow plugs, timing." },
    { id: "air-intake",          name: "Air & Intake",        desc: "Filters, throttle, turbo/supercharging, boost." },
    { id: "exhaust-emissions",   name: "Exhaust & Emissions", desc: "Manifolds, catalysts, DPF, EGR, SCR/DEF." },
    { id: "electrical",          name: "Electrical",          desc: "Batteries, charging, starting, wiring." },
    { id: "drivetrain",          name: "Drivetrain",          desc: "Clutch, transmission, drive, final drive." },
    { id: "steering-suspension", name: "Steering & Suspension", desc: "Steering gear, suspension, alignment." },
    { id: "brakes",              name: "Brakes",              desc: "Hydraulic, air, ABS, regenerative." },
    { id: "hvac",                name: "HVAC",                desc: "Heating, A/C, refrigerant handling." },
    { id: "diagnostics",         name: "Diagnostics & Tools", desc: "OBD, scan tools, measurement, procedures." },
    { id: "safety",              name: "Safety & Shop",       desc: "PPE, hazmat, lifting, lockout/tagout." }
  ],

  // 4) ERA — where in history the technology / engine sits.
  eras: [
    { id: "pioneer",  name: "Pioneer (First Engines)", desc: "Birth of the engine through ~1919: first cars, steam, early gas/diesel." },
    { id: "vintage",  name: "Vintage",                 desc: "~1920–1948: flatheads, mechanical everything." },
    { id: "classic",  name: "Classic",                 desc: "~1949–1979: carburetors, points, muscle era." },
    { id: "modern",   name: "Modern",                  desc: "~1980–present: EFI, computerized, sensors." },
    { id: "emerging", name: "Emerging / Future",       desc: "EV, hydrogen, autonomy, future drivetrains." },
    { id: "obsolete", name: "Obsolete (No Longer Used)", desc: "Tech retired on modern vehicles, kept for reference & restoration: carburetors, breaker points, etc." }
  ],

  // 5) REGION / STANDARD — markets differ on parts, units, regulation.
  regions: [
    { id: "global",        name: "Global / Universal", desc: "Applies everywhere." },
    { id: "north-america", name: "North America",      desc: "US/Canada/Mexico standards, SAE, imperial." },
    { id: "europe",        name: "Europe",             desc: "EU/UN-ECE, Euro emissions, metric." },
    { id: "asia-pacific",  name: "Asia-Pacific",       desc: "JIS and regional standards, metric." },
    { id: "uk",            name: "United Kingdom",     desc: "UK-specific terminology & MOT." }
  ],

  // 6) SKILL LEVEL — the learner progression (gates content difficulty).
  levels: [
    { id: "pre-apprentice", order: 1, name: "Pre-Apprentice", desc: "Names of parts, basic safety, what things do." },
    { id: "apprentice",     order: 2, name: "Apprentice",     desc: "How systems work, basic service & measurement." },
    { id: "technician",     order: 3, name: "Technician",     desc: "Diagnosis, specs, multi-system interaction." },
    { id: "journeyman",     order: 4, name: "Journeyman",     desc: "Independent troubleshooting, root cause, standards." },
    { id: "master",         order: 5, name: "Master (Dealer-Trained)", desc: "Advanced/OEM-specific, edge cases, mentoring." }
  ],

  unitSystems: [
    { id: "imperial", name: "Imperial (SAE)" },
    { id: "metric",   name: "Metric (SI)" }
  ]
};

/* Convenience lookup maps so the game can resolve an id -> display entry. */
window.TAXONOMY._index = (function (t) {
  var idx = {};
  ["industries", "fuels", "systems", "eras", "regions", "levels", "unitSystems"].forEach(function (dim) {
    idx[dim] = {};
    (t[dim] || []).forEach(function (entry) { idx[dim][entry.id] = entry; });
  });
  return idx;
})(window.TAXONOMY);
