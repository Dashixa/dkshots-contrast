import { contrastRatio, hexToRgb, NON_TEXT_THRESHOLD, relativeLuminance, visualContrastPercent, type Background, type Rgb } from './colors';

export interface AnalysisResult {
  averagePercent: number;
  pixelCount: number;
  strongPixelCount: number;
  weakPixelCount: number;
}

export type AnalysisByBackground = Record<Background['id'], AnalysisResult | null>;

const MAX_SIDE = 500;

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось прочитать изображение. Проверьте файл PNG или SVG.'));
    image.src = url;
  });
}

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas недоступен в этом браузере.');
  return [canvas, context];
}

export function analyzeImage(image: HTMLImageElement, backgrounds: readonly Background[]): AnalysisByBackground {
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('Изображение имеет нулевой размер.');

  // Анализируем копию ровно 500 px по большей стороне, сохраняя пропорции.
  const scale = MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  // Отдельная маска позволяет исключить полностью прозрачные пиксели.
  const [, maskContext] = createCanvas(width, height);
  maskContext.drawImage(image, 0, 0, width, height);
  const alpha = maskContext.getImageData(0, 0, width, height).data;
  let maxAlpha = 0;
  for (let index = 3; index < alpha.length; index += 4) {
    maxAlpha = Math.max(maxAlpha, alpha[index]);
  }
  // Сглаженные края с почти нулевой alpha визуально незаметны, но всегда дают
  // ложный минимум около 1:1. Учитываем пиксели от половины максимальной alpha.
  const alphaCutoff = Math.ceil(maxAlpha / 2);

  const [canvas, context] = createCanvas(width, height);
  const results = {} as AnalysisByBackground;

  for (const background of backgrounds) {
    const rgb = hexToRgb(background.hex);
    const backgroundLuminance = relativeLuminance(rgb);

    // Порядок важен: сначала фон, затем PNG/SVG с его alpha-каналом.
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = background.hex;
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const composited = context.getImageData(0, 0, width, height).data;

    let pixelCount = 0;
    let strongPixelCount = 0;
    let weakPixelCount = 0;
    let percentSum = 0;
    for (let index = 0; index < composited.length; index += 4) {
      if (alpha[index + 3] === 0 || alpha[index + 3] < alphaCutoff) continue;
      pixelCount++;
      const pixel: Rgb = [composited[index], composited[index + 1], composited[index + 2]];
      const ratio = contrastRatio(relativeLuminance(pixel), backgroundLuminance);
      if (ratio >= NON_TEXT_THRESHOLD) strongPixelCount++;
      else weakPixelCount++;
      // Усредняем визуальную оценку всех оттенков, включая градиенты.
      percentSum += visualContrastPercent(ratio);
    }

    results[background.id] = pixelCount === 0
      ? null
      : { averagePercent: Math.round(percentSum / pixelCount * 10) / 10, pixelCount, strongPixelCount, weakPixelCount };
  }

  return results;
}
