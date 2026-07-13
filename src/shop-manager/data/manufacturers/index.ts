
import { Manufacturer } from '@/types/affiliate';
import { automotiveManufacturers } from './automotive';
import { heavyDutyManufacturers } from './heavy-duty';
import { equipmentManufacturers } from './equipment';
import { marineManufacturers } from './marine';
import { atvUtvManufacturers } from './atv-utv';
import { motorcycleManufacturers } from './motorcycle';

/**
 * Combined manufacturers data from all categories
 */
export const manufacturers: Manufacturer[] = [
  ...automotiveManufacturers,
  ...heavyDutyManufacturers,
  ...equipmentManufacturers,
  ...marineManufacturers,
  ...atvUtvManufacturers,
  ...motorcycleManufacturers
];

export * from './productGenerator';
