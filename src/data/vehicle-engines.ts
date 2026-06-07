// Engine variants per Make → Model, with year-range applicability.
// Used to populate the Engine field in vehicle fitment so parts can be tied
// to the correct displacement / engine code for a given model-year.
//
// Coverage focuses on the most popular PH-market nameplates. Models not
// listed simply fall back to a free-text Engine input — adding new entries
// here is additive and safe.

import type { VehicleCategory } from "./vehicles";

export type EngineSpec = {
  /** Display label, e.g. "2.4L Diesel (2GD-FTV)" or "1.5L Gasoline" */
  label: string;
  /** Optional internal engine code, e.g. "2GD-FTV", "K15B" */
  code?: string;
  /** First model year this engine appeared (inclusive) */
  start?: number;
  /** Last model year this engine appeared (inclusive). Omit = present. */
  end?: number;
};

export type EngineCatalog = Partial<
  Record<VehicleCategory, Record<string, Record<string, EngineSpec[]>>>
>;

export const VEHICLE_ENGINES: EngineCatalog = {
  car: {
    Toyota: {
      Vios: [
        { label: "1.3L Gasoline (2NR-FE)", code: "2NR-FE", start: 2013, end: 2022 },
        { label: "1.5L Gasoline (1NZ-FE)", code: "1NZ-FE", start: 2007, end: 2013 },
        { label: "1.5L Gasoline (2NR-VE)", code: "2NR-VE", start: 2023 },
      ],
      Wigo: [
        { label: "1.0L Gasoline (1KR-VE)", code: "1KR-VE", start: 2014, end: 2023 },
        { label: "1.2L Gasoline (3NR-VE)", code: "3NR-VE", start: 2023 },
      ],
      Hilux: [
        { label: "2.4L Diesel (2GD-FTV)", code: "2GD-FTV", start: 2015 },
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2015 },
        { label: "2.7L Gasoline (2TR-FE)", code: "2TR-FE", start: 2015 },
        { label: "3.0L Diesel (1KD-FTV)", code: "1KD-FTV", start: 2005, end: 2015 },
        { label: "2.5L Diesel (2KD-FTV)", code: "2KD-FTV", start: 2005, end: 2015 },
      ],
      Fortuner: [
        { label: "2.4L Diesel (2GD-FTV)", code: "2GD-FTV", start: 2015 },
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2015 },
        { label: "2.7L Gasoline (2TR-FE)", code: "2TR-FE", start: 2015 },
        { label: "3.0L Diesel (1KD-FTV)", code: "1KD-FTV", start: 2005, end: 2015 },
      ],
      Innova: [
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2016, end: 2022 },
        { label: "2.0L Gasoline (1TR-FE)", code: "1TR-FE", start: 2005, end: 2022 },
        { label: "2.5L Diesel (2KD-FTV)", code: "2KD-FTV", start: 2005, end: 2016 },
      ],
      "Innova Zenix": [
        { label: "2.0L Hybrid (M20A-FXS)", code: "M20A-FXS", start: 2022 },
        { label: "2.0L Gasoline (M20A-FKS)", code: "M20A-FKS", start: 2022 },
      ],
      Avanza: [
        { label: "1.3L Gasoline (K3-VE)", code: "K3-VE", start: 2003, end: 2021 },
        { label: "1.5L Gasoline (2NR-VE)", code: "2NR-VE", start: 2021 },
        { label: "1.3L Gasoline (1NR-VE)", code: "1NR-VE", start: 2015 },
      ],
      Rush: [{ label: "1.5L Gasoline (2NR-VE)", code: "2NR-VE", start: 2018 }],
      "Corolla Altis": [
        { label: "1.6L Gasoline (1ZR-FE)", code: "1ZR-FE", start: 2008, end: 2019 },
        { label: "1.8L Gasoline (2ZR-FE)", code: "2ZR-FE", start: 2008, end: 2019 },
        { label: "1.6L Gasoline (2ZR-FBE)", code: "2ZR-FBE", start: 2019 },
        { label: "1.8L Hybrid (2ZR-FXE)", code: "2ZR-FXE", start: 2019 },
      ],
      "Corolla Cross": [
        { label: "1.8L Gasoline (2ZR-FBE)", code: "2ZR-FBE", start: 2020 },
        { label: "1.8L Hybrid (2ZR-FXE)", code: "2ZR-FXE", start: 2020 },
      ],
      Camry: [
        { label: "2.5L Gasoline (2AR-FE)", code: "2AR-FE", start: 2011, end: 2019 },
        { label: "2.5L Hybrid (A25A-FXS)", code: "A25A-FXS", start: 2019 },
        { label: "3.5L V6 (2GR-FKS)", code: "2GR-FKS", start: 2018 },
      ],
      RAV4: [
        { label: "2.5L Gasoline (A25A-FKS)", code: "A25A-FKS", start: 2019 },
        { label: "2.5L Hybrid (A25A-FXS)", code: "A25A-FXS", start: 2019 },
      ],
      "Land Cruiser 200": [
        { label: "4.5L V8 Diesel (1VD-FTV)", code: "1VD-FTV", start: 2007, end: 2021 },
        { label: "4.6L V8 Gasoline (1UR-FE)", code: "1UR-FE", start: 2012, end: 2021 },
      ],
      "Land Cruiser 300": [
        { label: "3.3L V6 Twin-Turbo Diesel (F33A-FTV)", code: "F33A-FTV", start: 2021 },
        { label: "3.5L V6 Twin-Turbo Gasoline (V35A-FTS)", code: "V35A-FTS", start: 2021 },
      ],
      Hiace: [
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2019 },
        { label: "3.0L Diesel (1KD-FTV)", code: "1KD-FTV", start: 2005, end: 2019 },
        { label: "2.5L Diesel (2KD-FTV)", code: "2KD-FTV", start: 2005, end: 2019 },
      ],
    },
    Mitsubishi: {
      Mirage: [{ label: "1.2L Gasoline (3A92)", code: "3A92", start: 2012 }],
      "Mirage G4": [{ label: "1.2L Gasoline (3A92)", code: "3A92", start: 2013 }],
      Lancer: [
        { label: "1.6L Gasoline (4G18)", code: "4G18", start: 2003, end: 2008 },
        { label: "2.0L Gasoline (4B11)", code: "4B11", start: 2007, end: 2017 },
        { label: "1.8L Gasoline (4B10)", code: "4B10", start: 2007, end: 2017 },
        { label: "2.0L Turbo (4B11T, Evo X)", code: "4B11T", start: 2007, end: 2016 },
      ],
      "Lancer EX": [
        { label: "1.6L Gasoline (4G18)", code: "4G18", start: 2008, end: 2017 },
        { label: "2.0L Gasoline (4B11)", code: "4B11", start: 2008, end: 2017 },
      ],
      ASX: [
        { label: "2.0L Gasoline (4B11)", code: "4B11", start: 2010 },
        { label: "1.6L Diesel (4N13)", code: "4N13", start: 2012, end: 2019 },
      ],
      Outlander: [
        { label: "2.4L Gasoline (4B12)", code: "4B12", start: 2012 },
        { label: "3.0L V6 (6B31)", code: "6B31", start: 2012, end: 2019 },
        { label: "2.0L PHEV (4B11)", code: "4B11", start: 2013 },
      ],
      Pajero: [
        { label: "2.5L Diesel (4D56)", code: "4D56", start: 1986, end: 2006 },
        { label: "2.8L Diesel (4M40)", code: "4M40", start: 1993, end: 2006 },
        { label: "3.0L V6 Gasoline (6G72)", code: "6G72", start: 1991, end: 2021 },
        { label: "3.2L Diesel (4M41)", code: "4M41", start: 2000, end: 2021 },
        { label: "3.5L V6 Gasoline (6G74)", code: "6G74", start: 1994, end: 2006 },
        { label: "3.8L V6 Gasoline (6G75)", code: "6G75", start: 2003, end: 2021 },
      ],
      "Pajero Sport": [
        { label: "2.5L Diesel (4D56)", code: "4D56", start: 2008, end: 2015 },
        { label: "2.4L Diesel (4N15)", code: "4N15", start: 2015 },
        { label: "3.0L V6 Gasoline (6B31)", code: "6B31", start: 2008, end: 2016 },
      ],
      Adventure: [
        { label: "2.5L Diesel (4D56)", code: "4D56", start: 1997, end: 2017 },
        { label: "1.8L Gasoline (4G93)", code: "4G93", start: 1997, end: 2008 },
      ],
      Galant: [
        { label: "2.0L Gasoline (4G63)", code: "4G63", start: 1996, end: 2012 },
        { label: "2.4L Gasoline (4G69)", code: "4G69", start: 2003, end: 2012 },
        { label: "3.8L V6 (6G75)", code: "6G75", start: 2003, end: 2012 },
      ],
      Montero: [
        { label: "2.5L Diesel (4D56)", code: "4D56", start: 2008, end: 2016 },
        { label: "2.4L Diesel (4N15)", code: "4N15", start: 2016 },
      ],
      "Montero Sport": [
        { label: "2.5L Diesel (4D56)", code: "4D56", start: 2008, end: 2016 },
        { label: "2.4L Diesel (4N15)", code: "4N15", start: 2016 },
      ],
      Strada: [
        { label: "2.5L Diesel (4D56)", code: "4D56", start: 2005, end: 2015 },
        { label: "2.4L Diesel (4N15)", code: "4N15", start: 2015 },
      ],
      Xpander: [{ label: "1.5L Gasoline (4A91)", code: "4A91", start: 2018 }],
      "Xpander Cross": [{ label: "1.5L Gasoline (4A91)", code: "4A91", start: 2019 }],
      L300: [
        { label: "2.5L Diesel (4D56)", code: "4D56", end: 2017 },
        { label: "2.2L Diesel (4N14)", code: "4N14", start: 2021 },
      ],
    },
    Honda: {
      City: [
        { label: "1.5L Gasoline (L15A)", code: "L15A", start: 2008, end: 2020 },
        { label: "1.5L Gasoline (L15B)", code: "L15B", start: 2020 },
      ],
      Jazz: [
        { label: "1.3L Gasoline (L13Z)", code: "L13Z", start: 2008, end: 2020 },
        { label: "1.5L Gasoline (L15A)", code: "L15A", start: 2008, end: 2020 },
      ],
      Civic: [
        { label: "1.8L Gasoline (R18Z)", code: "R18Z", start: 2012, end: 2021 },
        { label: "1.5L Turbo (L15B7)", code: "L15B7", start: 2016 },
        { label: "2.0L VTEC Turbo (K20C1, Type R)", code: "K20C1", start: 2017 },
      ],
      CRV: [
        { label: "2.0L Gasoline (R20A)", code: "R20A", start: 2007, end: 2017 },
        { label: "1.5L Turbo (L15BE)", code: "L15BE", start: 2017 },
        { label: "1.6L Diesel i-DTEC (N16A)", code: "N16A", start: 2015, end: 2022 },
      ],
      "CR-V": [
        { label: "2.0L Gasoline (R20A)", code: "R20A", start: 2007, end: 2017 },
        { label: "1.5L Turbo (L15BE)", code: "L15BE", start: 2017 },
        { label: "1.6L Diesel i-DTEC (N16A)", code: "N16A", start: 2015, end: 2022 },
      ],
      BR_V: [{ label: "1.5L Gasoline (L15Z)", code: "L15Z", start: 2016 }],
      "BR-V": [{ label: "1.5L Gasoline (L15Z)", code: "L15Z", start: 2016 }],
    },
    Nissan: {
      Almera: [
        { label: "1.5L Gasoline (HR15DE)", code: "HR15DE", start: 2011, end: 2022 },
        { label: "1.0L Turbo (HRA0)", code: "HRA0", start: 2022 },
      ],
      Navara: [
        { label: "2.5L Diesel (YD25DDTi)", code: "YD25DDTi", start: 2005, end: 2021 },
        { label: "2.5L Turbo Diesel (QR25)", code: "QR25", start: 2021 },
      ],
      Terra: [{ label: "2.5L Diesel (YD25DDTi)", code: "YD25DDTi", start: 2018 }],
      "X-Trail": [
        { label: "2.0L Gasoline (MR20DD)", code: "MR20DD", start: 2014, end: 2022 },
        { label: "2.5L Gasoline (QR25DE)", code: "QR25DE", start: 2014 },
      ],
      Patrol: [
        { label: "5.6L V8 Gasoline (VK56VD)", code: "VK56VD", start: 2010 },
        { label: "4.0L V6 Gasoline (VQ40DE)", code: "VQ40DE", start: 2010 },
      ],
      "GT-R": [{ label: "3.8L Twin-Turbo V6 (VR38DETT)", code: "VR38DETT", start: 2007 }],
    },
    Ford: {
      Ranger: [
        { label: "2.2L Diesel (Duratorq TDCi)", start: 2011, end: 2022 },
        { label: "3.2L 5-cyl Diesel (Duratorq)", start: 2011, end: 2022 },
        { label: "2.0L Bi-Turbo Diesel (EcoBlue)", start: 2018 },
        { label: "2.0L Single-Turbo Diesel (EcoBlue)", start: 2018 },
        { label: "3.0L V6 Turbo Diesel (Lion)", start: 2022 },
      ],
      Everest: [
        { label: "2.2L Diesel (Duratorq TDCi)", start: 2015, end: 2022 },
        { label: "3.2L 5-cyl Diesel (Duratorq)", start: 2015, end: 2022 },
        { label: "2.0L Bi-Turbo Diesel (EcoBlue)", start: 2018 },
        { label: "3.0L V6 Turbo Diesel (Lion)", start: 2022 },
      ],
      Mustang: [
        { label: "2.3L EcoBoost I4", start: 2015 },
        { label: "5.0L V8 Coyote", start: 2015 },
        { label: "5.2L V8 Voodoo (GT350)", start: 2015, end: 2020 },
      ],
      Raptor: [
        { label: "3.0L V6 Twin-Turbo Petrol", start: 2023 },
        { label: "2.0L Bi-Turbo Diesel", start: 2018, end: 2022 },
      ],
    },
    Isuzu: {
      "D-Max": [
        { label: "3.0L Diesel (4JJ1-TC)", code: "4JJ1-TC", start: 2007, end: 2019 },
        { label: "1.9L Diesel (RZ4E-TC)", code: "RZ4E-TC", start: 2018 },
        { label: "3.0L Diesel (4JJ3-TCX)", code: "4JJ3-TCX", start: 2020 },
      ],
      MUX: [
        { label: "3.0L Diesel (4JJ1-TC)", code: "4JJ1-TC", start: 2013, end: 2020 },
        { label: "1.9L Diesel (RZ4E-TC)", code: "RZ4E-TC", start: 2018 },
        { label: "3.0L Diesel (4JJ3-TCX)", code: "4JJ3-TCX", start: 2020 },
      ],
      "MU-X": [
        { label: "3.0L Diesel (4JJ1-TC)", code: "4JJ1-TC", start: 2013, end: 2020 },
        { label: "1.9L Diesel (RZ4E-TC)", code: "RZ4E-TC", start: 2018 },
        { label: "3.0L Diesel (4JJ3-TCX)", code: "4JJ3-TCX", start: 2020 },
      ],
      Crosswind: [{ label: "2.5L Diesel (4JA1)", code: "4JA1", end: 2017 }],
    },
    Mazda: {
      "BT-50": [
        { label: "2.2L Diesel (MZ-CD)", start: 2011, end: 2020 },
        { label: "3.2L Diesel (MZ-CD)", start: 2011, end: 2020 },
        { label: "1.9L Diesel (RZ4E-TC)", code: "RZ4E-TC", start: 2021 },
        { label: "3.0L Diesel (4JJ3-TCX)", code: "4JJ3-TCX", start: 2021 },
      ],
      "CX-5": [
        { label: "2.0L Skyactiv-G", start: 2012 },
        { label: "2.5L Skyactiv-G", start: 2012 },
        { label: "2.2L Skyactiv-D Diesel", start: 2012 },
      ],
      Mazda3: [
        { label: "1.5L Skyactiv-G", start: 2013, end: 2019 },
        { label: "2.0L Skyactiv-G", start: 2013 },
        { label: "2.5L Skyactiv-G", start: 2019 },
      ],
    },
    Suzuki: {
      Swift: [
        { label: "1.2L Gasoline (K12B/K12C)", start: 2011 },
        { label: "1.4L Boosterjet (K14C)", code: "K14C", start: 2017 },
      ],
      Jimny: [
        { label: "1.3L Gasoline (M13A)", code: "M13A", start: 1998, end: 2018 },
        { label: "1.5L Gasoline (K15B)", code: "K15B", start: 2018 },
      ],
      Ertiga: [
        { label: "1.4L Gasoline (K14B)", code: "K14B", start: 2012, end: 2019 },
        { label: "1.5L Gasoline (K15B)", code: "K15B", start: 2019 },
      ],
      Vitara: [{ label: "1.6L Gasoline (M16A)", code: "M16A", start: 2015 }],
    },
    Hyundai: {
      Accent: [
        { label: "1.4L Gasoline (Kappa)", start: 2011 },
        { label: "1.6L CRDi Diesel (U-II)", start: 2011 },
      ],
      Tucson: [
        { label: "2.0L Gasoline (Nu MPI)", start: 2015 },
        { label: "2.0L CRDi Diesel (R-Engine)", start: 2015 },
        { label: "1.6L T-GDi Gasoline (Smartstream)", start: 2021 },
      ],
      Santa_Fe: [
        { label: "2.2L CRDi Diesel (R-Engine)", start: 2012 },
        { label: "2.4L Gasoline (Theta II)", start: 2012, end: 2018 },
      ],
      "Santa Fe": [
        { label: "2.2L CRDi Diesel (R-Engine)", start: 2012 },
        { label: "2.4L Gasoline (Theta II)", start: 2012, end: 2018 },
      ],
      Starex: [{ label: "2.5L CRDi Diesel (A-Engine)", start: 2007 }],
    },
    Kia: {
      Picanto: [{ label: "1.0L Gasoline (Kappa)", start: 2011 }],
      Soluto: [{ label: "1.4L Gasoline (Kappa)", start: 2019 }],
      Sportage: [
        { label: "2.0L Gasoline (Nu MPI)", start: 2010 },
        { label: "2.0L CRDi Diesel (R-Engine)", start: 2010 },
      ],
      Sorento: [
        { label: "2.2L CRDi Diesel", start: 2014 },
        { label: "2.4L Gasoline (Theta II)", start: 2014, end: 2020 },
      ],
    },
    Chevrolet: {
      Colorado: [
        { label: "2.5L Diesel (Duramax)", start: 2012, end: 2020 },
        { label: "2.8L Diesel (Duramax)", start: 2012, end: 2020 },
      ],
      Trailblazer: [
        { label: "2.5L Diesel (Duramax)", start: 2012, end: 2020 },
        { label: "2.8L Diesel (Duramax)", start: 2012, end: 2020 },
      ],
    },
  },
  motorcycle: {
    Honda: {
      "Click 125i": [{ label: "125cc eSP", start: 2014 }],
      "Click 150i": [{ label: "150cc eSP", start: 2017 }],
      "Click 160": [{ label: "160cc eSP+", start: 2022 }],
      ADV150: [{ label: "150cc eSP+", start: 2019, end: 2022 }],
      ADV160: [{ label: "160cc eSP+", start: 2022 }],
      "PCX 160": [{ label: "160cc eSP+", start: 2021 }],
      XRM125: [{ label: "125cc Carbureted", start: 2008 }],
      TMX125: [{ label: "125cc Carbureted", start: 2003 }],
      CB150R: [{ label: "150cc DOHC", start: 2018 }],
      CBR150R: [{ label: "150cc DOHC", start: 2019 }],
      Beat: [
        { label: "110cc eSP", start: 2014, end: 2020 },
        { label: "110cc eSP+", start: 2020 },
      ],
    },
    Yamaha: {
      Mio: [{ label: "115cc Carbureted", start: 2003, end: 2014 }],
      "Mio i 125": [{ label: "125cc Bluecore", start: 2016 }],
      "Mio Sporty": [{ label: "115cc Carbureted", start: 2003 }],
      "Mio Soul i 125": [{ label: "125cc Bluecore", start: 2016 }],
      "Mio Gear": [{ label: "125cc Bluecore", start: 2022 }],
      "NMAX 155": [{ label: "155cc VVA Bluecore", start: 2015 }],
      "Aerox 155": [{ label: "155cc VVA Bluecore", start: 2017 }],
      Sniper: [
        { label: "150cc Carbureted", start: 2010, end: 2017 },
        { label: "150cc Fuel Injected (MX-King)", start: 2017 },
      ],
      "YZF-R15": [{ label: "155cc VVA", start: 2017 }],
      "MT-15": [{ label: "155cc VVA", start: 2019 }],
    },
    Suzuki: {
      Raider: [
        { label: "150cc 2-stroke", end: 2014 },
        { label: "150cc Fuel Injected DOHC", start: 2015 },
      ],
      "Skydrive Sport": [{ label: "125cc", start: 2017 }],
      "Burgman Street": [{ label: "125cc", start: 2020 }],
    },
    Kawasaki: {
      "Barako II": [{ label: "175cc Carbureted", start: 2010 }],
      "Rouser NS200": [{ label: "200cc", start: 2018 }],
      "Ninja 400": [{ label: "400cc Twin", start: 2018 }],
      Z400: [{ label: "400cc Twin", start: 2019 }],
    },
  },
};

/** Generic engine fallback per category — used when a model has no curated
 *  list yet. Gives users sensible displacement-based picks without leaving
 *  them with a blank free-text field. */
export const GENERIC_ENGINES_BY_CATEGORY: Partial<Record<VehicleCategory, EngineSpec[]>> = {
  car: [
    { label: "1.0L Gasoline" },
    { label: "1.2L Gasoline" },
    { label: "1.3L Gasoline" },
    { label: "1.5L Gasoline" },
    { label: "1.6L Gasoline" },
    { label: "1.8L Gasoline" },
    { label: "2.0L Gasoline" },
    { label: "2.4L Gasoline" },
    { label: "2.5L Gasoline" },
    { label: "3.0L V6 Gasoline" },
    { label: "3.5L V6 Gasoline" },
    { label: "5.0L V8 Gasoline" },
    { label: "1.5L Diesel" },
    { label: "1.9L Diesel" },
    { label: "2.2L Diesel" },
    { label: "2.5L Diesel" },
    { label: "2.8L Diesel" },
    { label: "3.0L Diesel" },
    { label: "3.2L Diesel" },
    { label: "1.5L Turbo" },
    { label: "2.0L Turbo" },
    { label: "Hybrid" },
    { label: "Electric (EV)" },
  ],
  motorcycle: [
    { label: "100cc" },
    { label: "110cc" },
    { label: "125cc" },
    { label: "150cc" },
    { label: "155cc" },
    { label: "160cc" },
    { label: "200cc" },
    { label: "250cc" },
    { label: "300cc" },
    { label: "400cc" },
    { label: "600cc" },
    { label: "1000cc+" },
    { label: "Electric (EV)" },
  ],
  heavy_truck: [
    { label: "4.0L Diesel" },
    { label: "5.0L Diesel" },
    { label: "6.0L Diesel" },
    { label: "7.0L Diesel" },
    { label: "8.0L Diesel" },
    { label: "10.0L Diesel" },
    { label: "12.0L Diesel" },
  ],
  atv_utv: [
    { label: "150cc" },
    { label: "250cc" },
    { label: "400cc" },
    { label: "500cc" },
    { label: "700cc" },
    { label: "800cc" },
    { label: "1000cc" },
  ],
  marine: [
    { label: "Outboard 2-stroke" },
    { label: "Outboard 4-stroke" },
    { label: "Inboard Gasoline" },
    { label: "Inboard Diesel" },
    { label: "Jet ski 4-stroke" },
  ],
  heavy_equipment: [
    { label: "Diesel — under 100 HP" },
    { label: "Diesel — 100–200 HP" },
    { label: "Diesel — 200–400 HP" },
    { label: "Diesel — 400+ HP" },
  ],
};

/** Transmission options per category. Used to narrow part compatibility
 *  (clutch kits, gearbox filters, ATF, mounts, etc.). */
export type TransmissionOption = { value: string; label: string };

export const TRANSMISSIONS_BY_CATEGORY: Partial<Record<VehicleCategory, TransmissionOption[]>> = {
  car: [
    { value: "Manual", label: "Manual (MT)" },
    { value: "Automatic", label: "Automatic (AT)" },
    { value: "CVT", label: "CVT" },
    { value: "DCT", label: "Dual-Clutch (DCT)" },
    { value: "AMT", label: "Automated Manual (AMT)" },
    { value: "Tiptronic", label: "Tiptronic / Sport AT" },
    { value: "EV Single-Speed", label: "EV Single-Speed" },
  ],
  motorcycle: [
    { value: "Manual", label: "Manual clutch" },
    { value: "Automatic", label: "Automatic (CVT scooter)" },
    { value: "Semi-Auto", label: "Semi-automatic (underbone)" },
    { value: "DCT", label: "DCT" },
  ],
  heavy_truck: [
    { value: "Manual", label: "Manual" },
    { value: "Automatic", label: "Automatic" },
    { value: "AMT", label: "Automated Manual (AMT)" },
  ],
  atv_utv: [
    { value: "Manual", label: "Manual" },
    { value: "CVT", label: "CVT" },
    { value: "Automatic", label: "Automatic" },
  ],
  marine: [
    { value: "Direct Drive", label: "Direct drive" },
    { value: "Stern Drive", label: "Stern drive" },
    { value: "V-Drive", label: "V-drive" },
    { value: "Jet Drive", label: "Jet drive" },
  ],
  heavy_equipment: [
    { value: "Manual", label: "Manual" },
    { value: "Powershift", label: "Powershift" },
    { value: "Hydrostatic", label: "Hydrostatic" },
    { value: "Automatic", label: "Automatic" },
  ],
};

export function getTransmissionsFor(category: VehicleCategory): TransmissionOption[] {
  return TRANSMISSIONS_BY_CATEGORY[category] ?? [];
}

/** Return engine specs that are valid for the given make/model and (optional)
 *  year range. Year overlap is inclusive. When no curated list exists for the
 *  model, falls back to a category-wide generic list so the dropdown is never
 *  empty. */
export function getEnginesFor(
  category: VehicleCategory,
  make?: string | null,
  model?: string | null,
  yearStart?: number | null,
  yearEnd?: number | null,
): EngineSpec[] {
  if (!make || !model) return [];
  const list = VEHICLE_ENGINES[category]?.[make]?.[model];
  if (!list || list.length === 0) {
    return GENERIC_ENGINES_BY_CATEGORY[category] ?? [];
  }
  const ys = yearStart ?? undefined;
  const ye = yearEnd ?? ys;
  if (!ys) return list;
  const filtered = list.filter((e) => {
    const es = e.start ?? 1900;
    const ee = e.end ?? 9999;
    const a = ys;
    const b = ye ?? ys;
    return es <= b && ee >= a;
  });
  // If the year is out of range for every curated entry, fall back to the
  // full curated list rather than going empty — better UX for older cars.
  return filtered.length > 0 ? filtered : list;
}
