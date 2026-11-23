import type { APIRoute } from 'astro';
import { SITE } from '../data/site';
import { loadProjects } from '../lib/projects';

export const GET: APIRoute = async () => {
  const { featured } = await loadProjects();
  const urls = [`${SITE.url}/`, ...featured.map((p) => `${SITE.url}/work/${p.id}/`)];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
