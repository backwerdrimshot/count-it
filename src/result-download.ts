export function wrapResultLines(summary: string, measure: (text: string) => number, width: number): string[] {
  return summary.split('\n').flatMap(paragraph => {
    const lines: string[] = []; let line = '';
    for (const word of paragraph.split(/\s+/)) {
      if (measure(`${line} ${word}`.trim()) > width && line) { lines.push(line.trim()); line = ''; }
      // Even a long identifier must remain inside the exported card.
      for (const character of word) {
        const next = `${line}${character}`;
        if (measure(next) > width && line) { lines.push(line.trim()); line = ''; }
        line += character;
      }
      line += ' ';
    }
    lines.push(line.trim()); return lines;
  });
}
/** The same locally drawn PNG is used for download and clipboard copy. */
export function createResultImage(summary: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas'); const context = canvas.getContext('2d');
    if (!context) { reject(new Error('Canvas unavailable')); return; }
    context.font = '22px sans-serif';
    const lines = wrapResultLines(summary, text => context.measureText(text).width, 840);
    canvas.width = 960; canvas.height = 150 + lines.length * 36;
    context.fillStyle = '#faf9f4'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#365438'; context.fillRect(0, 0, canvas.width, 16);
    context.fillStyle = '#20231e'; context.font = '22px sans-serif';
    lines.forEach((line, i) => context.fillText(line, 60, 70 + i * 36));
    context.font = '16px sans-serif'; context.fillText('Count It · Backwerd Rhythm Shop · Browser-generated result', 60, canvas.height - 35);
    context.fillText('Browser-generated record; not proof of authentic work.', 60, canvas.height - 15);
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG unavailable')), 'image/png');
  });
}

interface ImageClipboard {
  secure: boolean;
  clipboard?: Pick<Clipboard, 'write'>;
  Item?: typeof ClipboardItem;
}
function browserClipboard(): ImageClipboard {
  return { secure: window.isSecureContext, clipboard: navigator.clipboard, Item: window.ClipboardItem };
}

/** Call directly from the copy button: write starts before awaiting PNG encoding. */
export async function copyResultImage(summary: string, environment: () => ImageClipboard = browserClipboard,
  render: (summary: string) => Promise<Blob> = createResultImage): Promise<boolean> {
  try {
    const { secure, clipboard, Item } = environment();
    if (!secure || !clipboard?.write || !Item || (Item.supports && !Item.supports('image/png'))) return false;
    const png = render(summary);
    // Consume renderer rejection even if a browser rejects write before reading its data.
    void png.catch(() => {});
    await clipboard.write([new Item({ 'image/png': png })]);
    return true;
  } catch { return false; }
}

export async function downloadResultImage(summary: string): Promise<boolean> {
  try {
    const blob = await createResultImage(summary);
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'count-it-result.png'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch { return false; }
}
