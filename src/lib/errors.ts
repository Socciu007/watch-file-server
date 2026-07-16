export class TransientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'TransientError';
  }
}

export class PermanentError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PermanentError';
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
