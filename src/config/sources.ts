import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppConfigSchema, type AppConfig } from './schema.js';
import { ConfigError } from '../lib/errors.js';

export function loadConfig(configPath: string = './config.json'): AppConfig {
  const absolute = resolve(configPath);
  let raw: string;
  try {
    raw = readFileSync(absolute, 'utf-8');
  } catch (err) {
    throw new ConfigError(`Cannot read config file at ${absolute}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError(`Invalid JSON in config file: ${(err as Error).message}`);
  }

  const result = AppConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ConfigError(`Invalid config.json: ${issues}`);
  }

  return result.data;
}