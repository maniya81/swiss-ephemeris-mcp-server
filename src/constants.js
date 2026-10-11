// Shared Vedic reference data
export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];
export const SIGN_ABBR = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'];
export const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];
export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];
export const NAKSHATRA_SPAN = 360 / 27;
export const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
export const DASHA_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
export const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
export const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
export const PLANET_ABBR = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke', Lagna: 'La' };
export const DAY_MS = 24 * 60 * 60 * 1000;
export const SIDEREAL_YEAR_DAYS = 365.256363;
// Weekday lords, Sunday first
export const WEEKDAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

export const norm360 = (x) => ((x % 360) + 360) % 360;
export const signOf = (lon) => Math.floor(norm360(lon) / 30);
// Houses counted from sign `from` to sign `to`, 1-12
export const houseFrom = (from, to) => ((to - from + 12) % 12) + 1;
export const round = (v, digits = 4) => Math.round(v * 10 ** digits) / 10 ** digits;

export function formatDms(value) {
  let d = Math.floor(value);
  let m = Math.floor((value - d) * 60);
  let s = Math.round(((value - d) * 60 - m) * 60);
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; d += 1; }
  return `${d}°${String(m).padStart(2, '0')}'${String(s).padStart(2, '0')}"`;
}

// "Cn 15°46'05\"" style position
export const shortPosition = (lon) => `${SIGN_ABBR[signOf(lon)]} ${formatDms(norm360(lon) % 30)}`;

// Human-readable duration, e.g. "12d 04:33:10" (negative durations get a minus sign)
export function formatDuration(ms) {
  const sign = ms < 0 ? '-' : '';
  const total = Math.round(Math.abs(ms) / 1000);
  const days = Math.floor(total / 86400);
  const rest = total % 86400;
  const hh = String(Math.floor(rest / 3600)).padStart(2, '0');
  const mm = String(Math.floor((rest % 3600) / 60)).padStart(2, '0');
  const ss = String(rest % 60).padStart(2, '0');
  return `${sign}${days}d ${hh}:${mm}:${ss}`;
}
