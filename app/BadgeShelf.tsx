'use client';
import { BADGES, currentStreak, longestStreak, streakText, type BadgeState } from '../src/badges';

/* The quiet record of what has been earned on this device. Every badge is
   listed with its rule, so "Not yet" says what to do rather than hiding it,
   and earned/not-yet is written out, never shown by colour alone. */
export default function BadgeShelf({ state }: { state: BadgeState }) {
  const earned = BADGES.filter(badge => state.earned[badge.id]).length;
  const best = longestStreak(state.days);
  return <section className="badge-shelf" aria-labelledby="badge-shelf-title">
    <h2 id="badge-shelf-title">Badges</h2>
    <p>{earned} of {BADGES.length} earned on this device. {streakText(currentStreak(state.days))}{best > 1 ? ` Longest: ${best} days.` : ''}</p>
    <ul>
      {BADGES.map(badge => {
        const on = state.earned[badge.id];
        return <li key={badge.id} className={on ? 'is-earned' : undefined}>
          <span className="badge-mark" aria-hidden="true">{on ? '★' : '○'}</span>
          <span><strong>{badge.name}</strong> <span className="badge-status">{on ? `Earned ${on}` : 'Not yet'}</span><br />{badge.rule}</span>
        </li>;
      })}
    </ul>
    <p className="badge-note">Badges do not change scores or what you submit. Clearing browser data removes them.</p>
  </section>;
}
