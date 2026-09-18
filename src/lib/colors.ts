export type Rgb = readonly [number, number, number];

export const BACKGROUNDS = [
  { id: 'bg-page', name: 'Bg page', hex: '#ECEEF0' },
  { id: 'surface-primary', name: 'Surface primary', hex: '#FFFFFF' },
  { id: 'surface-secondary', name: 'Surface secondary', hex: '#F0F5F8' },
  { id: 'surface-tertiary', name: 'Surface tertiary', hex: '#F4F5F6' },
  { id: 'surface-inverse', name: 'Surface inverse', hex: '#262626' },
  { id: 'bg-control', name: 'Bg control', hex: '#E7EEF3' },
] as const;

export type Background = (typeof BACKGROUNDS)[number];

export const NON_TEXT_THRESHOLD = 3;

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace(/^#/, '');
  if (!/^[\da-f]{6}$/i.test(value)) throw new Error('Некорректный цвет фона');
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as unknown as Rgb;
}

// WCAG 2.x: sRGB → linear RGB. Таблица ускоряет полный проход по пикселям.
const LINEAR = Float64Array.from({ length: 256 }, (_, byte) => {
  const channel = byte / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
});

export function relativeLuminance([red, green, blue]: Rgb): number {
  return 0.2126 * LINEAR[red] + 0.7152 * LINEAR[green] + 0.0722 * LINEAR[blue];
}

export function contrastRatio(first: number, second: number): number {
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

// Сравнительный визуальный индекс для UI: 1:1 → 0%, 2:1 и выше → 100%.
// Это не отметка соответствия WCAG; она отдельно опирается на порог 3:1.
export function visualContrastPercent(ratio: number): number {
  return Math.min(100, Math.max(0, 100 * Math.log2(ratio)));
}
