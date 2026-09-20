import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { analyzeImage, loadImage, type AnalysisByBackground } from '../../src/lib/canvas';
import { BACKGROUNDS, hexToRgb, relativeLuminance, type Background } from '../../src/lib/colors';

interface Illustration {
  id: string;
  name: string;
  url: string;
}

type SelectionMessage =
  | { type: 'selection'; state: 'empty' | 'multiple' | 'unsupported' | 'loading' | 'error'; message: string }
  | { type: 'selection'; state: 'ready'; id: string; name: string; bytes: Uint8Array };

type AnalysisState = { id: string; results: AnalysisByBackground | null; loading: boolean; error: string | null };

const percent = (value: number) => `${value.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

function BrandMark() {
  return <svg viewBox="0 0 42 42" className="size-7 shrink-0" aria-hidden="true"><path fill="currentColor" d="M19.6 2.6c1.3-1 3.2-.1 3.3 1.5l.8 11 10.8-2.5c2.5-.6 3.8 2.4 1.7 3.9l-8.7 6.1 6.1 11c1 1.8-1 3.7-2.7 2.6l-10-6.7-7.7 8.7c-1.4 1.6-4 .4-3.7-1.7L11.2 25 3.6 20.5c-2.1-1.2-1.5-4.4.9-4.8l10.9-1.8z" /></svg>;
}

function BackgroundTile({ background, selected, score, onSelect }: {
  background: Background;
  selected: boolean;
  score: AnalysisByBackground[Background['id']] | undefined;
  onSelect: () => void;
}) {
  const dark = background.hex === '#262626';
  return <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    aria-label={`${background.name}, ${background.hex}, ${score ? percent(score.averagePercent) : 'результат не рассчитан'}`}
    className="group min-w-0 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#626bff]"
  >
    <span className="mb-1 block truncate px-0.5 text-[11px] font-medium text-[#34383c]">{background.name}</span>
    <span
      className={`flex h-[82px] flex-col justify-between rounded-[12px] border px-2.5 py-2 transition-shadow group-hover:shadow-sm ${selected ? 'border-[#626bff] ring-1 ring-[#626bff]' : background.hex === '#FFFFFF' ? 'border-[#e5e7eb]' : 'border-transparent'}`}
      style={{ backgroundColor: background.hex } as CSSProperties}
    >
      <span className={`text-[19px] font-semibold leading-5 ${dark ? 'text-white' : 'text-[#15191c]'}`}>
        {score ? percent(score.averagePercent) : score === null ? '—' : ''}
      </span>
      <span className={`text-[10px] font-medium ${dark ? 'text-[#d4d7da]' : 'text-[#687077]'}`}>{background.hex}</span>
    </span>
  </button>;
}

export default function App() {
  const [figmaItem, setFigmaItem] = useState<Illustration | null>(null);
  const [backgroundId, setBackgroundId] = useState<Background['id']>('surface-primary');
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [visibleResult, setVisibleResult] = useState<AnalysisByBackground[Background['id']] | undefined>();
  const figmaUrl = useRef<string | null>(null);

  const selected = figmaItem;
  const background = BACKGROUNDS.find((item) => item.id === backgroundId)!;
  const currentAnalysis = analysis?.id === selected?.id ? analysis : null;

  useEffect(() => {
    const receive = (event: MessageEvent<{ pluginMessage?: SelectionMessage }>) => {
      const message = event.data?.pluginMessage;
      if (!message || message.type !== 'selection') return;
      if (message.state === 'ready') {
        const url = URL.createObjectURL(new Blob([new Uint8Array(message.bytes)], { type: 'image/png' }));
        if (figmaUrl.current) URL.revokeObjectURL(figmaUrl.current);
        figmaUrl.current = url;
        const item = { id: `figma:${message.id}`, name: message.name, url };
        setFigmaItem(item);
      } else if (message.state === 'loading') {
        setFigmaItem(null);
      } else {
        setFigmaItem(null);
        if (figmaUrl.current) URL.revokeObjectURL(figmaUrl.current);
        figmaUrl.current = null;
      }
    };
    window.addEventListener('message', receive);
    parent.postMessage({ pluginMessage: { type: 'refresh-selection' } }, '*');
    return () => {
      window.removeEventListener('message', receive);
      if (figmaUrl.current) URL.revokeObjectURL(figmaUrl.current);
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setAnalysis(null);
      return;
    }
    let cancelled = false;
    let frame = 0;
    setAnalysis({ id: selected.id, results: null, loading: true, error: null });
    loadImage(selected.url).then((image) => {
      if (cancelled) return;
      // Несколько быстрых смен выделения сводятся к одному анализу за кадр.
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          setAnalysis({ id: selected.id, results: analyzeImage(image, BACKGROUNDS), loading: false, error: null });
        } catch (cause) {
          setAnalysis({ id: selected.id, results: null, loading: false, error: cause instanceof Error ? cause.message : 'Ошибка анализа.' });
        }
      });
    }).catch((cause: unknown) => {
      if (!cancelled) setAnalysis({ id: selected.id, results: null, loading: false, error: cause instanceof Error ? cause.message : 'Ошибка загрузки.' });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [selected?.id, selected?.url]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisibleResult(currentAnalysis?.results?.[backgroundId]));
    return () => cancelAnimationFrame(frame);
  }, [currentAnalysis, backgroundId]);

  const darkBackground = relativeLuminance(hexToRgb(background.hex)) < 0.179;
  const primaryText = darkBackground ? 'text-white' : 'text-[#171b1e]';
  const secondaryText = darkBackground ? 'text-[#d9dcdf]' : 'text-[#515960]';
  const score = selected ? visibleResult : undefined;
  const busy = Boolean(selected && (currentAnalysis?.loading || !currentAnalysis || score === undefined));

  return <div className="flex h-screen min-h-[480px] flex-col bg-[#f9fafb] text-[#171b1e]">
    <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[#e8eaed] bg-white px-6">
      <div className="flex items-center gap-1.5 font-semibold"><BrandMark /><span>DkShots</span></div>
      <h1 className="text-[16px] font-semibold">Проверка контрастности иллюстраций</h1>
      <span className="rounded-full bg-[#eef0f3] px-2.5 py-1 text-[11px] font-semibold text-[#515861]">FIGMA</span>
    </header>
    <main className="grid min-h-0 flex-1 gap-3 p-4 max-[700px]:grid-cols-1 min-[701px]:grid-cols-2">
      <section
        aria-label="Просмотр иллюстрации и результат"
        className="flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white max-[700px]:min-h-[420px]"
        style={selected ? { backgroundColor: background.hex } : undefined}
      >
        {selected ? <>
          <div className="px-5 pt-7 text-center" aria-live="polite" aria-atomic="true">
            <h2 className={`text-[13px] font-semibold ${secondaryText}`}>Уровень контраста · {background.name}</h2>
            <p className={`mt-3 text-[32px] font-semibold leading-none ${primaryText}`}>
              {busy ? 'Проверяем…' : score ? percent(score.averagePercent) : currentAnalysis?.error ? 'Ошибка' : '—'}
            </p>
            {!busy && currentAnalysis?.error && <p className={`mt-2 text-xs ${secondaryText}`}>{currentAnalysis.error}</p>}
            {!busy && score === null && <p className={`mt-2 text-xs ${secondaryText}`}>Нет видимых пикселей</p>}
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-7">
            <img src={selected.url} alt={selected.name} className="max-h-full max-w-full object-contain" />
          </div>
          <p
            className={`shrink-0 truncate px-7 pb-6 text-center text-[12px] font-medium ${secondaryText}`}
            title={selected.name}
          >
            {selected.name}
          </p>
        </> : <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flower-placeholder" aria-hidden="true"><span /><span /><span /><span /></div>
          <p className="mt-7 text-[15px] font-medium text-[#7b8188]">Выберите интерфейс в Figma</p>
          <p className="mt-2 max-w-[260px] text-[11px] leading-4 text-[#9aa0a6]">Подойдёт слой, группа, компонент, инстанс или целый фрейм.</p>
        </div>}
      </section>

      <section aria-label="Фоны и иллюстрации" className="min-h-0 overflow-y-auto rounded-[24px] border border-[#e6e8ec] bg-white p-6 max-[700px]:min-h-[470px]">
        <fieldset>
          <legend className="mb-4 text-[14px] font-semibold text-[#40464c]">Выбери фон для проверки</legend>
          <div className="grid grid-cols-3 gap-x-2 gap-y-3">
            {BACKGROUNDS.map((item) => <BackgroundTile
              key={item.id}
              background={item}
              selected={item.id === backgroundId}
              score={currentAnalysis?.results?.[item.id]}
              onSelect={() => setBackgroundId(item.id)}
            />)}
          </div>
        </fieldset>
      </section>
    </main>
  </div>;
}
