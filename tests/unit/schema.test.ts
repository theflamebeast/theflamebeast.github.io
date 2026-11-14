import { describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { makeProjectSchema } from '../../src/content/schema';

const schema = makeProjectSchema(() => z.string());

const featured = {
  title: 'Stashout',
  tier: 'featured',
  order: 1,
  summary: 'Server-authoritative multiplayer extraction shooter in the browser.',
  role: 'Solo developer',
  start: 'Jul 2026',
  end: null,
  stack: ['TypeScript', 'PixiJS'],
  cover: { src: 'cover.webp', alt: 'The Stashout lobby' },
};

const compact = {
  title: 'Server Insight',
  tier: 'compact',
  order: 3,
  summary: 'Client-side Fabric mod.',
  role: 'Solo developer',
  start: 'Jan 2026',
  end: null,
  stack: ['Java', 'Fabric'],
};

describe('project schema', () => {
  it('accepts a valid featured project and defaults links and gallery to empty', () => {
    const r = schema.safeParse(featured);
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({ links: [], gallery: [] });
  });

  it('rejects a featured project without cover', () => {
    const { cover: _, ...noCover } = featured;
    expect(schema.safeParse(noCover).success).toBe(false);
  });

  it('accepts a compact project without cover', () => {
    expect(schema.safeParse(compact).success).toBe(true);
  });

  it('rejects a project with an empty stack', () => {
    expect(schema.safeParse({ ...featured, stack: [] }).success).toBe(false);
  });

  it('accepts a 140-char summary and rejects a 141-char one', () => {
    expect(schema.safeParse({ ...featured, summary: 'a'.repeat(140) }).success).toBe(true);
    expect(schema.safeParse({ ...featured, summary: 'a'.repeat(141) }).success).toBe(false);
  });

  it('accepts a project without liveUrl and rejects a liveUrl that is not a URL', () => {
    expect(schema.safeParse(featured).success).toBe(true);
    expect(schema.safeParse({ ...featured, liveUrl: 'stashout' }).success).toBe(false);
  });

  it('rejects a gallery image with empty alt', () => {
    const r = schema.safeParse({ ...featured, gallery: [{ src: 'a.webp', alt: '' }] });
    expect(r.success).toBe(false);
  });

  it('keeps a project kind label instead of stripping it', () => {
    const r = schema.safeParse({ ...compact, kind: 'Fabric mod' });
    expect(r.success && r.data.kind).toBe('Fabric mod');
  });

  it('rejects a cover without alt text', () => {
    expect(schema.safeParse({ ...featured, cover: { src: 'cover.webp', alt: '' } }).success).toBe(false);
  });

  it('keeps a known diagram and rejects an unknown one', () => {
    const r = schema.safeParse({ ...featured, diagram: 'netcode' });
    expect(r.success && r.data.diagram).toBe('netcode');
    expect(schema.safeParse({ ...featured, diagram: 'flowchart' }).success).toBe(false);
  });

  it('rejects an unknown tier', () => {
    expect(schema.safeParse({ ...featured, tier: 'hero' }).success).toBe(false);
  });
});
