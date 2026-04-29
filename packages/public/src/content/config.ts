import { defineCollection, z } from 'astro:content';

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    metaDescription: z.string().optional(),
    hero: z.object({
      heading: z.string(),
      subheading: z.string().optional(),
      ctaText: z.string().optional(),
      ctaLink: z.string().optional(),
      backgroundImage: z.string().optional(),
    }).optional(),
    services: z.array(z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string().optional(),
      link: z.string().optional(),
    })).optional(),
  }),
});

const testimonials = defineCollection({
  type: 'content',
  schema: z.object({
    authorName: z.string(),
    authorDescription: z.string(),
    displayOrder: z.number().default(99),
    published: z.boolean().default(true),
  }),
});

const team = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    title: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    photo: z.string().optional(),
    displayOrder: z.number().default(99),
    published: z.boolean().default(true),
  }),
});

export const collections = { pages, testimonials, team };
