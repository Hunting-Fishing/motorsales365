// OFFLINE selected chat-policy characterization, not authorization mitigation.
// Actual retained two-table DDL, two helpers, six policies and selected indexes
// execute unchanged; auth/session/business support is explicitly synthetic.
// Dated table/function ACL reproduction is fixture-only, not migration replay,
// global privilege/role closure, PostgREST/JWT reachability or production data.
// No staff/native bridge, business-created trigger, messages, notifications,
// writer stubs, sweeps, seeds, backfills, storage or realtime are loaded.
// Affected rows and privileged stored state are checked independently: an empty
// returned rows array does not prove that a write affected zero records.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const root = new URL("../../", import.meta.url);
const sha = (raw) => createHash("sha256").update(raw.replace(/\r\n/g, "\n")).digest("hex");
function pin(raw, expected, label) {
  assert.ok(raw.length > 0 && raw.length < 128 * 1024, `${label}: bounded input`);
  assert.equal(sha(raw), expected, `${label}: LF pin drift`);
  return raw.replace(/\r\n/g, "\n");
}
function read(path, expected) {
  return pin(fs.readFileSync(new URL(path, root), "utf8"), expected, path);
}
function select(raw, pattern, expected, label) {
  const matches = [...raw.matchAll(pattern)];
  assert.equal(matches.length, 1, `${label}: unique complete declaration`);
  return pin(matches[0][0], expected, label);
}
function lines(raw, first, last, marker, expected) {
  assert.equal(raw.split(marker).length, 2, `${marker}: unique source declaration`);
  const all = raw.split("\n");
  assert.ok(first >= 1 && last >= first && last <= all.length);
  const sql = all.slice(first - 1, last).join("\n") + "\n";
  assert.ok(sql.includes(marker));
  return pin(sql, expected, marker);
}
const base = read(
  "supabase/migrations/20260711073331_3314948d-c196-44ff-b656-7be383f5d16b.sql",
  "67bba50f869ebbd00edab5de5d7913e91112073b7f7a1c75475bb4125414dac4",
);
const team = read(
  "supabase/migrations/20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql",
  "2231cdf09ee79ed8a8e0d93ef55176c2e32f245494f55c93dba5e5cbe4a171d7",
);
const observed = JSON.parse(
  read(
    "docs/evidence/native-chat-security-catalog-2026-10-15.json",
    "5ca3902814a8a607d04d67b5ae250768a4717338fa73f508504e621303065911",
  ),
);
const sql = {
  tables: lines(
    base,
    3,
    25,
    "CREATE TABLE public.chat_threads (",
    "4086319bae65c7d59e8479bfdb170714deaed67fc73524319a57cb6af724855b",
  ),
  memberIndex: lines(
    base,
    44,
    44,
    "CREATE INDEX idx_chat_thread_members_user",
    "b1ec5852d00dd6080692d3667d214d9e68ede2910d229602afc9c45bcf1973af",
  ),
  scope: lines(
    team,
    3,
    10,
    "ADD COLUMN IF NOT EXISTS business_id uuid",
    "0ec4d97c529df8f3da6a975b649589e8758fb67b059b64b933175f4723baa5cb",
  ),
  member: select(
    base,
    /^CREATE OR REPLACE FUNCTION public\.is_thread_member\([\s\S]*?\$\$;/gm,
    "7d7c050dbef1d1f1665bf8e92fef991e1417e22d42a77730c9d7ed9b61f5737a",
    "is_thread_member",
  ),
  active: select(
    base,
    /^CREATE OR REPLACE FUNCTION public\.is_active_thread_member\([\s\S]*?\$\$;/gm,
    "e1df7bfa23acb7973918654d4c7d7f9e0a5830331ee8b682faa3bd30ae0119ed",
    "is_active_thread_member",
  ),
};
const policyPins = [
  ["Members view threads", "6eb8d9205086251c17a4e75c6791c97337345dafab3680ce0c740dde60607bd6"],
  ["Anyone can create threads", "307530307f69a46d318f1b17462e2d3810d45d8d08357774e7dc3373cccc9899"],
  ["Creator can update thread", "7c4d3f3569a1ce53a1591aa01b2ee43845daa53077663b7f1a2528fab310bada"],
  ["Members see member rows", "924f1503a2f8a1a5c48e49689f84bcd49e5a898afd931c9325a41cec10b02c68"],
  ["Active members can invite", "3c87997d69cc588eea624781ac8f7bdadfb708b69125dc0891b078920b41ca12"],
  [
    "User can update own membership",
    "d196d1449f180dc753d9b8dab25ef2d1abf455f6a0f6604c862b5fe3ce78af87",
  ],
];
const policies = policyPins.map(([name, hash]) =>
  select(base, new RegExp(`^CREATE POLICY "${name}"[\\s\\S]*?;`, "gm"), hash, name),
);
const id = {
  creator: "00000000-0000-4000-8000-000000000001",
  active: "00000000-0000-4000-8000-000000000002",
  invited: "00000000-0000-4000-8000-000000000003",
  left: "00000000-0000-4000-8000-000000000004",
  stranger: "00000000-0000-4000-8000-000000000005",
  target: "00000000-0000-4000-8000-000000000006",
  invitedCreator: "00000000-0000-4000-8000-000000000007",
  missingCreator: "00000000-0000-4000-8000-000000000008",
  businessOwner: "00000000-0000-4000-8000-000000000009",
  businessA: "10000000-0000-4000-8000-000000000001",
  businessB: "10000000-0000-4000-8000-000000000002",
  a: "20000000-0000-4000-8000-000000000001",
  b: "20000000-0000-4000-8000-000000000002",
  c: "20000000-0000-4000-8000-000000000003",
  d: "20000000-0000-4000-8000-000000000004",
  newThread: "20000000-0000-4000-8000-000000000005",
};
const options = { concurrency: false, timeout: 30_000 };
const support = `
  SET statement_timeout='3000ms'; SET lock_timeout='1000ms'; SET search_path=public;
  CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS pg_catalog.uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::pg_catalog.uuid
  $$;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE TABLE public.businesses(id uuid PRIMARY KEY,owner_id uuid);
  GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
`;
async function withFixture(run) {
  const db = new PGlite("memory://");
  try {
    await db.exec(support);
    for (const selected of [
      sql.tables,
      sql.memberIndex,
      sql.scope,
      sql.member,
      sql.active,
      ...policies,
    ])
      await db.exec(selected);
    // Explicit narrow reproduction of dated observed ACLs; not a generic sweep,
    // complete role/default privilege closure, or changes to retained SQL bytes.
    await db.exec(`REVOKE ALL ON public.chat_threads,public.chat_thread_members FROM PUBLIC,anon,authenticated,service_role;
      GRANT ALL ON public.chat_threads,public.chat_thread_members TO anon,authenticated,service_role;
      GRANT EXECUTE ON FUNCTION public.is_thread_member(uuid,uuid),public.is_active_thread_member(uuid,uuid) TO anon,authenticated,service_role;`);
    for (const name of [
      "creator",
      "active",
      "invited",
      "left",
      "stranger",
      "target",
      "invitedCreator",
      "missingCreator",
      "businessOwner",
    ])
      await db.query("INSERT INTO auth.users VALUES($1)", [id[name]]);
    await db.query("INSERT INTO public.businesses VALUES($1,$2),($3,$2)", [
      id.businessA,
      id.businessOwner,
      id.businessB,
    ]);
    await db.query(
      "INSERT INTO public.chat_threads(id,title,created_by,business_id,kind) VALUES($1,'A team',$2,$3,'team'),($4,'B team',$5,$6,'team'),($7,'C group',$8,$3,'group'),($9,'D group',$8,NULL,'group')",
      [
        id.a,
        id.creator,
        id.businessA,
        id.b,
        id.invitedCreator,
        id.businessB,
        id.c,
        id.missingCreator,
        id.d,
      ],
    );
    await db.query(
      "INSERT INTO public.chat_thread_members(thread_id,user_id,status,invited_by) VALUES($1,$2,'active',$2),($1,$3,'active',$2),($1,$4,'invited',$2),($1,$5,'left',$2),($6,$7,'invited',$7)",
      [id.a, id.creator, id.active, id.invited, id.left, id.b, id.invitedCreator],
    );
    const beforeCatalog = await catalog(db);
    await run(db);
    assert.deepEqual(
      await catalog(db),
      beforeCatalog,
      "selected fixture permission/schema state preserved; not global closure",
    );
  } finally {
    await db.close();
  }
}
async function actor(db, user, query, params = [], role = "authenticated") {
  assert.ok(role === "authenticated" || role === "anon");
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [user ?? ""]);
    const result = await db.query(query, params);
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function catalog(db) {
  const result = {};
  for (const [key, query] of Object.entries({
    tables: `SELECT c.relname,pg_get_userbyid(c.relowner) owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('chat_threads','chat_thread_members') ORDER BY 1`,
    columns: `SELECT c.relname,a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,pg_get_expr(d.adbin,d.adrelid) "default",a.attacl::text acl FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relname IN ('chat_threads','chat_thread_members') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`,
    indexes: `SELECT c.relname table_name,i.relname name,x.indisready ready,x.indisvalid valid,x.indisunique "unique",pg_get_indexdef(x.indexrelid) definition FROM pg_index x JOIN pg_class c ON c.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('chat_threads','chat_thread_members') ORDER BY 1,2`,
    constraints: `SELECT c.relname table_name,k.conname name,k.contype type,k.convalidated validated,pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('chat_threads','chat_thread_members') ORDER BY 1,2`,
    policies: `SELECT c.relname table_name,p.polname name,pg_get_expr(p.polwithcheck,p.polrelid) "check",ARRAY(SELECT r.rolname::text FROM pg_roles r WHERE r.oid=ANY(p.polroles) ORDER BY 1) roles,pg_get_expr(p.polqual,p.polrelid) "using",p.polcmd command,p.polpermissive permissive FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('chat_threads','chat_thread_members') ORDER BY 1,2`,
    triggers: `SELECT c.relname table_name,t.tgname name,t.tgenabled enabled,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('chat_threads','chat_thread_members') AND NOT t.tgisinternal ORDER BY 1,2`,
    functions: `SELECT p.oid::regprocedure::text signature,p.proacl::text acl,pg_get_userbyid(p.proowner) owner,l.lanname language,p.provolatile volatility,md5(replace(p.prosrc,chr(13),'')) body_md5_lf,p.proconfig search_path,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,md5(pg_get_functiondef(p.oid)) definition_md5,has_function_privilege('service_role',p.oid,'EXECUTE') service_execute,p.prosecdef security_definer,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' AND p.proname IN ('is_thread_member','is_active_thread_member') ORDER BY 1`,
    roles: `SELECT rolname,rolsuper,rolbypassrls,rolinherit FROM pg_roles WHERE rolname IN ('postgres','authenticated','anon','service_role') ORDER BY 1`,
    schemas: `SELECT nspname,nspacl::text acl FROM pg_namespace WHERE nspname IN ('public','auth') ORDER BY 1`,
    defaults: `SELECT defaclrole::regrole::text role,defaclnamespace::regnamespace::text namespace,defaclobjtype,defaclacl::text acl FROM pg_default_acl ORDER BY 1,2,3`,
  }))
    result[key] = (await db.query(query)).rows;
  return result;
}
async function data(db) {
  const result = {};
  for (const name of [
    "auth.users",
    "public.businesses",
    "public.chat_threads",
    "public.chat_thread_members",
  ])
    result[name] = (
      await db.query(`SELECT to_jsonb(t) row FROM ${name} t ORDER BY to_jsonb(t)::text`)
    ).rows;
  return result;
}
async function snapshot(db) {
  return { catalog: await catalog(db), data: await data(db) };
}
async function storedMember(db, user, thread = id.a) {
  return (
    await db.query(
      "SELECT thread_id,user_id,status,invited_by,last_read_at FROM public.chat_thread_members WHERE thread_id=$1 AND user_id=$2",
      [thread, user],
    )
  ).rows;
}
const errorCode = (code, constraint) => (error) =>
  error.code === code && (!constraint || error.constraint === constraint);
function affected(result, count, returned = 0) {
  assert.equal(
    result.affectedRows,
    count,
    "database affected-row count, not returned-array length",
  );
  assert.equal(result.rows.length, returned);
}
async function rejectedWithoutChange(db, run, code, constraint) {
  const before = await snapshot(db);
  await assert.rejects(run(), errorCode(code, constraint));
  assert.deepEqual(
    await snapshot(db),
    before,
    "explicit transaction rollback preserves fixture state",
  );
}

test(
  "source/evidence pins and exactly selected boundaries exclude unrelated history",
  options,
  () => {
    assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
    assert.equal(observed.observed_at_utc, "2026-10-14 23:14:53.057469");
    assert.match(
      observed.scope,
      /Catalog metadata only; no application rows, counts, function invocation/,
    );
    assert.equal(observed.functions.length, 2);
    assert.equal(observed.tables.length, 2);
    assert.equal(policies.length, 6);
    assert.throws(() => pin(base + "\n", sha(base), "tamper"), /LF pin drift/);
    assert.throws(
      () =>
        select(
          sql.member + "\n" + sql.member,
          /^CREATE OR REPLACE FUNCTION public\.is_thread_member\([\s\S]*?\$\$;/gm,
          sha(sql.member),
          "duplicate",
        ),
      /unique complete declaration/,
    );
    assert.throws(
      () => select("", /^CREATE POLICY .*?;/gm, sha(policies[0]), "missing"),
      /unique complete declaration/,
    );
    assert.equal(sha(base.replaceAll("\n", "\r\n")), sha(base));
    assert.doesNotMatch(
      [...Object.values(sql), ...policies].join("\n"),
      /CREATE TRIGGER|chat_thread_messages|enqueue_email|ensure_business_team_thread|business_staff|shop_manager|publication/i,
    );
    assert.match(sql.member, /status IN \('active','invited'\)/);
    assert.match(sql.active, /status = 'active'/);
  },
);

test(
  "dated selected table/helper catalog correspondence includes policies, columns, ACLs, indexes and no user triggers",
  options,
  async (t) => {
    await withFixture(async (db) => {
      const engine = (await db.query("SHOW server_version")).rows[0].server_version;
      t.diagnostic(
        `Memory PostgreSQL ${engine}; only NOT NULL constraint representation is normalized.`,
      );
      assert.match(engine, /^18\./);
      const current = await catalog(db);
      assert.deepEqual(current.functions, observed.functions);
      for (const record of observed.tables) {
        assert.equal(record.schema, "public");
        assert.deepEqual(
          current.tables.find((r) => r.relname === record.table),
          {
            relname: record.table,
            owner: record.owner,
            relrowsecurity: record.rls,
            relforcerowsecurity: record.force_rls,
            acl: record.acl,
          },
        );
        // Exact column attnotnull/default/type/attacl comparison precedes excluding
        // only PG18's additional contype=n representation from constraint records.
        assert.deepEqual(
          current.columns
            .filter((r) => r.relname === record.table)
            .map(({ relname, ...r }) => (assert.ok(relname), r)),
          record.columns,
        );
        for (const facet of ["indexes", "policies", "constraints"]) {
          const rows = current[facet]
            .filter(
              (r) => r.table_name === record.table && (facet !== "constraints" || r.type !== "n"),
            )
            .map(({ table_name, ...r }) => (assert.ok(table_name), r));
          assert.deepEqual(rows, record[facet]);
        }
        assert.deepEqual(
          current.triggers.filter((r) => r.table_name === record.table),
          record.user_triggers,
        );
      }
      const before = await snapshot(db);
      const actualActor = (
        await actor(
          db,
          id.active,
          "SELECT current_user name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
        )
      ).rows[0];
      assert.deepEqual(actualActor, {
        name: "authenticated",
        rolsuper: false,
        rolbypassrls: false,
      });
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "active and invited can SELECT the thread/member rows, left/stranger/null and anon cannot",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      for (const [subject, count] of [
        [id.active, 1],
        [id.invited, 1],
        [id.left, 0],
        [id.stranger, 0],
        [null, 0],
      ]) {
        assert.equal(
          (await actor(db, subject, "SELECT id FROM public.chat_threads WHERE id=$1", [id.a])).rows
            .length,
          count,
        );
        assert.equal(
          (
            await actor(
              db,
              subject,
              "SELECT user_id FROM public.chat_thread_members WHERE thread_id=$1",
              [id.a],
            )
          ).rows.length,
          count * 4,
        );
      }
      assert.deepEqual(
        (await actor(db, null, "SELECT * FROM public.chat_threads", [], "anon")).rows,
        [],
      );
      assert.deepEqual(
        (await actor(db, null, "SELECT * FROM public.chat_thread_members", [], "anon")).rows,
        [],
      );
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "PUBLIC-executable definer helpers expose nominated-user booleans independently of caller table visibility",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      for (const role of ["anon", "authenticated"]) {
        for (const subject of [null, id.stranger]) {
          for (const [nominated, member, active] of [
            [id.active, true, true],
            [id.invited, true, false],
            [id.left, false, false],
            [id.stranger, false, false],
            [null, false, false],
          ]) {
            assert.deepEqual(
              (
                await actor(
                  db,
                  subject,
                  "SELECT public.is_thread_member($1,$2) member,public.is_active_thread_member($1,$2) active",
                  [id.a, nominated],
                  role,
                )
              ).rows,
              [{ member, active }],
            );
          }
          assert.deepEqual(
            (await actor(db, subject, "SELECT user_id FROM public.chat_thread_members", [], role))
              .rows,
            [],
          );
          assert.deepEqual(
            (
              await actor(
                db,
                subject,
                "SELECT public.is_thread_member(NULL::uuid,$1) member,public.is_active_thread_member($2,$1) active",
                [id.active, id.newThread],
                role,
              )
            ).rows,
            [{ member: false, active: false }],
          );
        }
      }
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "visible active/invited self edits persist; other-member edits and DELETE affect zero",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const user of [id.active, id.invited]) {
        const update = await actor(
          db,
          user,
          "UPDATE public.chat_thread_members SET last_read_at='2001-02-03Z' WHERE thread_id=$1 AND user_id=$2 RETURNING user_id",
          [id.a, user],
        );
        affected(update, 1, 1);
        assert.equal(
          (await storedMember(db, user))[0].last_read_at.toISOString(),
          "2001-02-03T00:00:00.000Z",
        );
      }
      const before = await snapshot(db);
      affected(
        await actor(
          db,
          id.active,
          "UPDATE public.chat_thread_members SET status='active' WHERE thread_id=$1 AND user_id=$2 RETURNING user_id",
          [id.a, id.left],
        ),
        0,
      );
      affected(
        await actor(
          db,
          id.active,
          "DELETE FROM public.chat_thread_members WHERE thread_id=$1 AND user_id=$2 RETURNING user_id",
          [id.a, id.active],
        ),
        0,
      );
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "left membership scoped WHERE or RHS-column reads are SELECT-filtered and affect zero",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      affected(
        await actor(
          db,
          id.left,
          "UPDATE public.chat_thread_members SET status='active' WHERE thread_id=$1 AND user_id=$2",
          [id.a, id.left],
        ),
        0,
      );
      affected(await actor(db, id.left, "UPDATE public.chat_thread_members SET status=status"), 0);
      assert.equal((await storedMember(db, id.left))[0].status, "left");
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "left constant UPDATE with no WHERE/RETURNING/RHS read mutates despite returning no rows",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await data(db);
      const update = await actor(
        db,
        id.left,
        "UPDATE public.chat_thread_members SET status='active'",
      );
      affected(update, 1, 0);
      assert.equal((await storedMember(db, id.left))[0].status, "active");
      assert.equal(
        (await actor(db, id.left, "SELECT id FROM public.chat_threads WHERE id=$1", [id.a])).rows
          .length,
        1,
      );
      const after = await data(db);
      for (const name of ["auth.users", "public.businesses", "public.chat_threads"])
        assert.deepEqual(after[name], before[name]);
      assert.deepEqual(
        after["public.chat_thread_members"].filter((r) => r.row.user_id !== id.left),
        before["public.chat_thread_members"].filter((r) => r.row.user_id !== id.left),
      );
    });
  },
);

test(
  "adding RETURNING restores SELECT visibility requirement and prevents left reactivation",
  options,
  async () => {
    await withFixture(async (db) => {
      const before = await snapshot(db);
      affected(
        await actor(
          db,
          id.left,
          "UPDATE public.chat_thread_members SET status='active' RETURNING user_id",
        ),
        0,
      );
      assert.deepEqual(await snapshot(db), before);
      affected(await actor(db, null, "UPDATE public.chat_thread_members SET status='active'"), 0);
      affected(
        await actor(
          db,
          id.left,
          "UPDATE public.chat_thread_members SET status='active'",
          [],
          "anon",
        ),
        0,
      );
      assert.deepEqual(await snapshot(db), before);
    });
  },
);

test(
  "physically valid constant thread retarget can move self into an unseen thread without PK collision",
  options,
  async () => {
    await withFixture(async (db) => {
      assert.deepEqual(await storedMember(db, id.active, id.d), []);
      assert.deepEqual(
        (await actor(db, id.active, "SELECT id FROM public.chat_threads WHERE id=$1", [id.d])).rows,
        [],
      );
      const update = await actor(
        db,
        id.active,
        "UPDATE public.chat_thread_members SET thread_id=$1",
        [id.d],
      );
      affected(update, 1);
      assert.deepEqual(await storedMember(db, id.active), []);
      assert.equal((await storedMember(db, id.active, id.d))[0].status, "active");
      assert.deepEqual(
        (await actor(db, id.active, "SELECT id FROM public.chat_threads WHERE id=$1", [id.d])).rows,
        [{ id: id.d }],
      );
      assert.equal((await storedMember(db, id.creator))[0].thread_id, id.a);
    });
  },
);

test(
  "active/invited self transition to left persists with or without RETURNING but hides next-statement reads",
  options,
  async () => {
    for (const user of [id.active, id.invited]) {
      for (const returning of [false, true]) {
        // Separate reset fixtures prevent a prior transition from becoming this
        // command's source visibility. These are statement/snapshot observations,
        // not concurrent-session or persistent JWT revocation evidence.
        await withFixture(async (db) => {
          const before = await data(db);
          const update = await actor(
            db,
            user,
            `UPDATE public.chat_thread_members SET status='left' WHERE thread_id=$1 AND user_id=$2${returning ? " RETURNING user_id,status" : ""}`,
            [id.a, user],
          );
          affected(update, 1, returning ? 1 : 0);
          if (returning) assert.deepEqual(update.rows, [{ user_id: user, status: "left" }]);
          assert.equal((await storedMember(db, user))[0].status, "left");
          assert.deepEqual(
            (await actor(db, user, "SELECT id FROM public.chat_threads WHERE id=$1", [id.a])).rows,
            [],
          );
          assert.deepEqual(
            (
              await actor(
                db,
                user,
                "SELECT user_id FROM public.chat_thread_members WHERE thread_id=$1",
                [id.a],
              )
            ).rows,
            [],
          );
          const after = await data(db);
          for (const name of ["auth.users", "public.businesses", "public.chat_threads"])
            assert.deepEqual(after[name], before[name]);
          assert.deepEqual(
            after["public.chat_thread_members"].filter((r) => r.row.user_id !== user),
            before["public.chat_thread_members"].filter((r) => r.row.user_id !== user),
          );
        });
      }
    }
  },
);

test(
  "user retarget is blocked by self WITH CHECK even with valid auth FK and no PK collision",
  options,
  async () => {
    await withFixture(async (db) => {
      assert.deepEqual(await storedMember(db, id.target), []);
      assert.equal(
        (await db.query("SELECT id FROM auth.users WHERE id=$1", [id.target])).rows.length,
        1,
      );
      await rejectedWithoutChange(
        db,
        () => actor(db, id.active, "UPDATE public.chat_thread_members SET user_id=$1", [id.target]),
        "42501",
      );
      await rejectedWithoutChange(
        db,
        () =>
          actor(
            db,
            id.active,
            "UPDATE public.chat_thread_members SET user_id=$1 WHERE thread_id=$2 AND user_id=$3 RETURNING user_id",
            [id.target, id.a, id.active],
          ),
        "42501",
      );
    });
  },
);

test(
  "physically valid scoped or RETURNING thread retargets fail SELECT WITH CHECK unlike raw constant UPDATE",
  options,
  async () => {
    for (const [scoped, returning] of [
      [true, false],
      [true, true],
      [false, true],
    ]) {
      await withFixture(async (db) => {
        // The destination thread and auth target physically exist and the
        // destination membership key is empty. FK/PK errors cannot mask RLS.
        assert.equal(
          (await db.query("SELECT id FROM public.chat_threads WHERE id=$1", [id.d])).rows.length,
          1,
        );
        assert.deepEqual(await storedMember(db, id.active, id.d), []);
        assert.deepEqual(
          (await actor(db, id.active, "SELECT id FROM public.chat_threads WHERE id=$1", [id.d]))
            .rows,
          [],
        );
        const query = `UPDATE public.chat_thread_members SET thread_id=$1${scoped ? " WHERE thread_id=$2 AND user_id=$3" : ""}${returning ? " RETURNING thread_id,user_id" : ""}`;
        const parameters = scoped ? [id.d, id.a, id.active] : [id.d];
        await rejectedWithoutChange(db, () => actor(db, id.active, query, parameters), "42501");
        assert.equal((await storedMember(db, id.active))[0].thread_id, id.a);
        assert.deepEqual(await storedMember(db, id.active, id.d), []);
      });
    }
  },
);

test(
  "active noncreator can invite; invited noncreator cannot; invited creator succeeds but membership-less creator cannot",
  options,
  async () => {
    await withFixture(async (db) => {
      const insert =
        "INSERT INTO public.chat_thread_members(thread_id,user_id,status,invited_by) VALUES($1,$2,'invited',$3)";
      affected(await actor(db, id.active, insert, [id.a, id.target, id.active]), 1);
      assert.equal((await storedMember(db, id.target))[0].status, "invited");
      await rejectedWithoutChange(
        db,
        () => actor(db, id.invited, insert, [id.a, id.stranger, id.invited]),
        "42501",
      );
      affected(
        await actor(db, id.invitedCreator, insert, [id.b, id.stranger, id.invitedCreator]),
        1,
      );
      assert.equal((await storedMember(db, id.stranger, id.b))[0].status, "invited");
      assert.deepEqual(
        (
          await actor(db, id.missingCreator, "SELECT id FROM public.chat_threads WHERE id=$1", [
            id.c,
          ])
        ).rows,
        [],
      );
      await rejectedWithoutChange(
        db,
        () => actor(db, id.missingCreator, insert, [id.c, id.target, id.missingCreator]),
        "42501",
      );
    });
  },
);

test(
  "new thread INSERT is allowed without auto-membership; RETURNING and scoped creator UPDATE differ from constant UPDATE",
  options,
  async () => {
    await withFixture(async (db) => {
      affected(
        await actor(
          db,
          id.stranger,
          "INSERT INTO public.chat_threads(id,title,created_by) VALUES($1,'New group',$2)",
          [id.newThread, id.stranger],
        ),
        1,
      );
      assert.deepEqual(await storedMember(db, id.stranger, id.newThread), []);
      assert.deepEqual(
        (
          await actor(db, id.stranger, "SELECT id FROM public.chat_threads WHERE id=$1", [
            id.newThread,
          ])
        ).rows,
        [],
      );
      affected(
        await actor(
          db,
          id.stranger,
          "UPDATE public.chat_threads SET title='Scoped title' WHERE id=$1",
          [id.newThread],
        ),
        0,
      );
      affected(
        await actor(db, id.stranger, "UPDATE public.chat_threads SET title='Constant title'"),
        1,
      );
      assert.equal(
        (await db.query("SELECT title FROM public.chat_threads WHERE id=$1", [id.newThread]))
          .rows[0].title,
        "Constant title",
      );
      await rejectedWithoutChange(
        db,
        () =>
          actor(
            db,
            id.stranger,
            "INSERT INTO public.chat_threads(id,title,created_by) VALUES($1,'Returned group',$2) RETURNING id",
            [id.target, id.stranger],
          ),
        "42501",
      );
    });
  },
);

test(
  "new invitation versus existing-left ON CONFLICT differ; business ownership alone cannot recover the team",
  options,
  async () => {
    await withFixture(async (db) => {
      const insert =
        "INSERT INTO public.chat_thread_members(thread_id,user_id,status) VALUES($1,$2,'active')";
      affected(
        await actor(
          db,
          id.active,
          `${insert} ON CONFLICT(thread_id,user_id) DO UPDATE SET status=EXCLUDED.status`,
          [id.a, id.target],
        ),
        1,
      );
      assert.equal((await storedMember(db, id.target))[0].status, "active");
      await rejectedWithoutChange(
        db,
        () =>
          actor(
            db,
            id.active,
            `${insert} ON CONFLICT(thread_id,user_id) DO UPDATE SET status=EXCLUDED.status`,
            [id.a, id.left],
          ),
        "42501",
      );
      affected(
        await actor(db, id.active, `${insert} ON CONFLICT(thread_id,user_id) DO NOTHING`, [
          id.a,
          id.left,
        ]),
        0,
      );
      assert.equal((await storedMember(db, id.left))[0].status, "left");
      assert.deepEqual(
        (
          await actor(db, id.businessOwner, "SELECT id FROM public.chat_threads WHERE id=$1", [
            id.a,
          ])
        ).rows,
        [],
      );
      await rejectedWithoutChange(
        db,
        () => actor(db, id.businessOwner, insert, [id.a, id.businessOwner]),
        "42501",
      );
      affected(
        await actor(db, id.businessOwner, "UPDATE public.chat_thread_members SET status='active'"),
        0,
      );
      await rejectedWithoutChange(
        db,
        () =>
          actor(
            db,
            id.businessOwner,
            "INSERT INTO public.chat_threads(id,title,created_by,business_id,kind) VALUES($1,'Second team',$2,$3,'team')",
            [id.newThread, id.businessOwner, id.businessA],
          ),
        "23505",
        "chat_threads_business_team_unique",
      );
    });
  },
);

test(
  "actual CHECK/PK/FK/team-index failures roll back without weakening physical constraints",
  options,
  async () => {
    await withFixture(async (db) => {
      await rejectedWithoutChange(
        db,
        () => actor(db, id.active, "UPDATE public.chat_thread_members SET status='inactive'"),
        "23514",
        "chat_thread_members_status_check",
      );
      await rejectedWithoutChange(
        db,
        () =>
          actor(db, id.active, "UPDATE public.chat_thread_members SET thread_id=$1", [
            id.newThread,
          ]),
        "23503",
        "chat_thread_members_thread_id_fkey",
      );
      await rejectedWithoutChange(
        db,
        () =>
          actor(
            db,
            id.active,
            "INSERT INTO public.chat_thread_members(thread_id,user_id) VALUES($1,$2)",
            [id.a, id.newThread],
          ),
        "23503",
        "chat_thread_members_user_id_fkey",
      );
      await rejectedWithoutChange(
        db,
        () =>
          actor(
            db,
            id.active,
            "INSERT INTO public.chat_thread_members(thread_id,user_id) VALUES($1,$2)",
            [id.a, id.active],
          ),
        "23505",
        "chat_thread_members_pkey",
      );
      await rejectedWithoutChange(
        db,
        () =>
          actor(
            db,
            id.creator,
            "INSERT INTO public.chat_threads(id,title,created_by,business_id,kind) VALUES($1,'Duplicate team',$2,$3,'team')",
            [id.newThread, id.creator, id.businessA],
          ),
        "23505",
        "chat_threads_business_team_unique",
      );
    });
  },
);
