// Curated directory of advertisement networks and affiliate programs
// for the Philippines / SEA / global market. Used in /admin/shop directory tab.

export type DirectoryEntry = {
  name: string;
  url: string;
  category: string;
  region: string;
  payout: string;
  notes: string;
  difficulty: "easy" | "medium" | "hard"; // approval difficulty
};

export const AD_NETWORKS: DirectoryEntry[] = [
  { name: "Google AdSense", url: "https://www.google.com/adsense/start/", category: "Display ads", region: "Global", payout: "CPC / CPM", notes: "Industry standard. Requires original content + decent traffic. Pays via bank/wire.", difficulty: "medium" },
  { name: "Ezoic", url: "https://www.ezoic.com/", category: "Display ads", region: "Global", payout: "CPM (EPMV)", notes: "AI ad optimization. No traffic minimum (Access Now tier). Higher RPM than AdSense.", difficulty: "easy" },
  { name: "Mediavine", url: "https://www.mediavine.com/", category: "Display ads (premium)", region: "Global", payout: "CPM", notes: "Premium network. Requires 50k sessions/month. Best RPMs in industry.", difficulty: "hard" },
  { name: "Raptive (AdThrive)", url: "https://raptive.com/", category: "Display ads (premium)", region: "Global", payout: "CPM", notes: "Premium. Requires 100k pageviews/month. Top-tier earnings.", difficulty: "hard" },
  { name: "Media.net", url: "https://www.media.net/", category: "Contextual ads", region: "Global", payout: "CPC", notes: "Yahoo/Bing ad network. Good AdSense alternative/complement.", difficulty: "medium" },
  { name: "Monumetric", url: "https://monumetric.com/", category: "Display ads", region: "Global", payout: "CPM", notes: "Requires 10k pageviews/month. $99 setup fee under 80k views.", difficulty: "medium" },
  { name: "PropellerAds", url: "https://propellerads.com/", category: "Push / pop / native", region: "Global", payout: "CPM / CPC / CPA", notes: "No traffic minimum. Accepts most sites. Lower quality but easy approval.", difficulty: "easy" },
  { name: "Adsterra", url: "https://adsterra.com/", category: "Display / popunder / native", region: "Global", payout: "CPM / CPA", notes: "No minimum traffic. 100% fill rate. Pays weekly.", difficulty: "easy" },
  { name: "Infolinks", url: "https://www.infolinks.com/", category: "In-text ads", region: "Global", payout: "CPC / CPM", notes: "Non-intrusive in-text ads. Works alongside AdSense. No minimum traffic.", difficulty: "easy" },
  { name: "Outbrain", url: "https://www.outbrain.com/publishers/", category: "Native content recommendations", region: "Global", payout: "CPC", notes: "Premium native ads. Requires steady traffic.", difficulty: "medium" },
  { name: "Taboola", url: "https://www.taboola.com/publishers", category: "Native content recommendations", region: "Global", payout: "CPC", notes: "Largest native ad network. Min ~500k monthly pageviews.", difficulty: "hard" },
  { name: "Revcontent", url: "https://www.revcontent.com/", category: "Native ads", region: "Global", payout: "CPC", notes: "Quality native network. Requires 50k+ monthly views.", difficulty: "medium" },
  { name: "Sovrn (//Commerce)", url: "https://www.sovrn.com/", category: "Display + commerce", region: "Global", payout: "CPM + affiliate", notes: "Auto-affiliates outbound links. Pairs well with AdSense.", difficulty: "easy" },
  { name: "Setupad", url: "https://setupad.com/", category: "Header bidding", region: "Global", payout: "CPM", notes: "Header bidding wrapper. ~100k pageviews minimum.", difficulty: "medium" },
  { name: "Snigel", url: "https://snigel.com/", category: "Header bidding", region: "Global", payout: "CPM", notes: "Premium header bidding. 50k pageviews minimum.", difficulty: "medium" },
];

export const AFFILIATE_PROGRAMS: DirectoryEntry[] = [
  // PH / SEA marketplaces
  { name: "Shopee Affiliate Program (PH)", url: "https://affiliate.shopee.ph/", category: "Marketplace", region: "Philippines", payout: "Up to 13% commission", notes: "Top PH marketplace. Wide product range. Easy approval.", difficulty: "easy" },
  { name: "Lazada Affiliate Program (PH)", url: "https://www.lazada.com.ph/wow/i/ph/affiliate/landing", category: "Marketplace", region: "Philippines", payout: "Up to 10% commission", notes: "Major PH marketplace. Run via Involve Asia or Accesstrade.", difficulty: "easy" },
  { name: "TikTok Shop Affiliate (PH)", url: "https://affiliate-ph.tiktok.com/", category: "Marketplace / video", region: "Philippines", payout: "5–20% commission", notes: "Fastest growing channel in PH. Video-first affiliate program.", difficulty: "easy" },
  { name: "AliExpress Portals", url: "https://portals.aliexpress.com/", category: "Marketplace", region: "Global", payout: "Up to 9% commission", notes: "Run by AliExpress directly. Global shipping. Good for car parts/tools.", difficulty: "easy" },
  { name: "Amazon Associates", url: "https://affiliate-program.amazon.com/", category: "Marketplace", region: "Global", payout: "1–10% commission", notes: "Trusted brand. Auto-approval. Must make 3 sales in 180 days.", difficulty: "easy" },
  { name: "Zalora Affiliate", url: "https://www.zalora.com.ph/about/affiliate-program/", category: "Fashion", region: "SEA", payout: "Up to 12% commission", notes: "Fashion + accessories. Run via Involve Asia.", difficulty: "easy" },

  // Affiliate aggregators (PH-friendly)
  { name: "Involve Asia", url: "https://www.involve.asia/", category: "Affiliate network (aggregator)", region: "SEA / PH", payout: "Varies by merchant", notes: "Best PH-focused aggregator. Access to Lazada, Shopee, Zalora, Klook, hundreds more.", difficulty: "easy" },
  { name: "Accesstrade PH", url: "https://accesstrade.com.ph/", category: "Affiliate network (aggregator)", region: "Philippines / SEA", payout: "Varies", notes: "Strong in PH/VN/TH. Lazada, Shopee, telco, e-wallet offers.", difficulty: "easy" },
  { name: "Rakuten Advertising", url: "https://rakutenadvertising.com/", category: "Affiliate network", region: "Global", payout: "Varies", notes: "Premium brands. Walmart, Macy's, etc. More selective approval.", difficulty: "medium" },
  { name: "Awin", url: "https://www.awin.com/", category: "Affiliate network", region: "Global", payout: "Varies", notes: "Huge European/UK presence + global brands. $5 signup deposit (refunded).", difficulty: "medium" },
  { name: "CJ Affiliate (Commission Junction)", url: "https://www.cj.com/", category: "Affiliate network", region: "Global", payout: "Varies", notes: "Major US network. GoDaddy, Lowe's, Office Depot, etc.", difficulty: "medium" },
  { name: "Impact", url: "https://impact.com/", category: "Affiliate network", region: "Global", payout: "Varies", notes: "Modern partnership platform. Uber, Airbnb, Walmart, Adidas.", difficulty: "medium" },
  { name: "ShareASale", url: "https://www.shareasale.com/", category: "Affiliate network", region: "Global", payout: "Varies", notes: "10k+ merchants. Strong in lifestyle/DIY/tools niches.", difficulty: "easy" },
  { name: "FlexOffers", url: "https://www.flexoffers.com/", category: "Affiliate network", region: "Global", payout: "Varies", notes: "12k+ advertisers. Aggregates other networks.", difficulty: "easy" },
  { name: "PartnerStack", url: "https://partnerstack.com/", category: "SaaS affiliate", region: "Global", payout: "Recurring commission", notes: "B2B SaaS focus. Recurring monthly commissions.", difficulty: "easy" },
  { name: "ClickBank", url: "https://www.clickbank.com/", category: "Digital products", region: "Global", payout: "Up to 75% commission", notes: "Digital products & courses. High commissions but quality varies.", difficulty: "easy" },
  { name: "Indoleads", url: "https://indoleads.com/", category: "Affiliate network", region: "SEA / Global", payout: "Varies", notes: "SEA-focused with global reach. Good for travel/finance offers.", difficulty: "easy" },

  // Automotive-specific
  { name: "AutoZone Affiliate", url: "https://www.autozone.com/landing/page/affiliate-program.html", category: "Automotive parts", region: "US", payout: "3% commission", notes: "Auto parts giant. Via CJ Affiliate.", difficulty: "medium" },
  { name: "Advance Auto Parts", url: "https://shop.advanceautoparts.com/o/affiliate-program", category: "Automotive parts", region: "US", payout: "3–4% commission", notes: "Via CJ Affiliate.", difficulty: "medium" },
  { name: "RockAuto", url: "https://www.rockauto.com/", category: "Automotive parts", region: "Global", payout: "Varies", notes: "Massive online parts catalog. Ships internationally.", difficulty: "medium" },
  { name: "eBay Partner Network", url: "https://partnernetwork.ebay.com/", category: "Marketplace", region: "Global", payout: "1–4% commission", notes: "Huge for used parts, motors, collectibles.", difficulty: "easy" },
  { name: "CarParts.com Affiliate", url: "https://www.carparts.com/affiliates", category: "Automotive parts", region: "US", payout: "Up to 8%", notes: "Aftermarket parts. Via Impact.", difficulty: "medium" },

  // Travel / fuel / insurance (cross-sell to motorists)
  { name: "Klook Affiliate", url: "https://affiliate.klook.com/", category: "Travel / experiences", region: "SEA / Global", payout: "Up to 5%", notes: "Tours, car rentals, airport transfers. Big in PH.", difficulty: "easy" },
  { name: "Booking.com Affiliate", url: "https://www.booking.com/affiliate-program/v2/index.html", category: "Travel / hotels", region: "Global", payout: "25–40% of commission", notes: "Hotel bookings — good cross-sell for road-trip content.", difficulty: "easy" },
  { name: "Agoda Partners", url: "https://partners.agoda.com/", category: "Travel / hotels", region: "Global", payout: "Up to 7%", notes: "Strong in SEA.", difficulty: "easy" },
  { name: "DiscoverCars Affiliate", url: "https://www.discovercars.com/affiliate-program", category: "Car rental", region: "Global", payout: "Up to 70% of profit", notes: "Highest car-rental affiliate payout.", difficulty: "easy" },
];
