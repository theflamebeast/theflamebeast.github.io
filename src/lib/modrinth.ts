export const MODRINTH_FALLBACK = { downloads: 1831, asOf: '2026-11-10' } as const;

export async function getModrinthDownloads(
  slug: string,
  fetchImpl: typeof fetch = fetch,
  warn: (msg: string) => void = console.warn,
): Promise<{ downloads: number; live: boolean }> {
  const fallback = (why: string) => {
    warn(
      `Modrinth download count for "${slug}" unavailable (${why}); using ${MODRINTH_FALLBACK.downloads} from ${MODRINTH_FALLBACK.asOf}`,
    );
    return { downloads: MODRINTH_FALLBACK.downloads, live: false };
  };

  try {
    const res = await fetchImpl(`https://api.modrinth.com/v2/project/${slug}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return fallback(`HTTP ${res.status}`);
    const body: unknown = await res.json();
    const downloads = (body as { downloads?: unknown }).downloads;
    if (typeof downloads !== 'number' || !Number.isFinite(downloads)) return fallback('no numeric downloads field');
    return { downloads, live: true };
  } catch (err) {
    return fallback(err instanceof Error ? err.message : String(err));
  }
}
