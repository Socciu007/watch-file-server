import axios, { type AxiosInstance } from 'axios';

/**
 * Mail notification options.
 */
export interface MailOptions {
  subject: string;
  text: string;
  to: string;
}

/**
 * Mail notification interface.
 *
 * `send()` is **best-effort**: it never throws. Failures (network, auth,
 * 5xx, …) are silently swallowed because notifications must not break the
 * processing pipeline. If you need to observe failures, inject a custom
 * MailService implementation that records them.
 */
export interface MailService {
  send(opts: MailOptions): Promise<void>;
}

export interface HttpMailServiceOptions {
  apiUrl: string;
  /** Override axios instance for testing. */
  axiosOverride?: AxiosInstance;
}

export class HttpMailService implements MailService {
  private readonly http: AxiosInstance;
  private readonly apiUrl: string;

  constructor(opts: HttpMailServiceOptions) {
    this.apiUrl = opts.apiUrl;
    this.http = opts.axiosOverride ?? axios.create();
  }

  async send(opts: MailOptions): Promise<void> {
    try {
      await this.http.post(this.apiUrl, {
        subject: opts.subject,
        text: opts.text,
        to: opts.to,
      });
    } catch {
      /* best-effort: swallow */
    }
  }
}
