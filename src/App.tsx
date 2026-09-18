import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import BackgroundCard from './components/BackgroundCard';
import PreviewPanel from './components/PreviewPanel';
import { analyzeImage, loadImage, type AnalysisByBackground } from './lib/canvas';
import { BACKGROUNDS } from './lib/colors';

interface Illustration {
  id: string;
  name: string;
  url: string;
}

type AnalysisState = { imageId: string; results: AnalysisByBackground | null; loading: boolean; failed: boolean };

function BrandMark() {
  return <svg viewBox="0 0 42 42" className="size-[38px] shrink-0" aria-hidden="true"><path fill="currentColor" d="M19.6 2.6c1.3-1 3.2-.1 3.3 1.5l.8 11 10.8-2.5c2.5-.6 3.8 2.4 1.7 3.9l-8.7 6.1 6.1 11c1 1.8-1 3.7-2.7 2.6l-10-6.7-7.7 8.7c-1.4 1.6-4 .4-3.7-1.7L11.2 25 3.6 20.5c-2.1-1.2-1.5-4.4.9-4.8l10.9-1.8z" /></svg>;
}

export default function App() {
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundId, setBackgroundId] = useState<(typeof BACKGROUNDS)[number]['id']>('surface-primary');
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [visibleResult, setVisibleResult] = useState<AnalysisByBackground[keyof AnalysisByBackground] | undefined>();
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);

  const selected = illustrations.find((item) => item.id === selectedId);
  const background = BACKGROUNDS.find((item) => item.id === backgroundId)!;

  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    if (!selected) {
      setAnalysis(null);
      return;
    }
    let cancelled = false;
    let frame = 0;
    setAnalysis({ imageId: selected.id, results: null, loading: true, failed: false });
    loadImage(selected.url).then((image) => {
      if (cancelled) return;
      // Новый выбор отменяет ожидающий кадр и его дорогое сканирование.
      frame = requestAnimationFrame(() => {
        if (cancelled) return;
        try {
          const results = analyzeImage(image, BACKGROUNDS);
          setAnalysis({ imageId: selected.id, results, loading: false, failed: false });
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Не удалось проверить изображение.');
          setAnalysis({ imageId: selected.id, results: null, loading: false, failed: true });
        }
      });
    }).catch((cause: unknown) => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : 'Не удалось загрузить изображение.');
      setAnalysis({ imageId: selected.id, results: null, loading: false, failed: true });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [selected?.id, selected?.url]);

  useEffect(() => {
    // Быстрые переключения фона сводятся к одному обновлению за кадр.
    const frame = requestAnimationFrame(() => {
      setVisibleResult(analysis?.imageId === selectedId ? analysis.results?.[backgroundId] : undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [analysis, selectedId, backgroundId]);

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    const valid = incoming.filter((file) =>
      file.type === 'image/png' || file.type === 'image/svg+xml' || /\.(png|svg)$/i.test(file.name),
    );
    if (valid.length !== incoming.length) setError('Можно добавить только файлы PNG и SVG.');
    else setError(null);
    const added = valid.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      return { id: crypto.randomUUID(), name: file.name, url };
    });
    if (added.length) {
      setIllustrations((current) => [...current, ...added]);
      setSelectedId(added[0].id);
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = '';
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  }

  function removeIllustration(id: string) {
    const removed = illustrations.find((item) => item.id === id);
    if (!removed) return;
    const remaining = illustrations.filter((item) => item.id !== id);
    setIllustrations(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
    URL.revokeObjectURL(removed.url);
    objectUrls.current = objectUrls.current.filter((url) => url !== removed.url);
  }

  const currentAnalysis = analysis?.imageId === selectedId ? analysis : null;

  return (
    <div className="min-h-screen bg-[#fbfbfc] text-[#15181b]">
      <header className="relative flex h-[96px] items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2 text-[#101314]" aria-label="DkShots"><BrandMark /><span className="text-[16px] font-semibold">DkShots</span></div>
        <h1 className="absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-[22px] font-medium md:block">Проверка контрастности иллюстраций</h1>
        <div className="size-12 rounded-full bg-[#c7c9cb]" aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-7 sm:px-7 lg:pt-11">
        <h1 className="mb-6 text-center text-xl font-medium md:hidden">Проверка контрастности иллюстраций</h1>
        {error && <div role="alert" className="mb-4 rounded-xl border border-[#f4c4c4] bg-[#fff4f4] px-4 py-3 text-sm text-[#a5272c]">{error}<button type="button" className="ml-4 underline" onClick={() => setError(null)}>Закрыть</button></div>}
        <div className="grid gap-3 lg:grid-cols-2">
          <PreviewPanel
            imageUrl={selected?.url}
            imageName={selected?.name}
            backgroundName={background.name}
            backgroundHex={selected ? background.hex : '#FFFFFF'}
            result={visibleResult}
            loading={Boolean(selected && (currentAnalysis?.loading || !currentAnalysis || visibleResult === undefined))}
            failed={Boolean(currentAnalysis?.failed)}
            onAdd={() => fileInput.current?.click()}
          />

          <section
            className="min-h-[650px] rounded-[32px] border border-[#e7e9ed] bg-white px-6 py-10 sm:px-12 lg:min-h-[826px]"
            aria-label="Настройки проверки и иллюстрации"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <fieldset>
              <legend className="mb-5 text-[15px] font-semibold text-[#4b5056]">Выбери фон для проверки</legend>
              <div className="grid grid-cols-2 gap-x-2 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">
                {BACKGROUNDS.map((item) => (
                  <BackgroundCard
                    key={item.id}
                    background={item}
                    selected={item.id === backgroundId}
                    result={currentAnalysis?.results?.[item.id]}
                    onSelect={() => setBackgroundId(item.id)}
                  />
                ))}
              </div>
            </fieldset>

            <div className="mt-14">
              <h2 className="text-[15px] font-semibold text-[#4b5056]">Ваши иллюстрации</h2>
              {illustrations.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" aria-label="Загруженные иллюстрации">
                  {illustrations.map((item) => (
                    <div
                      key={item.id}
                      className={`group relative aspect-[1.1] overflow-hidden rounded-[14px] border bg-[#f5f6f8] transition hover:shadow-sm ${selectedId === item.id ? 'border-[#676cff] ring-1 ring-[#676cff]' : 'border-transparent'}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        aria-pressed={selectedId === item.id}
                        aria-label={`Выбрать иллюстрацию ${item.name}`}
                        title={item.name}
                        className="flex size-full items-center justify-center p-3 focus-visible:outline-2 focus-visible:outline-[#6067ff]"
                      ><img src={item.url} alt="" className="max-h-full max-w-full object-contain" /></button>
                      <button
                        type="button"
                        onClick={() => removeIllustration(item.id)}
                        aria-label={`Удалить иллюстрацию ${item.name}`}
                        title="Удалить иллюстрацию из списка"
                        className="pointer-events-auto absolute right-2 top-2 z-10 grid size-7 cursor-pointer place-items-center rounded-full bg-white text-[#555d64] shadow-sm transition hover:bg-[#fff0f0] hover:text-[#c53338] focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6067ff] sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100"
                      >
                        <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileInput} type="file" accept=".png,.svg,image/png,image/svg+xml" multiple className="sr-only" onChange={onInputChange} aria-label="Загрузить иллюстрации PNG или SVG" />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-7 cursor-pointer rounded-full bg-[#eff0f2] px-4 py-2.5 text-[15px] font-medium text-[#222528] transition hover:bg-[#e4e6e9] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#6067ff]"
              >Добавить иллюстрацию</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
