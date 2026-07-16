import { z } from 'zod';

export const SourceConfigSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  enabled: z.boolean().default(true),
});

export const WatcherConfigSchema = z.object({
  debounceMs: z.number().int().positive().default(1500),
  ignored: z.array(z.string()).default([]),
});

export const QueueConfigSchema = z.object({
  concurrency: z.number().int().positive(),
  maxRetries: z.number().int().nonnegative(),
});

export const QueuesConfigSchema = z.object({
  pdf: QueueConfigSchema,
  image: QueueConfigSchema,
});

export const OcrConfigSchema = z.object({
  lang: z.string().default('eng'),
  binaryPath: z.string().nullable().default(null),
});

export const ParserConfigSchema = z.object({
  type: z.literal('mock').default('mock'),
});

export const CircuitBreakerConfigSchema = z.object({
  failureThreshold: z.number().int().positive(),
  resetMs: z.number().int().positive(),
});

export const AccountingConfigSchema = z.object({
  baseUrl: z.string().url(),
  authTokenEnv: z.string().min(1),
  timeoutMs: z.number().int().positive(),
  circuitBreaker: CircuitBreakerConfigSchema,
});

export const MetricsConfigSchema = z.object({
  endpoint: z.string().url(),
  authTokenEnv: z.string().min(1),
  flushIntervalMs: z.number().int().positive(),
});

export const StorageConfigSchema = z.object({
  processedDir: z.string().min(1),
  failedDir: z.string().min(1),
});

export const AppConfigSchema = z.object({
  sources: z.array(SourceConfigSchema),
  watcher: WatcherConfigSchema,
  queues: QueuesConfigSchema,
  ocr: OcrConfigSchema,
  parser: ParserConfigSchema,
  accounting: AccountingConfigSchema,
  metrics: MetricsConfigSchema,
  storage: StorageConfigSchema,
});

export type SourceConfig = z.infer<typeof SourceConfigSchema>;
export type WatcherConfig = z.infer<typeof WatcherConfigSchema>;
export type QueueConfig = z.infer<typeof QueueConfigSchema>;
export type QueuesConfig = z.infer<typeof QueuesConfigSchema>;
export type OcrConfig = z.infer<typeof OcrConfigSchema>;
export type ParserConfig = z.infer<typeof ParserConfigSchema>;
export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;
export type AccountingConfig = z.infer<typeof AccountingConfigSchema>;
export type MetricsConfig = z.infer<typeof MetricsConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
