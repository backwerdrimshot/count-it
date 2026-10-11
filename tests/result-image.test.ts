import { describe, expect, it, vi } from 'vitest';
import { copyResultImage } from '../src/result-download';

class FakeItem {
  static supports = () => true;
  constructor(readonly data: Record<string, Promise<Blob>>) {}
}
const Item = FakeItem as unknown as typeof ClipboardItem;
describe('local result image copy', () => {
  it('starts write synchronously with a PNG promise, preserving the click activation', async () => {
    let resolve!: (blob: Blob) => void;
    const blob = new Blob(['local summary'], { type: 'image/png' });
    const png = new Promise<Blob>(done => { resolve = done; });
    const write = vi.fn(async (items: ClipboardItem[]) => {
      const data = (items[0] as unknown as FakeItem).data;
      expect(Object.keys(data)).toEqual(['image/png']);
      expect(await data['image/png']).toBe(blob);
    });
    const copied = copyResultImage('existing summary', () => ({ secure: true, Item, clipboard: { write } }), () => png);
    expect(write).toHaveBeenCalledOnce(); // before asynchronous PNG encoding finishes
    resolve(blob);
    expect(await copied).toBe(true);
  });
  it('does not render or write in insecure, absent or unsupported environments', async () => {
    const render = vi.fn(); const write = vi.fn();
    for (const env of [
      { secure: false, Item, clipboard: { write } },
      { secure: true, Item },
      { secure: true, clipboard: { write } },
      { secure: true, Item: class extends FakeItem { static supports = () => false; } as unknown as typeof ClipboardItem, clipboard: { write } },
    ]) expect(await copyResultImage('summary', () => env, render)).toBe(false);
    expect(render).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });
  it('returns failure on denied write and throwing clipboard access for accessible download fallback', async () => {
    expect(await copyResultImage('summary', () => { throw new Error('blocked'); })).toBe(false);
    expect(await copyResultImage('summary', () => ({ secure: true, Item, clipboard: { write: async () => { throw new Error('denied'); } } }),
      async () => new Blob(['png'], { type: 'image/png' }))).toBe(false);
  });
  it('handles PNG encoding failure without an unhandled rejection', async () => {
    expect(await copyResultImage('summary', () => ({ secure: true, Item, clipboard: { write: async items => {
      await (items[0] as unknown as FakeItem).data['image/png'];
    } } }), () => Promise.reject(new Error('no canvas')))).toBe(false);
  });
});
