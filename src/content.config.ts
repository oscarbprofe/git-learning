import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const unitsCollection = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/units' }),
  schema: z.object({
    order: z.number().int().positive(),
    slug: z.string(),
    title: z.string(),
    description: z.string(),
    points: z.number().int().positive(),
  }),
});

const optionSchema = z.object({
  key: z.string().regex(/^[a-d]$/),
  label: z.string(),
});

const exerciseSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  scenario: z.string().optional(),
  accept: z.array(z.string()).min(1),
  hint: z.string().optional(),
  expectedHint: z.string().optional(),
  value: z.number().positive(),
});

const quizSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(optionSchema).length(4),
  correct: z.string().regex(/^[a-d]$/),
  explanation: z.string(),
  value: z.number().positive(),
});

const activitiesCollection = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/activities' }),
  schema: z.object({
    unit: z.string(),
    exercises: z.array(exerciseSchema),
    quiz: z.array(quizSchema),
  }),
});

export const collections = {
  units: unitsCollection,
  activities: activitiesCollection,
};
