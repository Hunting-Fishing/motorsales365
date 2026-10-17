// Isolated synthetic pg_catalog execution only. The existing fixed stock
// fixture is NOT hosted parity, original-human Auth or ordinary-role authority.
// No network, native process, project connection or migration is created here.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { buildMixedReservationOrderSource } from "../parts-stock/mixed-reservation-order-source.mjs";

const query = readFileSync(new URL("./stock-writer-catalog-review.sql", import.meta.url), "utf8");
const vectors = [
  "schemas",
  "relations",
  "columns",
  "constraints",
  "indexes",
  "policies",
  "triggers",
  "functions",
];
const acceptance = {
  sourceCorrespondence: false,
  allWriters: false,
  nativeAuthority: false,
  recovery: false,
  release: false,
};

test("selected catalog SELECT executes against the retained synthetic stock graph, not a hosted baseline", async (t) => {
  const source = buildMixedReservationOrderSource();
  const db = new PGlite();
  try {
    for (const statement of source.setupStatements) await db.exec(statement);
    await db.exec(source.candidateSQL);

    await t.test(
      "missing requested objects remain explicit while bounded selected metadata is returned",
      async () => {
        const result = await db.query(query);
        assert.equal(result.rows.length, 1);
        const value = result.rows[0].catalog;
        assert.equal(value.projectRef, "wjxaajgvddtrxxtocxen");
        assert.equal(value.mode, "read-only-selected-stock-catalog-fingerprints-v1");
        assert.equal(value.readerMetadataComplete, true);
        assert.equal(value.boundedMetadataComplete, true);
        assert.equal(value.allRequestedObjectsPresent, false);
        assert.equal(value.truncated, false);
        assert.deepEqual(value.metadataFailures, []);
        assert.ok(value.missingRelations.length > 0);
        assert.ok(value.missingFunctions.length > 0);
        assert.deepEqual(value.acceptance, acceptance);
        for (const vector of vectors) assert.ok(Array.isArray(value[vector]), vector);
        for (const vector of [
          "relations",
          "columns",
          "constraints",
          "indexes",
          "triggers",
          "functions",
        ])
          assert.ok(value[vector].length > 0, vector);
        // Every seed identity, email and business name is deliberately absent;
        // source body hashes must not become returned raw source or row data.
        const serialized = JSON.stringify(value);
        for (const id of Object.values(source.ids)) assert.ok(!serialized.includes(id));
        assert.doesNotMatch(
          serialized,
          /fixture[0-9]*@example\.invalid|Synthetic item|Other synthetic item|Fixture/,
        );
        assert.doesNotMatch(serialized, /sb_secret_|sb_publishable_|Bearer |eyJ[A-Za-z0-9_-]+\./);
      },
    );

    await t.test(
      "one exceeded column bound suppresses every metadata vector, never a partial pass",
      async () => {
        const needle = "1024 AS columns";
        assert.equal(query.split(needle).length, 2, "one reviewed fixed bound");
        const result = await db.query(query.replace(needle, "1 AS columns"));
        const value = result.rows[0].catalog;
        assert.equal(value.boundedMetadataComplete, false);
        assert.equal(value.truncated, true);
        assert.ok(value.metadataFailures.includes("column-cap-exceeded"));
        assert.ok(value.observedCatalogCounts.columns > 1);
        for (const vector of vectors) assert.deepEqual(value[vector], [], vector);
        assert.deepEqual(value.acceptance, acceptance);
      },
    );

    await t.test(
      "definition byte overflow suppresses every metadata vector without cap escalation",
      async () => {
        const needle = "131072 AS definition_bytes";
        assert.equal(query.split(needle).length, 2);
        const value = (await db.query(query.replace(needle, "1 AS definition_bytes"))).rows[0]
          .catalog;
        assert.equal(value.boundedMetadataComplete, false);
        assert.equal(value.truncated, true);
        assert.ok(value.metadataFailures.includes("metadata-byte-cap-exceeded"));
        for (const vector of vectors) assert.deepEqual(value[vector], [], vector);
        assert.deepEqual(value.acceptance, acceptance);
      },
    );

    await t.test(
      "missing reader catalog is a global refusal rather than an empty certified inventory",
      async () => {
        const needle = "('pg_trigger'),('pg_proc'),('pg_language'),('pg_depend')";
        assert.equal(query.split(needle).length, 2);
        const value = (
          await db.query(
            query.replace(needle, needle.replace("('pg_depend')", "('pg_depend_absent')")),
          )
        ).rows[0].catalog;
        assert.equal(value.readerMetadataComplete, false);
        assert.equal(value.boundedMetadataComplete, false);
        assert.ok(value.metadataFailures.includes("catalog-reader-metadata-refused"));
        for (const vector of vectors) assert.deepEqual(value[vector], [], vector);
        assert.deepEqual(value.acceptance, acceptance);
      },
    );

    await t.test(
      "a non-public attached function is fingerprinted without returning its private source",
      async () => {
        await db.exec(`CREATE SCHEMA fixture_stock_probe_private;
        CREATE FUNCTION fixture_stock_probe_private.attached_stock_probe() RETURNS trigger
        LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
        BEGIN
          -- Synthetic probe private literal must never be returned.
          RETURN NEW;
        END; $$;
        REVOKE ALL ON FUNCTION fixture_stock_probe_private.attached_stock_probe()
          FROM PUBLIC,anon,authenticated,service_role;
        CREATE TRIGGER fixture_stock_probe BEFORE UPDATE ON public.business_inventory_items
          FOR EACH ROW EXECUTE FUNCTION fixture_stock_probe_private.attached_stock_probe();`);
        try {
          const value = (await db.query(query)).rows[0].catalog;
          assert.equal(value.boundedMetadataComplete, true);
          const serialized = JSON.stringify(value);
          assert.match(serialized, /fixture_stock_probe_private\.attached_stock_probe/);
          assert.doesNotMatch(
            serialized,
            /Synthetic probe private literal|RETURN NEW|LANGUAGE plpgsql/,
          );
          assert.deepEqual(value.acceptance, acceptance);
        } finally {
          await db.exec(`DROP TRIGGER fixture_stock_probe ON public.business_inventory_items;
          DROP FUNCTION fixture_stock_probe_private.attached_stock_probe();
          DROP SCHEMA fixture_stock_probe_private;`);
        }
      },
    );
  } finally {
    await db.close();
  }
});
