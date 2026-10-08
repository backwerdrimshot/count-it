export const PROGRAM_ORIGINS = [
  'https://praxis.backwerdrimshot.com',
  'https://praxispercussion.com',
  'https://www.praxispercussion.com',
  'https://praxis-staging.backwerdrimshot.com',
] as const;
export const PROGRAM_FRAME_KEY = 'count-it-program-frame-v1';
export function programFramePolicy(existing: string, development = false): string {
  const directives = existing.split(';').map(value => value.trim())
    .filter(value => value && !/^frame-ancestors(?:\s|$)/i.test(value));
  const preview = development ? ' http://127.0.0.1:8127' : '';
  directives.push(`frame-ancestors 'self' ${PROGRAM_ORIGINS.join(' ')}${preview}`);
  return directives.join('; ');
}
export function programFrameOrigin(search: string, referrer: string, framed: boolean, ownOrigin: string, remembered: string | null, development = false): string | null {
  if (!framed) return null;
  const allowed = (origin: string) => PROGRAM_ORIGINS.some(value => value === origin)
    || development && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin);
  const params = new URLSearchParams(search);
  const requested = params.get('praxisReturnOrigin');
  try {
    const from = new URL(referrer).origin;
    if (params.getAll('praxisReturnOrigin').length > 1 || params.getAll('praxisContext').length > 1) return null;
    if (requested) {
      return params.get('praxisContext') === 'program' && requested === from && allowed(from) ? from : null;
    }
    // Same-frame internal navigation retains only the already checked origin.
    return from === ownOrigin && remembered && allowed(remembered) ? remembered : null;
  } catch { return null; }
}
