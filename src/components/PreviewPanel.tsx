import type { AnalysisResult } from '../lib/canvas';
import { hexToRgb, relativeLuminance } from '../lib/colors';

interface Props {
  imageUrl?: string;
  imageName?: string;
  backgroundName: string;
  backgroundHex: string;
  result: AnalysisResult | null | undefined;
  loading: boolean;
  failed: boolean;
  onAdd: () => void;
}

export default function PreviewPanel({ imageUrl, imageName, backgroundName, backgroundHex, result, loading, failed, onAdd }: Props) {
  // Порог 0.179 выбирает сторону с более высоким контрастом между белым и чёрным текстом.
  const darkBackground = relativeLuminance(hexToRgb(backgroundHex)) < 0.179;
  const primaryText = darkBackground ? 'text-[#f8f9fa]' : 'text-[#15181b]';
  const secondaryText = darkBackground ? 'text-[#d8dadd]' : 'text-[#4b5056]';
  const score = result?.averagePercent.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <section
      className="relative flex min-h-[650px] flex-col overflow-hidden rounded-[32px] border border-[#e7e9ed] bg-white lg:min-h-[826px]"
      style={imageUrl ? { backgroundColor: backgroundHex } : undefined}
      aria-label="Просмотр иллюстрации и результат"
    >
      {imageUrl ? (
        <>
          <div className="z-10 px-5 pt-11 text-center" aria-live="polite" aria-atomic="true">
            <h2 className={`text-[15px] font-semibold ${secondaryText}`}>Уровень контраста · {backgroundName}</h2>
            {loading ? (
              <p className={`mt-4 text-xl font-medium ${secondaryText}`}>Проверяем…</p>
            ) : result ? (
              <>
                <p className={`mt-4 text-[30px] font-semibold leading-none ${primaryText}`}>
                  {score}%
                </p>
                <p className={`mt-2 text-[13px] ${secondaryText}`}>Средний контраст по иллюстрации</p>
              </>
            ) : failed ? (
              <p className={`mt-4 text-[15px] ${secondaryText}`}>Не удалось проверить изображение</p>
            ) : (
              <p className={`mt-4 text-[15px] ${secondaryText}`}>Изображение полностью прозрачное</p>
            )}
          </div>
          <div className="flex flex-1 items-center justify-center p-10 sm:p-14">
            <img src={imageUrl} alt={imageName || 'Загруженная иллюстрация'} className="max-h-[500px] w-[500px] max-w-full object-contain" />
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-7 text-center">
          <div className="flower-placeholder" aria-hidden="true"><span /><span /><span /><span /></div>
          <p className="mt-10 text-[16px] font-medium text-[#83868a]">Здесь будет ваша иллюстрация</p>
          <button type="button" onClick={onAdd} className="mt-5 rounded-full bg-[#f0f1f3] px-5 py-2.5 text-sm font-medium text-[#25292d] transition hover:bg-[#e3e6e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6067ff] sm:hidden">Добавить иллюстрацию</button>
        </div>
      )}
    </section>
  );
}
