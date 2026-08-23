/**
 * Maps an owner's free-text paint name to a hex value the 2D and 3D renders
 * can both use. Owners type "Mythos Black" or "Gelato White", not hex codes.
 */
const PAINT_TABLE: [string, string][] = [
  ['white', '#e8ecf4'],
  ['black', '#22262f'],
  ['obsidian', '#1c2029'],
  ['grey', '#8b93a4'],
  ['gray', '#8b93a4'],
  ['silver', '#c2c8d4'],
  ['titanium', '#b9c0cc'],
  ['red', '#e0483c'],
  ['chili', '#d8402f'],
  ['blue', '#4a7fe0'],
  ['navy', '#2f4f8f'],
  ['green', '#3fa878'],
  ['sarge', '#6f7a52'],
  ['yellow', '#e8be3f'],
  ['orange', '#e2853c'],
  ['brown', '#9a7150'],
  ['beige', '#cbb99a'],
  ['pearl', '#eef1f7'],
  ['steel', '#7d8695'],
];

export function paintHex(colour: string): string {
  const name = colour.toLowerCase();
  for (const [key, hex] of PAINT_TABLE) {
    if (name.includes(key)) return hex;
  }
  return '#ffa62b';
}
