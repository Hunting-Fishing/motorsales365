# ESLint + TypeScript cleanup pass

## What changes

### 1. Auto-format: `prettier --write .`
The ~11,600 `prettier/prettier` violations are purely formatting. Running `prettier --write` fixes them all with zero behavior risk. No file moves, no logic changes.

### 2. ESLint config tweak
- `eslint.config.js` — add `"@typescript-eslint/no-explicit-any": "warn"` to the rules block. This downgrades the 1,060+ `as any` casts from hard errors to warnings. Fixing them properly requires typing every Supabase query `.select()` shape across ~90 files — that's a separate, deliberate refactor, not a cleanup task.

### 3. ESLint auto-fix: `eslint --fix .`
After Prettier formatting, `eslint --fix` will resolve any remaining auto-fixable issues (e.g. `prefer-const` where applicable).

### 4. Manual fixes for non-auto-fixable issues (~76 total)

**react-refresh/only-export-components (42)**
- Find files that export both React components and non-component values (constants, helper functions, types) from the same module.
- Move non-component exports into a sibling `.ts` file or use `export default` for the component. Keep behavior identical.

**react-hooks/exhaustive-deps (28)**
- Review each `useEffect`/`useCallback`/`useMemo` with missing or incorrect dependency arrays.
- Add missing deps, or wrap with `useRef` if the value is intentionally stable and should not trigger re-runs. Never change behavior.

**no-empty (6)**
- Empty `catch {}` blocks. Add a comment explaining why the exception is intentionally swallowed (e.g. `// localStorage unavailable in some contexts`), or re-throw if the empty catch is hiding a real error.

**prefer-const (4)**
- Should already be caught by `eslint --fix`; if any remain, convert `let` to `const`.

## Verification

- `bunx tsc --noEmit` — must remain clean (already passes).
- `bunx eslint .` — target: 0 errors, ~1060 warnings (the `no-explicit-any` ones).

## Files touched (estimate)

- `eslint.config.js` (1 line added)
- Potentially dozens of files for Prettier formatting (whitespace only)
- ~50–70 files for the manual lint fixes
