import { findDish } from '@grill/shared';

/**
 * The dish photos the app uses (apps/app/assets/photos), for the menu manager and the social studio. Whatever is
 * there at build time is picked up; a dish without a photo gets a warm gradient instead.
 */
const FILES = import.meta.glob(['../../app/assets/photos/*.jpg', '!../../app/assets/photos/hero-*.jpg'], { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const BY_NAME = new Map(Object.entries(FILES).map(([path, url]) => [path.split('/').pop()!.replace(/\.jpg$/, ''), url]));

export const photoUrl = (name: string): string | null => BY_NAME.get(name) ?? null;

export const dishPhoto = (dishId: string): string | null => {
  const d = findDish(dishId);
  return d ? photoUrl(d.photo) : null;
};
