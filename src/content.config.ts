import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { makeProjectSchema } from './content/schema';

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: ({ image }) => makeProjectSchema(image),
});

export const collections = { projects };
