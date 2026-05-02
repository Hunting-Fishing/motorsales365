// Vehicle makes & models commonly sold in the Philippine market.
// Heavy emphasis on Japanese brands (the dominant share of PH sales),
// plus Korean, American, European, Chinese and Indian brands present locally.
// Models include current and recent-historic nameplates buyers search for,
// including grey-market/JDM imports often listed on PH used-car platforms.
// Brand coverage cross-checked against autodeal.com.ph/brands.

export type VehicleCategory = "car" | "motorcycle";

export type MakeModels = {
  make: string;
  models: string[];
};

export const CAR_MAKES: MakeModels[] = [
  // ---------- Japanese ----------
  {
    make: "Toyota",
    models: [
      "Vios", "Wigo", "Yaris", "Yaris Cross", "Yaris iA", "Corolla", "Corolla Altis", "Corolla Cross", "Corolla Cross GR-S", "Corolla Hatchback", "Corolla Sport",
      "Camry", "Camry Hybrid", "Camry Solara", "Avanza", "Veloz", "Rush", "Innova", "Innova Zenix", "Innova Crysta", "Innova Touring Sport", "Zenix", "Fortuner", "Fortuner GR-S", "Fortuner Legender",
      "Land Cruiser", "Land Cruiser 70", "Land Cruiser 100", "Land Cruiser 200", "Land Cruiser 250", "Land Cruiser 300", "Land Cruiser Prado", "Land Cruiser FJ", "Land Cruiser FJ40", "Land Cruiser FJ60", "Land Cruiser FJ80",
      "Hilux", "Hilux GR-S", "Hilux Champ", "Hilux Conquest", "Hilux Revo", "Hiace", "Hiace Commuter", "Hiace Commuter Deluxe", "Hiace Super Grandia", "Hiace Super Grandia Elite", "Hiace GL Grandia", "Hiace Grandia Tourer", "Hiace LXV",
      "Tamaraw", "Tamaraw FX", "Tamaraw Revo", "Revo", "Revo VX", "FJ Cruiser", "RAV4", "RAV4 Hybrid", "RAV4 Prime", "RAV4 Adventure", "GR Yaris", "GR Supra", "GR Corolla", "GR86", "86", "AE86", "Trueno", "Levin",
      "Alphard", "Alphard Hybrid", "Vellfire", "Vellfire Hybrid", "Lite Ace", "Town Ace", "Coaster", "Coaster GX", "Prius", "Prius C", "Prius V", "Prius Prime", "Prius Plug-in", "bZ4X", "bZ3", "bZ3X", "Mirai",
      "Crown", "Crown Sport", "Crown Crossover", "Crown Sedan", "Crown Athlete", "Century", "Century SUV", "Sienna", "Sienna Hybrid", "Tundra", "Tundra TRD", "Tacoma", "Tacoma TRD", "Sequoia", "4Runner", "4Runner TRD", "Highlander", "Highlander Hybrid", "Grand Highlander",
      "Mark X", "Mark II", "Cressida", "Crown Majesta", "Starlet", "Starlet GT", "Echo", "Soluna", "Probox", "Succeed", "Granvia", "Avensis", "Auris", "Verso", "Avalon", "Solara", "Matrix", "Venza",
      "MR2", "MR-S", "Celica", "Celica GT-Four", "Supra", "Supra A80", "Supra A90", "Sera", "Estima", "Estima Hybrid", "Previa", "Noah", "Voxy", "Esquire", "Sienta", "Spade", "Porte",
      "Raize", "Raize Hybrid", "Urban Cruiser", "Hilux Surf", "Crown Comfort", "Comfort", "Crown Royal", "Aqua", "Glanza", "Innova HyCross",
    ],
  },
  {
    make: "Honda",
    models: [
      "Brio", "Brio Amaze", "Brio RS", "City", "City Hatchback", "City RS", "City Hybrid", "City Aspire", "Civic", "Civic Type R", "Civic Hybrid", "Civic e:HEV",
      "Civic Si", "Civic Hatchback", "Civic Coupe", "Civic Tourer", "Civic Ferio", "Civic EK9", "Civic EG", "Civic EF", "Accord", "Accord Hybrid", "Accord Coupe", "Accord Tourer", "Accord Euro",
      "BR-V", "WR-V", "HR-V", "HR-V e:HEV", "CR-V", "CR-V Hybrid", "ZR-V", "Pilot", "Pilot TrailSport", "Passport", "Odyssey", "Mobilio", "Stream", "Capa",
      "Fit", "Fit Hybrid", "Jazz", "Fit / Jazz", "Stepwgn", "Freed", "Freed Hybrid", "e:N1", "e:NS1", "e:NP1", "Insight", "FR-V", "Edix", "Airwave", "Partner",
      "Integra", "Integra Type R", "Prelude", "S2000", "NSX", "NSX Type S", "Beat", "S660", "S800", "Today",
      "Vezel", "Vezel Hybrid", "Shuttle", "Crosstour", "Element", "Ridgeline", "CR-Z", "Crossroad", "Avancier", "UR-V",
      "Legend", "Inspire", "Saber", "Vigor", "City ZX", "City SX-8", "Civic VTi", "Civic SiR", "Acty", "N-Box", "N-One", "N-WGN", "N-Van",
    ],
  },
  {
    make: "Mitsubishi",
    models: [
      "Mirage", "Mirage G4", "Mirage Hatchback", "Lancer", "Lancer EX", "Lancer Evolution", "Lancer Evolution X", "Lancer Evolution IX", "Lancer Evolution VIII", "Evo", "Evo X", "Galant", "Galant Fortis", "Galant VR-4",
      "Xpander", "Xpander Cross", "Xpander Hybrid", "Xpander HEV",
      "Montero", "Montero Sport", "Pajero", "Pajero Sport", "Pajero Mini", "Pajero iO", "Pajero Junior", "Pajero Evolution", "Shogun", "Shogun Sport",
      "Strada", "Strada Athlete", "Triton", "Triton Athlete", "L200", "L300", "L300 FB", "L300 Versa Van", "L300 Exceed",
      "Adventure", "Adventure GLS Sport", "Outlander", "Outlander PHEV", "Outlander Sport", "ASX", "RVR", "Eclipse", "Eclipse Cross", "Eclipse Cross PHEV",
      "Xforce", "Delica", "Delica D:5", "Delica Mini", "Space Gear", "Space Wagon", "Grandis", "Fuzion", "Endeavor", "Raider",
      "3000GT", "GTO", "FTO", "Colt", "Colt Plus", "Colt Rallyart", "Mirage Coupe", "Lancer GSR", "Lancer Cedia", "Sigma", "Diamante", "Magna", "Verada",
      "Airtrek", "i-MiEV", "Carisma", "Lancer 1.6 GLS",
    ],
  },
  {
    make: "Nissan",
    models: [
      "Almera", "Sylphy", "Sentra", "Sentra B13", "Sentra B14", "Sunny", "Tiida", "Latio", "Pulsar", "Pulsar GTI-R", "Versa",
      "Juke", "Juke Nismo", "Kicks", "Kicks e-Power", "Note", "Note e-Power", "March", "Micra", "Cube", "Lannia", "Sylphy Classic",
      "X-Trail", "X-Trail e-Power", "X-Trail T30", "X-Trail T31", "Murano", "Murano Hybrid", "Patrol", "Patrol Royale", "Patrol Super Safari", "Patrol Y61", "Patrol Y62", "Terra", "Pathfinder", "Pathfinder Armada", "Armada", "Xterra",
      "Navara", "Navara Pro-4X", "Navara D40", "Navara D22", "NP300", "Frontier", "Frontier Pro", "Hardbody", "Urvan", "Urvan Premium", "NV200", "NV350", "NV150 AD", "Urvan Escapade", "Caravan E25", "Caravan E26",
      "GT-R", "GT-R Nismo", "350Z", "370Z", "Z", "Z Nismo", "Skyline", "Skyline GT-R", "Skyline GT-R V-Spec", "R32", "R33", "R34", "R35",
      "Leaf", "Leaf e+", "Ariya", "Serena", "Serena e-Power", "Elgrand", "Quest", "Maxima", "Altima", "Altima Coupe", "Teana", "Cefiro", "President",
      "Bluebird", "Bluebird Sylphy", "Primera", "Stanza", "Silvia", "Silvia S15", "180SX", "200SX", "240SX", "300ZX", "Fairlady", "Skyline R30", "Skyline R31", "Cedric", "Gloria", "Laurel",
      "Vanette", "Caravan", "Civilian", "Atlas", "Cabstar", "Datsun", "Pao", "Figaro", "Be-1", "S-Cargo",
    ],
  },
  {
    make: "Mazda",
    models: [
      "Mazda2", "Mazda2 Hatchback", "Mazda2 Sedan", "Mazda3", "Mazda3 Sportback", "Mazda3 Sedan", "Mazda3 MPS", "Mazda6", "Mazda6 Wagon", "Mazda6 Sport",
      "CX-3", "CX-30", "CX-5", "CX-7", "CX-8", "CX-9", "CX-50", "CX-60", "CX-70", "CX-80", "CX-90",
      "MX-5", "MX-5 Miata", "MX-5 RF", "MX-30", "MX-30 R-EV", "MX-3", "MX-6",
      "BT-50", "Tribute", "RX-7", "RX-7 FD", "RX-7 FC", "RX-8", "Mazda5", "Premacy", "Biante", "MPV",
      "323", "323F", "626", "626 Capella", "929", "Familia", "Familia GTR", "Protege", "Protege5", "Demio", "Axela", "Atenza", "Bongo", "Eunos Cosmo", "Cosmo",
      "B-Series", "Roadster",
    ],
  },
  {
    make: "Suzuki",
    models: [
      "Alto", "Alto K10", "Alto Lapin", "Alto Works", "Celerio", "Swift", "Swift Sport", "Swift DZire", "Dzire", "Baleno", "Baleno RS", "Esteem", "Cervo",
      "Ertiga", "Ertiga Hybrid", "XL7", "XL6", "S-Presso", "Kizashi", "Ciaz", "Aerio",
      "Jimny", "Jimny 5-door", "Jimny Sierra", "Vitara", "Grand Vitara", "Grand Vitara Hybrid", "Escudo", "Sidekick", "Samurai", "X-90",
      "APV", "Carry", "Multicab", "Every", "Every Wagon", "Wagon R", "Wagon R+", "Cultus", "Liana", "SX4", "SX4 S-Cross", "Splash", "Forenza", "Reno", "Verona",
      "Ignis", "Fronx", "Brezza", "Solio", "Hustler", "Spacia", "Lapin", "Cappuccino", "Kei",
    ],
  },
  {
    make: "Subaru",
    models: [
      "Impreza", "Impreza WRX", "Impreza Hatchback", "WRX", "WRX STI", "WRX TR", "Legacy", "Legacy Wagon", "Legacy GT", "BRZ", "BRZ tS", "XV", "Crosstrek", "Crosstrek Hybrid",
      "Forester", "Forester e-Boxer", "Forester Wilderness", "Forester XT", "Outback", "Outback Wilderness", "Evoltis", "Ascent", "Tribeca",
      "SVX", "Justy", "Loyale", "Liberty", "Levorg", "Levorg STI Sport", "Exiga", "BRAT", "Sambar", "Stella", "Pleo", "Vivio", "R1", "R2",
      "Solterra",
    ],
  },
  {
    make: "Isuzu",
    models: [
      "D-Max", "D-Max V-Cross", "D-Max X-Terrain", "D-Max LS-E", "mu-X", "mu-X RS", "mu-X LS-E", "Crosswind", "Crosswind Sportivo", "Crosswind Sportivo X", "Crosswind XUV", "Crosswind XL",
      "Hi-Lander", "Fuego", "Trooper", "Trooper II", "Wizard", "Rodeo", "VehiCROSS", "Bighorn", "Panther", "Ascender",
      "Traviz", "N-Series", "NPR", "NQR", "NHR", "NLR", "F-Series", "FRR", "FVR", "FVZ", "FSR", "Giga", "C-Series",
      "Elf", "Forward", "Reach", "Como", "Stylus", "Impulse",
    ],
  },
  { make: "Lexus", models: [
    "IS", "IS 300", "IS 350", "IS F", "ES", "ES 300h", "ES 350", "GS", "GS F", "LS", "LS 500", "LS 500h",
    "UX", "UX 250h", "UX 300e", "NX", "NX 350h", "NX 450h+", "RX", "RX 350h", "RX 500h", "GX", "GX 460", "GX 550",
    "LX", "LX 600", "LX 570", "RZ", "RZ 450e", "RC", "RC F", "LC", "LC 500", "LC 500h", "LM", "LM 350h", "LM 500h",
    "TX", "SC", "HS", "CT 200h",
  ] },
  { make: "Acura", models: ["Integra", "TLX", "ILX", "RLX", "RDX", "MDX", "ZDX", "NSX", "RSX", "TSX", "TL"] },
  { make: "Infiniti", models: ["Q50", "Q60", "Q70", "QX30", "QX50", "QX55", "QX60", "QX70", "QX80", "G35", "G37", "M35", "M37", "FX35", "FX45"] },

  // ---------- Korean ----------
  {
    make: "Hyundai",
    models: [
      "Eon", "Reina", "i10", "i10 N Line", "Grand i10", "i20", "i20 N", "i30", "i30 N", "i40", "Accent", "Accent Hatchback", "Verna", "Elantra", "Elantra N", "Elantra N Line", "Avante", "Avante N",
      "Sonata", "Sonata Hybrid", "Sonata N Line", "Genesis", "Genesis Coupe", "Veloster", "Veloster N", "Veloster Turbo",
      "Stargazer", "Stargazer X", "Creta", "Creta N Line", "Venue", "Kona", "Kona Electric", "Kona N", "Kona Hybrid", "Bayon", "Exter",
      "Tucson", "Tucson N Line", "Tucson Hybrid", "Santa Fe", "Santa Fe Hybrid", "Santa Fe XL", "Santa Cruz", "Palisade", "Palisade Calligraphy", "Nexo", "Maxcruz",
      "Staria", "Staria Lounge", "Starex", "Grand Starex", "H-100", "H-1", "H-350", "Porter", "Porter II", "Mighty",
      "Ioniq", "Ioniq Hybrid", "Ioniq Electric", "Ioniq 5", "Ioniq 5 N", "Ioniq 6", "Ioniq 7", "Ioniq 9", "Getz", "Atos", "Atos Prime", "Matrix", "Trajet", "Lavita",
      "Coupe", "Tiburon", "Tiburon Tuscani", "Tuscani", "XG", "Equus", "Centennial", "Azera", "Aslan", "Grandeur", "Dynasty", "Excel", "Pony", "Stellar", "Galloper", "Terracan",
    ],
  },
  {
    make: "Kia",
    models: [
      "Picanto", "Picanto GT-Line", "Soluto", "Pride", "Rio", "Rio Hatchback", "Rio GT-Line", "Forte", "Forte Koup", "Forte5", "Cerato", "K3", "K3 GT", "K4", "K5", "K5 GT", "K7", "K8", "K9", "Optima", "Optima Hybrid",
      "Stinger", "Stinger GT", "Stonic", "Seltos", "Seltos X-Line", "Sportage", "Sportage Hybrid", "Sportage X-Line", "Sorento", "Sorento Hybrid", "Sorento PHEV", "Sorento X-Line", "Telluride", "Telluride X-Pro",
      "Carnival", "Carnival Hi-Limousine", "Sedona", "Carens", "Rondo", "Sephia", "Spectra", "Cadenza",
      "EV3", "EV4", "EV5", "EV6", "EV6 GT", "EV9", "EV9 GT", "Niro", "Niro EV", "Niro Hybrid", "Niro PHEV", "Soul", "Soul EV", "Soul Booster", "PV5",
      "Pregio", "K2500", "K2700", "K3000", "K3600", "K5000", "Bongo", "Bongo III", "Frontier", "Tasman",
    ],
  },
  { make: "Genesis", models: ["G70", "G80", "G80 Electrified", "G90", "GV60", "GV70", "GV70 Electrified", "GV80", "GV80 Coupe", "X Convertible"] },
  { make: "SsangYong", models: ["Tivoli", "Tivoli XLV", "Korando", "Rexton", "Rexton Sports", "Musso", "Stavic", "Rodius", "Actyon", "Kyron", "Chairman"] },

  // ---------- American ----------
  { make: "Ford", models: [
    "EcoSport", "Territory", "Escape", "Edge", "Bronco", "Bronco Sport", "Everest", "Everest Sport", "Everest Wildtrak",
    "Explorer", "Explorer Sport Trac", "Expedition", "Expedition MAX", "Excursion", "Flex",
    "Mustang", "Mustang Mach-E", "Mustang GT", "Mustang Shelby", "GT", "GT40",
    "Ranger", "Ranger Raptor", "Ranger Wildtrak", "Ranger Stormtrak", "F-150", "F-150 Lightning", "F-150 Raptor", "F-250", "F-350",
    "Maverick", "Transit", "Transit Connect", "Tourneo", "E-Series",
    "Focus", "Focus RS", "Focus ST", "Fiesta", "Fiesta ST", "Fusion", "Mondeo", "Taurus",
    "Lynx",
  ] },
  { make: "Chevrolet", models: [
    "Spark", "Spark EV", "Sail", "Aveo", "Sonic", "Cruze", "Optra", "Lacetti", "Cobalt", "Malibu", "Impala",
    "Trax", "Tracker", "Captiva", "Trailblazer", "Equinox", "Equinox EV", "Blazer", "Blazer EV",
    "Colorado", "Tahoe", "Suburban", "Camaro", "Corvette", "Silverado", "Silverado EV", "Avalanche",
    "Astro", "Express", "HHR", "Orlando", "Cavalier", "Lumina", "Venture",
  ] },
  { make: "Jeep", models: ["Renegade", "Compass", "Patriot", "Liberty", "Cherokee", "Grand Cherokee", "Grand Cherokee L", "Grand Cherokee 4xe", "Wrangler", "Wrangler 4xe", "Wrangler Rubicon", "Gladiator", "Wagoneer", "Grand Wagoneer", "Avenger", "Commander"] },
  { make: "Dodge", models: ["Charger", "Challenger", "Durango", "Journey", "Nitro", "Caliber", "Magnum", "Viper", "Dart", "Hornet", "Caravan", "Grand Caravan", "Ram"] },
  { make: "Ram", models: ["1500", "1500 TRX", "1500 Rebel", "1500 Laramie", "2500", "2500 Power Wagon", "3500", "ProMaster", "ProMaster City", "700", "1200"] },
  { make: "GMC", models: ["Sierra", "Sierra HD", "Sierra Denali", "Yukon", "Yukon XL", "Yukon Denali", "Hummer EV", "Hummer EV SUV", "Acadia", "Terrain", "Canyon", "Savana"] },
  { make: "Cadillac", models: ["CT4", "CT4-V", "CT5", "CT5-V", "CT6", "ATS", "CTS", "STS", "DTS", "XTS", "XT4", "XT5", "XT6", "Escalade", "Escalade ESV", "Escalade IQ", "Lyriq", "Celestiq", "SRX", "BLS", "ELR"] },
  { make: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck", "Roadster", "Semi"] },
  { make: "Lincoln", models: ["Aviator", "Corsair", "Nautilus", "Navigator", "Navigator L", "MKC", "MKX", "MKZ", "MKT", "Continental", "Town Car"] },

  // ---------- European ----------
  { make: "BMW", models: [
    "1 Series", "2 Series", "2 Series Gran Coupe", "2 Series Active Tourer", "3 Series", "3 Series Touring",
    "4 Series", "4 Series Gran Coupe", "5 Series", "5 Series Touring", "6 Series", "6 Series GT", "7 Series", "8 Series",
    "X1", "X2", "X3", "X3 M", "X4", "X4 M", "X5", "X5 M", "X6", "X6 M", "X7", "XM",
    "Z3", "Z4", "Z8", "M2", "M3", "M4", "M5", "M6", "M8",
    "i3", "i4", "i5", "i7", "i8", "iX", "iX1", "iX2", "iX3", "iX5",
  ] },
  { make: "Mercedes-Benz", models: [
    "A-Class", "B-Class", "C-Class", "C-Class Coupe", "C-Class Cabriolet", "E-Class", "E-Class Coupe", "E-Class Cabriolet",
    "S-Class", "S-Class Coupe", "Maybach S-Class", "CLA", "CLA Shooting Brake", "CLS", "CLE",
    "GLA", "GLB", "GLC", "GLC Coupe", "GLE", "GLE Coupe", "GLS", "G-Class", "Maybach GLS",
    "V-Class", "Vito", "Sprinter", "Citan", "Metris",
    "EQA", "EQB", "EQC", "EQE", "EQE SUV", "EQS", "EQS SUV", "EQV",
    "AMG GT", "AMG GT 4-Door", "AMG SL", "SL", "SLC", "SLK", "SLR", "SLS",
    "ML-Class", "GL-Class", "R-Class", "CLK", "CL-Class",
  ] },
  { make: "Audi", models: [
    "A1", "A3", "A3 Sportback", "S3", "RS3", "A4", "A4 Avant", "A4 Allroad", "S4", "RS4",
    "A5", "A5 Sportback", "S5", "RS5", "A6", "A6 Avant", "A6 Allroad", "S6", "RS6",
    "A7", "S7", "RS7", "A8", "S8", "Q2", "Q3", "Q3 Sportback", "Q4 e-tron", "Q5", "SQ5", "Q6 e-tron",
    "Q7", "SQ7", "Q8", "SQ8", "RS Q8", "Q8 e-tron",
    "TT", "TT RS", "R8", "e-tron", "e-tron GT", "RS e-tron GT",
  ] },
  { make: "Volkswagen", models: [
    "Polo", "Polo GTI", "Golf", "Golf GTI", "Golf R", "Jetta", "Beetle", "Santana", "Lamando",
    "Lavida", "Passat", "Passat CC", "Arteon", "Tiguan", "Tiguan Allspace", "Touareg", "Touran",
    "T-Cross", "T-Roc", "Atlas", "Atlas Cross Sport", "Caddy", "Transporter", "Crafter", "Multivan",
    "ID.3", "ID.4", "ID.5", "ID.6", "ID.7", "ID. Buzz",
    "Bora", "Eos", "Scirocco", "Phaeton",
  ] },
  { make: "Porsche", models: ["911", "911 Turbo", "911 GT3", "911 GT3 RS", "718 Cayman", "718 Boxster", "718 Spyder", "Panamera", "Panamera Sport Turismo", "Macan", "Macan Electric", "Cayenne", "Cayenne Coupe", "Taycan", "Taycan Cross Turismo", "918 Spyder", "Carrera GT"] },
  { make: "Volvo", models: ["S60", "S80", "S90", "V40", "V60", "V70", "V90", "XC40", "XC60", "XC70", "XC90", "C30", "C40 Recharge", "C70", "EX30", "EX40", "EX60", "EX90", "EM90", "ES90"] },
  { make: "Mini", models: ["Cooper", "Cooper S", "Cooper SE", "Hardtop", "Hatch", "Clubman", "Countryman", "Convertible", "Cabrio", "Roadster", "Coupe", "Paceman", "JCW", "Aceman"] },
  { make: "Land Rover", models: ["Defender", "Defender 90", "Defender 110", "Defender 130", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque", "Freelander", "LR2", "LR3", "LR4"] },
  { make: "Jaguar", models: ["XE", "XF", "XJ", "XK", "S-Type", "X-Type", "F-Type", "E-Pace", "F-Pace", "I-Pace"] },
  { make: "Peugeot", models: ["208", "2008", "3008", "5008", "508", "Traveller", "Landtrek", "Expert", "Partner", "Boxer", "301", "405", "406", "407", "607", "RCZ"] },
  { make: "Renault", models: ["Kiger", "Kwid", "Triber", "Captur", "Koleos", "Megane", "Clio", "Duster", "Arkana", "Trafic", "Master", "Scenic"] },
  { make: "Citroën", models: ["C3", "C3 Aircross", "C4", "C4 Cactus", "C5", "C5 Aircross", "C5 X", "Berlingo", "Jumpy", "DS3", "DS4", "DS5", "DS7", "Xsara", "Xsara Picasso"] },
  { make: "Fiat", models: ["500", "500e", "500X", "500L", "Panda", "Tipo", "Punto", "Bravo", "Doblo", "Ducato", "Strada", "Ulysse", "Multipla"] },
  { make: "Alfa Romeo", models: ["Giulia", "Giulia Quadrifoglio", "Stelvio", "Stelvio Quadrifoglio", "Tonale", "Junior", "MiTo", "Giulietta", "4C", "8C", "Brera", "Spider", "159", "166"] },
  { make: "Maserati", models: ["Ghibli", "Quattroporte", "Levante", "Grecale", "GranTurismo", "GranTurismo Folgore", "GranCabrio", "MC20", "MC20 Cielo", "MC12"] },
  { make: "Ferrari", models: ["Roma", "Roma Spider", "Portofino", "Portofino M", "12Cilindri", "296 GTB", "296 GTS", "SF90 Stradale", "SF90 Spider", "Purosangue", "F8 Tributo", "F8 Spider", "812 Superfast", "812 GTS", "488 GTB", "488 Pista", "California", "California T", "458 Italia", "458 Speciale", "FF", "GTC4Lusso", "Enzo", "LaFerrari"] },
  { make: "Lamborghini", models: ["Huracán", "Huracán Sterrato", "Revuelto", "Aventador", "Urus", "Urus SE", "Urus Performante", "Gallardo", "Murciélago", "Diablo", "Countach", "Espada"] },
  { make: "Bentley", models: ["Continental GT", "Continental GTC", "Flying Spur", "Bentayga", "Bentayga EWB", "Mulsanne", "Arnage", "Azure", "Brooklands"] },
  { make: "Rolls-Royce", models: ["Ghost", "Ghost Black Badge", "Phantom", "Phantom Drophead", "Cullinan", "Cullinan Black Badge", "Spectre", "Wraith", "Dawn", "Silver Shadow", "Silver Spirit"] },
  { make: "Lotus", models: ["Emira", "Eletre", "Emeya", "Evora", "Exige", "Elise", "Esprit", "Europa", "Evija"] },

  // ---------- Chinese ----------
  { make: "BYD", models: [
    "Dolphin", "Dolphin Mini", "Seagull", "Seal", "Seal U", "Seal U DM-i",
    "Atto 2", "Atto 3", "Han", "Han EV", "Han DM", "Tang", "Tang EV", "Tang DM",
    "Sealion 5", "Sealion 6", "Sealion 7", "Shark", "Shark 6",
    "Song", "Song Pro", "Song Plus", "Yuan Plus", "Qin", "Qin Plus", "Qin L",
    "F3", "M6", "e2", "e3", "e6",
  ] },
  { make: "MG", models: [
    "MG3", "MG3 Hybrid+", "MG4", "MG4 EV", "MG5", "MG5 EV", "MG6", "MG7",
    "ZS", "ZS EV", "HS", "HS PHEV", "RX5", "RX8", "RX9", "GS", "GT", "Cyberster", "Marvel R", "ES", "EHS", "One",
  ] },
  { make: "Geely", models: [
    "Coolray", "Azkarra", "Okavango", "Emgrand", "Emgrand GS", "Emgrand X7", "Atlas", "Atlas Pro",
    "Geometry C", "Geometry G6", "Geometry M6", "Starray", "Starray EM-i", "GX3", "GX3 Pro",
    "Monjaro", "Tugella", "Boyue", "Preface", "Galaxy E5", "Galaxy E8", "Galaxy L7", "Panda Mini",
  ] },
  { make: "Chery", models: [
    "Tiggo 2", "Tiggo 2 Pro", "Tiggo 4", "Tiggo 4 Pro", "Tiggo 5x", "Tiggo 7", "Tiggo 7 Pro", "Tiggo 7 Pro Max",
    "Tiggo 8", "Tiggo 8 Pro", "Tiggo 8 Pro Max", "Tiggo 9", "Tiggo Cross",
    "Arrizo 5", "Arrizo 6", "Arrizo 8", "QQ", "Fulwin",
  ] },
  { make: "Haval", models: ["Jolion", "Jolion Hybrid", "Jolion Pro", "H2", "H6", "H6 Hybrid", "H6 GT", "H7", "H8", "H9", "Big Dog", "Dargo", "Xiaolong"] },
  { make: "GWM", models: ["Tank 300", "Tank 400", "Tank 500", "Tank 700", "Cannon", "Cannon Alpha", "Poer", "Wingle 7", "Ora Good Cat", "Ora 03", "Ora Funky Cat", "Ora 07"] },
  { make: "Maxus", models: ["G10", "G20", "G50", "G90", "T60", "T70", "T90", "T90 EV", "D60", "D90", "D90 Pro", "V80", "V90", "Mifa", "Mifa 9", "eDeliver 3", "eDeliver 9", "eMaxus"] },
  { make: "Foton", models: ["Toplander", "Toplander S", "Thunder", "Thunder Plus", "Gratour", "Gratour Mini Truck", "Gratour Midi", "View Traveller", "View IX5", "View IX7", "Tornado", "Tunland", "Tunland G7", "Tunland V7", "Tunland V9", "Aumark", "Auman"] },
  { make: "JAC", models: ["S2", "S3", "S4", "S5", "S7", "JS3", "JS4", "JS6", "JS8 Pro", "T6", "T8", "T9", "Sunray", "Refine S2", "Refine S3", "iEV6E", "iEV7S", "JS3 Lite"] },
  { make: "Dongfeng", models: ["Rich 6", "Rich 7", "Glory 500", "Glory 580", "Glory 600", "Forthing T5", "Forthing T5 Evo", "Forthing 4", "Box", "E70", "MAGE", "M5"] },
  { make: "BAIC", models: ["X3", "X35", "X55", "X55 II", "X7", "BJ20", "BJ30", "BJ40", "BJ40 Plus", "BJ60", "BJ80", "BJ90", "Beijing X7", "EU5", "EX3", "EX5", "EU260"] },
  { make: "Changan", models: ["CS15", "CS35", "CS35 Plus", "CS55", "CS55 Plus", "CS75", "CS75 Plus", "CS85", "CS95", "Alsvin", "Eado", "Hunter", "Hunter Plus", "Hunter Black Knight", "UNI-T", "UNI-K", "UNI-V", "Lumin", "Star 5", "Star 7", "Star 9"] },
  { make: "GAC", models: ["GS3", "GS3 Emzoom", "GS4", "GS4 Plus", "GS5", "GS7", "GS8", "GS8 II", "M6", "M6 Pro", "M8", "M8 GS", "Empow", "Aion S", "Aion V", "Aion Y", "Aion ES", "Aion Hyptec"] },
  { make: "Hongqi", models: ["H5", "H6", "H9", "HS3", "HS5", "HS6", "HS7", "HS9", "E-HS3", "E-HS9", "E-QM5", "EH7", "L5", "LS7"] },

  { make: "Bestune", models: ["T55", "T77", "T77 Pro", "T90", "T99", "B30", "B70", "B70 S", "Pony", "Xiaoma"] },
  { make: "Changhe", models: ["M50", "M50S", "Freedom", "Freedom Pickup", "Freedom Mini Truck", "Furida", "Q25", "Q35"] },
  { make: "DFSK", models: ["Glory 500", "Glory 560", "Glory 580", "Glory 600", "Glory iX5", "Glory iX7", "Super Cab", "Super Cab Pro", "Mini Truck", "C31", "C32", "C35", "C36", "C37", "K01", "K02", "K05", "K07"] },
  { make: "Deepal", models: ["S05", "S07", "S09", "L07", "G318", "SL03"] },
  { make: "DENZA", models: ["D9", "N7", "N8", "N9", "Z9 GT", "Z9"] },
  { make: "FAW", models: ["Bestune T77", "Bestune T99", "Sirius S80", "Bestune B30", "V80", "V80 Plus", "V70", "Tiger V", "Vita", "J6", "J7"] },
  { make: "Haima", models: ["S5", "S7", "7X", "7X-E", "8S", "M3", "M5", "M6", "Family", "2"] },
  { make: "JETOUR", models: ["Dashing", "Dashing Pro", "X70", "X70 Plus", "X70 Pro", "X90", "X90 Plus", "X95", "T1", "T2", "Traveller", "Shanhai L7", "Shanhai L9", "Shanhai T2"] },
  { make: "Jaecoo", models: ["J5", "J6", "J7", "J7 PHEV", "J8"] },
  { make: "Kaicene", models: ["F70", "Star Truck", "Star 5", "Star 9", "Hunter"] },
  { make: "Kaiyi", models: ["X3", "X3 Pro", "E5", "E5 Pro", "Xuanjie"] },
  { make: "KG Mobility", models: ["Tivoli", "Tivoli XLV", "Korando", "Korando e-Motion", "Torres", "Torres EVX", "Rexton", "Rexton Sports", "Musso", "Musso Sports", "Actyon"] },
  { make: "King Long", models: ["Kingo", "Kingwin", "Sea Lion", "XMQ6900", "XMQ6127"] },
  { make: "Li Auto", models: ["L6", "L7", "L8", "L9", "Mega", "ONE"] },
  { make: "Lynk & Co", models: ["01", "02", "03", "03+", "05", "06", "07 EM-P", "08 EM-P", "09", "Z10", "Z20"] },
  { make: "Omoda", models: ["Omoda 3", "Omoda 5", "Omoda E5", "Omoda 7", "Omoda C7", "Omoda C9"] },
  { make: "RADAR", models: ["RD6", "Horizon"] },
  { make: "VinFast", models: ["VF 3", "VF 5", "VF 6", "VF 7", "VF 8", "VF 9", "VF e34", "VF Wild", "Lux A2.0", "Lux SA2.0", "Fadil", "President"] },
  { make: "Voyah", models: ["Free", "Free EV", "Dream", "Courage", "Passion", "Zhiyin"] },
  { make: "ZEEKR", models: ["001", "001 FR", "007", "009", "009 Grand", "X", "Mix", "7X"] },
  { make: "Aito", models: ["M5", "M5 EV", "M7", "M7 Ultra", "M8", "M9"] },
  { make: "Skywell", models: ["ET5", "EW7"] },
  { make: "Wuling", models: ["Hongguang", "Hongguang Mini EV", "Bingo", "Almaz", "Air EV", "Cortez"] },
  { make: "Leapmotor", models: ["T03", "C01", "C10", "C16", "B10"] },
  { make: "XPeng", models: ["G3", "G6", "G9", "P5", "P7", "X9", "Mona M03"] },
  { make: "NIO", models: ["ES6", "ES7", "ES8", "EC6", "EC7", "ET5", "ET5T", "ET7", "ET9", "EL6", "EL7", "EL8"] },

  // ---------- Indian ----------
  { make: "Tata", models: ["Nexon", "Nexon EV", "Punch", "Punch EV", "Tiago", "Tiago EV", "Tigor", "Tigor EV", "Altroz", "Harrier", "Harrier EV", "Safari", "Curvv", "Curvv EV", "Xpres-T", "Ace", "Ace Gold", "Yodha", "Intra", "Sumo", "Indica", "Indigo"] },
  { make: "Mahindra", models: ["Scorpio", "Scorpio Classic", "Scorpio-N", "XUV300", "XUV3XO", "XUV400", "XUV700", "XUV.e8", "XUV.e9", "Bolero", "Bolero Neo", "Thar", "Thar Roxx", "Pik Up", "Pik-Up", "Marazzo", "Enforcer", "TUV300", "KUV100", "Alturas G4", "BE 6", "XEV 9e"] },

  // ---------- Italian / British / niche / luxury ----------
  { make: "Abarth", models: ["595", "595 Competizione", "695", "695 Biposto", "500e", "124 Spider"] },
  { make: "Chrysler", models: ["300", "300C", "Pacifica", "Pacifica Hybrid", "Voyager", "Town & Country", "PT Cruiser", "Sebring", "Crossfire"] },
  { make: "Aston Martin", models: ["Vantage", "DB9", "DB11", "DB12", "DBS", "DBS Superleggera", "DBX", "DBX707", "Rapide", "Vanquish", "Valkyrie", "Valhalla", "Virage", "One-77"] },
  { make: "McLaren", models: ["540C", "570S", "570GT", "600LT", "650S", "675LT", "720S", "750S", "765LT", "Artura", "GT", "P1", "Senna", "Speedtail", "Elva", "MP4-12C"] },
  { make: "Smart", models: ["fortwo", "forfour", "#1", "#3", "Roadster"] },
  { make: "Polestar", models: ["Polestar 1", "Polestar 2", "Polestar 3", "Polestar 4", "Polestar 5"] },
  { make: "Rivian", models: ["R1T", "R1S", "R2", "R3"] },
  { make: "Lucid", models: ["Air", "Gravity"] },

  // ---------- Other PH-market specialty ----------
  { make: "GAZ", models: ["Gazelle Next", "Gazelle Business", "Sobol", "Sadko", "Volga", "Tigr", "Siber"] },
  { make: "Haier", models: ["Brio"] },
  { make: "UAZ", models: ["Patriot", "Hunter", "Pickup", "Cargo", "Bukhanka", "Profi"] },
  { make: "Lada", models: ["Niva", "Niva Travel", "Granta", "Vesta", "Vesta SW", "Largus", "4x4", "Kalina", "Priora", "Samara"] },
  { make: "Daihatsu", models: ["Terios", "Rocky", "Charade", "Mira", "Move", "Tanto", "Hijet", "Copen", "Sirion", "Boon", "Materia", "Atrai"] },
  { make: "Datsun", models: ["GO", "GO+", "redi-GO", "Cross", "240Z", "260Z", "280Z", "510", "1200", "Sunny"] },
  { make: "Pontiac", models: ["G6", "G8", "GTO", "Solstice", "Vibe", "Firebird", "Trans Am", "Bonneville", "Grand Prix", "Sunfire", "Aztek"] },
  { make: "Saturn", models: ["Ion", "Aura", "Vue", "Sky", "Astra", "Outlook"] },
  { make: "Hummer", models: ["H1", "H2", "H3", "H3T", "EV"] },
  { make: "Saab", models: ["9-3", "9-5", "9-7X", "900", "9000"] },
  { make: "Skoda", models: ["Fabia", "Octavia", "Octavia RS", "Superb", "Kamiq", "Karoq", "Kodiaq", "Kodiaq RS", "Scala", "Enyaq", "Enyaq Coupe", "Slavia", "Kushaq"] },
  { make: "Seat", models: ["Ibiza", "Leon", "Leon Cupra", "Arona", "Ateca", "Tarraco", "Toledo", "Alhambra", "Mii"] },
  { make: "Cupra", models: ["Leon", "Formentor", "Born", "Ateca", "Tavascan", "Terramar"] },
  { make: "Opel", models: ["Astra", "Corsa", "Insignia", "Mokka", "Crossland", "Grandland", "Combo", "Vivaro", "Movano", "Zafira"] },
  { make: "Vauxhall", models: ["Astra", "Corsa", "Insignia", "Mokka", "Crossland", "Grandland", "Combo", "Vivaro", "Zafira"] },
  { make: "Dacia", models: ["Sandero", "Logan", "Duster", "Jogger", "Spring", "Bigster"] },
  { make: "Holden", models: ["Commodore", "Monaro", "Astra", "Cruze", "Captiva", "Colorado", "Trailblazer", "Ute"] },
  { make: "Proton", models: ["Saga", "Persona", "Iriz", "X50", "X70", "X90", "Exora", "Preve", "Inspira", "Wira"] },
  { make: "Perodua", models: ["Myvi", "Axia", "Bezza", "Aruz", "Ativa", "Alza", "Kancil", "Kelisa", "Kembara", "Kenari", "Viva"] },

  // ---------- Other ----------
  { make: "Other", models: ["Other"] },
];

export const MOTORCYCLE_MAKES: MakeModels[] = [
  // Big 4 Japanese
  {
    make: "Honda",
    models: [
      "Click 125i", "Click 150i", "Click 160", "BeAT", "BeAT Fi", "BeAT Street", "Genio", "Wave 110", "Wave 110R", "Wave 125", "Wave 125S", "Wave Alpha", "Wave Dash",
      "Dio", "Vario 125", "Vario 160", "PCX 125", "PCX 150", "PCX 160", "ADV 150", "ADV 160", "ADV 350", "Airblade", "Airblade 160",
      "XRM 110", "XRM 125", "XRM 125 DSX", "XRM 125 Motard", "RS125", "RS125 Fi", "RS150R", "Winner X", "TMX 125", "TMX 155",
      "CB150R Streetfire", "CB150X", "CB150 Verza", "CB300F", "CB300R", "CB400", "CB400SF", "CB500F", "CB650R", "CB1000R", "CB1300",
      "CBR150R", "CBR250R", "CBR250RR", "CBR300R", "CBR400R", "CBR500R", "CBR600F", "CBR600RR", "CBR650R", "CBR900RR", "CBR929RR", "CBR954RR",
      "CBR1000RR", "CBR1000RR-R Fireblade", "CBR1100XX",
      "Rebel 250", "Rebel 300", "Rebel 500", "Rebel 1100", "Shadow", "Phantom",
      "X-ADV", "Forza 125", "Forza 250", "Forza 350", "Forza 750", "NC750", "NC750X",
      "Africa Twin", "Transalp", "VFR", "VFR800", "VFR1200", "Gold Wing", "Goldwing",
      "CRF150F", "CRF150L", "CRF230F", "CRF250L", "CRF250 Rally", "CRF300L", "CRF300 Rally", "CRF450L", "CRF450X", "XR125", "XR150L", "XR190L", "XR250", "XLR125",
      "Monkey", "Grom", "Super Cub", "C70", "C90", "C100", "Dax", "Cub",
    ],
  },
  {
    make: "Yamaha",
    models: [
      "Mio", "Mio i 125", "Mio Sporty", "Mio Soul", "Mio Soul i 125", "Mio Aerox", "Mio Aerox 155", "Aerox 155", "Aerox Alpha",
      "NMAX 155", "NMAX 160", "XMAX 250", "XMAX 300", "Tmax", "Tmax 530", "Tmax 560", "Lexi 125", "Fazzio", "Mio Fazzio",
      "Sniper 150", "Sniper 155", "Sniper MX", "Sight", "Force", "Vega R", "Vega Force", "Crypton",
      "FZ", "FZ150", "FZ16", "FZ-S", "MT-03", "MT-07", "MT-09", "MT-10", "MT-15", "MT-25",
      "YZF-R1", "YZF-R1M", "YZF-R3", "YZF-R6", "YZF-R7", "YZF-R15", "YZF-R25", "YZF-R125",
      "Tracer 7", "Tracer 9", "Tracer 900", "FJR1300",
      "XSR125", "XSR155", "XSR700", "XSR900", "Bolt", "V-Star", "VMAX", "Vmax",
      "Tenere 700", "WR155R", "WR250R", "WR250F", "WR450F", "Serow", "TT-R125",
      "YZ65", "YZ85", "YZ125", "YZ250", "YZ250F", "YZ250FX", "YZ450F", "YZ450FX",
      "Banshee", "Raptor", "Warrior",
    ],
  },
  {
    make: "Suzuki",
    models: [
      "Raider J", "Raider J Crossover", "Raider J 115", "Raider R150 Fi", "Raider R150 Carb", "Raider R150 FU", "Smash", "Smash 115", "Skydrive", "Skydrive Sport",
      "Burgman Street", "Burgman 200", "Burgman 400", "Avenis", "Address", "Address 110",
      "GSX-S125", "GSX-R125", "GSX-S150", "GSX-R150", "GSX-S750", "GSX-R750", "GSX-S1000", "GSX-S1000F", "GSX-S1000GT", "GSX-R1000", "GSX-R600", "GSX-R650",
      "Hayabusa", "GSX1300R", "Bandit", "SV650", "SV1000",
      "V-Strom 250", "V-Strom 250 SX", "V-Strom 650", "V-Strom 650XT", "V-Strom 800DE", "V-Strom 1000", "V-Strom 1050", "V-Strom 1050DE",
      "Katana", "Boulevard", "Boulevard M109R", "Intruder",
      "DR-Z125", "DR-Z250", "DR-Z400", "DR-Z400S", "DR-Z400SM", "DR200", "DR650", "RM-Z250", "RM-Z450", "RM85",
    ],
  },
  {
    make: "Kawasaki",
    models: [
      "Barako", "Barako II", "CT100", "CT125", "Fury 125", "Fury 125 R", "Rouser 135", "Rouser 150", "Rouser 200", "Rouser NS125", "Rouser NS160", "Rouser NS200", "Rouser RS200",
      "Z125", "Z125 Pro", "Z250", "Z300", "Z400", "Z650", "Z650RS", "Z900", "Z900RS", "Z1000", "Z1000SX", "Z H2",
      "Ninja 125", "Ninja 250", "Ninja 300", "Ninja 400", "Ninja 500", "Ninja 650", "Ninja 1000", "Ninja 1000SX",
      "Ninja ZX-4R", "Ninja ZX-4RR", "Ninja ZX-6R", "Ninja ZX-10R", "Ninja ZX-10RR", "Ninja ZX-14R", "Ninja H2", "Ninja H2 SX", "Ninja H2R",
      "Versys 250", "Versys 300", "Versys 650", "Versys 1000", "Versys-X 300",
      "KLR650", "KLX110", "KLX140", "KLX150", "KLX150L", "KLX150BF", "KLX230", "KLX300", "KLX300SM", "KLX450R",
      "KX65", "KX85", "KX112", "KX250", "KX250F", "KX450", "KX450F",
      "W175", "W175SE", "W650", "W800", "Vulcan S", "Vulcan 900", "Vulcan 1700", "Vulcan 2000", "Eliminator", "Concours",
    ],
  },

  // European
  { make: "BMW Motorrad", models: ["G 310 R", "G 310 GS", "G 310 RR", "F 700 GS", "F 750 GS", "F 800 GS", "F 850 GS", "F 850 GS Adventure", "F 900 R", "F 900 XR", "F 900 GS", "R 1200 GS", "R 1250 GS", "R 1250 GS Adventure", "R 1300 GS", "R 1300 GS Adventure", "S 1000 RR", "S 1000 R", "S 1000 XR", "M 1000 RR", "M 1000 R", "K 1600", "R nineT", "R 18", "C 400", "CE 04"] },
  { make: "KTM", models: ["Duke 125", "Duke 200", "Duke 250", "Duke 390", "Duke 690", "Duke 790", "Duke 890", "Duke 990", "Duke 1290", "Duke 1390", "RC 125", "RC 200", "RC 250", "RC 390", "RC 8C", "Adventure 250", "Adventure 390", "Adventure 690", "Adventure 790", "Adventure 890", "Adventure 1090", "Adventure 1190", "Adventure 1290", "Super Adventure 1290", "EXC", "EXC-F", "SX", "SX-F", "Freeride", "Enduro", "Super Duke", "SMC R"] },
  { make: "Ducati", models: ["Monster", "Monster 696", "Monster 821", "Monster 937", "Monster SP", "Panigale V2", "Panigale V4", "Panigale V4 R", "Panigale V4 SP", "Streetfighter V2", "Streetfighter V4", "Streetfighter V4 SP", "Multistrada V2", "Multistrada V4", "Multistrada V4 Pikes Peak", "Multistrada V4 Rally", "Diavel", "Diavel V4", "XDiavel", "Scrambler", "Scrambler 1100", "Scrambler Icon", "Scrambler Desert Sled", "Scrambler Nightshift", "Hypermotard", "Hypermotard 950", "Hyperstrada", "DesertX", "SuperSport", "SuperSport 950"] },
  { make: "Triumph", models: ["Trident 660", "Daytona 660", "Daytona 675", "Daytona 765", "Speed Twin", "Speed Triple", "Speed Triple 1200 RS", "Speed 400", "Street Triple", "Street Triple R", "Street Triple RS", "Bonneville", "Bonneville T100", "Bonneville T120", "Bonneville Bobber", "Bonneville Speedmaster", "Scrambler", "Scrambler 400 X", "Scrambler 900", "Scrambler 1200", "Thruxton", "Thruxton RS", "Tiger 660", "Tiger Sport 660", "Tiger 850", "Tiger 900", "Tiger 1200", "Rocket 3", "Rocket 3 R", "Rocket 3 GT"] },
  { make: "Aprilia", models: ["RS 125", "RS 457", "RS 660", "RSV4", "RSV4 Factory", "Tuono 125", "Tuono 660", "Tuono V4", "Tuono V4 Factory", "Tuareg 660", "SR GT", "SR 50", "SXR 160", "Caponord", "Dorsoduro", "Shiver"] },
  { make: "MV Agusta", models: ["F3", "F3 RR", "F4", "Brutale", "Brutale 800", "Brutale 1000", "Brutale 1000 RR", "Dragster", "Dragster 800", "Turismo Veloce", "Superveloce", "Rivale", "Stradale"] },
  { make: "Husqvarna", models: ["Svartpilen 125", "Svartpilen 250", "Svartpilen 401", "Svartpilen 701", "Svartpilen 801", "Vitpilen 125", "Vitpilen 250", "Vitpilen 401", "Vitpilen 701", "Norden 901", "Norden 901 Expedition", "FE", "TE", "TX", "FC", "TC"] },
  { make: "Vespa", models: ["LX 125", "LX 150", "S 125", "S 150", "Primavera 125", "Primavera 150", "Sprint 125", "Sprint 150", "GTS 250", "GTS 300", "GTS Super", "GTV 300", "Sei Giorni", "PX 150", "Elettrica"] },
  { make: "Piaggio", models: ["Liberty", "Liberty 150", "Beverly", "Beverly 300", "Beverly 400", "Medley", "Medley 150", "Fly", "MP3", "MP3 400", "MP3 500", "X10", "Zip"] },
  { make: "Royal Enfield", models: ["Hunter 350", "Meteor 350", "Classic 350", "Classic 500", "Bullet 350", "Bullet 500", "Himalayan 411", "Himalayan 450", "Scram 411", "Scram 440", "Continental GT 535", "Continental GT 650", "Interceptor 650", "Super Meteor 650", "Shotgun 650", "Goan Classic 350", "Bear 650", "Guerrilla 450"] },
  { make: "Harley-Davidson", models: ["Sportster S", "Nightster", "Nightster Special", "Iron 883", "Iron 1200", "Forty-Eight", "Roadster", "Street 750", "Street Bob", "Softail Standard", "Low Rider S", "Low Rider ST", "Fat Bob", "Fat Boy", "Heritage Classic", "Breakout", "Road Glide", "Road Glide Special", "Road Glide ST", "Street Glide", "Street Glide Special", "Street Glide ST", "Road King", "Road King Special", "Electra Glide", "CVO", "CVO Road Glide", "CVO Street Glide", "Pan America", "Pan America 1250", "LiveWire"] },
  { make: "Indian", models: ["Scout", "Scout Bobber", "Scout Sixty", "Sport Scout", "FTR", "FTR 1200", "FTR Rally", "FTR Sport", "Chief", "Chief Bobber", "Chief Dark Horse", "Chieftain", "Chieftain Dark Horse", "Roadmaster", "Roadmaster Dark Horse", "Springfield", "Pursuit", "Challenger"] },
  { make: "Moto Guzzi", models: ["V7", "V7 Stone", "V7 Special", "V9", "V9 Bobber", "V85 TT", "V100 Mandello", "California", "Audace", "Eldorado"] },

  // Chinese / Local PH-popular
  { make: "CFMOTO", models: ["150NK", "250NK", "300NK", "300SR", "400NK", "450SR", "450MT", "650NK", "650MT", "650 Adventura", "650GT", "700CL-X", "800NK", "800MT", "800MT Touring", "1250TR-G", "Papio", "Papio SS", "Papio CL", "Papio XO"] },
  { make: "Benelli", models: ["TNT 135", "TNT 150", "TNT 250", "TNT 300", "TNT 600", "TNT 600i", "302S", "302R", "502C", "502X", "752S", "Leoncino 250", "Leoncino 500", "Leoncino 800", "TRK 251", "TRK 502", "TRK 502X", "TRK 702", "TRK 702X", "Imperiale 400", "Tornado 302R"] },
  { make: "QJMotor", models: ["SRK 250", "SRK 400", "SRK 600", "SRK 700", "SRT 550", "SRT 700", "SRT 750", "SRT 800", "SRT 800X", "SRG 600", "SRV 250"] },
  { make: "Zontes", models: ["GK 350", "ZT 125", "ZT 155", "ZT 250", "ZT 310", "ZT 350", "X310", "X350", "T310", "T350", "U150", "U310"] },
  { make: "SYM", models: ["Jet", "Jet 14", "Jet X 125", "Symphony", "Symphony S", "Symphony ST", "Maxsym", "Maxsym TL", "Maxsym 400", "Husky", "Husky 125", "Joymax", "Cruisym", "ADX"] },
  { make: "Kymco", models: ["Like 125", "Like 150", "X-Town", "X-Town 250", "X-Town 300", "X-Town 350", "AK 550", "AK 550 Premium", "Downtown", "Downtown 350", "People", "Agility", "Racing King"] },
  { make: "Rusi", models: ["Classic 125", "Classic 200", "MGZ 250", "Flash", "Flash 110", "TC 125", "TC 200", "TC 250", "Rouser", "TC Pro 250", "Sport", "Pony"] },
  { make: "Motorstar", models: ["Cafe 250", "Cafe 400", "Xplorer 200", "Xplorer 400", "MSX125", "Cafe Racer", "Lexmoto", "Magnum 200"] },
  { make: "Bajaj", models: ["Pulsar 135", "Pulsar 150", "Pulsar 180", "Pulsar 200", "Pulsar NS125", "Pulsar NS160", "Pulsar NS200", "Pulsar RS200", "Pulsar N250", "Pulsar N400", "Dominar 250", "Dominar 400", "Avenger", "CT100", "Discover", "Boxer"] },
  { make: "TVS", models: ["Apache RTR 160", "Apache RTR 180", "Apache RTR 200", "Apache RR 310", "Raider 125", "HLX 125", "HLX 150", "HLX 200", "Ronin", "Sport"] },
  { make: "Lifan", models: ["KP 200", "KP Mini", "KPR 200", "KPT 200", "Bahamas 150", "V16"] },
  { make: "SWM", models: ["Superdual", "Six Days", "Outlaw", "Silver Vase", "Gran Turismo"] },
  { make: "Voge", models: ["300R", "300DS", "300AC", "500AC", "500DS", "525R", "650DS", "650DSX", "900DSX"] },
  { make: "GPX", models: ["Demon 150", "Demon 150GR", "Drone 150", "Legend 150", "Razer 220", "Gentleman 200", "Gentleman 250"] },
  { make: "Keeway", models: ["RKR 165", "RKS 200", "TX200", "Vieste 300", "K-Light 250"] },
  { make: "Loncin", models: ["GP150", "Voge", "VR150", "VR250"] },
  { make: "Skygo", models: ["Wings", "Sky 100", "Stallion", "Cosmo", "Zoom"] },
  { make: "Kawayama", models: ["XRM Clone", "GP125", "Sky 125"] },
  { make: "Euro Pony", models: ["Pony", "Mini Bike"] },
  { make: "Daelim", models: ["VJF250", "VJ125", "Daystar", "Roadwin"] },
  { make: "Hyosung", models: ["GT250R", "GT650R", "GV250", "GV650", "Aquila"] },
  { make: "ATK", models: ["AT110", "ATX125"] },
  { make: "Beta", models: ["RR 125", "RR 250", "RR 300", "RR 350", "RR 390", "RR 480", "Xtrainer"] },
  { make: "GasGas", models: ["MC 125", "MC 250", "MC 450F", "EC 250", "EC 350F", "ES 700", "ES 700SM"] },

  // Other
  { make: "Other", models: ["Other"] },
];

export function getMakes(category: VehicleCategory): MakeModels[] {
  return category === "motorcycle" ? MOTORCYCLE_MAKES : CAR_MAKES;
}
