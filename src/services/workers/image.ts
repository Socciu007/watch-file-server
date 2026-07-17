import sharp from 'sharp';
import type { FileEvent } from '../../types/index.js';
import { BaseWorker, type BaseWorkerDeps } from './base.js';

const MAX_DIMENSION = 2000;

export class ImageWorker extends BaseWorker {
  constructor(deps: BaseWorkerDeps) {
    super(deps, 'image-worker');
  }

  protected queueType(): 'pdf' | 'image' {
    return 'image';
  }

  protected async extractText(event: FileEvent): Promise<string> {
    const buffer = await sharp(event.path)
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    return this.deps.ocrService.extractText(buffer);
  }
}