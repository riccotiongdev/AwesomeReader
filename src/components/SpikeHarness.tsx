/**
 * Throwaway dev harness for ticket 01 (foliate-js spike). Reached at
 * `#spike`. Verifies on a real device/browser: paginated rendering, theme
 * injection, font sizing, and location save/restore. Remove when the real
 * reader (ticket 04) lands.
 */
import { useEffect, useRef, useState } from 'react';

type FoliateView = any;

const THEMES: Record<string, string> = {
  oled: 'body { background: #000 !important; color: #c9c9c9 !important; }',
  sepia: 'body { background: #f4ecd8 !important; color: #433422 !important; }',
  light: 'body { background: #fff !important; color: #1a1a1a !important; }',
};

export default function SpikeHarness() {
  const holderRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef<unknown>(null);
  const [log, setLog] = useState<string[]>([]);
  const [meta, setMeta] = useState('opening…');
  const [fontPct, setFontPct] = useState(100);
  const [theme, setTheme] = useState('oled');

  const addLog = (msg: string) => setLog((l) => [...l.slice(-14), msg]);

  const getView = (): FoliateView | null =>
    (holderRef.current?.firstElementChild as FoliateView) ?? null;

  useEffect(() => {
    let disposed = false;
    let view: FoliateView | null = null;

    (async () => {
      await import('foliate-js/view.js');
      if (disposed) return;
      view = document.createElement('foliate-view') as FoliateView;
      view.style.cssText = 'display:block;width:100%;height:72vh;border:1px solid #555;';
      holderRef.current!.append(view);

      view.addEventListener('relocate', (e: { detail: unknown }) => {
        addLog(`relocate ${JSON.stringify(e.detail).slice(0, 160)}`);
      });

      const res = await fetch('/mini-book.epub');
      const blob = await res.blob();
      const file = new File([blob], 'mini-book.epub', { type: 'application/epub+zip' });
      await view.open(file);
      await view.init({});
      const book = view.book;
      setMeta(
        `title="${book.metadata.title}" author="${book.metadata.author}" ` +
          `toc=${book.toc.length} sections=${book.sections.length}`
      );
      addLog('opened fixture mini-book.epub');
    })();

    return () => {
      disposed = true;
    };
  }, []);

  const applyStyle = async (view: FoliateView, nextTheme: string, nextFont: number) => {
    const css =
      THEMES[nextTheme] +
      ` p, h1, h2, h3, li { font-size: ${nextFont}% !important; }`;
    await view.renderer?.setStyles(css);
  };

  const act = async (fn: (view: FoliateView) => void | Promise<void>) => {
    const view = getView();
    if (!view) return;
    try {
      await fn(view);
    } catch (e) {
      addLog(`ERR ${(e as Error).message}`);
    }
  };

  const btn = (label: string, fn: (view: FoliateView) => void | Promise<void>) => (
    <button
      onClick={() => act(fn)}
      style={{ marginRight: 6, marginBottom: 6, padding: '6px 10px' }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: 12, fontFamily: 'system-ui, sans-serif', background: '#111', color: '#ddd', minHeight: '100vh' }}>
      <h2 style={{ margin: '0 0 8px' }}>foliate-js spike harness (#spike)</h2>
      <div>{meta}</div>
      <div style={{ margin: '8px 0' }}>
        {btn('next', (v) => v.next())}
        {btn('prev', (v) => v.prev())}
        {btn('goTo ch2 (path)', (v) => v.goTo('OEBPS/ch2.xhtml'))}
        {btn('save location', (v) => {
          savedRef.current = v.lastLocation;
          addLog(`saved ${JSON.stringify(v.lastLocation)?.slice(0, 160)}`);
        })}
        {btn('restore location', async (v) => {
          const loc = savedRef.current as any;
          await v.goTo(loc?.cfi ?? loc);
          addLog(`restored ${JSON.stringify(loc)?.slice(0, 160)}`);
        })}
      </div>
      <div style={{ margin: '8px 0' }}>
        {Object.keys(THEMES).map((t) => (
          <button
            key={t}
            onClick={() => act((v) => applyStyle(v, t, fontPct)).then(() => setTheme(t))}
            style={{ marginRight: 6, padding: '6px 10px', background: t === theme ? '#444' : '#222', color: '#eee' }}
          >
            theme {t}
          </button>
        ))}
        <button onClick={() => act((v) => applyStyle(v, theme, Math.max(70, fontPct - 10)).then(() => setFontPct((f) => Math.max(70, f - 10))))} style={{ marginRight: 6, padding: '6px 10px' }}>
          font −
        </button>
        <button onClick={() => act((v) => applyStyle(v, theme, Math.min(160, fontPct + 10)).then(() => setFontPct((f) => Math.min(160, f + 10))))} style={{ marginRight: 6, padding: '6px 10px' }}>
          font +
        </button>
        <span>font {fontPct}%</span>
      </div>
      <div ref={holderRef} />
      <pre style={{ background: '#000', color: '#7f7', padding: 8, fontSize: 11, minHeight: 90, whiteSpace: 'pre-wrap' }}>
        {log.join('\n')}
      </pre>
    </div>
  );
}
