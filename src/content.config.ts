import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const characters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/characters' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      catalogue: z.string().regex(/^N°00[1-8]$/),
      archetype: z.string(),
      role: z.string(),
      coreQuestion: z.string(),
      colourName: z.string(),
      colourHex: z.string().regex(/^#[0-9A-F]{6}$/),
      aesthetic: z.string(),
      home: z.string(),
      tagline: z.string(),
      portrait: image(),
      order: z.number().int().min(1).max(8),
      status: z.enum(['live', 'coming-soon']),
    }),
});

export const collections = { characters };
