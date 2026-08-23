import type { VehicleCategory } from '@/lib/domain/types';

/** Display names for the category vocabulary, shared across search and listing. */
export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  CITY: 'City car',
  ECONOMY: 'Economy',
  COMPACT: 'Compact',
  SEDAN: 'Saloon',
  ESTATE: 'Estate',
  SUV: 'SUV',
  VAN: 'Van',
  PICKUP: 'Pickup',
  LUXURY: 'Luxury',
  SPORTS: 'Sports',
  CONVERTIBLE: 'Convertible',
  ELECTRIC: 'Electric',
};

export const PAINT_OPTIONS = [
  'Alpine White',
  'Obsidian Black',
  'Moonstone Grey',
  'Titanium Silver',
  'Signal Red',
  'Deep Blue',
  'Cedar Green',
];
