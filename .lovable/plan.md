## Problem

The "Continue → attach proof" button is disabled because the reason field requires **20 characters minimum**. The user typed "I own this business" (19 chars) — one character short — and the form silently refuses to advance. The hint text ("19/2000 — minimum 20 characters") is easy to miss and the button gives no feedback on click.

Same gate exists on the server (`submitOwnershipTransferRequest` in `src/lib/business-claims.functions.ts` validates `reason.min(20)`).

## Fix

1. **Lower the minimum to 10 characters** in both places (client dialog + server validator). Short reasons like "I own this business" or "Previous owner left" are legitimate — admins will judge the evidence documents, not prose length.
   - `src/components/business-page/transfer-request-dialog.tsx`: change `reason.trim().length < 20` → `< 10`, update hint to "minimum 10 characters".
   - `src/lib/business-claims.functions.ts`: change Zod `reason: z.string().min(20)` → `min(10)` for the transfer schema.

2. **Show why the button is disabled.** When the button is disabled, render a small inline message under the textarea: "Please add at least 10 characters explaining the request." Color it `text-destructive` once the user has typed at least 1 character but is still under the threshold.

3. **Apply the same relaxation to the regular claim flow** (`submitBusinessClaim`) if it has the same 20-char gate, for consistency. (Will verify in build mode and only change if it matches.)

No DB/schema changes. No changes to admin approval logic, evidence upload, or RLS.

## Files

- `src/components/business-page/transfer-request-dialog.tsx` — lower threshold, add inline validation message.
- `src/lib/business-claims.functions.ts` — relax `reason.min()` on transfer (and claim if symmetrical).
