import type { Dish } from '@grill/shared';

import type { Diet } from './state/demo';

/** Whether a dish suits the guest's diet: nothing they avoid, halal or vegetarian if they asked, not spicy if mild. */
export function fits(d: Dish, diet: Diet): boolean {
  if (diet.avoid.some((a) => d.allergens.includes(a))) return false;
  if (diet.vega && !d.tags.includes('vega') && d.cat !== 'drinks' && d.cat !== 'sauzen') return false;
  if (diet.halal && !d.tags.includes('halal') && !d.tags.includes('vega') && d.cat !== 'drinks' && d.cat !== 'sauzen' && d.cat !== 'desserts') return false;
  if (diet.mild && d.tags.includes('pittig')) return false;
  return true;
}
