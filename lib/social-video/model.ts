import { z } from "zod";

export const socialVideoPlatformSchema = z.enum(["tiktok", "youtube", "instagram", "native"]);
export const socialVideoStatusSchema = z.enum(["draft", "review", "published", "archived", "unavailable"]);
export const socialVideoContentTypeSchema = z.enum(["vehicle", "carcheck", "review", "explanation", "delivery", "showroom", "news", "short"]);
export const socialVideoSourceStateSchema = z.enum(["unchecked", "available", "unavailable", "unknown"]);

const socialVideoAnalyticsSchema = z.object({
  impressions: z.number().int().nonnegative().default(0),
  playClicks: z.number().int().nonnegative().default(0),
  vehicleClicks: z.number().int().nonnegative().default(0),
  carCheckClicks: z.number().int().nonnegative().default(0),
  testDriveClicks: z.number().int().nonnegative().default(0),
  contactClicks: z.number().int().nonnegative().default(0),
}).default({ impressions: 0, playClicks: 0, vehicleClicks: 0, carCheckClicks: 0, testDriveClicks: 0, contactClicks: 0 });

export const socialVideoSchema = z.object({
  id: z.string().min(1),
  platform: socialVideoPlatformSchema,
  sourceUrl: z.string().url(),
  externalId: z.string().optional(),
  title: z.string().min(1).max(180),
  caption: z.string().max(1000).optional(),
  description: z.string().max(2000).optional(),
  thumbnailUrl: z.string().url().optional(),
  embedUrl: z.string().url().optional(),
  status: socialVideoStatusSchema,
  sourceState: socialVideoSourceStateSchema.default("unchecked"),
  sourceCheckedAt: z.string().datetime().optional(),
  contentType: socialVideoContentTypeSchema,
  vehicleIds: z.array(z.string()).default([]),
  carCheckId: z.string().optional(),
  vvVerifiedId: z.string().optional(),
  brand: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
  tags: z.array(z.string().max(60)).max(30).default([]),
  featured: z.boolean().default(false),
  placements: z.object({
    homepage: z.boolean().default(false),
    inventory: z.boolean().default(false),
    vehicleDetail: z.boolean().default(false),
    carCheck: z.boolean().default(false),
    knowledge: z.boolean().default(false),
  }),
  aspectRatio: z.enum(["9:16", "16:9"]).default("9:16"),
  analytics: socialVideoAnalyticsSchema,
  socialPublishedAt: z.string().datetime().optional(),
  publishedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export type SocialVideo = z.infer<typeof socialVideoSchema>;
export type SocialVideoPlatform = z.infer<typeof socialVideoPlatformSchema>;
export type SocialVideoSourceState = z.infer<typeof socialVideoSourceStateSchema>;

export const socialVideoCreateSchema = z.object({
  sourceUrl: z.string().url(),
  title: z.string().min(1).max(180).optional(),
  contentType: socialVideoContentTypeSchema.default("short"),
  vehicleIds: z.array(z.string()).max(20).default([]),
  carCheckId: z.string().optional(),
  vvVerifiedId: z.string().optional(),
  brand: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
  tags: z.array(z.string().max(60)).max(30).default([]),
  featured: z.boolean().default(false),
  placements: z.object({
    homepage: z.boolean().default(false),
    inventory: z.boolean().default(false),
    vehicleDetail: z.boolean().default(false),
    carCheck: z.boolean().default(false),
    knowledge: z.boolean().default(false),
  }).default({ homepage: false, inventory: false, vehicleDetail: false, carCheck: false, knowledge: false }),
});

export const publicSocialVideoSchema = socialVideoSchema.pick({
  id: true,
  platform: true,
  sourceUrl: true,
  externalId: true,
  title: true,
  caption: true,
  description: true,
  thumbnailUrl: true,
  embedUrl: true,
  contentType: true,
  vehicleIds: true,
  carCheckId: true,
  vvVerifiedId: true,
  brand: true,
  model: true,
  tags: true,
  featured: true,
  placements: true,
  aspectRatio: true,
  socialPublishedAt: true,
  publishedAt: true,
});

export type PublicSocialVideo = z.infer<typeof publicSocialVideoSchema>;
