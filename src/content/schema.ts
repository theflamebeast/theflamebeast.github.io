import { z } from 'astro/zod';

export function makeProjectSchema(image: () => z.ZodType) {
  return z
    .object({
      title: z.string().min(1),
      tier: z.enum(['featured', 'compact']),
      order: z.number().int(),
      summary: z.string().min(1).max(140),
      role: z.string().min(1),
      start: z.string().min(1),
      end: z.string().min(1).nullable(),
      status: z.enum(['active', 'hiatus', 'released']),
      stack: z.array(z.string().min(1)).min(1),
      links: z.array(z.object({ label: z.string().min(1), href: z.url() })).default([]),
      liveUrl: z.url().optional(),
      cover: image().optional(),
      gallery: z.array(z.object({ src: image(), alt: z.string().min(1) })).default([]),
      video: z
        .object({ mp4: z.string().min(1), webm: z.string().min(1), poster: image(), caption: z.string().min(1) })
        .optional(),
      modrinthSlug: z.string().min(1).optional(),
    })
    .refine((p) => p.tier !== 'featured' || p.cover !== undefined, {
      message: 'featured projects need a cover',
      path: ['cover'],
    });
}
