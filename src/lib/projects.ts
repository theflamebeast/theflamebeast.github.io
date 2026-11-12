import { getCollection, type CollectionEntry } from 'astro:content';
import { getModrinthDownloads } from './modrinth';

export type Project = CollectionEntry<'projects'>;

interface Projects {
  featured: Project[];
  compact: Project[];
  downloads: Record<string, number>;
}

async function load(): Promise<Projects> {
  const all = (await getCollection('projects')).sort((a, b) => a.data.order - b.data.order);
  const downloads = Object.fromEntries(
    await Promise.all(
      all
        .filter((p) => p.data.modrinthSlug)
        .map(async (p) => [p.id, (await getModrinthDownloads(p.data.modrinthSlug!)).downloads] as const),
    ),
  );
  return {
    featured: all.filter((p) => p.data.tier === 'featured'),
    compact: all.filter((p) => p.data.tier === 'compact'),
    downloads,
  };
}

let cached: Promise<Projects> | null = null;

// Every page renders the header's picker, so without the cache one build would ask Modrinth once
// per page. In dev the cache would hide edits to the collection, so it is skipped there.
export function loadProjects(): Promise<Projects> {
  if (import.meta.env.DEV) return load();
  return (cached ??= load());
}
