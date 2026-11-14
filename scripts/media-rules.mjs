/**
 * Media that must never reach the public site, by where it came from.
 * @param {string} path
 * @returns {string | null} why the file is refused, or null when it is allowed
 */
export function isForbiddenSource(path) {
  const segments = path.split(/[\\/]+/);
  const name = segments.at(-1) ?? '';
  const folders = segments.slice(0, -1);

  if (folders.includes('Whisk') || name.startsWith('Whisk')) return 'AI-generated image (Whisk), not real footage';
  if (folders.some((s) => s.includes('Gemini'))) return 'AI-generated image (Gemini), not real footage';
  if (folders.includes('Technical')) return 'admin, console or DNS screenshot (Technical folder)';
  if (/^admin-.*\.[a-z0-9]+$/i.test(name)) return 'admin screen';
  if (/^auth\.[a-z0-9]+$/i.test(name)) return 'login screen';
  return null;
}
