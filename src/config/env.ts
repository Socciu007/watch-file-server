import { z } from 'zod';
import { ConfigError } from '../lib/errors.js';

const EnvSchema = z.object({
  ACCOUNTING_API_TOKEN: z.string().min(1),
  METRICS_PUSH_TOKEN: z.string().min(1),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  WORKER_ROLE: z.enum(['all', 'pdf-only', 'image-only']).default('all'),
  NODE_ENV: z.string().default('development'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new ConfigError(`Invalid environment variables: ${missing}`);
  }
  return result.data;
}