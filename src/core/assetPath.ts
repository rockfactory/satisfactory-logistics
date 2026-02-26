const base = import.meta.env.BASE_URL.replace(/\/+$/, '');

/**
 * Prepends the Vite base URL to an absolute asset path.
 * Handles both root (`/`) and sub-path (`/satisfactory-logistics/`) deployments.
 */
export function assetPath(path: string): string {
  if (!path || !base) return path;
  return `${base}${path}`;
}
