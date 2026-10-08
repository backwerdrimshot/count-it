import { describe, expect, it } from 'vitest';
import { PROGRAM_ORIGINS, programFrameOrigin, programFramePolicy } from '../src/program-frame';
const parent = 'https://praxispercussion.com';
const own = 'https://count-it.backwerdrhythmshop.com';
const search = `?praxisContext=program&praxisReturnOrigin=${encodeURIComponent(parent)}`;
describe('Program frame context', () => {
  it('preserves other security directives and excludes local parents from production', () => {
    const policy = programFramePolicy("default-src 'self'; frame-ancestors 'none'; connect-src 'self'");
    expect(policy).toBe(`default-src 'self'; connect-src 'self'; frame-ancestors 'self' ${PROGRAM_ORIGINS.join(' ')}`);
    expect(policy).not.toMatch(/localhost|127\.0\.0\.1|\*/);
    expect(programFramePolicy('', true)).toContain('http://127.0.0.1:8127');
  });
  it('requires a real frame and exact approved referrer origin', () => {
    expect(programFrameOrigin(search, parent + '/count-it/', true, own, null)).toBe(parent);
    expect(programFrameOrigin(search, parent, false, own, parent)).toBeNull();
    expect(programFrameOrigin(search, 'https://evil.example/', true, own, null)).toBeNull();
    expect(programFrameOrigin(search, '', true, own, null)).toBeNull();
    expect(programFrameOrigin(search + '&praxisReturnOrigin=' + parent, parent, true, own, null)).toBeNull();
  });
  it('retains checked context only for internal framed navigation', () => {
    expect(programFrameOrigin('', own + '/workshop', true, own, parent)).toBe(parent);
    expect(programFrameOrigin('', own, false, own, parent)).toBeNull();
    expect(programFrameOrigin('', 'https://evil.example/', true, own, parent)).toBeNull();
    expect(programFrameOrigin('', own, true, own, 'https://evil.example')).toBeNull();
  });
  it('permits local preview origins only in development', () => {
    const local = '?praxisContext=program&praxisReturnOrigin=http://127.0.0.1:8127';
    expect(programFrameOrigin(local, 'http://127.0.0.1:8127/', true, own, null)).toBeNull();
    expect(programFrameOrigin(local, 'http://127.0.0.1:8127/', true, own, null, true)).toBe('http://127.0.0.1:8127');
  });
});
