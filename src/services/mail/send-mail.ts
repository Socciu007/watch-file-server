import axios, { type AxiosInstance } from 'axios';

/**
 * Mail notification interface.
 *
 * The default implementation `HttpMailService` POSTs to the internal mail API
 * (https://vn2.dadaex.cn/api/moneyapi/mail). Production should inject a real
 * impl; tests can pass a mock that satisfies the same shape.
 */
export interface MailOptions {
  subject: string;
  text: string;
  to: string;
}

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
    await this.http.post(this.apiUrl, {
      subject: opts.subject,
      text: opts.text,
      to: opts.to,
    });
  }
}

/**
 * Fire-and-forget wrapper: sends a mail but never throws or blocks the caller.
 * Errors are swallowed silently (logged by the caller if needed).
 * Use this when mail is a notification, not a hard dependency.
 */
export async function sendMailBestEffort(
  mail: MailService | undefined,
  opts: MailOptions,
): Promise<void> {
  if (!mail) return;
  try {
    await mail.send(opts);
  } catch {
    /* swallow — best-effort notification */
  }
}
