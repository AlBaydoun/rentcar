/**
 * The five silhouettes the renderers know how to draw.
 *
 * Shared by the 3D model, the 2D card silhouette and the server components
 * that pick one, so it cannot live inside a 'use client' module.
 */
export const BODY_STYLES = ['CITY', 'HATCH', 'SUV', 'SEDAN', 'SPORTS', 'VAN'] as const;
export type BodyStyle = (typeof BODY_STYLES)[number];

export function bodyStyleForCategory(category: string): BodyStyle {
  switch (category) {
    case 'SUV':
    case 'PICKUP':
      return 'SUV';
    case 'VAN':
      return 'VAN';
    case 'SPORTS':
    case 'CONVERTIBLE':
      return 'SPORTS';
    case 'SEDAN':
    case 'ESTATE':
    case 'LUXURY':
      return 'SEDAN';
    case 'CITY':
      return 'CITY';
    default:
      return 'HATCH';
  }
}
