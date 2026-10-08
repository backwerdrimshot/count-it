import { describe, expect, it } from 'vitest';
import { builderStateFromQuery, buildQuery } from '../src/assignment/builder';
describe('saved assignment configuration reopening', () => {
  it.each(['a=Pulse&level=1&scope=measure&meter=4-4&guide=on&n=10&pass=8&seed=abcdef', 'cells=quarter,eighths&scope=beat&sys=eastman-ti-te-ta&guide=off&fb=end&retry=off&n=2', 'a=Unpinned&seed=abcdef', 'level=2&retry=free&fb=each&n=5'])('preserves pinned and unpinned settings: %s', query => {
    const state = builderStateFromQuery(query); expect(state).not.toBeNull();
    const before = new URLSearchParams(query), after = new URLSearchParams(buildQuery(state!));
    before.sort(); after.sort(); expect(after.toString()).toBe(before.toString());
  });
  it('refuses musically invalid saved settings through the app parser', () => { expect(builderStateFromQuery('cells=whole,quarter&scope=beat')).toBeNull(); });
  it('refuses a discarded seed or ambiguous duplicate setting', () => {
    expect(builderStateFromQuery('seed=bad%20seed')).toBeNull();
    expect(builderStateFromQuery('level=1&level=2')).toBeNull();
  });
});
