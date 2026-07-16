export interface MetricsService {
  recordJobComplete(type: 'pdf' | 'image', status: 'success' | 'fail', durationMs: number): Promise<void>;
  flush(): Promise<void>;
}
