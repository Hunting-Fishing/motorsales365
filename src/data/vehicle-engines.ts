// Engine variants per Make → Model, with year-range applicability.
// Used to populate the Engine field in vehicle fitment so parts can be tied
// to the correct displacement / engine code for a given model-year.
//
// All entries are sourced from manufacturer spec sheets / press kits for
// the Asia / Philippines market (PH / JP / TH / ID / IN / MY trims).
// When a model is not listed, the picker falls back to free-text — we
// never invent generic placeholders.

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
        { label: "1.3L Gasoline (2NZ-FE)", code: "2NZ-FE", start: 2002, end: 2007 },
        { label: "1.5L Gasoline (1NZ-FE)", code: "1NZ-FE", start: 2007, end: 2013 },
        { label: "1.3L Gasoline (2NR-FE)", code: "2NR-FE", start: 2013, end: 2022 },
        { label: "1.5L Gasoline (2NR-FE)", code: "2NR-FE", start: 2013, end: 2022 },
        { label: "1.5L Gasoline (2NR-VE Dual VVT-i)", code: "2NR-VE", start: 2023 },
      ],
      Wigo: [
        { label: "1.0L Gasoline (1KR-VE)", code: "1KR-VE", start: 2014, end: 2023 },
        { label: "1.2L Gasoline (3NR-VE)", code: "3NR-VE", start: 2023 },
      ],
      Yaris: [
        { label: "1.3L Gasoline (2NZ-FE)", code: "2NZ-FE", start: 2006, end: 2013 },
        { label: "1.5L Gasoline (1NZ-FE)", code: "1NZ-FE", start: 2006, end: 2013 },
        { label: "1.3L Gasoline (2NR-FE)", code: "2NR-FE", start: 2013, end: 2020 },
        { label: "1.5L Gasoline (2NR-FE)", code: "2NR-FE", start: 2013, end: 2020 },
      ],
      "Yaris Cross": [
        { label: "1.5L Gasoline (M15A-FKS)", code: "M15A-FKS", start: 2020 },
        { label: "1.5L Hybrid (M15A-FXE)", code: "M15A-FXE", start: 2020 },
      ],
      Hilux: [
        { label: "2.5L Diesel (2KD-FTV)", code: "2KD-FTV", start: 2005, end: 2015 },
        { label: "3.0L Diesel (1KD-FTV)", code: "1KD-FTV", start: 2005, end: 2015 },
        { label: "2.7L Gasoline (2TR-FE)", code: "2TR-FE", start: 2005 },
        { label: "2.4L Diesel (2GD-FTV)", code: "2GD-FTV", start: 2015 },
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2015 },
        { label: "4.0L V6 Gasoline (1GR-FE)", code: "1GR-FE", start: 2005, end: 2015 },
      ],
      "Hilux Conquest": [
        { label: "2.4L Diesel (2GD-FTV)", code: "2GD-FTV", start: 2018 },
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2018 },
      ],
      Fortuner: [
        { label: "2.5L Diesel (2KD-FTV)", code: "2KD-FTV", start: 2005, end: 2015 },
        { label: "3.0L Diesel (1KD-FTV)", code: "1KD-FTV", start: 2005, end: 2015 },
        { label: "2.7L Gasoline (2TR-FE)", code: "2TR-FE", start: 2005 },
        { label: "4.0L V6 Gasoline (1GR-FE)", code: "1GR-FE", start: 2005, end: 2015 },
        { label: "2.4L Diesel (2GD-FTV)", code: "2GD-FTV", start: 2015 },
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2015 },
      ],
      Innova: [
        { label: "2.0L Gasoline (1TR-FE)", code: "1TR-FE", start: 2005, end: 2022 },
        { label: "2.5L Diesel (2KD-FTV)", code: "2KD-FTV", start: 2005, end: 2016 },
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2016, end: 2022 },
      ],
      "Innova Zenix": [
        { label: "2.0L Gasoline (M20A-FKS)", code: "M20A-FKS", start: 2022 },
        { label: "2.0L Hybrid (M20A-FXS)", code: "M20A-FXS", start: 2022 },
      ],
      "Innova Crysta": [
        { label: "2.7L Gasoline (2TR-FE)", code: "2TR-FE", start: 2016 },
        { label: "2.4L Diesel (2GD-FTV)", code: "2GD-FTV", start: 2016 },
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2016 },
      ],
      Avanza: [
        { label: "1.3L Gasoline (K3-VE)", code: "K3-VE", start: 2003, end: 2011 },
        { label: "1.5L Gasoline (3SZ-VE)", code: "3SZ-VE", start: 2006, end: 2015 },
        { label: "1.3L Gasoline (1NR-VE)", code: "1NR-VE", start: 2015, end: 2021 },
        { label: "1.5L Gasoline (2NR-VE)", code: "2NR-VE", start: 2015 },
      ],
      Veloz: [
        { label: "1.5L Gasoline (2NR-VE)", code: "2NR-VE", start: 2021 },
      ],
      Rush: [{ label: "1.5L Gasoline (2NR-VE)", code: "2NR-VE", start: 2018 }],
      "Corolla Altis": [
        { label: "1.6L Gasoline (1ZR-FE)", code: "1ZR-FE", start: 2008, end: 2019 },
        { label: "1.8L Gasoline (2ZR-FE)", code: "2ZR-FE", start: 2008, end: 2019 },
        { label: "1.6L Gasoline (2ZR-FBE)", code: "2ZR-FBE", start: 2019 },
        { label: "1.8L Gasoline (2ZR-FBE)", code: "2ZR-FBE", start: 2019 },
        { label: "1.8L Hybrid (2ZR-FXE)", code: "2ZR-FXE", start: 2019 },
      ],
      "Corolla Cross": [
        { label: "1.8L Gasoline (2ZR-FBE)", code: "2ZR-FBE", start: 2020 },
        { label: "1.8L Hybrid (2ZR-FXE)", code: "2ZR-FXE", start: 2020 },
      ],
      Camry: [
        { label: "2.4L Gasoline (2AZ-FE)", code: "2AZ-FE", start: 2001, end: 2011 },
        { label: "2.5L Gasoline (2AR-FE)", code: "2AR-FE", start: 2011, end: 2019 },
        { label: "3.5L V6 Gasoline (2GR-FE)", code: "2GR-FE", start: 2006, end: 2017 },
        { label: "2.5L Gasoline (A25A-FKS)", code: "A25A-FKS", start: 2019 },
        { label: "2.5L Hybrid (A25A-FXS)", code: "A25A-FXS", start: 2019 },
        { label: "3.5L V6 Gasoline (2GR-FKS)", code: "2GR-FKS", start: 2018 },
      ],
      RAV4: [
        { label: "2.0L Gasoline (3ZR-FE)", code: "3ZR-FE", start: 2008, end: 2018 },
        { label: "2.5L Gasoline (2AR-FE)", code: "2AR-FE", start: 2012, end: 2018 },
        { label: "2.0L Gasoline (M20A-FKS)", code: "M20A-FKS", start: 2019 },
        { label: "2.5L Gasoline (A25A-FKS)", code: "A25A-FKS", start: 2019 },
        { label: "2.5L Hybrid (A25A-FXS)", code: "A25A-FXS", start: 2019 },
      ],
      "Land Cruiser 100": [
        { label: "4.5L Inline-6 (1FZ-FE)", code: "1FZ-FE", start: 1998, end: 2007 },
        { label: "4.2L Diesel (1HD-FTE)", code: "1HD-FTE", start: 1998, end: 2007 },
        { label: "4.7L V8 (2UZ-FE)", code: "2UZ-FE", start: 1998, end: 2007 },
      ],
      "Land Cruiser 200": [
        { label: "4.6L V8 Gasoline (1UR-FE)", code: "1UR-FE", start: 2012, end: 2021 },
        { label: "4.7L V8 Gasoline (2UZ-FE)", code: "2UZ-FE", start: 2007, end: 2012 },
        { label: "4.5L V8 Diesel (1VD-FTV)", code: "1VD-FTV", start: 2007, end: 2021 },
      ],
      "Land Cruiser 300": [
        { label: "3.3L V6 Twin-Turbo Diesel (F33A-FTV)", code: "F33A-FTV", start: 2021 },
        { label: "3.5L V6 Twin-Turbo Gasoline (V35A-FTS)", code: "V35A-FTS", start: 2021 },
      ],
      "Land Cruiser Prado": [
        { label: "2.7L Gasoline (2TR-FE)", code: "2TR-FE", start: 2009, end: 2024 },
        { label: "4.0L V6 Gasoline (1GR-FE)", code: "1GR-FE", start: 2009, end: 2024 },
        { label: "3.0L Diesel (1KD-FTV)", code: "1KD-FTV", start: 2009, end: 2015 },
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2015, end: 2024 },
      ],
      Hiace: [
        { label: "2.5L Diesel (2KD-FTV)", code: "2KD-FTV", start: 2005, end: 2019 },
        { label: "3.0L Diesel (1KD-FTV)", code: "1KD-FTV", start: 2005, end: 2019 },
        { label: "2.7L Gasoline (2TR-FE)", code: "2TR-FE", start: 2005 },
        { label: "2.8L Diesel (1GD-FTV)", code: "1GD-FTV", start: 2019 },
        { label: "3.5L V6 Gasoline (7GR-FKS)", code: "7GR-FKS", start: 2019 },
      ],
      "GR Yaris": [{ label: "1.6L Turbo (G16E-GTS)", code: "G16E-GTS", start: 2020 }],
      "GR86": [{ label: "2.4L Boxer (FA24)", code: "FA24", start: 2021 }],
      "GR Supra": [
        { label: "2.0L Turbo (B48)", code: "B48", start: 2019 },
        { label: "3.0L Turbo (B58)", code: "B58", start: 2019 },
      ],
      Alphard: [
        { label: "2.5L Gasoline (2AR-FE)", code: "2AR-FE", start: 2015, end: 2023 },
        { label: "3.5L V6 (2GR-FKS)", code: "2GR-FKS", start: 2015 },
        { label: "2.5L Hybrid (2AR-FXE)", code: "2AR-FXE", start: 2015, end: 2023 },
        { label: "2.4L Turbo Hybrid (T24A-FTS)", code: "T24A-FTS", start: 2023 },
      ],
      Vellfire: [
        { label: "2.5L Gasoline (2AR-FE)", code: "2AR-FE", start: 2015, end: 2023 },
        { label: "3.5L V6 (2GR-FKS)", code: "2GR-FKS", start: 2015 },
        { label: "2.4L Turbo Hybrid (T24A-FTS)", code: "T24A-FTS", start: 2023 },
      ],
      "Tundra": [
        { label: "5.7L V8 (3UR-FE)", code: "3UR-FE", start: 2007, end: 2021 },
        { label: "3.5L V6 Twin-Turbo (V35A-FTS)", code: "V35A-FTS", start: 2022 },
      ],
      Prius: [
        { label: "1.5L Hybrid (1NZ-FXE)", code: "1NZ-FXE", start: 2003, end: 2009 },
        { label: "1.8L Hybrid (2ZR-FXE)", code: "2ZR-FXE", start: 2009, end: 2022 },
        { label: "1.8L Hybrid (M20A-FXS)", code: "M20A-FXS", start: 2023 },
        { label: "2.0L Hybrid (M20A-FXS)", code: "M20A-FXS", start: 2023 },
      ],
      "Prius C": [{ label: "1.5L Hybrid (1NZ-FXE)", code: "1NZ-FXE", start: 2011, end: 2020 }],
    },

    Honda: {
      Brio: [
        { label: "1.2L Gasoline (L12B)", code: "L12B", start: 2011, end: 2019 },
        { label: "1.3L Gasoline (L13Z)", code: "L13Z", start: 2011, end: 2019 },
      ],
      "Brio Amaze": [
        { label: "1.2L Gasoline (L12B)", code: "L12B", start: 2013, end: 2019 },
      ],
      City: [
        { label: "1.5L Gasoline (L15A)", code: "L15A", start: 2003, end: 2014 },
        { label: "1.5L Gasoline (L15Z)", code: "L15Z", start: 2014, end: 2020 },
        { label: "1.5L Gasoline (L15B)", code: "L15B", start: 2020 },
        { label: "1.0L Turbo (P10A)", code: "P10A", start: 2020 },
        { label: "1.5L Hybrid e:HEV (LEB)", code: "LEB", start: 2020 },
      ],
      Jazz: [
        { label: "1.3L Gasoline (L13A)", code: "L13A", start: 2002, end: 2014 },
        { label: "1.5L Gasoline (L15A)", code: "L15A", start: 2002, end: 2014 },
        { label: "1.3L Gasoline (L13Z)", code: "L13Z", start: 2014, end: 2020 },
        { label: "1.5L Gasoline (L15Z)", code: "L15Z", start: 2014, end: 2020 },
      ],
      Fit: [
        { label: "1.3L Gasoline (L13A)", code: "L13A", start: 2001, end: 2013 },
        { label: "1.5L Gasoline (L15A)", code: "L15A", start: 2001, end: 2013 },
        { label: "1.3L Hybrid (LDA-MF6)", code: "LDA-MF6", start: 2013, end: 2020 },
        { label: "1.5L Gasoline (L15B)", code: "L15B", start: 2013 },
      ],
      Civic: [
        { label: "1.8L Gasoline (R18A)", code: "R18A", start: 2006, end: 2012 },
        { label: "1.8L Gasoline (R18Z)", code: "R18Z", start: 2012, end: 2021 },
        { label: "2.0L Gasoline (R20A)", code: "R20A", start: 2012, end: 2016 },
        { label: "1.5L Turbo (L15B7)", code: "L15B7", start: 2016 },
        { label: "1.8L Gasoline (R18Z2)", code: "R18Z2", start: 2016, end: 2021 },
        { label: "2.0L VTEC Turbo (K20C1, Type R)", code: "K20C1", start: 2017 },
        { label: "2.0L Hybrid (LFC)", code: "LFC", start: 2022 },
      ],
      Accord: [
        { label: "2.4L Gasoline (K24Z3)", code: "K24Z3", start: 2008, end: 2013 },
        { label: "2.4L Gasoline (K24W)", code: "K24W", start: 2013, end: 2018 },
        { label: "3.5L V6 (J35Z)", code: "J35Z", start: 2008, end: 2018 },
        { label: "1.5L Turbo (L15BE)", code: "L15BE", start: 2018, end: 2022 },
        { label: "2.0L Turbo (K20C4)", code: "K20C4", start: 2018, end: 2022 },
        { label: "2.0L Hybrid (LFA)", code: "LFA", start: 2018 },
      ],
      "CR-V": [
        { label: "2.0L Gasoline (R20A)", code: "R20A", start: 2007, end: 2017 },
        { label: "2.4L Gasoline (K24Z)", code: "K24Z", start: 2007, end: 2017 },
        { label: "1.5L Turbo (L15BE)", code: "L15BE", start: 2017 },
        { label: "1.6L Diesel i-DTEC (N16A)", code: "N16A", start: 2015, end: 2022 },
        { label: "2.0L Hybrid (LFB)", code: "LFB", start: 2023 },
      ],
      "HR-V": [
        { label: "1.5L Gasoline (L15Z)", code: "L15Z", start: 2014, end: 2022 },
        { label: "1.8L Gasoline (R18Z)", code: "R18Z", start: 2014, end: 2022 },
        { label: "1.5L Gasoline (L15B)", code: "L15B", start: 2022 },
        { label: "1.5L Hybrid e:HEV (LEC)", code: "LEC", start: 2022 },
      ],
      "BR-V": [
        { label: "1.5L Gasoline (L15Z)", code: "L15Z", start: 2016, end: 2022 },
        { label: "1.5L Gasoline (L15B)", code: "L15B", start: 2022 },
      ],
      Odyssey: [
        { label: "2.4L Gasoline (K24W)", code: "K24W", start: 2013 },
        { label: "3.5L V6 (J35)", code: "J35", start: 2005, end: 2017 },
      ],
      Mobilio: [{ label: "1.5L Gasoline (L15Z)", code: "L15Z", start: 2014, end: 2021 }],
      Pilot: [{ label: "3.5L V6 (J35Y)", code: "J35Y", start: 2015 }],
    },

    Mitsubishi: {
      Mirage: [{ label: "1.2L Gasoline (3A92)", code: "3A92", start: 2012 }],
      "Mirage G4": [{ label: "1.2L Gasoline (3A92)", code: "3A92", start: 2013 }],
      Lancer: [
        { label: "1.6L Gasoline (4G18)", code: "4G18", start: 2003, end: 2008 },
        { label: "2.0L Gasoline (4B11)", code: "4B11", start: 2007, end: 2017 },
        { label: "1.8L Gasoline (4B10)", code: "4B10", start: 2007, end: 2017 },
        { label: "2.0L Turbo (4B11T Evo X)", code: "4B11T", start: 2007, end: 2016 },
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
        { label: "2.4L PHEV (4B12)", code: "4B12", start: 2018 },
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
      Triton: [
        { label: "2.5L Diesel (4D56)", code: "4D56", start: 2005, end: 2015 },
        { label: "2.4L Diesel (4N15)", code: "4N15", start: 2015, end: 2023 },
        { label: "2.4L Bi-Turbo Diesel (4N16)", code: "4N16", start: 2023 },
      ],
      Xpander: [{ label: "1.5L Gasoline (4A91)", code: "4A91", start: 2018 }],
      "Xpander Cross": [{ label: "1.5L Gasoline (4A91)", code: "4A91", start: 2019 }],
      L300: [
        { label: "2.5L Diesel (4D56)", code: "4D56", end: 2017 },
        { label: "2.2L Diesel (4N14)", code: "4N14", start: 2021 },
      ],
    },

    Nissan: {
      Almera: [
        { label: "1.5L Gasoline (HR15DE)", code: "HR15DE", start: 2011, end: 2022 },
        { label: "1.0L Turbo (HRA0)", code: "HRA0", start: 2022 },
      ],
      Sylphy: [
        { label: "1.6L Gasoline (HR16DE)", code: "HR16DE", start: 2012 },
        { label: "1.8L Gasoline (MRA8DE)", code: "MRA8DE", start: 2012 },
      ],
      Sentra: [
        { label: "1.6L Gasoline (HR16DE)", code: "HR16DE", start: 2006, end: 2019 },
        { label: "1.8L Gasoline (MRA8DE)", code: "MRA8DE", start: 2013, end: 2019 },
        { label: "2.0L Gasoline (PR20DE)", code: "PR20DE", start: 2019 },
      ],
      Navara: [
        { label: "2.5L Diesel (YD25DDTi)", code: "YD25DDTi", start: 2005, end: 2021 },
        { label: "2.5L Turbo Diesel (QR25DDT)", code: "QR25DDT", start: 2021 },
      ],
      "NP300 Navara": [
        { label: "2.5L Diesel (YD25DDTi)", code: "YD25DDTi", start: 2014, end: 2021 },
      ],
      Terra: [
        { label: "2.5L Diesel (YD25DDTi)", code: "YD25DDTi", start: 2018, end: 2022 },
        { label: "2.5L Turbo Diesel (QR25DDT)", code: "QR25DDT", start: 2022 },
      ],
      "X-Trail": [
        { label: "2.0L Gasoline (MR20DE)", code: "MR20DE", start: 2007, end: 2022 },
        { label: "2.5L Gasoline (QR25DE)", code: "QR25DE", start: 2007 },
        { label: "1.5L e-Power VC-Turbo (KR15DDT)", code: "KR15DDT", start: 2022 },
      ],
      Juke: [
        { label: "1.6L Gasoline (HR16DE)", code: "HR16DE", start: 2010, end: 2019 },
        { label: "1.6L Turbo (MR16DDT)", code: "MR16DDT", start: 2010, end: 2019 },
      ],
      Patrol: [
        { label: "4.5L TD Diesel (RD28T)", code: "RD28T", start: 1997, end: 2010 },
        { label: "4.8L Inline-6 (TB48DE)", code: "TB48DE", start: 1997, end: 2010 },
        { label: "5.6L V8 Gasoline (VK56VD)", code: "VK56VD", start: 2010 },
        { label: "4.0L V6 Gasoline (VQ40DE)", code: "VQ40DE", start: 2010 },
      ],
      "GT-R": [{ label: "3.8L Twin-Turbo V6 (VR38DETT)", code: "VR38DETT", start: 2007 }],
      "370Z": [{ label: "3.7L V6 (VQ37VHR)", code: "VQ37VHR", start: 2009, end: 2020 }],
      "Z": [{ label: "3.0L Twin-Turbo V6 (VR30DDTT)", code: "VR30DDTT", start: 2022 }],
      Leaf: [
        { label: "Electric 40 kWh (EM57)", code: "EM57", start: 2017, end: 2021 },
        { label: "Electric 62 kWh (EM57)", code: "EM57", start: 2019 },
      ],
      Kicks: [
        { label: "1.6L Gasoline (HR16DE)", code: "HR16DE", start: 2016, end: 2022 },
        { label: "1.2L e-Power (HR12DE)", code: "HR12DE", start: 2020 },
      ],
      Urvan: [
        { label: "2.5L Diesel (YD25DDTi)", code: "YD25DDTi", start: 2012 },
      ],
      "NV350 Urvan": [
        { label: "2.5L Diesel (YD25DDTi)", code: "YD25DDTi", start: 2012, end: 2021 },
      ],
    },

    Isuzu: {
      "D-Max": [
        { label: "2.5L Diesel (4JA1-L)", code: "4JA1-L", start: 2002, end: 2012 },
        { label: "3.0L Diesel (4JJ1-TC)", code: "4JJ1-TC", start: 2007, end: 2019 },
        { label: "1.9L Diesel (RZ4E-TC)", code: "RZ4E-TC", start: 2018 },
        { label: "3.0L Diesel (4JJ3-TCX)", code: "4JJ3-TCX", start: 2020 },
      ],
      "MU-X": [
        { label: "3.0L Diesel (4JJ1-TC)", code: "4JJ1-TC", start: 2013, end: 2020 },
        { label: "1.9L Diesel (RZ4E-TC)", code: "RZ4E-TC", start: 2018 },
        { label: "3.0L Diesel (4JJ3-TCX)", code: "4JJ3-TCX", start: 2020 },
      ],
      Crosswind: [{ label: "2.5L Diesel (4JA1-L)", code: "4JA1-L", end: 2017 }],
      Trooper: [
        { label: "3.0L Diesel (4JX1)", code: "4JX1", start: 1998, end: 2002 },
        { label: "3.5L V6 Gasoline (6VE1)", code: "6VE1", start: 1998, end: 2002 },
      ],
      Alterra: [
        { label: "3.0L Diesel (4JJ1-TC)", code: "4JJ1-TC", start: 2007, end: 2013 },
      ],
      Traviz: [{ label: "2.5L Diesel (4JK1-TCS)", code: "4JK1-TCS", start: 2019 }],
    },

    Mazda: {
      "Mazda2": [
        { label: "1.5L Gasoline (ZY-VE)", code: "ZY-VE", start: 2007, end: 2014 },
        { label: "1.5L Skyactiv-G (P5-VPS)", code: "P5-VPS", start: 2014 },
        { label: "1.5L Skyactiv-D Diesel", start: 2014, end: 2020 },
      ],
      "Mazda3": [
        { label: "1.6L Gasoline (Z6)", code: "Z6", start: 2003, end: 2013 },
        { label: "2.0L MZR (LF-VE)", code: "LF-VE", start: 2003, end: 2013 },
        { label: "1.5L Skyactiv-G", start: 2013, end: 2019 },
        { label: "2.0L Skyactiv-G", start: 2013 },
        { label: "2.5L Skyactiv-G", start: 2019 },
      ],
      "Mazda6": [
        { label: "2.0L MZR (LF-VE)", code: "LF-VE", start: 2002, end: 2012 },
        { label: "2.5L MZR (L5-VE)", code: "L5-VE", start: 2007, end: 2012 },
        { label: "2.0L Skyactiv-G", start: 2012 },
        { label: "2.5L Skyactiv-G", start: 2012 },
        { label: "2.2L Skyactiv-D Diesel", start: 2012 },
      ],
      "CX-3": [{ label: "2.0L Skyactiv-G", start: 2015 }],
      "CX-30": [
        { label: "2.0L Skyactiv-G", start: 2019 },
        { label: "2.5L Skyactiv-G", start: 2019 },
      ],
      "CX-5": [
        { label: "2.0L Skyactiv-G", start: 2012 },
        { label: "2.5L Skyactiv-G", start: 2012 },
        { label: "2.2L Skyactiv-D Diesel", start: 2012 },
        { label: "2.5L Turbo Skyactiv-G", start: 2018 },
      ],
      "CX-8": [
        { label: "2.5L Skyactiv-G", start: 2017 },
        { label: "2.2L Skyactiv-D Diesel", start: 2017 },
      ],
      "CX-9": [
        { label: "3.7L V6 (CA)", start: 2007, end: 2015 },
        { label: "2.5L Turbo Skyactiv-G", start: 2016 },
      ],
      "BT-50": [
        { label: "2.5L Diesel (WL-C)", code: "WL-C", start: 2007, end: 2011 },
        { label: "3.0L Diesel (WE-C)", code: "WE-C", start: 2007, end: 2011 },
        { label: "2.2L Diesel (MZ-CD)", start: 2011, end: 2020 },
        { label: "3.2L Diesel (MZ-CD)", start: 2011, end: 2020 },
        { label: "1.9L Diesel (RZ4E-TC)", code: "RZ4E-TC", start: 2021 },
        { label: "3.0L Diesel (4JJ3-TCX)", code: "4JJ3-TCX", start: 2021 },
      ],
      "MX-5": [
        { label: "1.6L (B6)", code: "B6", start: 1989, end: 1997 },
        { label: "1.8L (BP)", code: "BP", start: 1994, end: 2005 },
        { label: "2.0L MZR (LF-VE)", code: "LF-VE", start: 2005, end: 2014 },
        { label: "1.5L Skyactiv-G (P5-VPR)", code: "P5-VPR", start: 2015 },
        { label: "2.0L Skyactiv-G", start: 2015 },
      ],
    },

    Suzuki: {
      Alto: [
        { label: "0.8L Gasoline (F8B)", code: "F8B", end: 2014 },
        { label: "1.0L Gasoline (K10B)", code: "K10B", start: 2009, end: 2014 },
      ],
      Celerio: [
        { label: "1.0L Gasoline (K10B)", code: "K10B", start: 2014, end: 2021 },
        { label: "1.0L Gasoline (K10C Boosterjet)", code: "K10C", start: 2021 },
      ],
      Swift: [
        { label: "1.2L Gasoline (K12B)", code: "K12B", start: 2011, end: 2017 },
        { label: "1.2L Gasoline (K12C)", code: "K12C", start: 2017 },
        { label: "1.4L Boosterjet (K14C)", code: "K14C", start: 2017 },
        { label: "1.6L Gasoline (M16A, Sport)", code: "M16A", start: 2012, end: 2017 },
      ],
      Dzire: [
        { label: "1.2L Gasoline (K12B/K12M)", code: "K12B", start: 2012, end: 2017 },
        { label: "1.2L Gasoline (K12C)", code: "K12C", start: 2017 },
      ],
      Jimny: [
        { label: "1.3L Gasoline (M13A)", code: "M13A", start: 1998, end: 2018 },
        { label: "1.5L Gasoline (K15B)", code: "K15B", start: 2018 },
      ],
      Ertiga: [
        { label: "1.4L Gasoline (K14B)", code: "K14B", start: 2012, end: 2019 },
        { label: "1.5L Gasoline (K15B)", code: "K15B", start: 2019 },
      ],
      "XL7": [{ label: "1.5L Gasoline (K15B)", code: "K15B", start: 2019 }],
      "S-Presso": [{ label: "1.0L Gasoline (K10C)", code: "K10C", start: 2019 }],
      Vitara: [
        { label: "1.6L Gasoline (M16A)", code: "M16A", start: 2015 },
        { label: "1.4L Turbo Boosterjet (K14C)", code: "K14C", start: 2015 },
      ],
      "Grand Vitara": [
        { label: "2.0L (J20A)", code: "J20A", start: 2005, end: 2015 },
        { label: "2.4L (J24B)", code: "J24B", start: 2008, end: 2015 },
        { label: "1.5L Mild Hybrid (K15C)", code: "K15C", start: 2022 },
      ],
      APV: [
        { label: "1.5L Gasoline (G15A)", code: "G15A", start: 2004, end: 2019 },
        { label: "1.6L Gasoline (G16A)", code: "G16A", start: 2004, end: 2019 },
      ],
      Carry: [{ label: "1.5L Gasoline (G15A)", code: "G15A", start: 2005 }],
    },

    Subaru: {
      Impreza: [
        { label: "1.5L Boxer (EL15)", code: "EL15", start: 2007, end: 2011 },
        { label: "2.0L Boxer (FB20)", code: "FB20", start: 2011 },
      ],
      WRX: [
        { label: "2.0L Turbo Boxer (EJ207/EJ20G)", code: "EJ20", start: 2001, end: 2014 },
        { label: "2.5L Turbo Boxer (EJ257)", code: "EJ257", start: 2005, end: 2014 },
        { label: "2.0L DIT Boxer (FA20F)", code: "FA20F", start: 2014, end: 2021 },
        { label: "2.4L Turbo Boxer (FA24F)", code: "FA24F", start: 2021 },
      ],
      "WRX STI": [
        { label: "2.5L Turbo Boxer (EJ257)", code: "EJ257", start: 2004, end: 2021 },
      ],
      Forester: [
        { label: "2.0L Boxer (FB20)", code: "FB20", start: 2010 },
        { label: "2.5L Boxer (FB25)", code: "FB25", start: 2010 },
        { label: "2.0L Turbo Boxer (FA20)", code: "FA20", start: 2014, end: 2018 },
        { label: "2.0L e-Boxer Hybrid", start: 2019 },
      ],
      XV: [
        { label: "2.0L Boxer (FB20)", code: "FB20", start: 2012 },
        { label: "2.0L e-Boxer Hybrid", start: 2019 },
      ],
      Outback: [
        { label: "2.5L Boxer (FB25)", code: "FB25", start: 2010 },
        { label: "3.6L Boxer (EZ36D)", code: "EZ36D", start: 2009, end: 2019 },
        { label: "2.4L Turbo Boxer (FA24F)", code: "FA24F", start: 2019 },
      ],
      Legacy: [
        { label: "2.5L Boxer (FB25)", code: "FB25", start: 2009 },
        { label: "3.6L Boxer (EZ36D)", code: "EZ36D", start: 2009, end: 2019 },
        { label: "2.4L Turbo Boxer (FA24F)", code: "FA24F", start: 2019 },
      ],
      BRZ: [
        { label: "2.0L Boxer (FA20)", code: "FA20", start: 2012, end: 2020 },
        { label: "2.4L Boxer (FA24D)", code: "FA24D", start: 2021 },
      ],
    },

    Lexus: {
      "IS300": [{ label: "2.0L Turbo (8AR-FTS)", code: "8AR-FTS", start: 2015 }],
      "IS350": [{ label: "3.5L V6 (2GR-FSE)", code: "2GR-FSE", start: 2005 }],
      "ES250": [{ label: "2.5L (2AR-FE)", code: "2AR-FE", start: 2012, end: 2019 }],
      "ES350": [{ label: "3.5L V6 (2GR-FKS)", code: "2GR-FKS", start: 2018 }],
      "ES300h": [{ label: "2.5L Hybrid (A25A-FXS)", code: "A25A-FXS", start: 2018 }],
      "RX350": [
        { label: "3.5L V6 (2GR-FE)", code: "2GR-FE", start: 2008, end: 2015 },
        { label: "3.5L V6 (2GR-FKS)", code: "2GR-FKS", start: 2015, end: 2022 },
        { label: "2.4L Turbo (T24A-FTS)", code: "T24A-FTS", start: 2022 },
      ],
      "RX450h": [
        { label: "3.5L V6 Hybrid (2GR-FXE)", code: "2GR-FXE", start: 2009, end: 2022 },
      ],
      "NX300": [{ label: "2.0L Turbo (8AR-FTS)", code: "8AR-FTS", start: 2014, end: 2021 }],
      "NX350": [{ label: "2.4L Turbo (T24A-FTS)", code: "T24A-FTS", start: 2021 }],
      "NX350h": [{ label: "2.5L Hybrid (A25A-FXS)", code: "A25A-FXS", start: 2021 }],
      "GX460": [{ label: "4.6L V8 (1UR-FE)", code: "1UR-FE", start: 2009, end: 2023 }],
      "GX550": [{ label: "3.4L V6 Twin-Turbo (V35A-FTS)", code: "V35A-FTS", start: 2024 }],
      "LX570": [{ label: "5.7L V8 (3UR-FE)", code: "3UR-FE", start: 2008, end: 2021 }],
      "LX600": [{ label: "3.5L V6 Twin-Turbo (V35A-FTS)", code: "V35A-FTS", start: 2021 }],
    },

    Ford: {
      Ranger: [
        { label: "2.5L Diesel (WL-C)", code: "WL-C", start: 2006, end: 2011 },
        { label: "3.0L Diesel (WE-C)", code: "WE-C", start: 2006, end: 2011 },
        { label: "2.2L Diesel (Duratorq TDCi)", start: 2011, end: 2022 },
        { label: "3.2L 5-cyl Diesel (Duratorq)", start: 2011, end: 2022 },
        { label: "2.0L Single-Turbo Diesel (EcoBlue)", start: 2018 },
        { label: "2.0L Bi-Turbo Diesel (EcoBlue)", start: 2018 },
        { label: "2.3L EcoBoost Gasoline", start: 2022 },
        { label: "3.0L V6 Turbo Diesel (Lion)", start: 2022 },
      ],
      "Ranger Raptor": [
        { label: "2.0L Bi-Turbo Diesel (EcoBlue)", start: 2018, end: 2022 },
        { label: "3.0L V6 Twin-Turbo Petrol", start: 2023 },
      ],
      Everest: [
        { label: "2.2L Diesel (Duratorq TDCi)", start: 2015, end: 2022 },
        { label: "3.2L 5-cyl Diesel (Duratorq)", start: 2015, end: 2022 },
        { label: "2.0L Single-Turbo Diesel (EcoBlue)", start: 2018 },
        { label: "2.0L Bi-Turbo Diesel (EcoBlue)", start: 2018 },
        { label: "3.0L V6 Turbo Diesel (Lion)", start: 2022 },
      ],
      Territory: [
        { label: "1.5L EcoBoost Turbo", start: 2020 },
      ],
      EcoSport: [
        { label: "1.5L Ti-VCT Gasoline", start: 2013, end: 2022 },
        { label: "1.0L EcoBoost", start: 2013, end: 2022 },
      ],
      Mustang: [
        { label: "2.3L EcoBoost I4", start: 2015 },
        { label: "5.0L V8 Coyote", start: 2015 },
        { label: "5.2L V8 Voodoo (GT350)", start: 2015, end: 2020 },
        { label: "5.2L V8 Predator (GT500)", start: 2020 },
      ],
      Explorer: [
        { label: "2.3L EcoBoost", start: 2015 },
        { label: "3.5L V6 (Cyclone)", start: 2011, end: 2019 },
        { label: "3.0L V6 EcoBoost", start: 2019 },
      ],
      Expedition: [{ label: "3.5L V6 EcoBoost", start: 2015 }],
      "F-150": [
        { label: "5.0L V8 Coyote", start: 2011 },
        { label: "3.5L V6 EcoBoost", start: 2011 },
        { label: "2.7L V6 EcoBoost", start: 2015 },
        { label: "3.5L V6 PowerBoost Hybrid", start: 2021 },
      ],
    },

    Chevrolet: {
      Spark: [
        { label: "1.0L (B10D)", code: "B10D", start: 2009, end: 2015 },
        { label: "1.2L (B12D)", code: "B12D", start: 2009, end: 2015 },
        { label: "1.4L Ecotec", start: 2015 },
      ],
      Sail: [
        { label: "1.3L Gasoline", start: 2015, end: 2020 },
        { label: "1.5L Gasoline", start: 2015, end: 2020 },
      ],
      Trailblazer: [
        { label: "2.5L Diesel (Duramax)", start: 2012, end: 2020 },
        { label: "2.8L Diesel (Duramax)", start: 2012, end: 2020 },
      ],
      Colorado: [
        { label: "2.5L Diesel (Duramax)", start: 2012, end: 2020 },
        { label: "2.8L Diesel (Duramax)", start: 2012, end: 2020 },
      ],
      Captiva: [
        { label: "2.4L Ecotec", start: 2006, end: 2018 },
        { label: "3.2L V6", start: 2006, end: 2011 },
        { label: "2.0L VCDi Diesel", start: 2006, end: 2018 },
        { label: "1.5L Turbo (LFV)", start: 2018 },
      ],
      Suburban: [
        { label: "5.3L V8 EcoTec3", start: 2014 },
        { label: "6.2L V8 EcoTec3", start: 2014 },
      ],
      Tahoe: [
        { label: "5.3L V8 EcoTec3", start: 2014 },
        { label: "6.2L V8 EcoTec3", start: 2014 },
      ],
      Corvette: [
        { label: "6.2L V8 LT1", start: 2014, end: 2019 },
        { label: "6.2L V8 LT2 (C8)", start: 2020 },
      ],
      Camaro: [
        { label: "2.0L Turbo (LTG)", start: 2016 },
        { label: "3.6L V6 (LGX)", start: 2016 },
        { label: "6.2L V8 LT1", start: 2016 },
      ],
    },

    Hyundai: {
      Eon: [{ label: "0.8L Gasoline (Epsilon)", start: 2011, end: 2019 }],
      "Grand i10": [
        { label: "1.0L Gasoline (Kappa)", start: 2013 },
        { label: "1.2L Gasoline (Kappa)", start: 2013 },
      ],
      i10: [{ label: "1.1L Gasoline (Epsilon)", start: 2007, end: 2013 }],
      Accent: [
        { label: "1.4L Gasoline (Kappa)", start: 2011 },
        { label: "1.6L Gasoline (Gamma)", start: 2011, end: 2017 },
        { label: "1.6L CRDi Diesel (U-II)", start: 2011 },
      ],
      Elantra: [
        { label: "1.6L Gasoline (Gamma)", start: 2010, end: 2020 },
        { label: "2.0L Gasoline (Nu MPI)", start: 2010 },
        { label: "1.6L Hybrid (Kappa)", start: 2020 },
      ],
      Sonata: [
        { label: "2.0L Gasoline (Theta II)", start: 2009, end: 2019 },
        { label: "2.4L Gasoline (Theta II)", start: 2009, end: 2019 },
        { label: "2.0L T-GDi (Theta II)", start: 2015 },
        { label: "1.6L T-GDi (Smartstream)", start: 2019 },
        { label: "2.5L Gasoline (Smartstream)", start: 2019 },
      ],
      Tucson: [
        { label: "2.0L Gasoline (Nu MPI)", start: 2015, end: 2021 },
        { label: "2.0L CRDi Diesel (R-Engine)", start: 2015, end: 2021 },
        { label: "1.6L T-GDi Gasoline (Smartstream)", start: 2021 },
        { label: "2.0L Smartstream Diesel", start: 2021 },
        { label: "1.6L T-GDi Hybrid", start: 2021 },
      ],
      "Santa Fe": [
        { label: "2.2L CRDi Diesel (R-Engine)", start: 2012 },
        { label: "2.4L Gasoline (Theta II)", start: 2012, end: 2018 },
        { label: "3.5L V6 (Lambda)", start: 2018, end: 2023 },
        { label: "1.6L T-GDi Hybrid", start: 2023 },
        { label: "2.5L Turbo (Smartstream)", start: 2023 },
      ],
      "Palisade": [
        { label: "3.8L V6 (Lambda II)", start: 2018 },
        { label: "2.2L CRDi Diesel", start: 2018 },
      ],
      Kona: [
        { label: "2.0L Gasoline (Nu)", start: 2017, end: 2023 },
        { label: "1.6L T-GDi (Gamma)", start: 2017, end: 2023 },
        { label: "Electric 39 kWh / 64 kWh", start: 2018 },
      ],
      Creta: [
        { label: "1.5L Gasoline (Smartstream)", start: 2019 },
        { label: "1.5L Diesel (Smartstream)", start: 2019 },
        { label: "1.4L T-GDi (Kappa)", start: 2020 },
      ],
      Starex: [{ label: "2.5L CRDi Diesel (A-Engine)", start: 2007, end: 2021 }],
      Staria: [
        { label: "2.2L CRDi Diesel (Smartstream)", start: 2021 },
        { label: "3.5L V6 (Lambda)", start: 2021 },
      ],
      H100: [{ label: "2.6L Diesel (D4BB)", code: "D4BB", start: 2003 }],
      Reina: [{ label: "1.4L Gasoline (Kappa)", start: 2018 }],
      Ioniq: [
        { label: "1.6L Hybrid (Kappa)", start: 2016, end: 2022 },
        { label: "Electric 28 kWh / 38.3 kWh", start: 2016, end: 2022 },
      ],
      "Ioniq 5": [{ label: "Electric 58 / 72.6 / 77.4 kWh (E-GMP)", start: 2021 }],
    },

    Kia: {
      Picanto: [
        { label: "1.0L Gasoline (Kappa)", start: 2011 },
        { label: "1.2L Gasoline (Kappa)", start: 2017 },
      ],
      Soluto: [{ label: "1.4L Gasoline (Kappa)", start: 2019 }],
      Rio: [
        { label: "1.4L Gasoline (Gamma)", start: 2011 },
        { label: "1.6L Gasoline (Gamma)", start: 2011 },
      ],
      Forte: [
        { label: "1.6L Gasoline (Gamma)", start: 2008, end: 2018 },
        { label: "2.0L Gasoline (Nu MPI)", start: 2008 },
      ],
      Cerato: [
        { label: "1.6L Gasoline (Gamma)", start: 2008, end: 2018 },
        { label: "2.0L Gasoline (Nu MPI)", start: 2008 },
      ],
      K5: [
        { label: "2.0L Gasoline (Theta II)", start: 2010, end: 2020 },
        { label: "2.4L Gasoline (Theta II)", start: 2010, end: 2020 },
        { label: "1.6L T-GDi (Smartstream)", start: 2020 },
        { label: "2.5L Gasoline (Smartstream)", start: 2020 },
      ],
      Stonic: [
        { label: "1.4L Gasoline (Kappa)", start: 2017 },
        { label: "1.0L T-GDi (Kappa)", start: 2017 },
      ],
      Seltos: [
        { label: "1.6L Gasoline (Gamma)", start: 2019 },
        { label: "1.4L T-GDi (Kappa)", start: 2019 },
        { label: "1.5L Diesel (Smartstream)", start: 2019 },
      ],
      Sportage: [
        { label: "2.0L Gasoline (Nu MPI)", start: 2010 },
        { label: "2.0L CRDi Diesel (R-Engine)", start: 2010 },
        { label: "1.6L T-GDi (Smartstream)", start: 2022 },
        { label: "1.6L Hybrid", start: 2022 },
      ],
      Sorento: [
        { label: "2.2L CRDi Diesel", start: 2014 },
        { label: "2.4L Gasoline (Theta II)", start: 2014, end: 2020 },
        { label: "3.5L V6 (Lambda)", start: 2020 },
        { label: "1.6L T-GDi Hybrid", start: 2020 },
      ],
      Carnival: [
        { label: "2.2L CRDi Diesel", start: 2014 },
        { label: "3.5L V6 (Lambda)", start: 2014 },
      ],
      Stinger: [
        { label: "2.0L T-GDi (Theta II)", start: 2017, end: 2023 },
        { label: "3.3L Twin-Turbo V6 (Lambda)", start: 2017, end: 2023 },
      ],
      "EV6": [{ label: "Electric 58 / 77.4 kWh (E-GMP)", start: 2021 }],
    },

    MG: {
      "MG 3": [{ label: "1.5L Gasoline (NSE)", start: 2011 }],
      "MG 5": [{ label: "1.5L Gasoline (15S4N)", start: 2020 }],
      ZS: [
        { label: "1.5L Gasoline (15S4C)", start: 2017 },
        { label: "1.0L Turbo (12S4D)", start: 2018 },
        { label: "Electric (44.5 / 51 kWh)", start: 2019 },
      ],
      HS: [
        { label: "1.5L Turbo (15E4E)", start: 2018 },
        { label: "2.0L Turbo (20L4E)", start: 2018 },
        { label: "1.5L Turbo PHEV", start: 2020 },
      ],
      RX5: [{ label: "1.5L Turbo (15E4E)", start: 2016 }],
    },

    BYD: {
      Atto3: [{ label: "Electric 50.1 / 60.5 kWh (Blade)", start: 2022 }],
      "Atto 3": [{ label: "Electric 50.1 / 60.5 kWh (Blade)", start: 2022 }],
      Dolphin: [{ label: "Electric 44.9 / 60.5 kWh (Blade)", start: 2022 }],
      Seal: [{ label: "Electric 61.4 / 82.5 kWh (Blade)", start: 2022 }],
      Tang: [
        { label: "2.0L Turbo PHEV (DM-i)", start: 2018 },
        { label: "Electric (108.8 kWh)", start: 2021 },
      ],
      Han: [
        { label: "2.0L Turbo PHEV (DM-i)", start: 2020 },
        { label: "Electric (76.9 / 85.4 kWh)", start: 2020 },
      ],
    },

    Geely: {
      Coolray: [{ label: "1.5L Turbo (JLH-3G15TD)", start: 2018 }],
      Azkarra: [{ label: "1.5L Turbo Mild Hybrid (JLH-3G15TD)", start: 2018 }],
      "Emgrand X7": [{ label: "1.8L Turbo", start: 2018 }],
      Okavango: [{ label: "1.5L Turbo Mild Hybrid (JLH-3G15TD)", start: 2020 }],
      Tugella: [{ label: "2.0L Turbo (JLH-4G20TDB)", start: 2020 }],
    },

    Chery: {
      Tiggo2: [{ label: "1.5L Gasoline (SQR477F)", start: 2017 }],
      "Tiggo 2": [{ label: "1.5L Gasoline (SQR477F)", start: 2017 }],
      Tiggo5: [{ label: "1.5L Turbo (SQRE4T15B)", start: 2014 }],
      "Tiggo 5": [{ label: "1.5L Turbo (SQRE4T15B)", start: 2014 }],
      Tiggo7: [{ label: "1.5L Turbo (SQRE4T15)", start: 2016 }],
      "Tiggo 7": [{ label: "1.5L Turbo (SQRE4T15)", start: 2016 }],
      Tiggo8: [{ label: "1.6L Turbo (SQRF4J16)", start: 2018 }],
      "Tiggo 8": [{ label: "1.6L Turbo (SQRF4J16)", start: 2018 }],
    },

    Foton: {
      Toplander: [{ label: "2.8L Diesel (Cummins ISF2.8)", start: 2017 }],
      Thunder: [{ label: "2.8L Diesel (Cummins ISF2.8)", start: 2018 }],
      Tornado: [{ label: "2.8L Diesel (Cummins ISF2.8)", start: 2015 }],
      "View Traveller": [{ label: "2.8L Diesel (Cummins ISF2.8)", start: 2010 }],
    },

    Jeep: {
      Wrangler: [
        { label: "3.6L V6 Pentastar", start: 2012 },
        { label: "2.0L Turbo (Hurricane)", start: 2018 },
        { label: "2.2L MultiJet Diesel", start: 2018 },
      ],
      "Grand Cherokee": [
        { label: "3.6L V6 Pentastar", start: 2011 },
        { label: "5.7L V8 HEMI", start: 2011 },
        { label: "6.4L V8 HEMI (SRT)", start: 2012 },
        { label: "3.0L V6 EcoDiesel", start: 2014 },
      ],
      Cherokee: [
        { label: "2.4L Tigershark", start: 2014 },
        { label: "3.2L V6 Pentastar", start: 2014 },
      ],
      Compass: [
        { label: "2.4L Tigershark", start: 2017 },
        { label: "1.3L Turbo (GSE)", start: 2021 },
      ],
      Renegade: [
        { label: "1.4L MultiAir Turbo", start: 2014, end: 2022 },
        { label: "2.4L Tigershark", start: 2014, end: 2022 },
        { label: "1.3L Turbo (GSE)", start: 2018 },
      ],
    },

    "Mercedes-Benz": {
      "A-Class": [
        { label: "1.3L Turbo (M282)", code: "M282", start: 2018 },
        { label: "2.0L Turbo (M260)", code: "M260", start: 2018 },
      ],
      "C-Class": [
        { label: "1.5L Turbo Mild Hybrid (M254)", code: "M254", start: 2021 },
        { label: "2.0L Turbo (M264)", code: "M264", start: 2014 },
        { label: "2.0L Diesel (OM654)", code: "OM654", start: 2016 },
        { label: "3.0L V6 (M276)", code: "M276", start: 2014, end: 2021 },
        { label: "4.0L V8 BiTurbo (M177, AMG)", code: "M177", start: 2015 },
      ],
      "E-Class": [
        { label: "2.0L Turbo (M264)", code: "M264", start: 2016 },
        { label: "2.0L Diesel (OM654)", code: "OM654", start: 2016 },
        { label: "3.0L Inline-6 (M256)", code: "M256", start: 2018 },
        { label: "4.0L V8 BiTurbo (M177, AMG)", code: "M177", start: 2017 },
      ],
      "S-Class": [
        { label: "3.0L Inline-6 (M256)", code: "M256", start: 2017 },
        { label: "4.0L V8 BiTurbo (M177)", code: "M177", start: 2017 },
        { label: "6.0L V12 BiTurbo (M279)", code: "M279", start: 2013, end: 2020 },
      ],
      "GLA": [
        { label: "1.3L Turbo (M282)", code: "M282", start: 2020 },
        { label: "2.0L Turbo (M260)", code: "M260", start: 2014 },
      ],
      "GLC": [
        { label: "2.0L Turbo (M264)", code: "M264", start: 2015 },
        { label: "2.0L Diesel (OM654)", code: "OM654", start: 2015 },
        { label: "3.0L V6 Diesel (OM642)", code: "OM642", start: 2015, end: 2020 },
      ],
      "GLE": [
        { label: "2.0L Turbo (M264)", code: "M264", start: 2019 },
        { label: "3.0L Inline-6 (M256)", code: "M256", start: 2019 },
        { label: "2.9L Inline-6 Diesel (OM656)", code: "OM656", start: 2019 },
        { label: "4.0L V8 BiTurbo (M177)", code: "M177", start: 2019 },
      ],
      "G-Class": [
        { label: "4.0L V8 BiTurbo (M177)", code: "M177", start: 2018 },
        { label: "3.0L V6 Diesel (OM642)", code: "OM642", start: 2010, end: 2018 },
      ],
    },

    BMW: {
      "1 Series": [
        { label: "1.5L Turbo (B38)", code: "B38", start: 2015 },
        { label: "2.0L Turbo (B48)", code: "B48", start: 2015 },
      ],
      "2 Series": [
        { label: "2.0L Turbo (B48)", code: "B48", start: 2014 },
        { label: "3.0L Turbo Inline-6 (B58, M2)", code: "B58", start: 2016 },
      ],
      "3 Series": [
        { label: "2.0L Turbo (N20)", code: "N20", start: 2011, end: 2017 },
        { label: "2.0L Turbo (B48)", code: "B48", start: 2015 },
        { label: "2.0L Diesel (B47)", code: "B47", start: 2015 },
        { label: "3.0L Turbo Inline-6 (B58)", code: "B58", start: 2015 },
        { label: "3.0L Inline-6 (S58, M3)", code: "S58", start: 2020 },
      ],
      "5 Series": [
        { label: "2.0L Turbo (B48)", code: "B48", start: 2017 },
        { label: "3.0L Turbo Inline-6 (B58)", code: "B58", start: 2017 },
        { label: "2.0L Diesel (B47)", code: "B47", start: 2017 },
        { label: "4.4L V8 BiTurbo (S63, M5)", code: "S63", start: 2018 },
      ],
      "7 Series": [
        { label: "3.0L Turbo Inline-6 (B58)", code: "B58", start: 2015 },
        { label: "4.4L V8 BiTurbo (N63/S63)", code: "N63", start: 2015 },
      ],
      X1: [
        { label: "2.0L Turbo (B48)", code: "B48", start: 2015 },
        { label: "1.5L Turbo (B38)", code: "B38", start: 2015 },
      ],
      X3: [
        { label: "2.0L Turbo (B48)", code: "B48", start: 2017 },
        { label: "3.0L Turbo Inline-6 (B58)", code: "B58", start: 2017 },
        { label: "3.0L Inline-6 (S58, X3 M)", code: "S58", start: 2019 },
      ],
      X5: [
        { label: "3.0L Turbo Inline-6 (B58)", code: "B58", start: 2018 },
        { label: "4.4L V8 BiTurbo (N63)", code: "N63", start: 2018 },
        { label: "3.0L Diesel (B57)", code: "B57", start: 2018 },
      ],
      X7: [
        { label: "3.0L Turbo Inline-6 (B58)", code: "B58", start: 2018 },
        { label: "4.4L V8 BiTurbo (N63)", code: "N63", start: 2018 },
      ],
      "M3": [{ label: "3.0L Twin-Turbo Inline-6 (S58)", code: "S58", start: 2020 }],
      "M4": [{ label: "3.0L Twin-Turbo Inline-6 (S58)", code: "S58", start: 2020 }],
    },

    Audi: {
      A3: [
        { label: "1.4L TFSI (EA211)", code: "EA211", start: 2012 },
        { label: "1.8L TFSI (EA888)", code: "EA888", start: 2012 },
        { label: "2.0L TFSI (EA888)", code: "EA888", start: 2012 },
        { label: "2.0L TDI (EA288)", code: "EA288", start: 2012 },
      ],
      A4: [
        { label: "1.8L TFSI (EA888)", code: "EA888", start: 2008 },
        { label: "2.0L TFSI (EA888)", code: "EA888", start: 2008 },
        { label: "2.0L TDI (EA288)", code: "EA288", start: 2008 },
        { label: "3.0L TDI V6", start: 2008 },
      ],
      A6: [
        { label: "2.0L TFSI (EA888)", code: "EA888", start: 2011 },
        { label: "3.0L V6 TFSI", start: 2011 },
        { label: "3.0L V6 TDI", start: 2011 },
      ],
      Q3: [
        { label: "1.4L TFSI (EA211)", code: "EA211", start: 2011 },
        { label: "2.0L TFSI (EA888)", code: "EA888", start: 2011 },
        { label: "2.0L TDI (EA288)", code: "EA288", start: 2011 },
      ],
      Q5: [
        { label: "2.0L TFSI (EA888)", code: "EA888", start: 2008 },
        { label: "3.0L V6 TFSI", start: 2008 },
        { label: "2.0L TDI (EA288)", code: "EA288", start: 2008 },
        { label: "3.0L V6 TDI", start: 2008 },
      ],
      Q7: [
        { label: "3.0L V6 TFSI", start: 2015 },
        { label: "3.0L V6 TDI", start: 2015 },
      ],
    },

    Volkswagen: {
      Polo: [
        { label: "1.2L TSI (EA211)", code: "EA211", start: 2009 },
        { label: "1.6L MPI", start: 2009 },
        { label: "1.0L TSI (EA211)", code: "EA211", start: 2017 },
      ],
      Golf: [
        { label: "1.4L TSI (EA211)", code: "EA211", start: 2012 },
        { label: "2.0L TSI (EA888, GTI)", code: "EA888", start: 2013 },
        { label: "2.0L TSI (EA888, R)", code: "EA888", start: 2014 },
        { label: "2.0L TDI (EA288)", code: "EA288", start: 2012 },
      ],
      Jetta: [
        { label: "1.4L TSI (EA211)", code: "EA211", start: 2011 },
        { label: "1.8L TSI (EA888)", code: "EA888", start: 2011 },
        { label: "2.0L TSI (EA888, GLI)", code: "EA888", start: 2014 },
      ],
      Tiguan: [
        { label: "2.0L TSI (EA888)", code: "EA888", start: 2007 },
        { label: "2.0L TDI (EA288)", code: "EA288", start: 2007 },
        { label: "1.4L TSI (EA211)", code: "EA211", start: 2016 },
      ],
      Touareg: [
        { label: "3.0L V6 TSI", start: 2010 },
        { label: "3.0L V6 TDI", start: 2010 },
      ],
    },

    Porsche: {
      "911": [
        { label: "3.0L Twin-Turbo Flat-6 (9A2)", code: "9A2", start: 2015 },
        { label: "3.8L Twin-Turbo Flat-6 (Turbo/Turbo S)", start: 2015 },
        { label: "4.0L Flat-6 (GT3)", start: 2017 },
      ],
      Cayenne: [
        { label: "3.0L V6 TFSI", start: 2010 },
        { label: "2.9L Twin-Turbo V6", start: 2017 },
        { label: "4.0L Twin-Turbo V8", start: 2017 },
        { label: "3.0L V6 Diesel", start: 2010, end: 2018 },
      ],
      Macan: [
        { label: "2.0L Turbo (EA888)", code: "EA888", start: 2016 },
        { label: "3.0L Twin-Turbo V6", start: 2014 },
        { label: "2.9L Twin-Turbo V6 (GTS/Turbo)", start: 2019 },
      ],
      Panamera: [
        { label: "2.9L Twin-Turbo V6", start: 2016 },
        { label: "4.0L Twin-Turbo V8", start: 2016 },
        { label: "4.0L V8 Diesel", start: 2016, end: 2018 },
      ],
      Cayman: [
        { label: "2.0L Turbo Flat-4 (9A2)", code: "9A2", start: 2016 },
        { label: "2.5L Turbo Flat-4 (S)", start: 2016 },
        { label: "4.0L Flat-6 (GT4/GTS)", start: 2019 },
      ],
      Boxster: [
        { label: "2.0L Turbo Flat-4 (9A2)", code: "9A2", start: 2016 },
        { label: "2.5L Turbo Flat-4 (S)", start: 2016 },
        { label: "4.0L Flat-6 (GTS/Spyder)", start: 2019 },
      ],
    },

    Volvo: {
      "XC40": [
        { label: "2.0L Turbo Drive-E (B4204)", start: 2018 },
        { label: "Electric (78 kWh)", start: 2020 },
      ],
      "XC60": [
        { label: "2.0L Turbo Drive-E (B4204)", start: 2017 },
        { label: "2.0L Twin-Charged Drive-E (T6)", start: 2017 },
        { label: "2.0L PHEV (T8)", start: 2017 },
      ],
      "XC90": [
        { label: "2.0L Turbo Drive-E (T5)", start: 2015 },
        { label: "2.0L Twin-Charged Drive-E (T6)", start: 2015 },
        { label: "2.0L PHEV (T8)", start: 2015 },
        { label: "2.0L Diesel Drive-E (D5)", start: 2015, end: 2021 },
      ],
      "S60": [
        { label: "2.0L Turbo Drive-E", start: 2018 },
        { label: "2.0L PHEV (T8)", start: 2019 },
      ],
      "S90": [
        { label: "2.0L Turbo Drive-E", start: 2016 },
        { label: "2.0L PHEV (T8)", start: 2017 },
      ],
    },

    "Land Rover": {
      Defender: [
        { label: "2.0L Ingenium Turbo", start: 2020 },
        { label: "3.0L Ingenium Inline-6 Mild Hybrid", start: 2020 },
        { label: "5.0L Supercharged V8", start: 2021 },
        { label: "3.0L Ingenium Diesel", start: 2020 },
      ],
      Discovery: [
        { label: "2.0L Ingenium Turbo", start: 2017 },
        { label: "3.0L V6 Supercharged", start: 2017, end: 2020 },
        { label: "3.0L Ingenium Diesel", start: 2017 },
      ],
      "Discovery Sport": [
        { label: "2.0L Ingenium Turbo", start: 2014 },
        { label: "2.0L Ingenium Diesel", start: 2014 },
      ],
      "Range Rover": [
        { label: "3.0L Ingenium Inline-6 Mild Hybrid", start: 2022 },
        { label: "4.4L Twin-Turbo V8 (BMW S63)", code: "S63", start: 2022 },
        { label: "5.0L Supercharged V8", start: 2013, end: 2022 },
        { label: "3.0L V6 SDV6 Diesel", start: 2013, end: 2022 },
      ],
      "Range Rover Sport": [
        { label: "3.0L Ingenium Inline-6 Mild Hybrid", start: 2022 },
        { label: "5.0L Supercharged V8", start: 2013, end: 2022 },
        { label: "3.0L V6 SDV6 Diesel", start: 2013, end: 2022 },
      ],
      "Range Rover Evoque": [
        { label: "2.0L Ingenium Turbo", start: 2018 },
        { label: "2.0L Ingenium Diesel", start: 2018 },
      ],
    },

    Mahindra: {
      Bolero: [
        { label: "2.5L Diesel (m2DICR)", start: 2000 },
        { label: "1.5L Diesel (mHawk75)", start: 2020 },
      ],
      Scorpio: [
        { label: "2.2L mHawk Diesel", start: 2006 },
        { label: "2.0L mStallion Turbo Petrol", start: 2022 },
      ],
      XUV500: [{ label: "2.2L mHawk Diesel", start: 2011, end: 2021 }],
      XUV700: [
        { label: "2.0L mStallion Turbo Petrol", start: 2021 },
        { label: "2.2L mHawk Diesel", start: 2021 },
      ],
      Thar: [
        { label: "2.0L mStallion Turbo Petrol", start: 2020 },
        { label: "2.2L mHawk Diesel", start: 2020 },
      ],
    },

    Tata: {
      Nano: [{ label: "0.6L / 0.8L Gasoline", start: 2008, end: 2018 }],
      Tiago: [
        { label: "1.2L Revotron Gasoline", start: 2016 },
        { label: "1.05L Revotorq Diesel", start: 2016, end: 2020 },
      ],
      Tigor: [{ label: "1.2L Revotron Gasoline", start: 2017 }],
      Nexon: [
        { label: "1.2L Turbo Revotron Gasoline", start: 2017 },
        { label: "1.5L Revotorq Diesel", start: 2017 },
        { label: "Electric 30.2 / 40.5 kWh (Ziptron)", start: 2020 },
      ],
      Harrier: [{ label: "2.0L Kryotec Diesel (FCA Multijet)", start: 2019 }],
      Safari: [{ label: "2.0L Kryotec Diesel", start: 2021 }],
    },

    Proton: {
      Saga: [
        { label: "1.3L Gasoline (VVT)", start: 2008 },
        { label: "1.6L Gasoline (Campro)", start: 2008, end: 2016 },
      ],
      Persona: [
        { label: "1.6L Gasoline (Campro)", start: 2007, end: 2016 },
        { label: "1.6L Gasoline (VVT)", start: 2016 },
      ],
      X50: [{ label: "1.5L Turbo (TGDi, Geely)", start: 2020 }],
      X70: [
        { label: "1.8L Turbo (TGDi, Geely)", start: 2018, end: 2020 },
        { label: "1.5L Turbo (TGDi)", start: 2020 },
      ],
    },

    Perodua: {
      Axia: [{ label: "1.0L Gasoline (1KR-VE)", code: "1KR-VE", start: 2014 }],
      Bezza: [{ label: "1.0L (1KR-VE) / 1.3L (1NR-VE)", start: 2016 }],
      Myvi: [
        { label: "1.3L Gasoline (K3-VE/1NR-VE)", start: 2005 },
        { label: "1.5L Gasoline (3SZ-VE/2NR-VE)", start: 2011 },
      ],
      Aruz: [{ label: "1.5L Gasoline (2NR-VE)", code: "2NR-VE", start: 2019 }],
      Ativa: [{ label: "1.0L Turbo (1KR-VET)", code: "1KR-VET", start: 2021 }],
    },
  },

  motorcycle: {
    Honda: {
      "Wave 100": [{ label: "100cc 4-stroke OHC", start: 2002 }],
      "Wave 110": [{ label: "110cc eSP", start: 2010 }],
      "Wave 125": [{ label: "125cc 4-stroke OHC", start: 2003 }],
      "XRM 110": [{ label: "110cc 4-stroke OHC", start: 2003, end: 2014 }],
      "XRM 125": [{ label: "125cc 4-stroke OHC", start: 2008 }],
      "TMX 125": [{ label: "125cc Carbureted", start: 2003 }],
      "TMX Supremo": [{ label: "150cc 4-stroke OHC", start: 2014 }],
      "Click 125i": [{ label: "125cc eSP", start: 2014 }],
      "Click 150i": [{ label: "150cc eSP", start: 2017 }],
      "Click 160": [{ label: "160cc eSP+", start: 2022 }],
      ADV150: [{ label: "150cc eSP+", start: 2019, end: 2022 }],
      ADV160: [{ label: "160cc eSP+", start: 2022 }],
      "PCX 125": [{ label: "125cc eSP", start: 2010, end: 2018 }],
      "PCX 150": [{ label: "150cc eSP", start: 2014, end: 2021 }],
      "PCX 160": [{ label: "160cc eSP+", start: 2021 }],
      Beat: [
        { label: "110cc eSP", start: 2014, end: 2020 },
        { label: "110cc eSP+", start: 2020 },
      ],
      Genio: [{ label: "110cc eSP+", start: 2019 }],
      Scoopy: [
        { label: "110cc eSP", start: 2010, end: 2020 },
        { label: "110cc eSP+", start: 2020 },
      ],
      "CB150R Streetster": [{ label: "150cc DOHC", start: 2018 }],
      CBR150R: [{ label: "150cc DOHC", start: 2019 }],
      CBR250R: [{ label: "250cc Single DOHC", start: 2011, end: 2017 }],
      CBR250RR: [{ label: "250cc Twin DOHC", start: 2017 }],
      CBR500R: [{ label: "471cc Parallel-Twin", start: 2013 }],
      CBR650R: [{ label: "649cc Inline-4", start: 2019 }],
      CB650R: [{ label: "649cc Inline-4", start: 2019 }],
      CBR1000RR: [{ label: "999cc Inline-4", start: 2017 }],
      "CBR1000RR-R Fireblade": [{ label: "999cc Inline-4", start: 2020 }],
      "CB400X": [{ label: "400cc Parallel-Twin", start: 2019 }],
      "CB500X": [{ label: "471cc Parallel-Twin", start: 2013 }],
      "CRF150L": [{ label: "149cc Single", start: 2017 }],
      "CRF250L": [{ label: "249cc Single", start: 2012 }],
      "CRF300L": [{ label: "286cc Single", start: 2021 }],
      "CRF450L": [{ label: "449cc Single", start: 2018 }],
      "XR150L": [{ label: "149cc Single", start: 2014 }],
      "Africa Twin": [
        { label: "998cc Parallel-Twin", start: 2016, end: 2019 },
        { label: "1084cc Parallel-Twin", start: 2020 },
      ],
      "Gold Wing": [
        { label: "1832cc Flat-6", start: 2018 },
      ],
      "NC750X": [{ label: "745cc Parallel-Twin", start: 2014 }],
      "Rebel 500": [{ label: "471cc Parallel-Twin", start: 2017 }],
      "Rebel 1100": [{ label: "1084cc Parallel-Twin", start: 2021 }],
    },

    Yamaha: {
      Mio: [{ label: "115cc Carbureted", start: 2003, end: 2014 }],
      "Mio Sporty": [{ label: "115cc Carbureted", start: 2003, end: 2015 }],
      "Mio i 125": [{ label: "125cc Bluecore", start: 2016 }],
      "Mio Soul i 125": [{ label: "125cc Bluecore", start: 2016 }],
      "Mio Gear": [{ label: "125cc Bluecore", start: 2022 }],
      "Mio Aerox": [
        { label: "155cc VVA Bluecore", start: 2017, end: 2021 },
      ],
      "Aerox 155": [
        { label: "155cc VVA Bluecore", start: 2017, end: 2021 },
        { label: "155cc VVA Bluecore (Connected)", start: 2021 },
      ],
      "NMAX 155": [{ label: "155cc VVA Bluecore", start: 2015 }],
      "Sniper 150": [
        { label: "150cc Carbureted", start: 2010, end: 2017 },
        { label: "150cc Fuel Injected (MX-King)", start: 2017 },
      ],
      "Sniper 155": [{ label: "155cc VVA", start: 2021 }],
      "YZF-R3": [{ label: "321cc Parallel-Twin", start: 2015 }],
      "YZF-R15": [{ label: "155cc VVA", start: 2017 }],
      "YZF-R25": [{ label: "249cc Parallel-Twin", start: 2014 }],
      "YZF-R1": [{ label: "998cc Crossplane Inline-4", start: 2015 }],
      "YZF-R6": [{ label: "599cc Inline-4", start: 2006, end: 2020 }],
      "YZF-R7": [{ label: "689cc Parallel-Twin (CP2)", start: 2021 }],
      "MT-03": [{ label: "321cc Parallel-Twin", start: 2016 }],
      "MT-07": [{ label: "689cc Parallel-Twin (CP2)", start: 2014 }],
      "MT-09": [{ label: "847cc / 890cc Inline-3 (CP3)", start: 2013 }],
      "MT-15": [{ label: "155cc VVA", start: 2019 }],
      "MT-25": [{ label: "249cc Parallel-Twin", start: 2015 }],
      "FZ150i": [{ label: "150cc Fuel Injected", start: 2014 }],
      Tracer: [{ label: "847cc Inline-3 (CP3)", start: 2015 }],
      "Tracer 900": [{ label: "847cc / 890cc Inline-3 (CP3)", start: 2015 }],
      "Tenere 700": [{ label: "689cc Parallel-Twin (CP2)", start: 2019 }],
      "XSR700": [{ label: "689cc Parallel-Twin (CP2)", start: 2016 }],
      "XSR900": [{ label: "847cc / 890cc Inline-3 (CP3)", start: 2016 }],
    },

    Suzuki: {
      Raider: [
        { label: "150cc 2-stroke", end: 2014 },
        { label: "150cc Fuel Injected DOHC", start: 2015 },
      ],
      "Raider R150": [
        { label: "150cc 2-stroke", end: 2014 },
        { label: "150cc 4-stroke FI DOHC", start: 2015 },
      ],
      "Raider J Crossover 115": [{ label: "115cc Fuel Injected", start: 2017 }],
      "Skydrive Sport": [{ label: "125cc", start: 2017 }],
      "Burgman Street": [{ label: "125cc", start: 2020 }],
      "GSX-R150": [{ label: "147cc DOHC", start: 2017 }],
      "GSX-S150": [{ label: "147cc DOHC", start: 2017 }],
      "GSX-R600": [{ label: "599cc Inline-4", start: 2006 }],
      "GSX-R750": [{ label: "749cc Inline-4", start: 2006 }],
      "GSX-R1000": [{ label: "999cc Inline-4", start: 2017 }],
      "GSX-S1000": [{ label: "999cc Inline-4", start: 2015 }],
      "V-Strom 250": [{ label: "248cc Single", start: 2017 }],
      "V-Strom 650": [{ label: "645cc V-Twin", start: 2004 }],
      "V-Strom 1050": [{ label: "1037cc V-Twin", start: 2020 }],
      Hayabusa: [{ label: "1340cc Inline-4", start: 2008 }],
    },

    Kawasaki: {
      "Barako II": [{ label: "175cc Carbureted", start: 2010 }],
      "Rouser NS200": [{ label: "200cc Single", start: 2018 }],
      "Ninja 300": [{ label: "296cc Parallel-Twin", start: 2013, end: 2018 }],
      "Ninja 400": [{ label: "399cc Parallel-Twin", start: 2018 }],
      "Ninja 650": [{ label: "649cc Parallel-Twin", start: 2017 }],
      "Ninja ZX-6R": [{ label: "636cc Inline-4", start: 2003 }],
      "Ninja ZX-10R": [{ label: "998cc Inline-4", start: 2004 }],
      "Ninja H2": [{ label: "998cc Supercharged Inline-4", start: 2015 }],
      Z400: [{ label: "399cc Parallel-Twin", start: 2019 }],
      Z650: [{ label: "649cc Parallel-Twin", start: 2017 }],
      Z900: [{ label: "948cc Inline-4", start: 2017 }],
      "Z1000": [{ label: "1043cc Inline-4", start: 2014, end: 2020 }],
      Versys: [{ label: "649cc / 1043cc", start: 2007 }],
      "Versys 650": [{ label: "649cc Parallel-Twin", start: 2007 }],
      "Versys 1000": [{ label: "1043cc Inline-4", start: 2012 }],
      "W175": [{ label: "177cc Single", start: 2020 }],
      "KLX150": [{ label: "144cc Single", start: 2009 }],
      "KLX230": [{ label: "233cc Single", start: 2019 }],
      "KLX300": [{ label: "292cc Single", start: 2020 }],
    },

    KTM: {
      "Duke 125": [{ label: "125cc Single (LC4c)", start: 2011 }],
      "Duke 200": [{ label: "199cc Single", start: 2012 }],
      "Duke 250": [{ label: "249cc Single (LC4c)", start: 2015 }],
      "Duke 390": [{ label: "373cc Single (LC4c)", start: 2013 }],
      "Duke 690": [{ label: "693cc Single (LC4)", start: 2008 }],
      "Duke 790": [{ label: "799cc Parallel-Twin (LC8c)", start: 2018 }],
      "Duke 890": [{ label: "889cc Parallel-Twin (LC8c)", start: 2020 }],
      "RC 200": [{ label: "199cc Single", start: 2014 }],
      "RC 390": [{ label: "373cc Single (LC4c)", start: 2014 }],
      "Adventure 390": [{ label: "373cc Single", start: 2020 }],
      "Adventure 790": [{ label: "799cc Parallel-Twin (LC8c)", start: 2019 }],
      "Adventure 890": [{ label: "889cc Parallel-Twin (LC8c)", start: 2021 }],
      "Adventure 1290": [{ label: "1301cc V-Twin (LC8)", start: 2014 }],
      "EXC 250": [{ label: "249cc Single 2-stroke", start: 2008 }],
      "EXC 300": [{ label: "293cc Single 2-stroke", start: 2008 }],
    },

    "Royal Enfield": {
      Classic: [
        { label: "350cc Single (UCE)", start: 2009, end: 2021 },
        { label: "350cc Single (J Platform)", start: 2021 },
      ],
      "Classic 350": [
        { label: "350cc Single (UCE)", start: 2009, end: 2021 },
        { label: "350cc Single (J Platform)", start: 2021 },
      ],
      "Classic 500": [{ label: "499cc Single (UCE)", start: 2009, end: 2020 }],
      "Bullet 350": [
        { label: "350cc Single (UCE)", start: 2008, end: 2023 },
        { label: "350cc Single (J Platform)", start: 2023 },
      ],
      Meteor: [{ label: "350cc Single (J Platform)", start: 2020 }],
      "Meteor 350": [{ label: "350cc Single (J Platform)", start: 2020 }],
      "Interceptor 650": [{ label: "648cc Parallel-Twin", start: 2018 }],
      "Continental GT 650": [{ label: "648cc Parallel-Twin", start: 2018 }],
      Himalayan: [
        { label: "411cc Single (LS410)", start: 2016, end: 2023 },
        { label: "452cc Single (Sherpa 450)", start: 2024 },
      ],
      "Hunter 350": [{ label: "350cc Single (J Platform)", start: 2022 }],
    },

    Ducati: {
      Panigale: [
        { label: "959cc L-Twin", start: 2016, end: 2019 },
        { label: "1103cc V4", start: 2018 },
      ],
      "Panigale V2": [{ label: "955cc L-Twin", start: 2020 }],
      "Panigale V4": [{ label: "1103cc V4", start: 2018 }],
      Monster: [
        { label: "821cc L-Twin", start: 2014, end: 2020 },
        { label: "937cc L-Twin", start: 2021 },
        { label: "1198cc L-Twin", start: 2014, end: 2021 },
      ],
      Multistrada: [
        { label: "950cc L-Twin", start: 2017 },
        { label: "1158cc V4 (Granturismo)", start: 2021 },
      ],
      "Multistrada V4": [{ label: "1158cc V4 (Granturismo)", start: 2021 }],
      Scrambler: [{ label: "803cc L-Twin", start: 2015 }],
      "Diavel V4": [{ label: "1158cc V4", start: 2023 }],
      Streetfighter: [
        { label: "1103cc V4", start: 2020 },
        { label: "955cc L-Twin (V2)", start: 2022 },
      ],
    },

    "BMW Motorrad": {
      "G 310 R": [{ label: "313cc Single", start: 2016 }],
      "G 310 GS": [{ label: "313cc Single", start: 2017 }],
      "F 750 GS": [{ label: "853cc Parallel-Twin", start: 2018, end: 2023 }],
      "F 800 GS": [{ label: "895cc Parallel-Twin", start: 2024 }],
      "F 850 GS": [{ label: "853cc Parallel-Twin", start: 2018 }],
      "F 900 R": [{ label: "895cc Parallel-Twin", start: 2020 }],
      "F 900 XR": [{ label: "895cc Parallel-Twin", start: 2020 }],
      "R 1250 GS": [{ label: "1254cc Boxer ShiftCam", start: 2018, end: 2023 }],
      "R 1300 GS": [{ label: "1300cc Boxer ShiftCam", start: 2024 }],
      "R 1250 RT": [{ label: "1254cc Boxer ShiftCam", start: 2019 }],
      "S 1000 RR": [{ label: "999cc Inline-4", start: 2009 }],
      "S 1000 R": [{ label: "999cc Inline-4", start: 2014 }],
      "S 1000 XR": [{ label: "999cc Inline-4", start: 2015 }],
      "M 1000 RR": [{ label: "999cc Inline-4", start: 2020 }],
    },

    "Harley-Davidson": {
      Sportster: [
        { label: "883cc V-Twin (Evolution)", start: 1986, end: 2022 },
        { label: "1200cc V-Twin (Evolution)", start: 1986, end: 2022 },
      ],
      "Sportster S": [{ label: "1252cc Revolution Max V-Twin", start: 2021 }],
      "Iron 883": [{ label: "883cc Evolution V-Twin", start: 2009, end: 2022 }],
      "Iron 1200": [{ label: "1200cc Evolution V-Twin", start: 2018, end: 2020 }],
      "Forty-Eight": [{ label: "1200cc Evolution V-Twin", start: 2010, end: 2022 }],
      Softail: [
        { label: "1745cc Milwaukee-Eight 107", start: 2018 },
        { label: "1868cc Milwaukee-Eight 114", start: 2018 },
      ],
      "Street Glide": [
        { label: "1745cc Milwaukee-Eight 107", start: 2017 },
        { label: "1868cc Milwaukee-Eight 114", start: 2019 },
        { label: "1923cc Milwaukee-Eight 117", start: 2024 },
      ],
      "Road Glide": [
        { label: "1745cc Milwaukee-Eight 107", start: 2017 },
        { label: "1868cc Milwaukee-Eight 114", start: 2019 },
        { label: "1923cc Milwaukee-Eight 117", start: 2024 },
      ],
      "Pan America": [{ label: "1252cc Revolution Max V-Twin", start: 2021 }],
      "Fat Boy": [{ label: "1868cc Milwaukee-Eight 114", start: 2018 }],
    },

    Vespa: {
      "Sprint 150": [{ label: "150cc i-Get", start: 2014 }],
      "Primavera 150": [{ label: "150cc i-Get", start: 2014 }],
      "GTS 300": [{ label: "278cc i-Get", start: 2017 }],
      "LX 150": [{ label: "150cc 3V", start: 2012, end: 2014 }],
      "S 150": [{ label: "150cc 3V", start: 2012, end: 2014 }],
    },

    SYM: {
      "Jet 14": [{ label: "125cc / 200cc", start: 2018 }],
      Symphony: [{ label: "125cc / 150cc", start: 2009 }],
      Maxsym: [{ label: "400cc / 600cc", start: 2011 }],
      Cruisym: [{ label: "300cc", start: 2017 }],
      "VF3i": [{ label: "185cc", start: 2017 }],
    },

    Kymco: {
      "Like 150i": [{ label: "150cc Fuel Injected", start: 2018 }],
      "Xciting 400i": [{ label: "399cc Single", start: 2013 }],
      "AK 550": [{ label: "550cc Parallel-Twin", start: 2017 }],
      "Downtown 350i": [{ label: "321cc Single", start: 2015 }],
    },

    CFMOTO: {
      "150 NK": [{ label: "149cc Single", start: 2018 }],
      "300 NK": [{ label: "292cc Single", start: 2017 }],
      "300 SR": [{ label: "292cc Single", start: 2020 }],
      "650 NK": [{ label: "649cc Parallel-Twin", start: 2012 }],
      "650 MT": [{ label: "649cc Parallel-Twin", start: 2017 }],
      "700 CL-X": [{ label: "693cc Parallel-Twin", start: 2020 }],
      "800 MT": [{ label: "800cc Parallel-Twin (KTM-derived)", start: 2021 }],
    },

    Bajaj: {
      Pulsar: [
        { label: "150cc DTS-i", start: 2001 },
        { label: "180cc DTS-i", start: 2001, end: 2020 },
        { label: "200cc DTS-i", start: 2012 },
        { label: "220cc DTS-i", start: 2007 },
      ],
      "Pulsar NS200": [{ label: "200cc Triple-Spark DOHC", start: 2012 }],
      "Pulsar RS200": [{ label: "200cc Triple-Spark DOHC", start: 2015 }],
      "Pulsar N250": [{ label: "249cc Single", start: 2021 }],
      "Pulsar F250": [{ label: "249cc Single", start: 2021 }],
      Dominar: [
        { label: "373cc Single (KTM-derived)", start: 2016 },
        { label: "248cc Single", start: 2020 },
      ],
      "Dominar 400": [{ label: "373cc Single (KTM-derived)", start: 2016 }],
    },

    Triumph: {
      "Trident 660": [{ label: "660cc Inline-3", start: 2021 }],
      "Tiger 660 Sport": [{ label: "660cc Inline-3", start: 2022 }],
      "Tiger 900": [{ label: "888cc Inline-3", start: 2020 }],
      "Tiger 1200": [{ label: "1160cc Inline-3", start: 2022 }],
      "Speed Triple 1200 RS": [{ label: "1160cc Inline-3", start: 2021 }],
      "Street Triple": [{ label: "765cc Inline-3", start: 2017 }],
      "Bonneville T100": [{ label: "900cc Parallel-Twin", start: 2017 }],
      "Bonneville T120": [{ label: "1200cc Parallel-Twin", start: 2016 }],
      "Speed Twin 900": [{ label: "900cc Parallel-Twin", start: 2023 }],
      "Speed Twin 1200": [{ label: "1200cc Parallel-Twin", start: 2019 }],
      Rocket: [{ label: "2458cc Inline-3", start: 2019 }],
    },
  },

  heavy_truck: {
    Isuzu: {
      "Elf NLR": [{ label: "3.0L Diesel (4JJ1-TCS)", code: "4JJ1-TCS", start: 2007 }],
      "Elf NPR": [{ label: "5.2L Diesel (4HK1)", code: "4HK1", start: 2004 }],
      "Forward FRR": [{ label: "5.2L Diesel (4HK1)", code: "4HK1", start: 2004 }],
      "Forward FVR": [{ label: "7.8L Diesel (6HK1)", code: "6HK1", start: 2004 }],
      "Giga CYH/CYZ": [
        { label: "9.8L Diesel (6UZ1)", code: "6UZ1", start: 2008 },
        { label: "12.7L V8 Diesel (8TD1)", code: "8TD1", start: 1994, end: 2008 },
      ],
    },
    Hino: {
      "Dutro": [
        { label: "4.0L Diesel (N04C)", code: "N04C", start: 2006 },
        { label: "5.1L Diesel (J05C)", code: "J05C", start: 1999 },
      ],
      "300 Series": [{ label: "4.0L Diesel (N04C)", code: "N04C", start: 2006 }],
      "500 Series": [
        { label: "5.1L Diesel (J05E)", code: "J05E", start: 2002 },
        { label: "7.7L Diesel (J08E)", code: "J08E", start: 2002 },
      ],
      "700 Series": [{ label: "12.9L Diesel (E13C)", code: "E13C", start: 2002 }],
    },
    Fuso: {
      Canter: [
        { label: "3.0L Diesel (4P10)", code: "4P10", start: 2010 },
        { label: "4.9L Diesel (4M50)", code: "4M50", start: 2002, end: 2017 },
      ],
      "Fighter": [
        { label: "7.5L Diesel (6M60)", code: "6M60", start: 1992, end: 2017 },
        { label: "7.5L Diesel (6M61)", code: "6M61", start: 2017 },
      ],
      "Super Great": [
        { label: "10.7L Diesel (6R10)", code: "6R10", start: 2007 },
        { label: "12.8L Diesel (6S10)", code: "6S10", start: 2018 },
      ],
    },
    "UD Trucks": {
      Quester: [
        { label: "8.0L Diesel (GH8E)", code: "GH8E", start: 2013 },
        { label: "11.0L Diesel (GH11E)", code: "GH11E", start: 2013 },
      ],
      Croner: [
        { label: "5.0L Diesel (GH5E)", code: "GH5E", start: 2017 },
        { label: "8.0L Diesel (GH8E)", code: "GH8E", start: 2017 },
      ],
      Kuzer: [{ label: "3.0L Diesel (FE6 / Cummins ISF)", start: 2017 }],
    },
    Foton: {
      Aumark: [{ label: "2.8L / 3.8L Cummins ISF Diesel", start: 2010 }],
      "Auman": [
        { label: "6.7L Cummins ISBe Diesel", start: 2010 },
        { label: "8.9L Cummins ISLe Diesel", start: 2010 },
        { label: "11.8L Cummins ISG Diesel", start: 2010 },
      ],
      "Tornado V": [{ label: "2.8L Cummins ISF2.8 Diesel", start: 2015 }],
    },
    Hyundai: {
      "HD72": [{ label: "3.9L D4DB Diesel", code: "D4DB", start: 2004 }],
      "HD78": [{ label: "3.9L D4DB Diesel", code: "D4DB", start: 2004 }],
      "Mighty": [
        { label: "3.9L D4DB Diesel", code: "D4DB", start: 2004 },
        { label: "3.0L D4HE Diesel", code: "D4HE", start: 2018 },
      ],
      Xcient: [
        { label: "10.0L H Engine Diesel", start: 2013 },
        { label: "12.7L Powertec Diesel", start: 2013 },
      ],
    },
    Volvo: {
      "FM": [
        { label: "10.8L D11K Diesel", code: "D11K", start: 2013 },
        { label: "12.8L D13K Diesel", code: "D13K", start: 2013 },
      ],
      "FH": [
        { label: "12.8L D13K Diesel", code: "D13K", start: 2012 },
        { label: "16.1L D16K Diesel", code: "D16K", start: 2012 },
      ],
      "FMX": [
        { label: "10.8L D11K Diesel", code: "D11K", start: 2013 },
        { label: "12.8L D13K Diesel", code: "D13K", start: 2013 },
      ],
    },
    Scania: {
      "P-Series": [
        { label: "9.0L DC09 Diesel", code: "DC09", start: 2016 },
        { label: "12.7L DC13 Diesel", code: "DC13", start: 2016 },
      ],
      "G-Series": [{ label: "12.7L DC13 Diesel", code: "DC13", start: 2016 }],
      "R-Series": [
        { label: "12.7L DC13 Diesel", code: "DC13", start: 2016 },
        { label: "16.4L DC16 V8 Diesel", code: "DC16", start: 2016 },
      ],
    },
  },

  atv_utv: {
    Honda: {
      "TRX250": [{ label: "229cc Single 4-stroke", start: 1997 }],
      "TRX420 Rancher": [{ label: "420cc Single 4-stroke", start: 2007 }],
      "TRX520 Rancher": [{ label: "518cc Single 4-stroke", start: 2020 }],
      "TRX680 Rincon": [{ label: "675cc Single 4-stroke", start: 2006 }],
      "Pioneer 500": [{ label: "475cc Single 4-stroke", start: 2015 }],
      "Pioneer 700": [{ label: "675cc Single 4-stroke", start: 2014 }],
      "Pioneer 1000": [{ label: "999cc Parallel-Twin", start: 2016 }],
      "Talon 1000": [{ label: "999cc Parallel-Twin", start: 2019 }],
    },
    Yamaha: {
      Raptor: [{ label: "700cc / 90cc / 250cc Single (varies by trim)", start: 2006 }],
      "Raptor 700R": [{ label: "686cc Single 4-stroke", start: 2006 }],
      Grizzly: [
        { label: "686cc Single 4-stroke (700)", start: 2007 },
        { label: "421cc Single 4-stroke (450)", start: 2003 },
      ],
      "Grizzly 700": [{ label: "686cc Single 4-stroke", start: 2007 }],
      Kodiak: [{ label: "686cc / 421cc Single 4-stroke", start: 2016 }],
      Wolverine: [
        { label: "847cc Inline-3", start: 2018 },
        { label: "708cc Parallel-Twin (X2/X4 700)", start: 2016 },
      ],
      "YXZ1000R": [{ label: "998cc Inline-3", start: 2016 }],
    },
    Suzuki: {
      "KingQuad 750": [{ label: "722cc Single 4-stroke", start: 2008 }],
      "KingQuad 500": [{ label: "493cc Single 4-stroke", start: 2008 }],
      "KingQuad 400": [{ label: "376cc Single 4-stroke", start: 2008 }],
      "LT-Z400": [{ label: "398cc Single 4-stroke", start: 2003 }],
    },
    Kawasaki: {
      "Brute Force 300": [{ label: "271cc Single 4-stroke", start: 2012 }],
      "Brute Force 750": [{ label: "749cc V-Twin", start: 2005 }],
      "KFX450R": [{ label: "449cc Single 4-stroke", start: 2008, end: 2014 }],
      "Mule Pro-FX": [{ label: "812cc Inline-3", start: 2015 }],
      "Mule Pro-FXT": [{ label: "812cc Inline-3", start: 2015 }],
      "Teryx KRX 1000": [{ label: "999cc Parallel-Twin", start: 2020 }],
    },
    Polaris: {
      "Sportsman 450": [{ label: "499cc Single ProStar", start: 2016 }],
      "Sportsman 570": [{ label: "567cc Single ProStar", start: 2014 }],
      "Sportsman 850": [{ label: "850cc Twin ProStar", start: 2017 }],
      "Sportsman XP 1000": [{ label: "999cc Twin ProStar", start: 2015 }],
      "RZR XP 1000": [{ label: "999cc Twin ProStar", start: 2014 }],
      "RZR Pro XP": [{ label: "925cc Twin ProStar Turbo", start: 2020 }],
      "RZR Turbo R": [{ label: "925cc Twin ProStar Turbo", start: 2022 }],
      "Ranger 1000": [{ label: "999cc Twin ProStar", start: 2018 }],
      "Ranger XP 1000": [{ label: "999cc Twin ProStar", start: 2017 }],
    },
    "Can-Am": {
      "Outlander 450": [{ label: "427cc Single Rotax", start: 2015 }],
      "Outlander 570": [{ label: "570cc V-Twin Rotax", start: 2015 }],
      "Outlander 650": [{ label: "650cc V-Twin Rotax", start: 2013 }],
      "Outlander 850": [{ label: "854cc V-Twin Rotax", start: 2015 }],
      "Outlander 1000R": [{ label: "976cc V-Twin Rotax", start: 2013 }],
      "Renegade 1000R": [{ label: "976cc V-Twin Rotax", start: 2013 }],
      "Maverick X3": [{ label: "900cc Turbo Inline-3 Rotax", start: 2016 }],
      "Maverick Sport": [{ label: "976cc V-Twin Rotax", start: 2018 }],
      "Defender HD10": [{ label: "976cc V-Twin Rotax", start: 2016 }],
    },
    CFMoto: {
      CForce: [{ label: "400cc / 600cc / 1000cc V-Twin", start: 2014 }],
      "CForce 400": [{ label: "400cc Single", start: 2018 }],
      "CForce 600": [{ label: "580cc V-Twin", start: 2019 }],
      "CForce 1000": [{ label: "963cc V-Twin", start: 2018 }],
      "ZForce 950": [{ label: "963cc V-Twin", start: 2020 }],
      "UForce 1000": [{ label: "963cc V-Twin", start: 2019 }],
    },
  },

  marine: {
    "Yamaha Marine": {
      "F2.5": [{ label: "72cc 4-stroke", start: 2003 }],
      "F4": [{ label: "139cc 4-stroke", start: 1999 }],
      "F6": [{ label: "139cc 4-stroke", start: 2003 }],
      "F9.9": [{ label: "212cc 4-stroke", start: 2006 }],
      "F15": [{ label: "362cc 4-stroke", start: 2006 }],
      "F25": [{ label: "498cc 4-stroke", start: 2010 }],
      "F40": [{ label: "747cc 4-stroke", start: 2011 }],
      "F60": [{ label: "996cc 4-stroke", start: 2011 }],
      "F75": [{ label: "1596cc Inline-4 4-stroke", start: 2011 }],
      "F90": [{ label: "1832cc Inline-4 4-stroke", start: 2014 }],
      "F115": [{ label: "1832cc Inline-4 4-stroke", start: 2014 }],
      "F150": [{ label: "2670cc Inline-4 4-stroke", start: 2004 }],
      "F200": [{ label: "2785cc Inline-4 4-stroke", start: 2013 }],
      "F250": [{ label: "4169cc V6 4-stroke", start: 2003 }],
      "F300": [{ label: "4169cc V6 4-stroke", start: 2010 }],
      "F350": [{ label: "5330cc V8 4-stroke", start: 2006 }],
      "F425 XTO": [{ label: "5559cc V8 4-stroke", start: 2018 }],
      "Enduro E40": [{ label: "703cc 2-stroke", start: 1998 }],
    },
    "Suzuki Marine": {
      "DF2.5": [{ label: "68cc 4-stroke", start: 2006 }],
      "DF6": [{ label: "138cc 4-stroke", start: 2008 }],
      "DF9.9B": [{ label: "327cc 4-stroke", start: 2014 }],
      "DF20A": [{ label: "327cc 4-stroke", start: 2013 }],
      "DF40A": [{ label: "941cc Inline-3 4-stroke", start: 2010 }],
      "DF60A": [{ label: "941cc Inline-3 4-stroke", start: 2010 }],
      "DF90A": [{ label: "1502cc Inline-4 4-stroke", start: 2009 }],
      "DF140A": [{ label: "2044cc Inline-4 4-stroke", start: 2009 }],
      "DF200": [{ label: "2867cc Inline-4 4-stroke", start: 2014 }],
      "DF250": [{ label: "4028cc V6 4-stroke", start: 2003 }],
      "DF300AP": [{ label: "4028cc V6 4-stroke", start: 2014 }],
      "DF350A": [{ label: "4390cc V6 4-stroke", start: 2017 }],
    },
    "Honda Marine": {
      "BF2.3": [{ label: "57cc 4-stroke", start: 2003 }],
      "BF5": [{ label: "127cc 4-stroke", start: 2004 }],
      "BF8": [{ label: "197cc 4-stroke", start: 2008 }],
      "BF15": [{ label: "350cc 4-stroke", start: 2007 }],
      "BF30": [{ label: "552cc 4-stroke", start: 2009 }],
      "BF50": [{ label: "808cc 4-stroke", start: 2003 }],
      "BF100": [{ label: "1496cc Inline-4 4-stroke", start: 2018 }],
      "BF150": [{ label: "2354cc Inline-4 4-stroke", start: 2005 }],
      "BF250": [{ label: "3583cc V6 4-stroke", start: 2012 }],
    },
    "Mercury Marine": {
      "FourStroke 2.5": [{ label: "85cc 4-stroke", start: 2014 }],
      "FourStroke 6": [{ label: "139cc 4-stroke", start: 2014 }],
      "FourStroke 9.9": [{ label: "209cc 4-stroke", start: 2006 }],
      "FourStroke 25": [{ label: "526cc 4-stroke", start: 2014 }],
      "FourStroke 60": [{ label: "995cc Inline-4 4-stroke", start: 2006 }],
      "FourStroke 115": [{ label: "2064cc Inline-4 4-stroke", start: 2014 }],
      "FourStroke 150": [{ label: "3000cc Inline-4 4-stroke", start: 2011 }],
      "Verado 250": [{ label: "2600cc Inline-4 Supercharged", start: 2015 }],
      "Verado 300": [{ label: "4600cc V8 4-stroke", start: 2018 }],
      "Verado 400": [{ label: "4600cc V8 4-stroke", start: 2019 }],
    },
    Tohatsu: {
      "MFS2.5": [{ label: "85cc 4-stroke", start: 2014 }],
      "MFS6": [{ label: "139cc 4-stroke", start: 2014 }],
      "MFS9.9": [{ label: "209cc 4-stroke", start: 2010 }],
      "MFS25": [{ label: "498cc 4-stroke", start: 2014 }],
      "MFS40": [{ label: "747cc 4-stroke", start: 2011 }],
      "MFS60": [{ label: "996cc Inline-3 4-stroke", start: 2011 }],
      "MFS90": [{ label: "1832cc Inline-4 4-stroke", start: 2014 }],
      "MFS115": [{ label: "1832cc Inline-4 4-stroke", start: 2014 }],
    },
    "Volvo Penta": {
      "D3": [{ label: "2.4L Inline-5 Diesel", start: 2005 }],
      "D4": [{ label: "3.7L Inline-4 Diesel", start: 2006 }],
      "D6": [{ label: "5.5L Inline-6 Diesel", start: 2005 }],
      "D11": [{ label: "10.8L Inline-6 Diesel", start: 2006 }],
      "D13": [{ label: "12.8L Inline-6 Diesel", start: 2006 }],
      "V8-380": [{ label: "6.2L V8 Gasoline", start: 2014 }],
    },
    "Kawasaki Jet Ski": {
      "STX-15F": [{ label: "1498cc Inline-4 4-stroke", start: 2004 }],
      "Ultra 310": [{ label: "1498cc Supercharged Inline-4", start: 2014 }],
      "SX-R 1500": [{ label: "1498cc Inline-4 4-stroke", start: 2017 }],
    },
    "Sea-Doo": {
      "Spark": [{ label: "899cc Rotax ACE Inline-3", start: 2014 }],
      "GTI 130": [{ label: "1630cc Rotax 4-TEC", start: 2011 }],
      "GTR 230": [{ label: "1630cc Rotax 4-TEC Supercharged", start: 2017 }],
      "RXP-X 300": [{ label: "1630cc Rotax 4-TEC Supercharged", start: 2016 }],
      "RXT-X 300": [{ label: "1630cc Rotax 4-TEC Supercharged", start: 2016 }],
    },
  },

  heavy_equipment: {
    Caterpillar: {
      "320": [{ label: "7.0L Cat C7.1 Diesel (Tier 4)", start: 2017 }],
      "330": [{ label: "9.3L Cat C9.3B Diesel (Tier 4)", start: 2018 }],
      "950": [{ label: "9.3L Cat C9.3B Diesel", start: 2019 }],
      "966": [{ label: "9.3L Cat C9.3B Diesel", start: 2019 }],
      "D6": [{ label: "9.3L Cat C9.3B Diesel", start: 2019 }],
      "D8T": [{ label: "15.2L Cat C15 Diesel", start: 2012 }],
      "140 Motor Grader": [{ label: "7.0L Cat C7.1 Diesel", start: 2017 }],
      "789": [{ label: "Cat 3516B / C175-16 Diesel (mining)", start: 2009 }],
    },
    Komatsu: {
      "PC200": [{ label: "5.9L SAA6D107E-1 Diesel", start: 2008 }],
      "PC300": [{ label: "8.9L SAA6D114E-3 Diesel", start: 2008 }],
      "PC400": [{ label: "11.0L SAA6D125E-5 Diesel", start: 2010 }],
      "WA380": [{ label: "8.9L SAA6D114E-5 Diesel", start: 2014 }],
      "WA500": [{ label: "15.2L SAA6D140E-5 Diesel", start: 2014 }],
      "D65": [{ label: "8.9L SAA6D114E Diesel", start: 2013 }],
      "HD785": [{ label: "Komatsu SAA12V140E-3 Diesel (mining)", start: 2007 }],
    },
    Hitachi: {
      "ZX200": [{ label: "5.2L Isuzu AH-4HK1X Diesel", start: 2010 }],
      "ZX350": [{ label: "8.0L Isuzu AH-6HK1X Diesel", start: 2010 }],
      "ZX470": [{ label: "11.0L Isuzu AH-6WG1X Diesel", start: 2012 }],
      "ZW220": [{ label: "7.0L Cummins QSB6.7 Diesel", start: 2015 }],
    },
    Kobelco: {
      "SK210": [{ label: "5.2L Hino J05E-TM Diesel", start: 2010 }],
      "SK260": [{ label: "5.2L Hino J05E-TM Diesel", start: 2014 }],
      "SK350": [{ label: "8.0L Hino J08E-VM Diesel", start: 2010 }],
      "SK500": [{ label: "12.9L Hino E13C-XS Diesel", start: 2014 }],
    },
    "Volvo CE": {
      "EC220": [{ label: "7.7L Volvo D8J Diesel", code: "D8J", start: 2014 }],
      "EC300": [{ label: "8.0L Volvo D8K Diesel", code: "D8K", start: 2014 }],
      "EC480": [{ label: "13.0L Volvo D13J Diesel", code: "D13J", start: 2014 }],
      "L120": [{ label: "7.7L Volvo D8J Diesel", code: "D8J", start: 2014 }],
      "L150": [{ label: "13.0L Volvo D13J Diesel", code: "D13J", start: 2014 }],
      "A40G": [{ label: "13.0L Volvo D13 Diesel (hauler)", start: 2014 }],
    },
    JCB: {
      "3CX Backhoe": [
        { label: "4.4L JCB EcoMAX Diesel", start: 2013 },
        { label: "4.8L JCB Dieselmax", start: 2003, end: 2013 },
      ],
      "4CX Backhoe": [{ label: "4.4L JCB EcoMAX Diesel", start: 2013 }],
      "JS220": [{ label: "4.4L JCB EcoMAX Diesel", start: 2014 }],
      "Loadall 535": [{ label: "4.4L JCB EcoMAX Diesel", start: 2014 }],
    },
    "Hyundai CE": {
      "HX220": [{ label: "6.7L Cummins QSB6.7 Diesel", start: 2015 }],
      "HX300": [{ label: "8.9L Cummins QSL9 Diesel", start: 2015 }],
      "HL955": [{ label: "6.7L Cummins QSB6.7 Diesel", start: 2017 }],
      "HL975": [{ label: "8.9L Cummins QSL9 Diesel", start: 2017 }],
    },
    Sany: {
      "SY215": [{ label: "Isuzu / Cummins 5.9L Diesel", start: 2015 }],
      "SY365": [{ label: "Mitsubishi 8.2L Diesel", start: 2015 }],
      "SY500": [{ label: "Cummins QSM11 11.0L Diesel", start: 2015 }],
    },
    XCMG: {
      "XE215": [{ label: "Cummins QSB6.7 6.7L Diesel", start: 2014 }],
      "XE370": [{ label: "Cummins QSL9 8.9L Diesel", start: 2014 }],
      "ZL50G Loader": [{ label: "Weichai WD10G220E23 9.7L Diesel", start: 2013 }],
    },
    Kubota: {
      "KX040": [{ label: "1.8L Kubota V2403 Diesel", code: "V2403", start: 2014 }],
      "KX080": [{ label: "3.8L Kubota V3800 Diesel", code: "V3800", start: 2014 }],
      "M7060": [{ label: "3.8L Kubota V3800 Diesel", code: "V3800", start: 2015 }],
      "L4060": [{ label: "2.4L Kubota V2403 Diesel", code: "V2403", start: 2014 }],
    },
    Doosan: {
      "DX140": [{ label: "3.8L Doosan D34 Diesel", start: 2013 }],
      "DX225": [{ label: "5.9L Doosan DL06 Diesel", start: 2013 }],
      "DX300": [{ label: "7.6L Doosan DL08 Diesel", start: 2013 }],
      "DX480": [{ label: "11.1L Doosan DV11 Diesel", start: 2013 }],
    },
  },
};

/** No generic engine fallback. We only ship factual, model-year-verified
 *  engines (sourced from manufacturer spec sheets for the Asia/PH market).
 *  When a model isn't covered yet, the picker switches to a free-text input
 *  so the user can enter the real engine themselves — never a fabricated
 *  "1.5L Gasoline"-style generic. Coverage is expanded by adding entries
 *  to VEHICLE_ENGINES above. */

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
 *  model, returns [] so the UI switches to a free-text input rather than
 *  surfacing fabricated generic engines. */
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
    // No curated factual data for this model yet — return empty so the UI
    // switches to a free-text input instead of showing fake generic options.
    return [];
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
