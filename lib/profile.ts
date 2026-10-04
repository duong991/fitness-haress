/**
 * Client-safe profile helpers.
 *
 * Kept free of `fs`/`path` so client components can import them without pulling
 * the JSON store into the browser bundle. Server code that needs the store
 * imports from `lib/data`.
 */
import type { Profile } from './data';

/**
 * A profile is usable only once its real body parameters and energy targets
 * exist. Empty/zero values mean the store is still blank — no mock numbers are
 * substituted anywhere in the app.
 */
export function isProfileReady(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.name?.trim() &&
      profile.age > 0 &&
      profile.height_cm > 0 &&
      profile.current_weight_kg > 0 &&
      profile.target_calories > 0,
  );
}
