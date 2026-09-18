import type { CSSProperties } from 'react';
import type { AnalysisResult } from '../lib/canvas';
import type { Background } from '../lib/colors';

interface Props {
  background: Background;
  selected: boolean;
  result: AnalysisResult | null | undefined;
  onSelect: () => void;
}

export default function BackgroundCard({ background, selected, result, onSelect }: Props) {
  const inverse = background.hex === '#262626';
  const percent = result?.averagePercent.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const resultLabel = result
    ? `средний уровень контраста ${percent}%`
    : result === null ? 'нет видимых пикселей' : 'результат ещё не рассчитан';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${background.name}, ${background.hex}, ${resultLabel}`}
      className="group min-w-0 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6067ff]"
    >
      <span className="mb-1.5 block truncate px-1 text-[13px] leading-5 text-[#24262a]">{background.name}</span>
      <span
        className={`relative flex h-[92px] flex-col justify-between rounded-[14px] border px-3 py-2.5 transition-all group-hover:shadow-sm ${selected ? 'border-[#676cff] ring-1 ring-[#676cff]' : background.hex === '#FFFFFF' ? 'border-[#e3e6ea]' : 'border-transparent'}`}
        style={{ backgroundColor: background.hex } as CSSProperties}
      >
        <span className={`block text-[22px] font-semibold leading-6 ${inverse ? 'text-white' : 'text-[#1e2429]'}`}>
          {result ? `${percent}%` : result === null ? '—' : ''}
        </span>
        <span className={`text-[12px] font-medium leading-4 ${inverse ? 'text-[#d5d7d9]' : 'text-[#60666d]'}`}>{background.hex.toUpperCase()}</span>
      </span>
    </button>
  );
}
