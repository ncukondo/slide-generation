import { z } from 'zod';

export const configSchema = z.object({
  templates: z
    .object({
      builtin: z.string().default('./templates'),
      custom: z.string().optional(),
    })
    .default({}),

  icons: z
    .object({
      registry: z.string().default('./icons/registry.yaml'),
      fetched: z.string().default('./icons/fetched'),
    })
    .default({}),

  references: z
    .object({
      enabled: z.boolean().default(true),
      connection: z
        .object({
          type: z.literal('cli').default('cli'),
          command: z.string().default('ref'),
        })
        .default({}),
      format: z
        .object({
          locale: z.string().default('ja-JP'),
          authorSep: z.string().default(', '),
          identifierSep: z.string().default('; '),
          maxAuthors: z.number().default(2),
          etAl: z.string().default('et al.'),
          etAlJa: z.string().default('ほか'),
        })
        .default({}),
    })
    .default({}),

  output: z
    .object({
      theme: z.string().default('default'),
      inlineStyles: z.boolean().default(false),
    })
    .default({}),
});

export type Config = z.infer<typeof configSchema>;
