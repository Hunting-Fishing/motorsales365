// STATIC body correspondence only. No SQL execution, source-history adoption,
// repaired authority, full function-header equivalence or bootstrap behavior.
import fs from "node:fs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = new URL("../../../", import.meta.url);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const md5 = (s) => createHash("md5").update(s).digest("hex");
const sourcePins = {
  roles: [
    "20260501224406_1fde4d15-467c-4a50-a39e-089c25417e52",
    "53dd7b960d83bbda344e9a1bb266c13ac4885b627ec2ca96e6fc96d2ceaa0bc7",
  ],
  founding: [
    "20260511140558_454c66c4-559a-4ae6-8a0b-2474942813d1",
    "6f5fabb2bbfb801964bbdf01d12c6bc6fb536b11e78ac40290c19f6a550bc6e1",
  ],
  moderation: [
    "20260512023916_08c3429a-e992-4bc3-ae1c-118ace98df45",
    "eb1890a93e8bb1698619587218698f3c4eddb6bc8422d89930fa98ca192b46f6",
  ],
  trial: [
    "20260522104711_7af12507-0ffa-4809-b770-7c0d2419c318",
    "5e554cdd401307757a589d923cc84d75a1ed2b56530e80963d85fb72cd444d49",
  ],
  foundingRevision: [
    "20260529103420_2638953d-9d10-4fb6-a50b-b469e593a1ec",
    "3fe02ccb75f5e6201ebb8dec2fa11d1ce5bc4aafe85a54c15ab050d3b2cb037e",
  ],
  autoOrg: [
    "20260609150719_b8b702f6-20b1-4370-be4d-32ae44284712",
    "8a9072b7673b7432746f951f38eaa4db64531f830c99315cdbca28f32f31bb91",
  ],
  member: [
    "20260615031547_8dcbb6a4-32d5-47c7-9ba9-bcfcb23177aa",
    "2a50b30a8d440ce2a0756a375cc236ddfeed98de96ad58c0c10f51c856dfd203",
  ],
  assignment: [
    "20260619191109_b6c5a81a-a8ea-4168-b767-e1e21a1b67c9",
    "af6fba63a04970e5d3b634f92b3b8e203cecead708e372e5a2df4285d1f987d0",
  ],
  support: [
    "20260621050736_a2046304-e3c7-4094-8d9c-f4974e0c65b9",
    "0107318078c8cc10eda54e9b75d996298dcbd6a7dbdfe02bb6679c6d77796764",
  ],
  updated: [
    "20260626070030_62255aec-1325-404a-a557-670626029309",
    "e6c6c4956837d4861698eb95aa7709962fc0783440cc0df513ea2d86afe463fa",
  ],
  timestamp: [
    "20260627150439_5c3d6dc8-8f14-45b1-9eb3-dc261579364b",
    "904dca2383a666cdae96b1723e744f257f63c723d4695040214af61c34d49b77",
  ],
  accreditation: [
    "20260706042027_d7ff3b5e-60ff-4d87-ad68-c6934d53d076",
    "edc61be0bec4265ad933e6a22c834e2103aa61f07fd9e1a951ffe84f0170ed71",
  ],
  referral: [
    "20260706042342_a2a3a3d6-6594-4d25-9a6b-2e02e5dff27f",
    "019dd0d9230a20288119a57e3f7c0828939dbe73116aaea09f5bbfb43ec99b8a",
  ],
  derive: [
    "20260706045048_1725132d-d311-46a4-8ce9-cffcca83cb5d",
    "0078df2357ddae0393eda7cb23a4287db197cc5d9eb1fb3b28f2c830c50208e8",
  ],
  shortRecompute: [
    "20260706045431_7f2e9b7f-0a44-499c-8482-f19f453b658d",
    "f4643172360cc82862552b0039bd812a57bae0bb22c64e35eb6ec35db6624bee",
  ],
  recompute: [
    "20260706045715_97c676ff-485d-46a0-a0e6-cc08a8da583d",
    "90863c60422c966f01821532924ea46025ce5eecf2e71aa67b548a4ba762f493",
  ],
  auth: [
    "20260707070949_d718892b-ccd8-45c4-a81b-058bb9b75211",
    "9073196a2c1c29302ff19ed28a699dfbf836b4efd9391e7154405125ad6b45f8",
  ],
  manager: [
    "20260707080025_262f0b57-b8aa-4af5-bab2-cfddbda4264d",
    "20a16b6bdf8262af8429e6b623ca008e6a1ae640f585aeeda02f5203f8aa247c",
  ],
  profileIntent: [
    "20260708153505_f6b6ac7a-c38a-43cb-be5e-2e6be4cacbd3",
    "b1a31ad4a3e02df7e49c5af99cad755de0d1db53b0c36671fc02338049116098",
  ],
};
const sources = Object.fromEntries(
  Object.entries(sourcePins).map(([key, [name, hash]]) => {
    const path = `supabase/migrations/${name}.sql`;
    const bytes = fs.readFileSync(new URL(path, root));
    assert.ok(bytes.length > 0 && bytes.length < 512 * 1024, path);
    const text = bytes.toString("utf8").replaceAll("\r\n", "\n");
    assert.equal(sha(text), hash, path);
    return [key, text];
  }),
);
const mappings = {
  "public.has_role(uuid,public.app_role)": "roles",
  "public.can_moderate(uuid)": "moderation",
  "public.can_support(uuid)": "support",
  "public.is_sales_assigned_user(uuid,uuid)": "assignment",
  "public.assign_founding_member()": "foundingRevision",
  "public.grant_founding_bronze()": "founding",
  "public.grant_business_trial()": "trial",
  "public.assign_profile_member_number()": "member",
  "public.tg_auto_create_seller_org()": "autoOrg",
  "public.tg_set_updated_at()": "timestamp",
  "public.update_updated_at_column()": "updated",
  "public.accredit_staff_partner(uuid)": "accreditation",
  "public.tg_auth_user_staff_accredit()": "accreditation",
  "public.attach_signup_referral()": "referral",
  "public.derive_signup_intent(uuid)": "derive",
  "public.recompute_signup_intent(uuid)": "shortRecompute",
  "public.recompute_signup_intent(uuid,text,text,text,text,text,text)": "recompute",
  "public.handle_new_user()": "auth",
  "public.canonical_365_org_id()": "auth",
  "public.is_internal_365_email(text)": "auth",
  "public.is_internal_365_staff(uuid)": "auth",
  "public.block_internal_staff_org()": "auth",
  "public.canonical_365_admin_id()": "manager",
  "public.set_internal_staff_manager()": "manager",
  "public.trg_profiles_recompute_intent()": "profileIntent",
};
const body = {},
  manifest = {};
for (const [signature, source] of Object.entries(mappings)) {
  const raw = sources[source],
    name = signature.slice("public.".length).split("(")[0];
  const marker = `CREATE OR REPLACE FUNCTION public.${name}(`;
  assert.equal(raw.split(marker).length, 2, signature);
  const first = raw.indexOf(marker),
    header = raw.slice(first);
  const match = header.match(/\bAS\s+(\$[a-z_]*\$)([\s\S]*?)\1/i);
  assert.ok(match, signature);
  body[signature] = match[2];
  manifest[signature] = {
    source,
    path: `supabase/migrations/${sourcePins[source][0]}.sql`,
    firstLine: raw.slice(0, first).split("\n").length,
    bodyMd5Lf: md5(match[2]),
    bodySha256Lf: sha(match[2]),
    bodyBytes: Buffer.byteLength(match[2]),
  };
}
const missing = [
  "public.can_manage_org(uuid,uuid)",
  "public.is_org_member(uuid,uuid)",
  "public.tg_org_add_creator_as_owner()",
];
export { sources, sourcePins, mappings, manifest, body, missing };
