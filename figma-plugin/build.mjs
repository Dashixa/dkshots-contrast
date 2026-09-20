import { readFile, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as buildScript } from 'esbuild';
import { build as buildUI } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const pluginDir = dirname(fileURLToPath(import.meta.url));
const outputDir = join(pluginDir, 'build');
const uiTempDir = join(pluginDir, '.ui-build');

await mkdir(outputDir, { recursive: true });
await buildScript({
  entryPoints: [join(pluginDir, 'code.ts')],
  outfile: join(outputDir, 'code.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2017',
  minify: true,
});

try {
  await buildUI({
    configFile: false,
    root: join(pluginDir, 'ui'),
    base: './',
    plugins: [tailwindcss()],
    build: { outDir: uiTempDir, emptyOutDir: true, minify: true },
  });

  // Figma загружает один HTML-файл UI. Встраиваем собранные CSS и JS внутрь.
  let html = await readFile(join(uiTempDir, 'index.html'), 'utf8');
  const script = html.match(/<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*><\/script>/);
  const style = html.match(/<link\b[^>]*\bhref="([^"]+\.css)"[^>]*>/);
  if (!script || !style) throw new Error('Vite не создал JS или CSS для интерфейса Figma.');

  const js = await readFile(resolve(uiTempDir, script[1]), 'utf8');
  const css = await readFile(resolve(uiTempDir, style[1]), 'utf8');
  html = html.replace(style[0], () => `<style>${css}</style>`);
  // type="module" сохраняет отложенное выполнение до разбора <body> и #root.
  html = html.replace(script[0], () => `<script type="module">${js.replaceAll('</script', '<\\/script')}</script>`);
  await writeFile(join(outputDir, 'ui.html'), html);
} finally {
  await rm(uiTempDir, { recursive: true, force: true });
}

console.log(`Figma plugin ready: ${join(pluginDir, 'manifest.json')}`);
