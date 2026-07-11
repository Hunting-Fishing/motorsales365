export type AutomotiveRegion = 'asia-ph' | 'asia' | 'europe' | 'north-america';

export const DEFAULT_REGION: AutomotiveRegion = 'asia-ph';

export const AUTOMOTIVE_REGIONS: AutomotiveRegion[] = [
  'asia-ph',
  'asia',
  'europe',
  'north-america',
];

export interface RegionMeta {
  label: string;
  flag: string;
  country: string;
  agencies: string[];
  emissions: string;
  obdMandate: string;
}

export const REGION_META: Record<AutomotiveRegion, RegionMeta> = {
  'asia-ph': {
    label: 'Asia · Philippines',
    flag: '🇵🇭',
    country: 'Philippines',
    agencies: ['DTI-FTEB', 'LTO', 'Manufacturer PH'],
    emissions: 'Euro 4 (since 2016)',
    obdMandate: 'No nationwide mandate; OBD2 present on most post-2008 ICE vehicles via OEM',
  },
  asia: {
    label: 'Asia (other)',
    flag: '🌏',
    country: 'Asia (regional)',
    agencies: ['Manufacturer / National agencies'],
    emissions: 'Varies (Euro 3–6 / JC08 / China 6)',
    obdMandate: 'Varies by country; widely adopted post-2010',
  },
  europe: {
    label: 'Europe',
    flag: '🇪🇺',
    country: 'European Union',
    agencies: ['RAPEX / Safety Gate', 'Manufacturer EU'],
    emissions: 'Euro 6d',
    obdMandate: 'EOBD: petrol 2001, diesel 2004',
  },
  'north-america': {
    label: 'North America',
    flag: '🇺🇸',
    country: 'United States / Canada',
    agencies: ['NHTSA', 'Transport Canada', 'Manufacturer NA'],
    emissions: 'EPA Tier 3 / CARB LEV III',
    obdMandate: 'OBD-II mandatory since 1996',
  },
};

export function regionLabel(region: AutomotiveRegion): string {
  return REGION_META[region]?.label ?? region;
}
