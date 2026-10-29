/**
 * Vuurpunten: Grill-Point's own savings programme (on grill-point.nl: a welcome discount, points, VIP invitations and a
 * birthday gift), shown as a flame that grows with every order. The levels, numbers and rewards are the demo's.
 */

export type Level = { id: 'vonk' | 'gloed' | 'vuur' | 'inferno'; name: string; from: number; perk: string };

export const LEVELS: Level[] = [
  { id: 'vonk', name: 'Vonk', from: 0, perk: 'Welkomstkorting op je eerste bestelling' },
  { id: 'gloed', name: 'Gloed', from: 150, perk: 'Gratis saus bij elke bestelling' },
  { id: 'vuur', name: 'Vuur', from: 400, perk: 'Uitnodigingen voor proefavonden (VIP)' },
  { id: 'inferno', name: 'Inferno', from: 900, perk: 'Mix Grill voor twee op je verjaardag' },
];

export type Reward = { id: string; name: string; cost: number; dish?: string };

export const REWARDS: Reward[] = [
  { id: 'saus', name: 'Een saus naar keuze', cost: 20 },
  { id: 'friet', name: 'Friet', cost: 60, dish: 'friet' },
  { id: 'baklava', name: 'Baklava, 4 stuks', cost: 90, dish: 'baklava' },
  { id: 'lahmacun', name: 'Lahmacun met döner', cost: 140, dish: 'lahmacun-doner' },
  { id: 'kapsalon', name: 'Kapsalon klein', cost: 200, dish: 'kapsalon' },
];

/** One point per euro. */
export const pointsFor = (total: number) => Math.floor(total);

export function levelOf(points: number): { level: Level; next: Level | null; progress: number } {
  let i = LEVELS.length - 1;
  while (i > 0 && points < LEVELS[i].from) i--;
  const level = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const progress = next ? (points - level.from) / (next.from - level.from) : 1;
  return { level, next, progress };
}
