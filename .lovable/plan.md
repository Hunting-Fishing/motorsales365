## Goal

Make the VIN / chassis field on `/sell` explain *why* auto-decode didn't populate anything, without ever wiping fields the user typed by hand. Also properly support Asian and European chassis numbers (JDM frame codes like `NCP150-1234567`, and non-US 17-digit VINs that NHTSA can't decode).

## Current behavior (problem)

`src/routes/sell.tsx` shows one generic message for two very different situations:

- Format looked fine but NHTSA returned nothing → "Couldn't decode this VIN — please fill the vehicle fields manually."
- `fetch` threw → "VIN lookup unavailable — please fill the vehicle fields manually."

`src/components/vin-scan-dialog.tsx` `vinFormatError` also fails Asian/EU VINs that don't pass the 17-digit ISO check digit (common on JDM Toyota/Honda imports), which currently blocks the field and looks like a "bad VIN" error.

Manual entries are already preserved by `applyVinDecode` (functional setters + conflict panel from the last change), so no regression risk there — the fix is purely error classification, copy, and JDM/EU acceptance.

## Failure taxonomy (what each message should say)

| Case | Detection | UX |
|---|---|---|
| Empty | no chars after normalize | no error, idle |
| Bad characters | contains `I`, `O`, `Q`, or non-alphanumerics | red inline: "Remove I, O, Q or spaces — VIN uses only letters and numbers." Keeps fields. |
| Too short / too long | length < 11 or > 17 | red inline: "VIN or chassis # must be 11–17 characters." Keeps fields. |
| Chassis # (11–16 chars) | valid chars, length 11–16 | neutral info: "Saved as chassis #. Auto-fill only works for 17-character VINs — please fill the vehicle fields below." No red. |
| 17-char, checksum fails | ISO 3779 check digit invalid | soft warning (amber, non-blocking): "Check digit didn't match — common for Asia/Europe market VINs. Saved anyway; auto-fill may not work." Still attempts decode. |
| 17-char, NHTSA empty | decode returns no year/make/model | amber: "This looks like a non-US market VIN (Asia / Europe imports often aren't in the US database). VIN saved — please fill the vehicle fields manually." |
| Network / API error | `fetch` throws or non-2xx | red: "VIN lookup service is unreachable right now — check your connection or fill the vehicle fields manually. Your VIN is saved." Offer a "Retry decode" button. |
| Success | any of year/make/model returned | existing green "VIN decoded — blank fields filled in." plus the conflict panel already added. |

In every case except empty, `vehicleQuality.vin_chassis` is saved and no manual field is touched.

## Changes

### 1. `src/components/vin-scan-dialog.tsx`

- Replace `vinFormatError` with a structured helper that returns a discriminated result:
  ```ts
  type VinFormatCheck =
    | { kind: "empty" }
    | { kind: "ok_vin" }        // 17 chars, checksum ok
    | { kind: "ok_chassis" }    // 11–16 chars, no checksum required
    | { kind: "warn_checksum" } // 17 chars but check digit fails (JDM/EU)
    | { kind: "bad_chars"; message: string }
    | { kind: "bad_length"; message: string };
  export function checkVinFormat(v: string): VinFormatCheck;
  ```
  Keep `vinFormatError` as a thin wrapper for existing callers (scan dialog) so the barcode flow keeps its current strict behavior.
- Add a `decodeVin` error signal: throw a typed `VinDecodeError` with `kind: "network" | "http"` and status, so the caller can distinguish network problems from "empty result".

### 2. `src/routes/sell.tsx`

- Widen the VIN state:
  ```ts
  type VinState =
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "ok" }
    | { kind: "chassis" }        // saved, no decode attempted
    | { kind: "warn"; message: string }   // amber, non-blocking (checksum, non-US)
    | { kind: "error"; message: string; retryable?: boolean };
  ```
  Replace the current `vinError` + `vinStatus` pair with this single state so we can't render conflicting messages.
- Rewrite the `onBlur` handler to use `checkVinFormat` and the new decode error type, mapping each branch to the copy in the taxonomy table.
- Add a "Retry decode" button next to the error message when `retryable` is true (network / HTTP failures only).
- Do NOT clear or overwrite Category / Year / Make / Model / Trim / Engine / Fuel / Transmission / Color / Mileage in any failure branch — reuse the existing `applyVinDecode` (which already only fills blanks + surfaces conflicts).
- Update the placeholder + help copy to reflect chassis # support: "17-char VIN or 11–16-char chassis # (Asia / Europe)."

### 3. Scanner dialog

- Scanner still requires a full 17-char VIN (barcodes always encode the full VIN). No copy change needed beyond passing through the new format checker.

### 4. Tests / verification

- Manual smoke-test matrix in the preview: empty, `1HGCM82633A004352` (valid US VIN), `1HGCM82633A00435I` (bad char), `NCP150-1234567` normalized (chassis), `JHMFA16506S000000` (17-char JDM likely-empty NHTSA), offline (throttle to offline in devtools → network error), then re-enable and hit Retry.
- Confirm typed values in Year/Make/Model survive every failure branch.
- `tsgo --noEmit` after edits.

## Out of scope

- Adding a second decoder for JDM/EU VINs (would need a paid API; the plan is to explain the gap, not fill it).
- Persisting the chassis # anywhere other than `vehicle_quality.vin_chassis` (already stored).
- Changes to the conflict panel added in the previous turn — it stays as-is.
