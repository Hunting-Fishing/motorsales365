# Smarter multi-region VIN decoder

Today the decoder only calls NHTSA and falls back to a tiny WMI-make table + year-position math. For an Asia-market VIN like `PADFD15107V101467` (Honda Cars Philippines, City FD1 2007), NHTSA returns nothing, so model / trim / engine / transmission / fuel / body type / drivetrain / color all stay blank.

Fix: turn `decodeVin` into a **server-side waterfall** that tries multiple sources in order and merges what each one returns. Client keeps a single call, no UI regressions.

## Sources, in order

1. **NHTSA (North America)** — unchanged. Best for WMI starting 1/2/3/4/5.
2. **Structural WMI+VDS lookup (Asia)** — a real table keyed by manufacturer + VDS pattern. Covers Honda / Toyota / Nissan / Mazda / Mitsubishi / Suzuki / Hyundai / Kia / Isuzu built in JP/TH/PH/ID/MY/KR/IN. For `PAD FD1 5 1 07` this resolves to Honda City (GD/FD platform), 1.5L, 2007, sedan, FWD, AT.
3. **Structural WMI+VDS lookup (Europe)** — same shape for VW/Audi/BMW/Mercedes/Peugeot/Renault/Fiat/Volvo/Skoda/Opel WMIs.
4. **AI Gateway fallback (Lovable AI, `google/gemini-3-flash-preview`)** — server-only. Sends the VIN + region hint (from WMI) and asks for a strict JSON: `{make,model,year,trim,engine,transmission,fuel,body_type,drivetrain,category,color_hint,confidence,region,notes}`. Used only for fields still missing after 1–3, never overrides an earlier confident value.
5. **Existing JDM chassis table** — still used when the input isn't a 17-char VIN.

Every field on the result gets a `sources` map (`{make:"nhtsa", model:"vds", trim:"ai", …}`) so the UI can show provenance and the seller knows what's a guess.

Color is never auto-filled with confidence — VINs don't encode paint. AI may return a `color_hint` from typical trim colors but the client leaves the color field blank and just shows the hint as a suggestion chip.

## Caching

New table `vin_decode_cache(vin PK, result jsonb, source text, decoded_at timestamptz)` with proper GRANTs + RLS (service_role write, authenticated read). Server checks cache first, writes back after a successful decode. Cuts AI-gateway spend and latency to zero on repeat lookups (scans, edits, re-decodes).

## Server changes

- `src/lib/vin-decode.functions.ts` — rewrite `decodeVin` handler as the waterfall above. Return shape extended to include `bodyType`, `drivetrain`, `fuel`, `transmission`, `category`, `region`, `sources`, `missing[]`, and `partial: boolean`.
- New `src/lib/vin-decode.server.ts` — pure helpers: `nhtsaDecode`, `structuralAsiaDecode`, `structuralEuropeDecode`, `aiDecode`, `mergeDecodes`, `cacheGet/Set`.
- New `src/data/vin-vds-tables.ts` — the structural Asia/Europe tables (WMI → make/region, then per-make VDS regex → {model, platform, body, engine, drivetrain, transmission_hint}). Seeded with the top ~40 nameplates sold in PH so the common cases work offline without AI.
- Expand WMI table so `PAD`, `MRH`, `PE1`, `MHF`, `MHY`, `MLH`, `LVS`, `LGX`, `LFV`, `LSJ`, `MA1`, `MB1`, `MEE`, `MEX`, `MNT`, `MPA`, `MMB`, `MMT`, `NM0`, `SJN`, `TMB`, `VF1`, `VF3`, `VF7`, `WF0`, `ZAR` all resolve with region tags.
- New migration for `vin_decode_cache` (with `GRANT` + RLS as required by project rules).

## Client changes

- `src/components/vin-scan-dialog.tsx` — remove the client's direct `fetch` to NHTSA; call the server function via `useServerFn(decodeVin)`. Keep the WMI/year local helpers only as a last-resort UI hint if the server call itself fails (offline). Widen `VinDecodeResult` to include the new fields + `sources` + `region`.
- `src/routes/sell.tsx` `applyVinDecode` — already applies fields only when blank; extend to consume `bodyType`, `drivetrain`, `fuel`, `transmission`, `category`, `engine`, `trim`. Update the partial-decode banner to list only fields in `result.missing`, and show a small region chip (NA / Asia / Europe) + per-field source dots (N/V/A) next to auto-filled inputs.
- Conflict panel already handles "Use VIN / Keep mine / Use VIN for all" — no change.

## Test case that must pass

Input `PADFD15107V101467` (no NHTSA data) must return, from structural Honda VDS table alone (no AI needed):

```
make=Honda, model=City, year=2007, body_type=sedan,
drivetrain=fwd, fuel=Gasoline, transmission=Automatic,
engine≈"1.5L 4-cyl L15A", region=Asia, source=vds
```

AI fallback only fills `trim` (e.g. "1.5 S / VTEC") if the VDS row doesn't carry it. Color stays blank; a "Common colors for this trim" hint chip may appear.

## Out of scope

- Paid third-party VIN APIs (VinDecoder.eu, DataOne). Can be added later as an optional source behind a secret without touching the waterfall shape.
- Auto-filling color from VIN (structurally impossible for most makes).
