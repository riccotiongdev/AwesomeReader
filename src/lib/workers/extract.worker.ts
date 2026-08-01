import { createDocument, extractFromDocument, ExtractedArticle } from '../services/extract';

export interface ExtractWorkerRequest {
  html: string;
  baseUrl: string;
}

export interface ExtractWorkerSuccess {
  ok: true;
  result: ExtractedArticle;
}

export interface ExtractWorkerFailure {
  ok: false;
  error: string;
}

self.onmessage = async (event: MessageEvent<ExtractWorkerRequest>) => {
  try {
    const { html, baseUrl } = event.data;
    const doc = await createDocument(html);
    const result = extractFromDocument(doc, baseUrl);
    self.postMessage({ ok: true, result } as ExtractWorkerSuccess);
  } catch (err: any) {
    self.postMessage({ ok: false, error: err?.message || String(err) } as ExtractWorkerFailure);
  }
};
