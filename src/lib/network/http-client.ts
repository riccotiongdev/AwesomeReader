import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface HttpResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export const PRIMARY_CORS_PROXY = 'https://corsproxy.io/?';
export const SECONDARY_CORS_PROXY = 'https://api.allorigins.win/raw?url=';

/**
 * Robust Cross-Platform HTTP Client
 * - On iOS & Android Native App: Bypasses CORS completely via CapacitorHttp native OS bridge.
 * - On Web Browser (PWA): Uses native fetch with multi-proxy fallback for AWS WAF & Cloudflare protected sites.
 */
export async function clientFetchText(url: string, options: { headers?: Record<string, string> } = {}): Promise<string> {
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
      if (response.status >= 200 && response.status < 300) {
        const resText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        if (!resText.includes('x-amzn-waf-action') && resText.length > 500) {
          return resText;
        }
      }
    } catch (err) {
      console.warn('Native CapacitorHttp fetch error, attempting fallback:', err);
    }
  }

  // 2. Direct Web Fetch
  try {
    const res = await fetch(url, { headers: options.headers });
    if (res.ok) {
      const text = await res.text();
      // Check if response is an AWS WAF challenge page
      if (!text.includes('x-amzn-waf-action') && text.length > 500) {
        return text;
      }
    }
  } catch (corsErr) {
    console.warn('Direct web fetch blocked by CORS or network, trying CORS proxies:', corsErr);
  }

  // 3. Primary Web Proxy Fallback (corsproxy.io)
  try {
    const proxyUrl = `${PRIMARY_CORS_PROXY}${encodeURIComponent(url)}`;
    const proxyRes = await fetch(proxyUrl, { headers: options.headers });
    if (proxyRes.ok) {
      const text = await proxyRes.text();
      if (!text.includes('x-amzn-waf-action') && text.length > 500) {
        return text;
      }
    }
  } catch (proxyErr) {
    console.warn('Primary CORS proxy failed, trying secondary proxy:', proxyErr);
  }

  // 4. Secondary Web Proxy Fallback (allorigins - bypasses AWS WAF challenge)
  const secondaryProxyUrl = `${SECONDARY_CORS_PROXY}${encodeURIComponent(url)}`;
  const secRes = await fetch(secondaryProxyUrl, { headers: options.headers });

  if (!secRes.ok) {
    throw new Error(`Failed to fetch URL through proxies (${secRes.status} ${secRes.statusText})`);
  }

  return await secRes.text();
}
