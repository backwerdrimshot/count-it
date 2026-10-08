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
export function downloadResultImage(summary: string) {
  const canvas = document.createElement('canvas'); const context = canvas.getContext('2d');
  if (!context) return;
  context.font = '22px sans-serif';
  const lines = wrapResultLines(summary, text => context.measureText(text).width, 840);
  canvas.width = 960; canvas.height = 150 + lines.length * 36;
  context.fillStyle = '#faf9f4'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#365438'; context.fillRect(0, 0, canvas.width, 16);
  context.fillStyle = '#20231e'; context.font = '22px sans-serif';
  lines.forEach((line, i) => context.fillText(line, 60, 70 + i * 36));
  context.font = '16px sans-serif'; context.fillText('Count It · Backwerd Rhythm Shop · Browser-generated result', 60, canvas.height - 35);
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'count-it-result.png'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
