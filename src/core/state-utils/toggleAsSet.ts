/**
 * Toggle a value in an array as a set.
 */
export function toggleAsSet<T>(items: T[], value: T, use: boolean) {
  const set = new Set(items ?? []);
  if (set.has(value) && !use) {
    set.delete(value);
  } else if (!set.has(value) && use) {
    set.add(value);
  }
  return Array.from(set);
}
