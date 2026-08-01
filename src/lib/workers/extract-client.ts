import { ExtractedArticle, parseArticleHtml } from '../services/extract';
import {
  ExtractWorkerRequest,
  ExtractWorkerSuccess,
  ExtractWorkerFailure,
} from './extract.worker';

export const DEFAULT_EXTRACT_TIMEOUT_MS = 30000;

export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined';
}

/**
 * Parse + extract HTML in a dedicated Web Worker so the main thread stays
 * responsive. A single worker is created per call and terminated when the
 * result arrives or the timeout elapses. Falls back to inline parsing when the
 * environment cannot create a (module) worker.
 */
export function extractArticleHtml(
  html: string,
  baseUrl: string,
  timeoutMs: number = DEFAULT_EXTRACT_TIMEOUT_MS
): Promise<ExtractedArticle> {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./extract.worker.ts', import.meta.url), { type: 'module' });
  } catch (err) {
    console.warn('Web Worker unavailable, extracting inline:', err);
    return parseArticleHtml(html, baseUrl);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Text extraction timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    worker.onmessage = (event: MessageEvent<ExtractWorkerSuccess | ExtractWorkerFailure>) => {
      clearTimeout(timer);
      worker.terminate();
      const data = event.data;
      if (data.ok) {
        resolve(data.result);
      } else {
        reject(new Error(data.error || 'Text extraction failed'));
      }
    };

    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      reject(new Error(event.message || 'Text extraction worker error'));
    };

    const request: ExtractWorkerRequest = { html, baseUrl };
    worker.postMessage(request);
  });
}
