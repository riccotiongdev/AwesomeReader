import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { withTimeout } from '../utils/timeout';

export interface ClientFetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export const DEFAULT_FETCH_TIMEOUT_MS = 15000;

export interface HttpResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export interface ClientFetchResult {
  status: number;
  headers: Record<string, string>;
  text: string | null;
}

export const PRIMARY_CORS_PROXY = 'https://corsproxy.io/?';
export const SECONDARY_CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const WAF_MARKER = 'x-amzn-waf-action';
const MIN_RESPONSE_LENGTH = 500;

function isGoodBody(text: string): boolean {
  return !text.includes(WAF_MARKER) && text.length > MIN_RESPONSE_LENGTH;
}

function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}

/**
 * Robust Cross-Platform HTTP Client (low-level)
 * - On iOS & Android Native App: Bypasses CORS completely via CapacitorHttp native OS bridge.
 * - On Web Browser (PWA): Uses native fetch with multi-proxy fallback for AWS WAF & Cloudflare protected sites.
 *
 * Returns status + headers + body so callers can implement conditional GET (304) and ETag caching.
 * A 304 response is treated as success with `text: null`.
 */
export async function clientFetch(
  url: string,
  options: ClientFetchOptions = {}
): Promise<ClientFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const run = async (): Promise<ClientFetchResult> => {
    // 1. If running as Native iOS/Android App, use CapacitorHttp native OS bridge (CORS Bypassed 100%)
    if (Capacitor.isNativePlatform()) {
      try {
        const response = await CapacitorHttp.get({
          url,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AwesomeReader/1.0',
            ...options.headers,
          },
          responseType: 'text',
        });
        if (response.status === 304) {
          return { status: 304, headers: normalizeHeaders(response.headers || {}), text: null };
        }
        if (response.status >= 200 && response.status < 300) {
          const resText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          if (isGoodBody(resText)) {
            return { status: response.status, headers: normalizeHeaders(response.headers || {}), text: resText };
          }
        }
      } catch (err) {
        console.warn('Native CapacitorHttp fetch error, attempting fallback:', err);
      }
    }

    // 2. Direct Web Fetch
    try {
      const res = await fetch(url, { headers: options.headers });
      if (res.status === 304) {
        return { status: 304, headers: headersToRecord(res.headers), text: null };
      }
      if (res.ok) {
        const text = await res.text();
        // Check if response is an AWS WAF challenge page
        if (isGoodBody(text)) {
          return { status: res.status, headers: headersToRecord(res.headers), text };
        }
      }
    } catch (corsErr) {
      console.warn('Direct web fetch blocked by CORS or network, trying CORS proxies:', corsErr);
    }

    // 3. Primary Web Proxy Fallback (corsproxy.io)
    try {
      const proxyUrl = `${PRIMARY_CORS_PROXY}${encodeURIComponent(url)}`;
      const proxyRes = await fetch(proxyUrl, { headers: options.headers });
      if (proxyRes.status === 304) {
        return { status: 304, headers: headersToRecord(proxyRes.headers), text: null };
      }
      if (proxyRes.ok) {
        const text = await proxyRes.text();
        if (isGoodBody(text)) {
          return { status: proxyRes.status, headers: headersToRecord(proxyRes.headers), text };
        }
      }
    } catch (proxyErr) {
      console.warn('Primary CORS proxy failed, trying secondary proxy:', proxyErr);
    }

    // 4. Secondary Web Proxy Fallback (allorigins - bypasses AWS WAF challenge)
    const secondaryProxyUrl = `${SECONDARY_CORS_PROXY}${encodeURIComponent(url)}`;
    const secRes = await fetch(secondaryProxyUrl, { headers: options.headers });

    if (secRes.status === 304) {
      return { status: 304, headers: headersToRecord(secRes.headers), text: null };
    }

    if (!secRes.ok) {
      throw new Error(`Failed to fetch URL through proxies (${secRes.status} ${secRes.statusText})`);
    }

    const text = await secRes.text();
    return { status: secRes.status, headers: headersToRecord(secRes.headers), text };
  };

  return withTimeout(run(), timeoutMs, `Request timed out after ${timeoutMs}ms: ${url}`);
}

/**
 * Convenience wrapper for callers that just need the response body as text.
 * Throws when the resource is not modified (304) or unavailable.
 */
export async function clientFetchText(url: string, options: ClientFetchOptions = {}): Promise<string> {
  const result = await clientFetch(url, options);
  if (result.status === 304 || result.text === null) {
    throw new Error(`Resource not modified (304): ${url}`);
  }
  return result.text;
}
