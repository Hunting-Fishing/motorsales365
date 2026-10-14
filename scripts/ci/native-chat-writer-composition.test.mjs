// OFFLINE selected unchanged chat writers and current captured attachments.
// Synthetic auth/session/business/public_profiles READ support is not production
// authentication or current-view parity. There are no permissive writer stubs.
// All three message triggers and the notification UPDATE guard remain intact.
// Stored notification rows are NOT delivery, realtime, push, email or storage.
// Source grants run first; narrow dated ACL reproduction below is fixture-only,
// not migration/sweep/default-privilege replay or global privilege closure.
// Void RPC rows/SELECT affectedRows do not confirm internal changed-row counts.
// No staff/native/business incoming writers, seeds, backfills or network calls.
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
  assert.equal(matches.length, 1, `${label}: unique complete selection`);
  return pin(matches[0][0], expected, label);
}
function fn(raw, name, expected) {
  return select(
    raw,
    new RegExp(`^CREATE OR REPLACE FUNCTION public\\.${name}\\([\\s\\S]*?\\$\\$;`, "gm"),
    expected,
    name,
  );
}
function lines(raw, first, last, marker, expected) {
  assert.equal(raw.split(marker).length, 2, `${marker}: unique retained marker`);
  const all = raw.split("\n");
  assert.ok(first > 0 && last >= first && last <= all.length);
  const selected = all.slice(first - 1, last).join("\n") + "\n";
  assert.ok(selected.includes(marker));
  return pin(selected, expected, marker);
}
const sources = {
  base: read(
    "supabase/migrations/20260711073331_3314948d-c196-44ff-b656-7be383f5d16b.sql",
    "67bba50f869ebbd00edab5de5d7913e91112073b7f7a1c75475bb4125414dac4",
  ),
  writers: read(
    "supabase/migrations/20260711073454_cea6ce68-1eda-4711-8431-5d3468395289.sql",
    "5c7f708934cd5fd777a8f0c27c13df63d1a26304e4ec4b21b19dbb33b5c7c7c6",
  ),
  unread: read(
    "supabase/migrations/20260711074001_e72c5982-744f-4023-9045-99a02778d52b.sql",
    "abb23565f14a66c0f576cc26589b8471e6300ddf2b62269ac7b717ad94031c50",
  ),
  team: read(
    "supabase/migrations/20260713071921_8c790938-2bb4-420b-b1df-3261d4bed855.sql",
    "2231cdf09ee79ed8a8e0d93ef55176c2e32f245494f55c93dba5e5cbe4a171d7",
  ),
  notification: read(
    "supabase/migrations/20260620175446_5053a902-248b-4600-bef6-8a9c84c28cd8.sql",
    "beb9df30a6408a9fe263dccdeee42a8c3031a592f2af759c4aa4275893b05b37",
  ),
};
const observed = JSON.parse(
  read(
    "docs/evidence/native-chat-writer-catalog-2026-10-15.json",
    "d30e32e7e678860c89252c31fae045ce7a7c574ed4683d47ca5c7414bba73c6f",
  ),
);
const review = read(
  "docs/evidence/native-chat-writer-catalog-review.sql",
  "7020c6b483dd2d1e08b3d482b3aa4f6ff5e885a11fef554ecf70a7d0656d8cbc",
);
const sql = {
  chat: lines(
    sources.base,
    3,
    25,
    "CREATE TABLE public.chat_threads (",
    "4086319bae65c7d59e8479bfdb170714deaed67fc73524319a57cb6af724855b",
  ),
  scope: lines(
    sources.team,
    3,
    10,
    "ADD COLUMN IF NOT EXISTS business_id uuid",
    "0ec4d97c529df8f3da6a975b649589e8758fb67b059b64b933175f4723baa5cb",
  ),
  memberIndex: lines(
    sources.base,
    44,
    44,
    "CREATE INDEX idx_chat_thread_members_user",
    "b1ec5852d00dd6080692d3667d214d9e68ede2910d229602afc9c45bcf1973af",
  ),
  member: fn(
    sources.base,
    "is_thread_member",
    "7d7c050dbef1d1f1665bf8e92fef991e1417e22d42a77730c9d7ed9b61f5737a",
  ),
  active: fn(
    sources.base,
    "is_active_thread_member",
    "e1df7bfa23acb7973918654d4c7d7f9e0a5830331ee8b682faa3bd30ae0119ed",
  ),
  chatPolicies: lines(
    sources.base,
    68,
    95,
    'CREATE POLICY "Members view threads"',
    "73d2c909691a053ab77c290aba2fe4eb4a52f2e57499b635e4bed4b48e724797",
  ),
  messages: lines(
    sources.base,
    27,
    43,
    "CREATE TABLE public.chat_thread_messages (",
    "94cebc30ef2ce81383a012831ffbdcc766e8b5d566446075a737fff68c40b19d",
  ),
  messagePolicies: lines(
    sources.base,
    97,
    103,
    'CREATE POLICY "Members view thread messages"',
    "f06d7ddfbf1b24b89a12fb2eed563257bab5c266ae8545644d31bfee5c649dc6",
  ),
  notifications: lines(
    sources.notification,
    53,
    77,
    "CREATE TABLE public.user_notifications (",
    "ca22588024b7fca969949b0235de292fd3eb381660b41315fc36b9f240835e93",
  ),
  notificationGuard: lines(
    sources.notification,
    102,
    112,
    "CREATE TRIGGER trg_user_notifications_lock_columns",
    "43c8742dcc209b02e3363288e42577df16adbdfc845c3f79f97c1411deafefa6",
  ),
  touchAttach: lines(
    sources.base,
    113,
    115,
    "CREATE TRIGGER trg_touch_chat_thread_on_message",
    "cfab0cbf25ed7e463d1b64603825aecc993bd13a93303884ad39d236efcc746c",
  ),
  notifyAttach: lines(
    sources.base,
    153,
    155,
    "CREATE TRIGGER trg_notify_chat_thread_message",
    "d0d9462e52c55695bd9626681286600f997bdc021754565b0321a88822be359d",
  ),
  teamAttach: lines(
    sources.team,
    210,
    212,
    "CREATE TRIGGER thread_message_notify",
    "326b9d99ac46bcbca398ec1d0df27baa296ba2f030412eb97b9d36161f1e14a7",
  ),
};
const functions = {
  create_group_chat: fn(
    sources.writers,
    "create_group_chat",
    "2aa4bd86c2abad744e91b3ee6374e48bc1d3afe1ba25e085a827ecd36fd1a4d0",
  ),
  invite_to_thread: fn(
    sources.writers,
    "invite_to_thread",
    "fd3b1875fbf4af9c2897b05186551778411972929cc2dc63d1d7a355e16ab744",
  ),
  respond_to_thread_invite: fn(
    sources.base,
    "respond_to_thread_invite",
    "6b3e0ff6aa9f3e082e67139a2244cd808545345e6c1801782a6d2ffb137bfcef",
  ),
  leave_thread: fn(
    sources.base,
    "leave_thread",
    "0784442eb7561c64abd45a703aacccf1a1e61db4322bebf18da39835f84dafab",
  ),
  mark_thread_read: fn(
    sources.base,
    "mark_thread_read",
    "45fbf4448eaa7979e31eb824bb6909e07e6457b0f7e812782f8f9271e785c2b8",
  ),
  mark_thread_unread: fn(
    sources.unread,
    "mark_thread_unread",
    "d2b23fb9389b749e57d6852d800daac7e62c60e10c5d75c6ae56125a7b57923b",
  ),
  notify_user: fn(
    sources.team,
    "notify_user",
    "4b2a5ae11891e50f31fb1636ded5417d85edb6968cb6d593095c9d9c4923963c",
  ),
  tg_touch_chat_thread: fn(
    sources.base,
    "tg_touch_chat_thread",
    "6b7b5100841978bd94f2a47f50e06560a8264c96d533b6aae9c56d6fe943333a",
  ),
  tg_notify_chat_thread_message: fn(
    sources.writers,
    "tg_notify_chat_thread_message",
    "473025919a57d3dd3ad063be3f6b3e0f3ccf013a256e385b989016b1bb1094fd",
  ),
  trg_thread_message_notify: fn(
    sources.team,
    "trg_thread_message_notify",
    "62e63d2a553000013f4ddc8ee3e52c124850f76c05b6c898e725c1d5b7962ce1",
  ),
  user_notifications_lock_columns: fn(
    sources.notification,
    "user_notifications_lock_columns",
    "19dab03b99efbd501ba4b07112aa166f425afdbe98703c556eadfee50789d636",
  ),
};
const grantPins = [
  [
    sources.base,
    "create_group_chat",
    "292aced7bc438f4d4c69bdb9e4ca1d0f49cff52de30b9eeb86a02aac4503ecfe",
  ],
  [
    sources.base,
    "invite_to_thread",
    "f247c94e030d72416ebbf8676d3d8ee105f9bf39816fca398dd291098390eb1e",
  ],
  [
    sources.base,
    "respond_to_thread_invite",
    "c69566139f9003c6d33789ec92a5bc3b02583ac67476b898dabbdeb398c70163",
  ],
  [
    sources.base,
    "leave_thread",
    "6f2d20fe071126f84538502dc14f66e98e40a577c968858edf7f09fb85aab2b4",
  ],
  [
    sources.base,
    "mark_thread_read",
    "57dacaa96f6071a6b6ad4c3891e73f947ff8eff6836e72eb0f7f1b487d1f93af",
  ],
  [
    sources.unread,
    "mark_thread_unread",
    "a8c16ff0cf6317913c000ad6fb761c43bd416e1e693035f0954b055517d9308e",
  ],
];
const grants = grantPins.map(([raw, name, hash]) =>
  select(
    raw,
    new RegExp(`^GRANT EXECUTE ON FUNCTION public\\.${name}[^;]*;`, "gm"),
    hash,
    `${name} source grant`,
  ),
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
  missing: "00000000-0000-4000-8000-000000000099",
  business: "10000000-0000-4000-8000-000000000001",
  a: "20000000-0000-4000-8000-000000000001",
  b: "20000000-0000-4000-8000-000000000002",
  c: "20000000-0000-4000-8000-000000000003",
  d: "20000000-0000-4000-8000-000000000004",
  message: "30000000-0000-4000-8000-000000000001",
};
const options = { concurrency: false, timeout: 30_000 };
const names = [
  "auth.users",
  "public.businesses",
  "public.public_profiles",
  "public.chat_threads",
  "public.chat_thread_members",
  "public.chat_thread_messages",
  "public.user_notifications",
];
const support = `
  SET statement_timeout='3000ms'; SET lock_timeout='1000ms'; SET search_path=public;
  CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS pg_catalog.uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::pg_catalog.uuid $$;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE TABLE public.businesses(id uuid PRIMARY KEY,owner_id uuid);
  -- Synthetic reduced READ support, NOT the uncaptured current public_profiles view.
  CREATE TABLE public.public_profiles(id uuid PRIMARY KEY,business_name text,full_name text);
  GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
`;
async function metadata(db) {
  const { observed_at_utc, ...result } = (await db.query(review)).rows[0];
  assert.ok(observed_at_utc);
  return result;
}
async function catalog(db) {
  const result = { captured: await metadata(db) };
  for (const [key, query] of Object.entries({
    tables: `SELECT n.nspname,c.relname,c.relacl::text acl,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth') AND c.relkind='r' ORDER BY 1,2`,
    columns: `SELECT n.nspname,c.relname,a.attname,a.attnotnull,a.attacl::text acl,format_type(a.atttypid,a.atttypmod) type,pg_get_expr(d.adbin,d.adrelid) default_expr FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname IN ('public','auth') AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,a.attnum`,
    policies: `SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' ORDER BY 1,2,3`,
    indexes: `SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('public','auth') ORDER BY 1,2,3`,
    constraints: `SELECT conrelid::regclass::text relation,conname,contype,convalidated,pg_get_constraintdef(oid) definition FROM pg_constraint WHERE connamespace IN ('public'::regnamespace,'auth'::regnamespace) ORDER BY 1,2`,
    functions: `SELECT p.oid::regprocedure::text signature,p.proacl::text acl,p.prosecdef,p.proconfig,md5(pg_get_functiondef(p.oid)) definition_md5 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','auth') ORDER BY 1`,
    roles: `SELECT rolname,rolsuper,rolbypassrls,rolinherit FROM pg_roles WHERE rolname IN ('postgres','anon','authenticated','service_role') ORDER BY 1`,
    schemas: `SELECT nspname,nspacl::text acl FROM pg_namespace WHERE nspname IN ('public','auth') ORDER BY 1`,
    defaults: `SELECT defaclrole::regrole::text role,defaclnamespace::regnamespace::text namespace,defaclobjtype,defaclacl::text acl FROM pg_default_acl ORDER BY 1,2,3`,
  }))
    result[key] = (await db.query(query)).rows;
  return result;
}
async function data(db) {
  const result = {};
  for (const name of names)
    result[name] = (
      await db.query(`SELECT to_jsonb(t) row FROM ${name} t ORDER BY to_jsonb(t)::text`)
    ).rows;
  return result;
}
async function snapshot(db) {
  return { catalog: await catalog(db), data: await data(db) };
}
async function withFixture(run) {
  const db = new PGlite("memory://");
  try {
    await db.exec(support);
    for (const selected of [
      sql.chat,
      sql.scope,
      sql.memberIndex,
      sql.member,
      sql.active,
      sql.chatPolicies,
      sql.messages,
      sql.messagePolicies,
      sql.notifications,
      ...Object.values(functions),
      ...grants,
      sql.notificationGuard,
      sql.touchAttach,
      sql.notifyAttach,
      sql.teamAttach,
    ])
      await db.exec(selected);
    // Reproduce only captured ACLs, retaining PUBLIC for the two membership
    // predicates from the preceding separate observation. No broad sweep runs.
    await db.exec(`REVOKE ALL ON public.chat_threads,public.chat_thread_members,public.chat_thread_messages,public.user_notifications FROM PUBLIC,anon,authenticated,service_role;
      GRANT ALL ON public.chat_threads,public.chat_thread_members,public.chat_thread_messages,public.user_notifications TO anon,authenticated,service_role;
      GRANT EXECUTE ON FUNCTION public.is_thread_member(uuid,uuid),public.is_active_thread_member(uuid,uuid) TO anon,authenticated,service_role;`);
    for (const record of observed.functions) {
      assert.match(record.signature, /^[a-z_]+\([a-z,\[\]]*\)$/);
      await db.exec(
        `REVOKE ALL ON FUNCTION public.${record.signature} FROM PUBLIC,anon,authenticated,service_role;`,
      );
      // Preserve exact captured ACL ordering, including service before auth for
      // mark_read/unread; full definitions/defaults/config fingerprints stay exact.
      for (const entry of record.acl.slice(1, -1).split(",")) {
        const role = entry.split("=")[0];
        if (role === "postgres") continue;
        assert.ok(role === "authenticated" || role === "service_role");
        await db.exec(`GRANT EXECUTE ON FUNCTION public.${record.signature} TO ${role};`);
      }
    }
    for (const key of [
      "creator",
      "active",
      "invited",
      "left",
      "stranger",
      "target",
      "invitedCreator",
      "missingCreator",
      "businessOwner",
    ]) {
      await db.query("INSERT INTO auth.users VALUES($1)", [id[key]]);
      await db.query("INSERT INTO public.public_profiles VALUES($1,NULL,$2)", [
        id[key],
        `${key} fixture label`,
      ]);
    }
    await db.query("INSERT INTO public.businesses VALUES($1,$2)", [id.business, id.businessOwner]);
    await db.query(
      "INSERT INTO public.chat_threads(id,title,created_by,business_id,kind,updated_at) VALUES($1,'A team',$2,$3,'team','2000-01-01Z'),($4,'B empty creator',$5,NULL,'group','2000-01-01Z'),($6,'C invited creator',$7,NULL,'group','2000-01-01Z'),($8,'D ordinary group',$2,NULL,'group','2000-01-01Z')",
      [id.a, id.creator, id.business, id.b, id.missingCreator, id.c, id.invitedCreator, id.d],
    );
    await db.query(
      "INSERT INTO public.chat_thread_members(thread_id,user_id,status,joined_at,last_read_at) VALUES($1,$2,'active','2000-01-01Z','2000-01-01Z'),($1,$3,'active','2000-01-01Z','2000-01-01Z'),($1,$4,'invited','2000-01-01Z','2000-01-01Z'),($1,$5,'left','2000-01-01Z','2000-01-01Z'),($6,$7,'invited','2000-01-01Z','2000-01-01Z'),($8,$2,'active','2000-01-01Z','2000-01-01Z'),($8,$3,'active','2000-01-01Z','2000-01-01Z')",
      [id.a, id.creator, id.active, id.invited, id.left, id.c, id.invitedCreator, id.d],
    );
    const before = await catalog(db);
    await run(db);
    assert.deepEqual(
      await catalog(db),
      before,
      "selected fixture permission/schema state, not global closure, preserved",
    );
  } finally {
    await db.close();
  }
}
async function actor(db, user, run, role = "authenticated") {
  assert.ok(role === "authenticated" || role === "anon");
  await db.exec(`BEGIN; SET LOCAL ROLE ${role};`);
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [user ?? ""]);
    const result = await run();
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
async function operator(db, user, run) {
  // Privileged fixture-only path for physical constraints unreachable through a
  // client's denied notify_user EXECUTE. This is not actor/API authorization.
  await db.exec("BEGIN");
  try {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [user]);
    const result = await run();
    await db.exec("COMMIT");
    return result;
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}
function queryRpc(db, name, args) {
  assert.ok(Object.hasOwn(functions, name));
  return db.query(
    `SELECT public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) result`,
    args,
  );
}
const rpc = (db, user, name, args, role) => actor(db, user, () => queryRpc(db, name, args), role);
const code = (expected, constraint) => (error) =>
  error.code === expected && (!constraint || error.constraint === constraint);
async function rejected(db, run, state, constraint) {
  const before = await snapshot(db);
  await assert.rejects(run(), code(state, constraint));
  assert.deepEqual(
    await snapshot(db),
    before,
    "explicit rollback restores earlier actual work and selected permission state",
  );
}
function voidResult(result) {
  assert.equal(result.rows.length, 1);
  assert.equal(result.fields[0].dataTypeID, 2278, "void OID, not changed-row confirmation");
  assert.deepEqual(Object.keys(result.rows[0]), ["result"]);
}
async function members(db, thread = id.a) {
  return (
    await db.query("SELECT * FROM public.chat_thread_members WHERE thread_id=$1 ORDER BY user_id", [
      thread,
    ])
  ).rows;
}
async function notifications(db) {
  return (await db.query("SELECT * FROM public.user_notifications ORDER BY user_id,category,id"))
    .rows;
}
async function member(db, user, thread = id.a) {
  return (await members(db, thread)).find((row) => row.user_id === user);
}
async function resetMember(db, user, status) {
  await db.query(
    "UPDATE public.chat_thread_members SET status=$1,joined_at='2000-01-01Z',last_read_at='2000-01-01Z' WHERE thread_id=$2 AND user_id=$3",
    [status, id.a, user],
  );
}
const send = (db, thread, sender, body = "literal fixture message") =>
  db.query(
    "INSERT INTO public.chat_thread_messages(thread_id,sender_id,body) VALUES($1,$2,$3) RETURNING id,thread_id,sender_id,body",
    [thread, sender, body],
  );

test(
  "five whole sources, unique selected writers/attachments and narrow catalog evidence remain pinned",
  options,
  () => {
    assert.equal(observed.projectRef, "wjxaajgvddtrxxtocxen");
    assert.equal(observed.observed_at_utc, "2026-10-14 23:34:25.907315");
    assert.equal(observed.functions.length, 11);
    assert.equal(observed.tables.length, 2);
    assert.match(observed.scope, /No application rows\/counts, function invocation or writes/);
    assert.throws(() => pin(sources.base + "\n", sha(sources.base), "tamper"), /LF pin drift/);
    assert.throws(
      () =>
        fn(
          functions.notify_user + "\n" + functions.notify_user,
          "notify_user",
          sha(functions.notify_user),
        ),
      /unique complete selection/,
    );
    assert.equal(sha(sources.base.replaceAll("\n", "\r\n")), sha(sources.base));
    assert.match(sql.notificationGuard, /current_setting\('role', true\) <> 'service_role'/);
    assert.doesNotMatch(functions.user_notifications_lock_columns, /NEW\.id/);
    assert.doesNotMatch(functions.tg_touch_chat_thread, /SECURITY DEFINER/);
    assert.doesNotMatch(
      [...Object.values(sql), ...Object.values(functions), ...grants].join("\n"),
      /CREATE PUBLICATION|business_staff|shop_manager|enqueue_email/i,
    );
  },
);

test(
  "saved SELECT verifies all11 function APIs/defaults/config/ACLs and two tables/four attachments exactly",
  options,
  async (t) => {
    await withFixture(async (db) => {
      const engine = (await db.query("SHOW server_version")).rows[0].server_version;
      t.diagnostic(
        `Memory PostgreSQL ${engine}; only NOT NULL constraint representation normalized.`,
      );
      assert.match(engine, /^18\./);
      const current = await metadata(db);
      assert.deepEqual(current.functions, observed.functions);
      for (const record of current.tables) {
        const expected = observed.tables.find((r) => r.table === record.table);
        assert.deepEqual(
          record.columns,
          expected.columns,
          "attnotnull/type/default/column ACL before PG18 normalization",
        );
        record.constraints = record.constraints.filter((r) => r.type !== "n");
      }
      assert.deepEqual(current.tables, observed.tables);
      const role = (
        await actor(db, id.active, () =>
          db.query(
            "SELECT current_user name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
          ),
        )
      ).rows[0];
      assert.deepEqual(role, { name: "authenticated", rolsuper: false, rolbypassrls: false });
    });
  },
);

test(
  "six writer EXECUTE/body guards distinguish anon denial from authenticated null-subject errors",
  options,
  async () => {
    await withFixture(async (db) => {
      const calls = [
        ["create_group_chat", ["Valid", []]],
        ["invite_to_thread", [id.a, []]],
        ["respond_to_thread_invite", [id.a, true]],
        ["leave_thread", [id.a]],
        ["mark_thread_read", [id.a]],
        ["mark_thread_unread", [id.a]],
      ];
      for (const [name, args] of calls) {
        await rejected(db, () => rpc(db, null, name, args), "P0001");
        await rejected(db, () => rpc(db, id.active, name, args, "anon"), "42501");
      }
      for (const name of [
        "tg_touch_chat_thread",
        "tg_notify_chat_thread_message",
        "trg_thread_message_notify",
        "user_notifications_lock_columns",
      ])
        await rejected(db, () => rpc(db, id.active, name, []), "42501");
      await rejected(
        db,
        () =>
          rpc(db, id.active, "notify_user", [
            id.target,
            "test",
            "Title",
            null,
            null,
            null,
            null,
            {},
          ]),
        "42501",
      );
    });
  },
);

test(
  "create validates titles but duplicate targets create two notifications for one membership",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const title of [null, "", "   "])
        await rejected(db, () => rpc(db, id.creator, "create_group_chat", [title, []]), "P0001");
      const created = (
        await rpc(db, id.creator, "create_group_chat", [
          "  Trimmed title  ",
          [id.target, id.target, id.creator, null],
        ])
      ).rows[0].result;
      assert.match(created, /^[0-9a-f-]{36}$/);
      assert.notEqual(created, id.a);
      assert.equal(
        (await db.query("SELECT title FROM public.chat_threads WHERE id=$1", [created])).rows[0]
          .title,
        "Trimmed title",
      );
      assert.deepEqual(
        (await members(db, created)).map((r) => [r.user_id, r.status]),
        [
          [id.creator, "active"],
          [id.target, "invited"],
        ],
      );
      const rows = await notifications(db);
      assert.equal(rows.length, 2);
      for (const row of rows) {
        assert.equal(row.user_id, id.target);
        assert.equal(row.category, "chat_invite");
        assert.equal(row.entity_id, created);
        assert.equal(row.read_at, null);
      }
      for (const array of [null, []]) {
        const thread = (await rpc(db, id.creator, "create_group_chat", ["x".repeat(96), array]))
          .rows[0].result;
        assert.equal((await members(db, thread)).length, 1);
      }
      assert.equal(
        (await notifications(db)).length,
        2,
        "no invented SQL80-char or member-array minimum limit",
      );
    });
  },
);

test(
  "invite requires active membership, counts only new rows and leaves existing-left members unchanged",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const [user, thread] of [
        [id.invited, id.a],
        [id.left, id.a],
        [id.invitedCreator, id.c],
        [id.missingCreator, id.b],
        [id.businessOwner, id.a],
        [id.stranger, id.a],
      ])
        await rejected(db, () => rpc(db, user, "invite_to_thread", [thread, []]), "P0001");
      assert.equal(
        (
          await rpc(db, id.active, "invite_to_thread", [
            id.a,
            [id.target, id.target, id.left, id.active, null, id.stranger],
          ])
        ).rows[0].result,
        2,
      );
      assert.equal((await member(db, id.left)).status, "left");
      assert.equal((await member(db, id.target)).status, "invited");
      assert.equal((await notifications(db)).length, 2);
      for (const array of [null, []])
        assert.equal(
          (await rpc(db, id.active, "invite_to_thread", [id.a, array])).rows[0].result,
          0,
        );
      for (const thread of [null, id.missing])
        await rejected(db, () => rpc(db, id.active, "invite_to_thread", [thread, null]), "P0001");
    });
  },
);

test(
  "respond true changes only invited while false/NULL decline any own status; repeated/missing void calls prove no count",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const status of ["invited", "active", "left"]) {
        for (const accept of [true, false, null]) {
          await resetMember(db, id.invited, status);
          const other = (await members(db)).filter((r) => r.user_id !== id.invited);
          const before = await member(db, id.invited);
          voidResult(await rpc(db, id.invited, "respond_to_thread_invite", [id.a, accept]));
          const after = await member(db, id.invited);
          assert.equal(
            after.status,
            accept === true ? (status === "invited" ? "active" : status) : "left",
          );
          if (accept === true && status === "invited")
            assert.ok(after.joined_at > before.joined_at);
          else assert.deepEqual(after.joined_at, before.joined_at);
          assert.deepEqual(
            (await members(db)).filter((r) => r.user_id !== id.invited),
            other,
          );
        }
      }
      for (const thread of [id.a, id.missing, null]) {
        const before = await data(db);
        voidResult(await rpc(db, id.stranger, "respond_to_thread_invite", [thread, true]));
        assert.deepEqual(await data(db), before);
      }
      await resetMember(db, id.invited, "invited");
      voidResult(await rpc(db, id.invited, "respond_to_thread_invite", [id.a, true]));
      const before = await data(db);
      voidResult(await rpc(db, id.invited, "respond_to_thread_invite", [id.a, true]));
      assert.deepEqual(await data(db), before);
    });
  },
);

test(
  "leave and mark_read affect own active/invited/left rows; missing/null targets return the same void shape unchanged",
  options,
  async () => {
    await withFixture(async (db) => {
      for (const status of ["active", "invited", "left"]) {
        await resetMember(db, id.invited, status);
        const other = (await members(db)).filter((r) => r.user_id !== id.invited);
        voidResult(await rpc(db, id.invited, "leave_thread", [id.a]));
        assert.equal((await member(db, id.invited)).status, "left");
        await resetMember(db, id.invited, status);
        const now = await actor(db, id.invited, async () => {
          const start = (await db.query("SELECT now() time")).rows[0].time;
          voidResult(await queryRpc(db, "mark_thread_read", [id.a]));
          return start;
        });
        assert.deepEqual((await member(db, id.invited)).last_read_at, now);
        assert.equal((await member(db, id.invited)).status, status);
        assert.deepEqual(
          (await members(db)).filter((r) => r.user_id !== id.invited),
          other,
        );
      }
      for (const name of ["leave_thread", "mark_thread_read"]) {
        for (const [user, thread] of [
          [id.stranger, id.a],
          [id.active, id.missing],
          [id.active, null],
          [id.active, id.b],
        ]) {
          const before = await data(db);
          voidResult(await rpc(db, user, name, [thread]));
          assert.deepEqual(await data(db), before);
        }
      }
      assert.deepEqual(
        await notifications(db),
        [],
        "membership read-state is not notification read-state",
      );
    });
  },
);

test(
  "unread uses exact other-sender max-minus1ms for active/invited/left, ignoring self and other-thread later messages",
  options,
  async () => {
    await withFixture(async (db) => {
      // Privileged synthetic message setup still runs all actual message triggers.
      await db.query(
        "INSERT INTO public.chat_thread_messages(thread_id,sender_id,body,created_at) VALUES($1,$2,'other earlier','2001-01-01Z'),($1,$2,'other latest','2002-01-01Z'),($1,$3,'self later','2003-01-01Z'),($4,$2,'other thread later','2099-01-01Z')",
        [id.a, id.creator, id.active, id.d],
      );
      for (const status of ["active", "invited", "left"]) {
        await resetMember(db, id.active, status);
        const before = await data(db);
        voidResult(await rpc(db, id.active, "mark_thread_unread", [id.a]));
        assert.equal(
          (await member(db, id.active)).last_read_at.toISOString(),
          "2001-12-31T23:59:59.999Z",
        );
        assert.equal((await member(db, id.active)).status, status);
        const after = await data(db);
        for (const table of names.filter((n) => n !== "public.chat_thread_members"))
          assert.deepEqual(after[table], before[table]);
        assert.deepEqual(
          after["public.chat_thread_members"].filter((r) => r.row.user_id !== id.active),
          before["public.chat_thread_members"].filter((r) => r.row.user_id !== id.active),
        );
      }
      const before = await data(db);
      voidResult(await rpc(db, id.stranger, "mark_thread_unread", [id.a]));
      assert.deepEqual(
        await data(db),
        before,
        "aggregate has no membership guard but returns no content/aggregate and no missing member mutation",
      );
    });
  },
);

test(
  "unread empty/self-only messages sets NULL; missing/null/cross-thread own-row misses are void no-ops",
  options,
  async () => {
    await withFixture(async (db) => {
      voidResult(await rpc(db, id.active, "mark_thread_unread", [id.a]));
      assert.equal((await member(db, id.active)).last_read_at, null);
      await resetMember(db, id.active, "active");
      await send(db, id.a, id.active, "self only");
      voidResult(await rpc(db, id.active, "mark_thread_unread", [id.a]));
      assert.equal((await member(db, id.active)).last_read_at, null);
      for (const thread of [id.b, id.missing, null]) {
        const before = await data(db);
        voidResult(await rpc(db, id.active, "mark_thread_unread", [thread]));
        assert.deepEqual(await data(db), before);
      }
    });
  },
);

test(
  "direct message INSERT runs BOTH fanouts on team/group; invoker touch updates creator but not active noncreator",
  options,
  async () => {
    await withFixture(async (db) => {
      const old = (await db.query("SELECT updated_at FROM public.chat_threads WHERE id=$1", [id.a]))
        .rows[0].updated_at;
      const first = await actor(db, id.active, () =>
        send(db, id.a, id.active, "<literal> active message"),
      );
      assert.equal(first.affectedRows, 1);
      assert.equal(first.rows.length, 1);
      assert.deepEqual(
        (await db.query("SELECT updated_at FROM public.chat_threads WHERE id=$1", [id.a])).rows[0]
          .updated_at,
        old,
      );
      let rows = await notifications(db);
      assert.equal(rows.length, 2);
      assert.deepEqual(rows.map((r) => r.category).sort(), ["chat_message", "team_chat"]);
      assert.ok(rows.every((r) => r.user_id === id.creator));
      assert.ok(rows.some((r) => r.body.includes("<literal> active message")));
      await actor(db, id.creator, () => send(db, id.a, id.creator));
      assert.ok(
        (await db.query("SELECT updated_at FROM public.chat_threads WHERE id=$1", [id.a])).rows[0]
          .updated_at > old,
      );
      await actor(db, id.active, () => send(db, id.d, id.active));
      rows = await notifications(db);
      assert.equal(rows.length, 6);
      assert.equal(
        rows.filter((r) => r.entity_id === id.d).length,
        2,
        "neither notifier filters to kind=team",
      );
      assert.ok(rows.every((r) => r.user_id !== id.invited && r.user_id !== id.left));
    });
  },
);

test(
  "direct send/SELECT policies distinguish active, invited, left, stranger, null and spoofed sender",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, id.active, () => send(db, id.a, id.active));
      for (const user of [id.invited, id.left, id.stranger, null])
        await rejected(db, () => actor(db, user, () => send(db, id.a, user ?? id.active)), "42501");
      await rejected(db, () => actor(db, id.active, () => send(db, id.a, id.creator)), "42501");
      for (const [user, count] of [
        [id.active, 1],
        [id.invited, 1],
        [id.left, 0],
        [id.stranger, 0],
      ])
        assert.equal(
          (
            await actor(db, user, () =>
              db.query("SELECT id FROM public.chat_thread_messages WHERE thread_id=$1", [id.a]),
            )
          ).rows.length,
          count,
        );
      const before = await data(db);
      for (const statement of [
        "UPDATE public.chat_thread_messages SET body='changed'",
        "DELETE FROM public.chat_thread_messages",
      ]) {
        const result = await actor(db, id.active, () => db.query(statement));
        assert.equal(result.affectedRows, 0);
        assert.deepEqual(result.rows, []);
      }
      assert.deepEqual(await data(db), before);
    });
  },
);

test(
  "notification guard permits own read_at and unprotected id but rejects protected fields; other-owner writes affect zero",
  options,
  async () => {
    await withFixture(async (db) => {
      await actor(db, id.active, () => send(db, id.a, id.active));
      const notification = (await notifications(db))[0];
      assert.equal(notification.user_id, id.creator);
      const own = await actor(db, id.creator, () =>
        db.query(
          "UPDATE public.user_notifications SET read_at='2005-01-01Z' WHERE id=$1 RETURNING id",
          [notification.id],
        ),
      );
      assert.equal(own.affectedRows, 1);
      assert.equal(own.rows.length, 1);
      const before = await data(db);
      const denied = await actor(db, id.active, () =>
        db.query("UPDATE public.user_notifications SET read_at=now() WHERE id=$1 RETURNING id", [
          notification.id,
        ]),
      );
      assert.equal(denied.affectedRows, 0);
      assert.deepEqual(await data(db), before);
      for (const [assignment, value] of [
        ["title", "Changed"],
        ["body", "Changed"],
        ["category", "changed"],
        ["link_url", "/changed"],
        ["metadata", {}],
        ["user_id", id.active],
        ["entity_type", "changed"],
        ["entity_id", id.missing],
        ["created_at", "2006-01-01Z"],
      ])
        await rejected(
          db,
          () =>
            actor(db, id.creator, () =>
              db.query(`UPDATE public.user_notifications SET ${assignment}=$1 WHERE id=$2`, [
                value,
                notification.id,
              ]),
            ),
          "P0001",
        );
      const changed = await actor(db, id.creator, () =>
        db.query("UPDATE public.user_notifications SET id=$1 WHERE id=$2 RETURNING id", [
          id.message,
          notification.id,
        ]),
      );
      assert.equal(changed.affectedRows, 1);
      assert.deepEqual(changed.rows, [{ id: id.message }]);
      assert.equal(
        (await db.query("SELECT id FROM public.user_notifications WHERE id=$1", [notification.id]))
          .rows.length,
        0,
        "literal current guard omits NEW.id; not a mitigation",
      );
      await rejected(
        db,
        () =>
          actor(db, id.creator, () =>
            db.query(
              "INSERT INTO public.user_notifications(user_id,category,title) VALUES($1,'test','Title')",
              [id.creator],
            ),
          ),
        "42501",
      );
    });
  },
);

test(
  "direct notify_user is denied while real definer fanout succeeds; default/NULL metadata and NULL-recipient operator controls",
  options,
  async () => {
    await withFixture(async (db) => {
      await rejected(
        db,
        () =>
          rpc(db, id.active, "notify_user", [
            id.target,
            "test",
            "Title",
            null,
            null,
            null,
            null,
            {},
          ]),
        "42501",
      );
      await actor(db, id.active, () => send(db, id.a, id.active));
      assert.deepEqual((await notifications(db)).map((r) => r.category).sort(), [
        "chat_message",
        "team_chat",
      ]);
      await operator(db, id.creator, async () => {
        voidResult(
          await queryRpc(db, "notify_user", [id.target, "test", "Default", null, null, null, null]),
        );
        voidResult(
          await queryRpc(db, "notify_user", [
            id.target,
            "test",
            "Null metadata",
            null,
            null,
            null,
            null,
            null,
          ]),
        );
      });
      assert.ok(
        (await notifications(db))
          .filter((r) => r.user_id === id.target)
          .every((r) => JSON.stringify(r.metadata) === "{}"),
      );
      const before = await data(db);
      await operator(db, id.creator, () =>
        queryRpc(db, "notify_user", [null, "test", "Ignored", null, null, null, null]),
      );
      assert.deepEqual(await data(db), before);
      const role = (
        await actor(db, id.creator, () =>
          db.query("SELECT current_user actor,current_setting('role',true) role_setting"),
        )
      ).rows[0];
      assert.deepEqual(role, { actor: "authenticated", role_setting: "authenticated" });
      // Guard WHEN uses mutable session role setting, not an immutable original
      // human identity; no claim that this fixture proves its complete call chain.
    });
  },
);

test(
  "late invalid recipient rolls back earlier real create/invite memberships and notification inserts",
  options,
  async () => {
    await withFixture(async (db) => {
      await rejected(
        db,
        () => rpc(db, id.creator, "create_group_chat", ["Atomic create", [id.target, id.missing]]),
        "23503",
        "chat_thread_members_user_id_fkey",
      );
      await rejected(
        db,
        () => rpc(db, id.active, "invite_to_thread", [id.a, [id.target, id.missing]]),
        "23503",
        "chat_thread_members_user_id_fkey",
      );
      for (const [recipient, title, state, constraint] of [
        [id.missing, "Title", "23503", "user_notifications_user_id_fkey"],
        [id.target, null, "23502", null],
      ])
        await rejected(
          db,
          () =>
            operator(db, id.creator, async () => {
              await queryRpc(db, "create_group_chat", [
                "Earlier real operator work",
                [id.stranger],
              ]);
              assert.ok(
                (await notifications(db)).some(
                  (row) => row.user_id === id.stranger && row.category === "chat_invite",
                ),
                "earlier actual notification insert occurred before later physical failure",
              );
              await queryRpc(db, "notify_user", [recipient, "test", title, null, null, null, null]);
            }),
          state,
          constraint,
        );
    });
  },
);

test(
  "actual message CHECK/PK/FK and notification PK failures restore earlier real message fanouts/timestamps",
  options,
  async () => {
    await withFixture(async (db) => {
      await rejected(
        db,
        () =>
          actor(db, id.creator, async () => {
            await send(db, id.a, id.creator);
            await db.query(
              "INSERT INTO public.chat_thread_messages(thread_id,sender_id,attachment_type) VALUES($1,$2,'audio')",
              [id.a, id.creator],
            );
          }),
        "23514",
        "chat_thread_messages_attachment_type_check",
      );
      await actor(db, id.creator, () =>
        db.query(
          "INSERT INTO public.chat_thread_messages(id,thread_id,sender_id,body) VALUES($1,$2,$3,'Existing')",
          [id.message, id.a, id.creator],
        ),
      );
      await rejected(
        db,
        () =>
          actor(db, id.creator, async () => {
            await send(db, id.a, id.creator);
            await db.query(
              "INSERT INTO public.chat_thread_messages(id,thread_id,sender_id) VALUES($1,$2,$3)",
              [id.message, id.a, id.creator],
            );
          }),
        "23505",
        "chat_thread_messages_pkey",
      );
      await rejected(
        db,
        () =>
          operator(db, id.creator, async () => {
            await send(db, id.a, id.creator);
            await db.query(
              "INSERT INTO public.chat_thread_messages(thread_id,sender_id) VALUES($1,$2)",
              [id.a, id.missing],
            );
          }),
        "23503",
        "chat_thread_messages_sender_id_fkey",
      );
      const existing = (await notifications(db))[0];
      await rejected(
        db,
        () =>
          operator(db, id.creator, async () => {
            await send(db, id.a, id.creator);
            await db.query(
              "INSERT INTO public.user_notifications(id,user_id,category,title) VALUES($1,$2,'test','Duplicate')",
              [existing.id, id.creator],
            );
          }),
        "23505",
        "user_notifications_pkey",
      );
    });
  },
);
