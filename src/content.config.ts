import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const characters = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/characters' }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string(),
        catalogue: z.string().regex(/^N°00[1-8]$/),
        archetype: z.string(),
        role: z.string(),
        coreQuestion: z.string(),
        colourName: z.string(),
        colourHex: z.string().regex(/^#[0-9A-F]{6}$/),
        aesthetic: z.string(),
        home: z.string(),
        accessory: z.string().optional(),
        companion: z.string().optional(),
        scale: z.string().optional(),
        tagline: z.string(),
        portrait: image(),
        order: z.number().int().min(1).max(8),
        status: z.enum(['live', 'coming-soon']),
        artMode: z.enum(['poster', 'plate']),
        fieldHex: z.string().regex(/^#[0-9A-F]{6}$/),
        microCopy: z.array(z.string()).default([]),
        cutout: image().optional(),
        duotone: image().optional(),
      })
      // A poster/plate promotion should mean supplying the matching art, not
      // just flipping artMode — without this, a poster character missing a
      // cutout silently falls back to the plate branch instead of failing
      // the build.
      .refine(
        (data) => {
          if (data.artMode === 'poster') return Boolean(data.cutout) && !data.duotone;
          return Boolean(data.duotone) && !data.cutout;
        },
        {
          // zod v4's `.refine` only resolves a dynamic message via an
          // `error` function on the params object (a bare function as the
          // second argument is not recognised) — the offending record comes
          // through as `issue.input`, not as a second callback argument.
          error: (issue) => {
            const data = issue.input as {
              name: string;
              artMode: 'poster' | 'plate';
              cutout?: unknown;
              duotone?: unknown;
            };
            if (data.artMode === 'poster') {
              return `${data.name} is artMode "poster" but ${
                !data.cutout ? 'has no cutout image' : 'still has a duotone image'
              }. Poster characters need a cutout and must not have a duotone.`;
            }
            return `${data.name} is artMode "plate" but ${
              !data.duotone ? 'has no duotone image' : 'still has a cutout image'
            }. Plate characters need a duotone and must not have a cutout.`;
          },
        },
      ),
});

export const collections = { characters };
