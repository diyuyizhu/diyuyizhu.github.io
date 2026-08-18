import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 五个分类板块，对应博客导航
export const CATEGORIES = ['技术栈', '网络安全', '专业学习', '项目经验', 'Dreams'] as const;
export type Category = (typeof CATEGORIES)[number];

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // 单值分类，对应五个板块
    categories: z.enum(CATEGORIES),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
  }),
});

export const collections = { blog };
