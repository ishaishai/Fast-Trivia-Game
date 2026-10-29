const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const pad = (n: number, width = 2) => String(Math.floor(Math.abs(n))).padStart(width, '0');

/** "20:00" in the player's local time. */
export function clockTime(epoch: number): string {
  const d = new Date(epoch);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function clockParts(epoch: number): { hh: string; mm: string; ss: string } {
  const d = new Date(epoch);
  return { hh: pad(d.getHours()), mm: pad(d.getMinutes()), ss: pad(d.getSeconds()) };
}

/** "Wed 28 Oct" */
export function dayLabel(epoch: number): string {
  const d = new Date(epoch);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function weekdayLong(epoch: number): string {
  return WEEKDAYS_LONG[new Date(epoch).getDay()];
}

export function monthShort(epoch: number): string {
  return MONTHS[new Date(epoch).getMonth()];
}

/** "02:14:09", or "14:09" under an hour. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "2 h 14 min", "14 min", "under a minute" — for sentences. */
export function humanDuration(ms: number): string {
  const minutes = Math.max(0, Math.round(ms / 60_000));
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function agoLabel(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const h = Math.floor(minutes / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}

/** 2381 → "2,381" (no Intl dependency, so it reads the same on every platform). */
export function num(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  const grouped = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return n < 0 ? `−${grouped}` : grouped;
}

/** +3, −1, 0 — with a true minus sign. */
export function signed(n: number): string {
  if (n > 0) return `+${num(n)}`;
  if (n < 0) return `−${num(-n)}`;
  return '0';
}

/** 1006 → "1,006th", grouped like every other count beside it. */
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${num(n)}th`;
  switch (n % 10) {
    case 1:
      return `${num(n)}st`;
    case 2:
      return `${num(n)}nd`;
    case 3:
      return `${num(n)}rd`;
    default:
      return `${num(n)}th`;
  }
}

export function seconds(ms: number, digits = 2): string {
  return `${(ms / 1000).toFixed(digits)}s`;
}

export function percent(part: number, whole: number): string {
  if (!whole) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}
