/**
 * Modules supported by the standalone 365 Motor Sales shop manager.
 *
 * Keep this list deliberately small. The cloned database may still contain
 * All Business 365 module rows, but those rows must not make unrelated
 * products visible in this application.
 */
export const SUPPORTED_MODULE_SLUGS = [
  'automotive',
  'repair-shop',
  'marine',
  'marine-services',
  'fuel_delivery',
  'fuel-delivery',
  'welding',
] as const;

const supportedModules = new Set<string>(SUPPORTED_MODULE_SLUGS);

export const isSupportedModule = (slug: string | null | undefined): boolean =>
  Boolean(slug && supportedModules.has(slug));

