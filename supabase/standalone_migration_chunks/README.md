# Standalone Migration Package

Auditable packaging of this repository's existing migration history, prepared for
replay against a user-owned Supabase project.

## Summary

- Source directory: `supabase/migrations`
- Source migration files: **388**
- First migration: `20260501224406_1fde4d15-467c-4a50-a39e-089c25417e52.sql`
- Last migration: `20260805085754_f4e0fcae-45f3-42a2-b801-44216b32a6bc.sql`
- Chunks produced: **7** (`chunk_001.sql` … `chunk_007.sql`)
- Chunk size target: ~150–220 KB; no individual source migration is ever split
- Audit hits: **779**

## Chunks

| Chunk | Source migrations | Size (KB) |
| --- | --- | --- |
| chunk_001.sql | 63 | 197.4 |
| chunk_002.sql | 68 | 197.5 |
| chunk_003.sql | 67 | 195.9 |
| chunk_004.sql | 61 | 199.4 |
| chunk_005.sql | 69 | 196.0 |
| chunk_006.sql | 27 | 199.3 |
| chunk_007.sql | 33 | 132.7 |

Each chunk is a lexicographic/chronological concatenation of whole migration files.
File boundaries are marked with `-- ===== BEGIN/END SOURCE MIGRATION: <filename> =====`
comments; these comments are the **only** added bytes.

## Audit hits by pattern

- `drop_table`: 2
- `drop_schema`: 0
- `drop_database`: 0
- `truncate`: 0
- `delete_from`: 10
- `alter_database`: 0
- `source_project_ref`: 0
- `supabase_co_url`: 0
- `auth_users`: 196
- `storage_objects`: 226
- `create_extension`: 7
- `security_definer`: 287
- `pg_net`: 2
- `cron`: 44
- `vault`: 5

Full match details (source filename, line number, matching line) are in `audit.json`.
These are flags for human review during migration, not defects.

## Guarantees

- **No database connection was made** while producing this package. No SQL was executed.
- **No source SQL was modified**, cleaned, reordered within files, deduplicated, or rewritten.
- Nothing outside `supabase/standalone_migration_chunks/` was created or changed.
- Replay order is `chunk_001.sql` → `chunk_007.sql`, in that order.
