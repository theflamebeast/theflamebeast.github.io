import { SITE } from '../data/site';

/** True for a link that leaves the site: an http(s) address on another origin. */
export function isExternal(href: string): boolean {
  if (!/^https?:\/\//i.test(href)) return false;
  return new URL(href).origin !== new URL(SITE.url).origin;
}
