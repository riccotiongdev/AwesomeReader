import { clientFetchText } from '../network/http-client';
import { ExtractedArticle, parseArticleHtml } from './extract';
import {
  extractArticleHtml,
  isWorkerSupported,
  DEFAULT_EXTRACT_TIMEOUT_MS,
} from '../workers/extract-client';

export type { ExtractedArticle };

export interface ExtractOptions {
  timeoutMs?: number;
}

/**
 * Fetch the article page (with a network timeout) and extract clean full text.
 * The heavy HTML parsing + Readability work runs in a Web Worker so the UI
 * thread stays responsive; falls back to inline parsing where workers are
 * unavailable (Node scripts, tests).
 */
export async function extractFullArticle(
  articleUrl: string,
  options: ExtractOptions = {}
): Promise<ExtractedArticle> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_EXTRACT_TIMEOUT_MS;

  const html = await clientFetchText(articleUrl, { timeoutMs });

  if (isWorkerSupported()) {
    return extractArticleHtml(html, articleUrl, timeoutMs);
  }

  return parseArticleHtml(html, articleUrl);
}
