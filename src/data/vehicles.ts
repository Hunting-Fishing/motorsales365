// Vehicle makes & models commonly sold in the Philippine market.
// Heavy emphasis on Japanese brands (the dominant share of PH sales),
// plus Korean, American, European, Chinese and Indian brands present locally.
// Models include current and recent-historic nameplates buyers search for.

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
      "Vios", "Wigo", "Yaris", "Yaris Cross", "Corolla Altis", "Corolla Cross",
      "Camry", "Avanza", "Veloz", "Rush", "Innova", "Zenix", "Fortuner",
      "Land Cruiser", "Land Cruiser Prado", "Hilux", "Hiace", "Hiace Commuter",
      "Tamaraw", "FJ Cruiser", "RAV4", "GR Yaris", "GR Supra", "GR86",
      "Alphard", "Vellfire", "Lite Ace", "Coaster", "Prius", "bZ4X",
    ],
  },
  {
    make: "Honda",
    models: [
      "Brio", "City", "City Hatchback", "Civic", "Civic Type R", "Accord",
      "BR-V", "HR-V", "CR-V", "ZR-V", "Pilot", "Odyssey", "Mobilio",
      "Fit / Jazz", "Stepwgn", "Freed", "e:N1",
    ],
  },
  {
    make: "Mitsubishi",
    models: [
      "Mirage", "Mirage G4", "Lancer EX", "Xpander", "Xpander Cross",
      "Montero Sport", "Pajero", "Pajero Sport", "Strada", "Triton",
      "L300", "Adventure", "Outlander", "Outlander PHEV", "ASX", "Eclipse Cross",
      "Xforce",
    ],
  },
  {
    make: "Nissan",
    models: [
      "Almera", "Sylphy", "Sentra", "Juke", "Kicks", "Kicks e-Power",
      "X-Trail", "Murano", "Patrol", "Patrol Royale", "Terra",
      "Navara", "NP300", "Frontier", "Urvan", "NV350", "GT-R", "370Z", "Z",
      "Leaf",
    ],
  },
  {
    make: "Mazda",
    models: [
      "Mazda2", "Mazda2 Hatchback", "Mazda3", "Mazda3 Sportback", "Mazda6",
      "CX-3", "CX-30", "CX-5", "CX-8", "CX-9", "CX-50", "CX-60", "CX-90",
      "MX-5 Miata", "BT-50", "MX-30",
    ],
  },
  {
    make: "Suzuki",
    models: [
      "Alto", "Celerio", "Swift", "Dzire", "Ciaz", "Ertiga", "XL7",
      "S-Presso", "Jimny", "Jimny 5-door", "Vitara", "Grand Vitara",
      "APV", "Carry",
    ],
  },
  {
    make: "Subaru",
    models: [
      "Impreza", "WRX", "WRX STI", "Legacy", "BRZ", "XV", "Crosstrek",
      "Forester", "Outback", "Evoltis (Ascent)",
    ],
  },
  {
    make: "Isuzu",
    models: [
      "D-Max", "mu-X", "Crosswind", "Traviz", "N-Series", "F-Series",
    ],
  },
  { make: "Lexus", models: ["IS", "ES", "LS", "UX", "NX", "RX", "GX", "LX", "RZ", "RC", "LC"] },
  { make: "Acura", models: ["Integra", "TLX", "RDX", "MDX"] },
  { make: "Infiniti", models: ["Q50", "Q60", "QX50", "QX55", "QX60", "QX80"] },

  // ---------- Korean ----------
  {
    make: "Hyundai",
    models: [
      "Eon", "Reina", "Accent", "Elantra", "Sonata", "Stargazer",
      "Stargazer X", "Creta", "Kona", "Kona Electric", "Tucson", "Santa Fe",
      "Palisade", "Staria", "H-100", "H-350", "Ioniq 5", "Ioniq 6",
    ],
  },
  {
    make: "Kia",
    models: [
      "Picanto", "Soluto", "Rio", "Forte", "K3", "K5", "Stonic", "Seltos",
      "Sportage", "Sorento", "Carnival", "Carens", "EV5", "EV6", "EV9",
    ],
  },
  { make: "Genesis", models: ["G70", "G80", "G90", "GV60", "GV70", "GV80"] },
  { make: "SsangYong", models: ["Tivoli", "Korando", "Rexton", "Musso"] },

  // ---------- American ----------
  { make: "Ford", models: ["EcoSport", "Territory", "Escape", "Bronco", "Bronco Sport", "Everest", "Explorer", "Expedition", "Mustang", "Ranger", "Ranger Raptor", "F-150", "F-150 Raptor", "Transit"] },
  { make: "Chevrolet", models: ["Spark", "Sail", "Trax", "Tracker", "Captiva", "Trailblazer", "Colorado", "Tahoe", "Suburban", "Camaro", "Corvette", "Silverado"] },
  { make: "Jeep", models: ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler", "Gladiator"] },
  { make: "Dodge", models: ["Charger", "Challenger", "Durango"] },
  { make: "Ram", models: ["1500", "2500"] },
  { make: "GMC", models: ["Sierra", "Yukon"] },
  { make: "Cadillac", models: ["CT4", "CT5", "XT4", "XT5", "XT6", "Escalade"] },
  { make: "Tesla", models: ["Model 3", "Model Y", "Model S", "Model X", "Cybertruck"] },

  // ---------- European ----------
  { make: "BMW", models: ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4", "M2", "M3", "M4", "M5", "M8", "i3", "i4", "i5", "i7", "iX", "iX1", "iX3"] },
  { make: "Mercedes-Benz", models: ["A-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "V-Class", "Vito", "Sprinter", "EQA", "EQB", "EQC", "EQE", "EQS", "AMG GT"] },
  { make: "Audi", models: ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "TT", "R8", "RS3", "RS5", "RS6", "RS7", "e-tron", "e-tron GT", "Q4 e-tron", "Q8 e-tron"] },
  { make: "Volkswagen", models: ["Polo", "Jetta", "Santana", "Lamando", "Lavida", "Tiguan", "Touareg", "T-Cross", "T-Roc", "ID.4", "ID.6"] },
  { make: "Porsche", models: ["911", "718 Cayman", "718 Boxster", "Panamera", "Macan", "Cayenne", "Taycan"] },
  { make: "Volvo", models: ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90", "EX30", "EX90"] },
  { make: "Mini", models: ["Cooper", "Cooper S", "Clubman", "Countryman", "Convertible", "JCW"] },
  { make: "Land Rover", models: ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Velar", "Range Rover Evoque"] },
  { make: "Jaguar", models: ["XE", "XF", "F-Type", "E-Pace", "F-Pace", "I-Pace"] },
  { make: "Peugeot", models: ["208", "2008", "3008", "5008", "Traveller", "Landtrek", "Expert"] },
  { make: "Renault", models: ["Kiger", "Kwid", "Triber", "Captur", "Koleos"] },
  { make: "Citroën", models: ["C3", "C3 Aircross", "C5 Aircross"] },
  { make: "Fiat", models: ["500", "500X", "Panda"] },
  { make: "Alfa Romeo", models: ["Giulia", "Stelvio", "Tonale"] },
  { make: "Maserati", models: ["Ghibli", "Quattroporte", "Levante", "Grecale", "MC20"] },
  { make: "Ferrari", models: ["Roma", "Portofino M", "296 GTB", "SF90", "Purosangue"] },
  { make: "Lamborghini", models: ["Huracán", "Revuelto", "Urus"] },
  { make: "Bentley", models: ["Continental GT", "Flying Spur", "Bentayga"] },
  { make: "Rolls-Royce", models: ["Ghost", "Phantom", "Cullinan", "Spectre"] },
  { make: "Lotus", models: ["Emira", "Eletre", "Emeya"] },

  // ---------- Chinese ----------
  { make: "BYD", models: ["Dolphin", "Seal", "Atto 3", "Han", "Tang", "Sealion 6", "Shark"] },
  { make: "MG", models: ["MG3", "MG5", "ZS", "ZS EV", "HS", "RX5", "GS", "Cyberster", "MG4"] },
  { make: "Geely", models: ["Coolray", "Azkarra", "Okavango", "Emgrand", "Atlas", "Geometry C", "Starray"] },
  { make: "Chery", models: ["Tiggo 2", "Tiggo 4 Pro", "Tiggo 5x", "Tiggo 7 Pro", "Tiggo 8", "Tiggo 8 Pro", "Omoda 5"] },
  { make: "Haval", models: ["Jolion", "H6", "H9", "Big Dog"] },
  { make: "GWM", models: ["Tank 300", "Tank 500", "Cannon", "Ora Good Cat"] },
  { make: "Maxus", models: ["G10", "G50", "T60", "T90", "D60", "D90", "V80"] },
  { make: "Foton", models: ["Toplander", "Thunder", "Gratour", "View Traveller", "Tornado"] },
  { make: "JAC", models: ["S2", "S3", "S4", "S7", "T6", "T8", "T9", "Sunray"] },
  { make: "Dongfeng", models: ["Rich 6", "Glory 580", "Forthing T5"] },
  { make: "BAIC", models: ["X35", "X55", "BJ20", "BJ40"] },
  { make: "Changan", models: ["CS35 Plus", "CS55 Plus", "CS75 Plus", "Alsvin", "Hunter"] },
  { make: "GAC", models: ["GS3", "GS4", "GS8", "Empow", "M8"] },
  { make: "Hongqi", models: ["H5", "H9", "HS5", "E-HS9"] },

  { make: "Bestune", models: ["T55", "T77", "T90", "B70"] },
  { make: "Changhe", models: ["M50", "Freedom"] },
  { make: "DFSK", models: ["Glory 500", "Glory 580", "Glory 600", "Glory iX5", "Super Cab", "Mini Truck", "C31", "C35"] },
  { make: "Deepal", models: ["S07", "S05", "L07", "G318"] },
  { make: "DENZA", models: ["D9", "N7", "N9", "Z9 GT"] },
  { make: "FAW", models: ["Bestune T77", "Sirius S80", "Bestune B30", "V80", "Tiger V"] },
  { make: "Haima", models: ["S5", "7X", "8S"] },
  { make: "JETOUR", models: ["Dashing", "X70", "X70 Plus", "X90", "X95", "T2"] },
  { make: "Jaecoo", models: ["J7", "J8"] },
  { make: "Kaicene", models: ["F70", "Star Truck", "Star 9"] },
  { make: "Kaiyi", models: ["X3 Pro", "E5", "X3"] },
  { make: "KG Mobility", models: ["Tivoli", "Korando", "Torres", "Rexton", "Musso"] },
  { make: "King Long", models: ["Kingo", "Kingwin", "Sea Lion"] },
  { make: "Li Auto", models: ["L6", "L7", "L8", "L9", "Mega"] },
  { make: "Lynk & Co", models: ["01", "03", "05", "06", "09"] },
  { make: "Omoda", models: ["Omoda 5", "Omoda E5", "Omoda C7", "Omoda C9"] },
  { make: "RADAR", models: ["RD6"] },
  { make: "VinFast", models: ["VF 3", "VF 5", "VF 6", "VF 7", "VF 8", "VF 9", "VF e34"] },
  { make: "Voyah", models: ["Free", "Dream", "Courage", "Passion"] },
  { make: "ZEEKR", models: ["001", "007", "009", "X", "Mix"] },

  // ---------- Indian ----------
  { make: "Tata", models: ["Nexon", "Punch", "Tiago", "Tigor", "Altroz", "Harrier", "Safari", "Xpres-T", "Ace"] },
  { make: "Mahindra", models: ["Scorpio", "Scorpio-N", "XUV300", "XUV400", "XUV700", "Bolero", "Bolero Neo", "Thar", "Thar Roxx", "Pik Up", "Marazzo", "Enforcer"] },

  // ---------- Italian / British (niche) ----------
  { make: "Abarth", models: ["595", "695", "500e"] },
  { make: "Chrysler", models: ["300", "Pacifica"] },
  { make: "Aston Martin", models: ["Vantage", "DB11", "DB12", "DBS", "DBX"] },

  // ---------- New PH-market EV brands ----------
  { make: "Aito", models: ["M5", "M7", "M9"] },
  { make: "GAZ", models: ["Gazelle Next", "Sobol"] },

  // ---------- Other ----------
  { make: "Other", models: ["Other"] },
];

export const MOTORCYCLE_MAKES: MakeModels[] = [
  // Big 4 Japanese
  {
    make: "Honda",
    models: [
      "Click 125i", "Click 160", "BeAT", "Genio", "Wave 110", "Wave 125", "Wave Alpha",
      "Dio", "PCX 160", "ADV 160", "ADV 350", "Airblade", "XRM 125", "RS125 Fi", "TMX 125",
      "CB150R Streetfire", "CB150X", "CB300F", "CB300R", "CB500F", "CB650R", "CB1000R",
      "CBR150R", "CBR250RR", "CBR500R", "CBR650R", "CBR1000RR-R Fireblade",
      "Rebel 300", "Rebel 500", "Rebel 1100", "X-ADV", "Forza 350", "Africa Twin",
      "Gold Wing", "CRF150L", "CRF250L", "CRF250 Rally", "CRF300L", "CRF300 Rally", "XR150L",
    ],
  },
  {
    make: "Yamaha",
    models: [
      "Mio i 125", "Mio Sporty", "Mio Soul i 125", "Mio Aerox 155", "Aerox 155", "Aerox Alpha",
      "NMAX 155", "XMAX 300", "Tmax", "Lexi 125", "Fazzio", "Sniper 150", "Sniper 155",
      "MT-03", "MT-07", "MT-09", "MT-10", "MT-15", "MT-25",
      "YZF-R3", "YZF-R7", "YZF-R15", "YZF-R25", "YZF-R1", "YZF-R6",
      "Tracer 9", "XSR155", "XSR700", "XSR900", "Tenere 700", "Vmax",
      "WR155R", "WR250R", "YZ85", "YZ125", "YZ250", "YZ250F", "YZ450F",
    ],
  },
  {
    make: "Suzuki",
    models: [
      "Raider J Crossover", "Raider R150 Fi", "Raider R150 Carb", "Smash 115", "Skydrive Sport",
      "Burgman Street", "Avenis", "Address", "GSX-S150", "GSX-R150", "GSX-S750", "GSX-R750",
      "GSX-S1000", "GSX-R1000", "Hayabusa", "V-Strom 250 SX", "V-Strom 650", "V-Strom 800DE", "V-Strom 1050",
      "Katana", "Boulevard", "DR-Z400", "RM-Z250", "RM-Z450",
    ],
  },
  {
    make: "Kawasaki",
    models: [
      "Barako II", "CT125", "Fury 125", "Rouser NS160", "Rouser NS200", "Z125 Pro", "Z250", "Z400",
      "Z650", "Z900", "Z1000", "Ninja 250", "Ninja 400", "Ninja 500", "Ninja 650",
      "Ninja ZX-4RR", "Ninja ZX-6R", "Ninja ZX-10R", "Ninja H2", "Versys 650", "Versys 1000",
      "KLX150", "KLX230", "KLX300", "W175", "W800", "Vulcan S",
    ],
  },

  // European
  { make: "BMW Motorrad", models: ["G 310 R", "G 310 GS", "F 750 GS", "F 850 GS", "F 900 R", "R 1250 GS", "R 1300 GS", "S 1000 RR", "S 1000 R", "M 1000 RR"] },
  { make: "KTM", models: ["Duke 200", "Duke 250", "Duke 390", "Duke 790", "Duke 890", "Duke 1290", "RC 200", "RC 390", "Adventure 250", "Adventure 390", "Adventure 890", "Adventure 1290", "EXC", "SX-F"] },
  { make: "Ducati", models: ["Monster", "Panigale V2", "Panigale V4", "Streetfighter V2", "Streetfighter V4", "Multistrada V2", "Multistrada V4", "Diavel", "Scrambler", "Hypermotard"] },
  { make: "Triumph", models: ["Trident 660", "Daytona 660", "Speed Triple", "Street Triple", "Bonneville", "Scrambler", "Tiger 660", "Tiger 900", "Tiger 1200", "Rocket 3"] },
  { make: "Aprilia", models: ["RS 457", "RS 660", "RSV4", "Tuono 660", "Tuono V4", "Tuareg 660", "SR GT"] },
  { make: "MV Agusta", models: ["F3", "Brutale", "Dragster", "Turismo Veloce"] },
  { make: "Husqvarna", models: ["Svartpilen 250", "Svartpilen 401", "Vitpilen 401", "Norden 901"] },
  { make: "Vespa", models: ["Primavera 150", "Sprint 150", "GTS 300"] },
  { make: "Piaggio", models: ["Liberty", "Beverly", "Medley"] },
  { make: "Royal Enfield", models: ["Hunter 350", "Meteor 350", "Classic 350", "Bullet 350", "Himalayan 450", "Scram 411", "Continental GT 650", "Interceptor 650", "Super Meteor 650", "Shotgun 650"] },
  { make: "Harley-Davidson", models: ["Sportster S", "Nightster", "Iron 883", "Forty-Eight", "Street Bob", "Fat Bob", "Fat Boy", "Heritage Classic", "Road Glide", "Street Glide", "Road King", "Pan America"] },
  { make: "Indian", models: ["Scout", "FTR", "Chief", "Chieftain", "Roadmaster"] },

  // Chinese / Local PH-popular
  { make: "CFMOTO", models: ["150NK", "300NK", "300SR", "400NK", "650NK", "650MT", "700CL-X", "800NK", "800MT", "Papio"] },
  { make: "Benelli", models: ["TNT 135", "TNT 150", "TNT 600i", "302S", "502C", "Leoncino 500", "TRK 251", "TRK 502", "TRK 702"] },
  { make: "QJMotor", models: ["SRK 250", "SRK 400", "SRK 600", "SRT 550", "SRT 800"] },
  { make: "Zontes", models: ["GK 350", "ZT 310", "ZT 350", "X310", "T310"] },
  { make: "SYM", models: ["Jet", "Symphony", "Maxsym", "Husky"] },
  { make: "Kymco", models: ["Like 150", "X-Town", "AK 550"] },
  { make: "Rusi", models: ["Classic 125", "MGZ 250", "Flash 110", "TC 125", "TC 250"] },
  { make: "Motorstar", models: ["Cafe 400", "Xplorer 200", "MSX125"] },

  // Other
  { make: "Other", models: ["Other"] },
];

export function getMakes(category: VehicleCategory): MakeModels[] {
  return category === "motorcycle" ? MOTORCYCLE_MAKES : CAR_MAKES;
}
