// Главный процесс плагина: читает только текущее выделение, не меняя документ.
type SelectionMessage =
  | { type: 'selection'; state: 'empty' | 'multiple' | 'unsupported' | 'loading'; message: string }
  | { type: 'selection'; state: 'ready'; id: string; name: string; bytes: Uint8Array }
  | { type: 'selection'; state: 'error'; message: string };

figma.showUI(__html__, { width: 920, height: 680, title: 'DkShots', themeColors: false });

let selectionVersion = 0;

async function publishSelection(): Promise<void> {
  const version = ++selectionVersion;
  const selection = figma.currentPage.selection;
  const send = (message: SelectionMessage) => {
    if (version === selectionVersion) figma.ui.postMessage(message);
  };

  if (selection.length === 0) {
    send({ type: 'selection', state: 'empty', message: 'Кликните по интерфейсу на холсте Figma.' });
    return;
  }
  if (selection.length !== 1) {
    send({ type: 'selection', state: 'multiple', message: 'Выберите один слой, группу или фрейм.' });
    return;
  }

  const node = selection[0];
  if (!('exportAsync' in node) || !('absoluteRenderBounds' in node)) {
    send({ type: 'selection', state: 'unsupported', message: 'Этот объект нельзя экспортировать как изображение.' });
    return;
  }
  const bounds = node.absoluteRenderBounds;
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    send({ type: 'selection', state: 'unsupported', message: 'Выбранный слой не имеет видимой площади.' });
    return;
  }

  send({ type: 'selection', state: 'loading', message: `Проверяем «${node.name}»…` });
  try {
    // Figma сразу экспортирует 500 px по большей стороне: это ограничивает память
    // и размер сообщения, а небольшие иллюстрации увеличиваются до тех же 500 px.
    const constraint: ExportSettingsConstraints = bounds.width >= bounds.height
      ? { type: 'WIDTH', value: 500 }
      : { type: 'HEIGHT', value: 500 };
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint,
      contentsOnly: true,
      colorProfile: 'SRGB',
    });
    send({ type: 'selection', state: 'ready', id: node.id, name: node.name, bytes });
  } catch {
    send({ type: 'selection', state: 'error', message: 'Figma не смогла экспортировать выбранный слой.' });
  }
}

figma.ui.onmessage = (message: { type?: string }) => {
  if (message.type === 'refresh-selection') void publishSelection();
};

figma.on('selectionchange', () => { void publishSelection(); });
figma.on('currentpagechange', () => { void publishSelection(); });
void publishSelection();
