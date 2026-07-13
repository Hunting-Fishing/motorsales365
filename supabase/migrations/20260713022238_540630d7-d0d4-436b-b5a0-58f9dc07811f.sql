
-- =========================================================
-- Document Check: schema
-- =========================================================

CREATE TABLE public.doc_check_countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL,
  region TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT,
  currency TEXT,
  drives_on TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doc_check_countries TO anon, authenticated;
GRANT ALL ON public.doc_check_countries TO service_role;
ALTER TABLE public.doc_check_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published countries" ON public.doc_check_countries
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage countries" ON public.doc_check_countries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.doc_check_countries(code) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('quick_guide','buying','selling','import','export','insurance','documents')),
  title TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 100,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX doc_check_sections_country_kind_idx ON public.doc_check_sections(country_code, kind, sort_order);
GRANT SELECT ON public.doc_check_sections TO anon, authenticated;
GRANT ALL ON public.doc_check_sections TO service_role;
ALTER TABLE public.doc_check_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published sections" ON public.doc_check_sections
  FOR SELECT USING (is_published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage sections" ON public.doc_check_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.doc_check_countries(code) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description_md TEXT NOT NULL DEFAULT '',
  who_issues TEXT,
  typical_cost TEXT,
  validity TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, code)
);
GRANT SELECT ON public.doc_check_documents TO anon, authenticated;
GRANT ALL ON public.doc_check_documents TO service_role;
ALTER TABLE public.doc_check_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read documents" ON public.doc_check_documents
  FOR SELECT USING (true);
CREATE POLICY "admin manage documents" ON public.doc_check_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_agency_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES public.doc_check_countries(code) ON DELETE CASCADE,
  section_kind TEXT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doc_check_agency_links TO anon, authenticated;
GRANT ALL ON public.doc_check_agency_links TO service_role;
ALTER TABLE public.doc_check_agency_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read agency links" ON public.doc_check_agency_links
  FOR SELECT USING (true);
CREATE POLICY "admin manage agency links" ON public.doc_check_agency_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doc_check_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  country_code TEXT,
  entity TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.doc_check_audit_log TO authenticated;
GRANT ALL ON public.doc_check_audit_log TO service_role;
ALTER TABLE public.doc_check_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.doc_check_audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert audit" ON public.doc_check_audit_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_doc_check_countries_updated BEFORE UPDATE ON public.doc_check_countries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_check_sections_updated BEFORE UPDATE ON public.doc_check_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_doc_check_documents_updated BEFORE UPDATE ON public.doc_check_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Seed: countries
-- =========================================================

INSERT INTO public.doc_check_countries (code, name, flag_emoji, region, slug, summary, currency, drives_on, sort_order, is_published) VALUES
  ('ph','Philippines','🇵🇭','Southeast Asia','ph','Vehicle transfer and registration is administered by the Land Transportation Office (LTO). Comprehensive third-party liability (CTPL) insurance is mandatory.','PHP','right', 1, true),
  ('sg','Singapore','🇸🇬','Southeast Asia','sg','Vehicles are administered by LTA. Ownership transfer, COE, and PARF rules apply.','SGD','left', 10, true),
  ('my','Malaysia','🇲🇾','Southeast Asia','my','JPJ manages registration and title transfer. Puspakom inspection is required for used-vehicle transfers.','MYR','left', 11, true),
  ('th','Thailand','🇹🇭','Southeast Asia','th','Department of Land Transport (DLT) handles vehicle transfer, CTPL (Por Ror Bor), and green book updates.','THB','left', 12, true),
  ('vn','Vietnam','🇻🇳','Southeast Asia','vn','Traffic Police handle registration transfer. Import restrictions on used vehicles are strict.','VND','right', 13, true),
  ('id','Indonesia','🇮🇩','Southeast Asia','id','SAMSAT / Korlantas Polri handle STNK/BPKB transfers and annual tax.','IDR','left', 14, true),
  ('us','United States','🇺🇸','North America','us','Vehicle title and registration are handled state-by-state via the DMV. Emissions and safety standards set by NHTSA/EPA.','USD','right', 20, true),
  ('ca','Canada','🇨🇦','North America','ca','Registration is provincial (ICBC, SAAQ, ServiceOntario, etc.). Transport Canada sets federal standards.','CAD','right', 21, true),
  ('uk','United Kingdom','🇬🇧','Europe','uk','DVLA manages V5C logbooks, MOT, and vehicle tax. Import from EU has post-Brexit VAT/duty rules.','GBP','left', 30, true),
  ('de','Germany','🇩🇪','Europe','de','Kfz-Zulassungsstelle handles registration. TÜV/DEKRA inspection required. EU-wide type approval applies.','EUR','right', 31, true),
  ('fr','France','🇫🇷','Europe','fr','ANTS online system for carte grise. Contrôle technique (CT) required every 2 years for used cars.','EUR','right', 32, true),
  ('nl','Netherlands','🇳🇱','Europe','nl','RDW manages kenteken registration. APK inspection mandatory. BPM tax on imports.','EUR','right', 33, true),
  ('es','Spain','🇪🇸','Europe','es','DGT handles transfer of ownership. ITV inspection required. Registration tax on imports.','EUR','right', 34, true),
  ('it','Italy','🇮🇹','Europe','it','Motorizzazione Civile and PRA manage title transfer. Revisione inspection every 2 years.','EUR','right', 35, true),
  ('jp','Japan','🇯🇵','East Asia','jp','Land Transport Bureau handles Shaken inspection and registration. Export deregistration for JDM exports.','JPY','left', 40, true),
  ('kr','South Korea','🇰🇷','East Asia','kr','KOROAD / MOLIT regulate vehicle transfer. Emissions and export certificates required for used exports.','KRW','right', 41, true),
  ('au','Australia','🇦🇺','Oceania','au','State-based rego (VicRoads, TfNSW, Qld TMR, etc.). Strict import rules under RAWS/SEVS.','AUD','left', 50, true),
  ('nz','New Zealand','🇳🇿','Oceania','nz','Waka Kotahi NZTA handles registration and WoF. Compliance inspection required on import.','NZD','left', 51, true);

-- =========================================================
-- Seed: Philippines full content
-- =========================================================

INSERT INTO public.doc_check_sections (country_code, kind, title, body_md, sort_order, is_published) VALUES
  ('ph','quick_guide','Quick Guide — Buying a used vehicle in the Philippines',
$MD$
This is the fast checklist buyers should complete before handing over any payment. Full details live in the sections below.

1. **Verify OR and CR match** — both documents must show the seller's name, and the plate, chassis (VIN), and engine numbers must match the vehicle in person.
2. **Confirm chassis and engine numbers** — check under the hood and on the frame. Numbers must be crisp, not restamped or ground.
3. **Ask for PNP-HPG Motor Vehicle Clearance** — required before transfer at LTO. Confirms the unit is not stolen or encumbered.
4. **Check for encumbrance** — the CR must be marked "No Encumbrance" (or the bank release must be attached if it was financed).
5. **Notarized Deed of Sale** — both parties sign in front of a notary public. Bring 2 valid government IDs each.
6. **Valid CTPL insurance** — Compulsory Third-Party Liability must be active. Buyer typically renews upon transfer.
7. **Recent Emission Test** — required to renew registration.
8. **Transfer at LTO within 30 days** — the buyer files the change of ownership at the LTO district office that has jurisdiction.
9. **Use traceable payment** — bank transfer, GCash, Maya, or manager's check. Avoid large cash.
10. **Meet in a safe, public place** — daylight, well-lit, ideally with a companion or mechanic.
$MD$, 1, true),

  ('ph','buying','Buying & transferring ownership',
$MD$
The Philippines transfers vehicle ownership through the Land Transportation Office (LTO). The buyer is responsible for filing the transfer within 30 days of the Deed of Sale.

**Required documents (buyer files these at LTO):**
- Original OR (Official Receipt) and CR (Certificate of Registration)
- Notarized Deed of Absolute Sale
- PNP-HPG Motor Vehicle Clearance (macro-etching + records check)
- Latest Emission Test Result
- CTPL insurance (Compulsory Third-Party Liability)
- Buyer and seller valid IDs (2 each)
- TIN of both parties
- Duty-paid stamp / release papers if imported

**Typical LTO transfer fees (2026):**
- Transfer fee: ₱150
- Change of ownership: ~₱50
- IT service fee, computer fee, and legal fees: ~₱169
- Total including PNP clearance and notarization: **₱1,500 – ₱3,500** depending on region

**Timeline:** 1–2 hours at LTO if papers are complete. Same-day plate release for renewals.
$MD$, 10, true),

  ('ph','selling','Selling & releasing liability',
$MD$
Once the buyer takes possession, the seller should protect themselves from future liability (traffic tickets, accidents, or unpaid registration) filed under the old owner's name.

**Seller checklist:**
- Prepare a **Notarized Deed of Sale** — keep a signed original for your records.
- Photocopy the buyer's IDs and take a photo of buyer + vehicle + plate together.
- Surrender **only photocopies** of OR/CR at signing; hand over originals only when payment clears.
- File a **"Sold" report** at your LTO district office (Report of Sale) so the vehicle is flagged as transferred if the buyer delays registration.
- Cancel your CTPL insurance or transfer it to the buyer.
- Save the transaction record for at least 3 years.
$MD$, 20, true),

  ('ph','import','Import laws',
$MD$
Philippine used-vehicle imports are heavily restricted. Only specific channels are permitted.

**Restrictions:**
- Executive Order 156 prohibits importation of used motor vehicles into the customs territory (with narrow exceptions).
- **Allowed:** returning residents (balikbayan) who owned the vehicle abroad for at least 12 months, diplomats, and vehicles imported through the Subic Bay Freeport Zone (SBFZ) or Cagayan Special Economic Zone.
- Left-hand-drive only. Right-hand-drive conversion is prohibited on public roads.
- Age caps vary by channel; SBFZ historically allowed vehicles up to ~5 years old.

**Duties & taxes (BOC):**
- Import duty: 30% (used) or 30% (new, ASEAN preferential rates may apply under ATIGA)
- VAT: 12%
- Excise tax: 4% – 50% based on net manufacturer's price
- Ad valorem tax on luxury vehicles

**Homologation:** DTI-BPS / DENR emissions compliance required for road use.
$MD$, 30, true),

  ('ph','export','Export laws',
$MD$
Vehicles registered in the Philippines can be exported after LTO deregistration.

**Steps:**
1. Settle any outstanding registration or Alarm Report at LTO.
2. Obtain a **PNP-HPG Motor Vehicle Clearance** confirming the unit is clear.
3. Apply for LTO **Certificate of Deregistration** for export.
4. File a **BOC Export Declaration** with commercial invoice and packing list.
5. Book with a licensed customs broker for RoRo or container shipment.
6. Buyer's country requirements (age caps, LHD/RHD, homologation) must be met before shipment.

**ATA Carnet** — for temporary export (rallies, shows, motorsport), the Philippine Chamber of Commerce and Industry (PCCI) issues carnets.
$MD$, 40, true),

  ('ph','insurance','Insurance',
$MD$
**Mandatory: CTPL** (Compulsory Third-Party Liability) — covers bodily injury or death to third parties, up to ₱100,000 per victim. Required for every vehicle registration renewal. Typical cost: ₱600–₱1,200 per year for private cars.

**Optional: Comprehensive** — covers own damage, theft, acts of nature, third-party property damage, and personal accident. Typical cost: 1.5%–3% of the vehicle's fair market value per year.

**Common local providers:** Malayan, Standard Insurance, Prudential Guarantee, FPG, Charter Ping An, MAPFRE Insular, Stronghold, PGA Sompo.

**Insurance Commission (IC)** regulates all motor insurance in the Philippines. Complaints can be filed at insurance.gov.ph.
$MD$, 50, true),

  ('ph','documents','Document reference',
$MD$
Below is a quick summary of the documents Filipino buyers and sellers encounter. Full descriptions are in the Document Reference table on this page.
$MD$, 60, true);

-- PH documents
INSERT INTO public.doc_check_documents (country_code, code, name, description_md, who_issues, typical_cost, validity, sort_order) VALUES
  ('ph','or','Official Receipt (OR)','Proof that the current year''s registration fees, CTPL, and emissions were paid. Renewed annually.','LTO','₱2,500 – ₱8,000 per year','1 year',10),
  ('ph','cr','Certificate of Registration (CR)','The vehicle''s title equivalent — shows the registered owner, plate, chassis, and engine numbers, and encumbrance status.','LTO','Included with registration','Lifetime (updated on transfer)',20),
  ('ph','deed_of_sale','Notarized Deed of Absolute Sale','Legal document transferring ownership from seller to buyer. Must be signed in front of a notary public with 2 valid IDs each.','Notary Public','₱200 – ₱500 notarial fee','N/A',30),
  ('ph','pnp_hpg','PNP-HPG Motor Vehicle Clearance','Confirms the unit is not stolen, carnapped, or wanted. Includes macro-etching of chassis and engine numbers.','PNP Highway Patrol Group','₱300 – ₱600','2 months',40),
  ('ph','emission','Emission Test Certificate','Confirms the vehicle meets Philippine Clean Air Act emission standards.','LTO-accredited PETCs','₱450 – ₱600','60 days',50),
  ('ph','ctpl','CTPL Insurance Certificate','Compulsory Third-Party Liability. Mandatory for every registration.','Insurance provider (IC-regulated)','₱600 – ₱1,200','1 year',60),
  ('ph','valid_id','Two valid government IDs','Any two of: PhilID, Passport, Driver''s License, UMID, PRC, Postal ID. Required by both notary and LTO.','Government agencies','Free – ₱500','Varies',70),
  ('ph','tin','TIN (Tax Identification Number)','Required on the Deed of Sale and LTO transfer form.','BIR','Free','Lifetime',80);

-- PH agency links
INSERT INTO public.doc_check_agency_links (country_code, section_kind, label, url, sort_order) VALUES
  ('ph', NULL, 'Land Transportation Office (LTO)', 'https://lto.gov.ph', 10),
  ('ph', NULL, 'Bureau of Customs (BOC)', 'https://customs.gov.ph', 20),
  ('ph', NULL, 'Insurance Commission', 'https://insurance.gov.ph', 30),
  ('ph', NULL, 'DTI Fair Trade Enforcement Bureau', 'https://dti.gov.ph/fair-trade/', 40),
  ('ph', NULL, 'PNP Highway Patrol Group', 'https://hpg.pnp.gov.ph', 50),
  ('ph', 'import', 'BOC Import Assessment', 'https://customs.gov.ph/import-assessment/', 60),
  ('ph', 'export', 'BOC Export Guidelines', 'https://customs.gov.ph/export/', 70);

-- Stub sections for each other country: a Quick Guide placeholder and empty other sections
INSERT INTO public.doc_check_sections (country_code, kind, title, body_md, sort_order, is_published)
SELECT c.code, 'quick_guide', 'Quick Guide — ' || c.name,
       'Content for ' || c.name || ' is being compiled. If you have local expertise in vehicle transfer, insurance, or import/export laws for ' || c.name || ', please contact us and we will credit your contribution.',
       1, true
FROM public.doc_check_countries c
WHERE c.code <> 'ph';
