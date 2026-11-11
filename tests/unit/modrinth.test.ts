import { describe, expect, it } from 'vitest';
import { getModrinthDownloads } from '../../src/lib/modrinth';

const realShape = {
  id: 'AbCdEf12',
  slug: 'server-insight',
  title: 'Server Insight',
  downloads: 2000,
  followers: 6,
  published: '2026-01-20T22:32:14.264541Z',
  updated: '2026-08-31T19:07:08.408312Z',
  game_versions: ['1.21.11', '26.2'],
  loaders: ['fabric'],
};

function fakeFetch(respond: () => Response | Promise<Response>) {
  const urls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    return respond();
  }) as typeof fetch;
  return { impl, urls };
}

function warnSpy() {
  const messages: string[] = [];
  return { warn: (m: string) => void messages.push(m), messages };
}

describe('getModrinthDownloads', () => {
  it('returns live downloads from a 200 response, from the project endpoint, without warning', async () => {
    const f = fakeFetch(() => new Response(JSON.stringify(realShape), { status: 200 }));
    const w = warnSpy();
    expect(await getModrinthDownloads('server-insight', f.impl, w.warn)).toEqual({ downloads: 2000, live: true });
    expect(f.urls).toEqual(['https://api.modrinth.com/v2/project/server-insight']);
    expect(w.messages).toEqual([]);
  });

  it('falls back and warns on HTTP 500', async () => {
    const f = fakeFetch(() => new Response('oops', { status: 500 }));
    const w = warnSpy();
    expect(await getModrinthDownloads('server-insight', f.impl, w.warn)).toEqual({ downloads: 1831, live: false });
    expect(w.messages).toHaveLength(1);
  });

  it('falls back and warns when fetch throws', async () => {
    const f = fakeFetch(() => {
      throw new TypeError('fetch failed');
    });
    const w = warnSpy();
    expect(await getModrinthDownloads('server-insight', f.impl, w.warn)).toEqual({ downloads: 1831, live: false });
    expect(w.messages).toHaveLength(1);
  });

  it('falls back and warns when downloads is not a number', async () => {
    const f = fakeFetch(() => new Response(JSON.stringify({ ...realShape, downloads: '2000' }), { status: 200 }));
    const w = warnSpy();
    expect(await getModrinthDownloads('server-insight', f.impl, w.warn)).toEqual({ downloads: 1831, live: false });
    expect(w.messages).toHaveLength(1);
  });
});
