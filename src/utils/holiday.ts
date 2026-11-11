/**
 * Date-aware catalogue events for Picharo.
 *
 * `getCatalogEventsForDate` returns every major holiday, religious observance,
 * film-festival window and awards-season window that contains the given date.
 * Results are ordered by priority, with major holidays first and broad
 * season-long themes last, so the first item is usually the best title.
 * Every event definition has at least three candidate titles; each call picks
 * one at random for `title` and exposes the full list as `titles`.
 *
 * Date-only strings are parsed as calendar dates: `YYYY-MM-DD`, `YYYY/MM/DD`,
 * `DD/MM/YYYY` and `DD/MMM/YYYY` are supported. `Date` objects and timestamps
 * use the runtime's local calendar date.
 *
 * Islamic and Hebrew holiday dates (Ramadan, Eid, Passover, Rosh Hashanah and
 * Hanukkah) are resolved with the runtime's ICU calendar data (Node ships with
 * full ICU). Lunar New Year, Holi and Diwali dates are curated for 2024-2035
 * because they depend on astronomical or regional calendar conventions.
 */

export type CatalogEventKind =
  | "holiday"
  | "religious"
  | "cultural"
  | "award-season"
  | "film-festival"
  | "season";

export type CatalogEventId =
  | "new-year"
  | "lunar-new-year"
  | "valentines-day"
  | "carnival"
  | "st-patricks-day"
  | "holi"
  | "nowruz"
  | "easter"
  | "orthodox-easter"
  | "ramadan"
  | "eid-al-fitr"
  | "eid-al-adha"
  | "passover"
  | "rosh-hashanah"
  | "hanukkah"
  | "diwali"
  | "day-of-the-dead"
  | "thanksgiving"
  | "halloween"
  | "christmas"
  | "orthodox-christmas"
  | "pride"
  | "summer-blockbusters"
  | "awards-season"
  | "golden-globes"
  | "sundance"
  | "bafta"
  | "berlinale"
  | "oscars"
  | "sxsw"
  | "cannes"
  | "tribeca"
  | "venice"
  | "tiff"
  | "emmys";

/** Kept as an alias for callers that used the original single-holiday API. */
export type HolidayId = CatalogEventId;

export interface Holiday {
  id: HolidayId;
  /** Catchy catalogue title, for example "Merry Everything: Christmas". */
  title: string;
  /** Tags that can be used to build a seasonal catalogue or query. */
  genres: string[];
}

export interface CatalogEvent extends Holiday {
  /** Every candidate title for this event; at least three. */
  titles: string[];
  kind: CatalogEventKind;
  /** Short, Netflix-style catalogue description. */
  description: string;
  /** Where the event is widely observed. `"worldwide"` means global. */
  regions: string[];
  /** Inclusive start of this occurrence, formatted as `YYYY-MM-DD`. */
  startsOn: string;
  /** Inclusive end of this occurrence, formatted as `YYYY-MM-DD`. */
  endsOn: string;
  /** Higher values are more specific and appear first in results. */
  priority: number;
}

export type HolidayDateInput = Date | string | number;

interface CalendarDate {
  year: number;
  /** 1-12 */
  month: number;
  day: number;
}

interface DateWindow {
  start: CalendarDate;
  end: CalendarDate;
}

type MonthDay = readonly [month: number, day: number];

/** At least three distinct candidate titles per event. */
type EventTitles = readonly [string, string, string, ...string[]];

interface EventDefinition {
  id: HolidayId;
  titles: EventTitles;
  genres: string[];
  kind: CatalogEventKind;
  description: string;
  regions: string[];
  priority: number;
  windowFor: (date: CalendarDate) => DateWindow | null;
}

const MILLISECONDS_PER_DAY = 86_400_000;

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

const ISO_DATE = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/;
const DAY_MONTH_YEAR_NUMERIC = /^(\d{1,2})[/\-\s.]+(\d{1,2})[/\-\s.]+(\d{4})$/;
const DAY_MONTH_YEAR_NAMED =
  /^(\d{1,2})[/\-\s.]+([a-z]{3,9})[/\-\s.]+(\d{4})$/i;

function monthFromName(name: string): number | null {
  const normalized = name.toLowerCase();
  if (normalized.length < 3) return null;

  const index = MONTH_NAMES.findIndex(
    (month) => month.slice(0, 3) === normalized.slice(0, 3),
  );

  return index === -1 ? null : index + 1;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  const days = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ] as const;

  return days[month - 1] ?? 0;
}

function isValidCalendarDate({ year, month, day }: CalendarDate): boolean {
  return (
    Number.isInteger(year) &&
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month)
  );
}

function assertValidDate(date: CalendarDate, input: string): CalendarDate {
  if (!isValidCalendarDate(date)) {
    throw new TypeError(`Invalid date: ${input}`);
  }

  return date;
}

function parseDateString(value: string): CalendarDate | null {
  const trimmed = value.trim();

  const isoMatch = ISO_DATE.exec(trimmed);
  if (isoMatch) {
    return assertValidDate(
      {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        day: Number(isoMatch[3]),
      },
      value,
    );
  }

  const numericMatch = DAY_MONTH_YEAR_NUMERIC.exec(trimmed);
  if (numericMatch) {
    return assertValidDate(
      {
        year: Number(numericMatch[3]),
        month: Number(numericMatch[2]),
        day: Number(numericMatch[1]),
      },
      value,
    );
  }

  const namedMatch = DAY_MONTH_YEAR_NAMED.exec(trimmed);
  if (namedMatch) {
    const month = monthFromName(namedMatch[2]);
    if (month === null) {
      throw new TypeError(`Invalid date: ${value}`);
    }

    return assertValidDate(
      {
        year: Number(namedMatch[3]),
        month,
        day: Number(namedMatch[1]),
      },
      value,
    );
  }

  return null;
}

function resolveCalendarDate(input: HolidayDateInput): CalendarDate {
  if (typeof input === "string") {
    const parsed = parseDateString(input);
    if (parsed) return parsed;
  }

  let date: Date;
  if (input instanceof Date) {
    date = input;
  } else if (typeof input === "number") {
    date = new Date(input);
  } else {
    date = new Date(input);
  }

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid date: ${String(input)}`);
  }

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function dateToUtc(date: CalendarDate): Date {
  return new Date(Date.UTC(date.year, date.month - 1, date.day));
}

function fromUtcDate(date: Date): CalendarDate {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const next = dateToUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return fromUtcDate(next);
}

function dayNumber(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / MILLISECONDS_PER_DAY;
}

function compareDates(a: CalendarDate, b: CalendarDate): number {
  return dayNumber(a) - dayNumber(b);
}

function containsDate(
  start: CalendarDate,
  end: CalendarDate,
  date: CalendarDate,
): boolean {
  return compareDates(start, date) <= 0 && compareDates(date, end) <= 0;
}

function formatIsoDate(date: CalendarDate): string {
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

function monthDayValue(month: number, day: number): number {
  return month * 100 + day;
}

function pickRandomTitle(titles: EventTitles): string {
  return titles[Math.floor(Math.random() * titles.length)] ?? titles[0];
}

/**
 * A window expressed as a month/day pair. If the end is before the start, the
 * window wraps across New Year (for example 28 Dec - 2 Jan).
 */
function annualWindow(start: MonthDay, end: MonthDay) {
  const startValue = monthDayValue(start[0], start[1]);
  const endValue = monthDayValue(end[0], end[1]);
  const wrapsYear = startValue > endValue;

  return (date: CalendarDate): DateWindow | null => {
    const value = monthDayValue(date.month, date.day);

    if (!wrapsYear) {
      if (value < startValue || value > endValue) return null;
      return {
        start: { year: date.year, month: start[0], day: start[1] },
        end: { year: date.year, month: end[0], day: end[1] },
      };
    }

    if (value >= startValue) {
      return {
        start: { year: date.year, month: start[0], day: start[1] },
        end: { year: date.year + 1, month: end[0], day: end[1] },
      };
    }

    if (value <= endValue) {
      return {
        start: { year: date.year - 1, month: start[0], day: start[1] },
        end: { year: date.year, month: end[0], day: end[1] },
      };
    }

    return null;
  };
}

/** A fixed start date and a duration in days, within the same calendar year. */
function fixedWindow(start: MonthDay, days: number) {
  return (date: CalendarDate): DateWindow | null => {
    const startDate = { year: date.year, month: start[0], day: start[1] };
    const endDate = addDays(startDate, days - 1);
    return containsDate(startDate, endDate, date)
      ? { start: startDate, end: endDate }
      : null;
  };
}

function windowAround(
  target: CalendarDate,
  before: number,
  after: number,
): DateWindow {
  return {
    start: addDays(target, -before),
    end: addDays(target, after),
  };
}

function matchWindow(
  window: DateWindow,
  date: CalendarDate,
): DateWindow | null {
  return containsDate(window.start, window.end, date) ? window : null;
}

/** Western (Gregorian) Easter Sunday. */
function easterSunday(year: number): CalendarDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return { year, month, day };
}

function easterWindow(date: CalendarDate): DateWindow | null {
  return matchWindow(windowAround(easterSunday(date.year), 7, 1), date);
}

/** Julian calendar date to Gregorian calendar date. */
function julianToGregorian(
  year: number,
  month: number,
  day: number,
): CalendarDate {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const julianDayNumber =
    day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;

  const j = julianDayNumber + 32044;
  const b = Math.floor((4 * j + 3) / 146097);
  const c = j - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const g = Math.floor((5 * e + 2) / 153);
  const gregorianDay = e - Math.floor((153 * g + 2) / 5) + 1;
  const gregorianMonth = g + 3 - 12 * Math.floor(g / 10);
  const gregorianYear = 100 * b + d - 4800 + Math.floor(g / 10);

  return {
    year: gregorianYear,
    month: gregorianMonth,
    day: gregorianDay,
  };
}

/** Orthodox Easter Sunday, converted from the Julian calendar. */
function orthodoxEasterSunday(year: number): CalendarDate {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;

  return julianToGregorian(year, month, day);
}

function orthodoxEasterWindow(date: CalendarDate): DateWindow | null {
  return matchWindow(windowAround(orthodoxEasterSunday(date.year), 7, 1), date);
}

/** Fourth Thursday of November (US Thanksgiving). */
function thanksgivingDay(year: number): CalendarDate {
  const firstOfNovember = new Date(Date.UTC(year, 10, 1));
  const offset = (4 - firstOfNovember.getUTCDay() + 7) % 7;

  return { year, month: 11, day: 1 + offset + 21 };
}

function thanksgivingWindow(date: CalendarDate): DateWindow | null {
  return matchWindow(windowAround(thanksgivingDay(date.year), 3, 3), date);
}

/** Carnival week ending on Fat Tuesday (47 days before Western Easter). */
function carnivalWindow(date: CalendarDate): DateWindow | null {
  const fatTuesday = addDays(easterSunday(date.year), -47);
  return matchWindow(windowAround(fatTuesday, 4, 0), date);
}

type CalendarSystem = "hebrew" | "islamic-umalqura";

interface CalendarParts {
  year: number;
  /** Normalized month name for Hebrew; numeric month string otherwise. */
  month: string;
  day: number;
}

const CALENDAR_FORMATTERS = new Map<CalendarSystem, Intl.DateTimeFormat>();
const CALENDAR_PARTS_CACHE = new Map<string, CalendarParts>();
const MAX_CALENDAR_CACHE = 4096;

function calendarFormatter(system: CalendarSystem): Intl.DateTimeFormat {
  const existing = CALENDAR_FORMATTERS.get(system);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat(`en-u-ca-${system}-nu-latn`, {
    year: "numeric",
    month: system === "hebrew" ? "long" : "numeric",
    day: "numeric",
    timeZone: "UTC",
  });

  CALENDAR_FORMATTERS.set(system, formatter);
  return formatter;
}

function normalizeMonthName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function readCalendar(
  system: CalendarSystem,
  date: CalendarDate,
): CalendarParts {
  const cacheKey = `${system}:${date.year}-${date.month}-${date.day}`;
  const cached = CALENDAR_PARTS_CACHE.get(cacheKey);
  if (cached) return cached;

  const parts = calendarFormatter(system).formatToParts(dateToUtc(date));
  const values: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  const parsed: CalendarParts = {
    year: Number(values["relatedYear"] ?? values["year"]),
    month:
      system === "hebrew"
        ? normalizeMonthName(values["month"] ?? "")
        : (values["month"] ?? ""),
    day: Number(values["day"]),
  };

  if (CALENDAR_PARTS_CACHE.size >= MAX_CALENDAR_CACHE) {
    CALENDAR_PARTS_CACHE.clear();
  }
  CALENDAR_PARTS_CACHE.set(cacheKey, parsed);

  return parsed;
}

function findOccurrence(
  date: CalendarDate,
  system: CalendarSystem,
  matches: (parts: CalendarParts) => boolean,
  searchDays: number,
): CalendarDate | null {
  for (let offset = -searchDays; offset <= searchDays; offset += 1) {
    const candidate = addDays(date, offset);
    if (matches(readCalendar(system, candidate))) return candidate;
  }

  return null;
}

function calendarWindow(
  system: CalendarSystem,
  isNear: (parts: CalendarParts) => boolean,
  isStart: (parts: CalendarParts) => boolean,
  before: number,
  after: number,
  searchDays: number,
) {
  return (date: CalendarDate): DateWindow | null => {
    if (!isNear(readCalendar(system, date))) return null;

    const start = findOccurrence(date, system, isStart, searchDays);
    if (!start) return null;

    const windowStart = addDays(start, -before);
    const windowEnd = addDays(start, after);

    return containsDate(windowStart, windowEnd, date)
      ? { start: windowStart, end: windowEnd }
      : null;
  };
}

function ramadanWindow(date: CalendarDate): DateWindow | null {
  const parts = readCalendar("islamic-umalqura", date);
  const isNear =
    parts.month === "9" || (parts.month === "8" && parts.day >= 29);

  if (!isNear) return null;

  const start = findOccurrence(
    date,
    "islamic-umalqura",
    (candidate) => candidate.month === "9" && candidate.day === 1,
    32,
  );

  if (!start) return null;

  const nextShawwal = findOccurrence(
    addDays(start, 25),
    "islamic-umalqura",
    (candidate) => candidate.month === "10" && candidate.day === 1,
    10,
  );

  const end = nextShawwal ? addDays(nextShawwal, -1) : addDays(start, 29);
  const windowStart = addDays(start, -1);

  return containsDate(windowStart, end, date)
    ? { start: windowStart, end }
    : null;
}

type YearTable = Readonly<Record<number, MonthDay>>;

function tableWindow(table: YearTable, before: number, after: number) {
  return (date: CalendarDate): DateWindow | null => {
    const monthDay = table[date.year];
    if (!monthDay) return null;

    const target = {
      year: date.year,
      month: monthDay[0],
      day: monthDay[1],
    };

    return matchWindow(windowAround(target, before, after), date);
  };
}

/** Lunar New Year (Spring Festival) dates, from the Hong Kong Observatory. */
const LUNAR_NEW_YEAR_DATES: YearTable = {
  2024: [2, 10],
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
  2032: [2, 11],
  2033: [1, 31],
  2034: [2, 19],
  2035: [2, 8],
};

/**
 * Holi / Rangwali Holi dates. The main day shifts by region and panchang, so
 * the catalogue window includes the day before and after.
 */
const HOLI_DATES: YearTable = {
  2024: [3, 25],
  2025: [3, 14],
  2026: [3, 4],
  2027: [3, 22],
  2028: [3, 11],
  2029: [3, 1],
  2030: [3, 20],
  2031: [3, 9],
  2032: [3, 27],
  2033: [3, 16],
  2034: [3, 5],
  2035: [3, 23],
};

/** Diwali / Lakshmi Puja dates for North India. */
const DIWALI_DATES: YearTable = {
  2024: [10, 31],
  2025: [10, 20],
  2026: [11, 8],
  2027: [10, 29],
  2028: [10, 17],
  2029: [11, 5],
  2030: [10, 26],
  2031: [11, 14],
  2032: [11, 2],
  2033: [10, 22],
  2034: [11, 10],
  2035: [10, 30],
};

const EVENTS: readonly EventDefinition[] = [
  {
    id: "new-year",
    titles: [
      "New Year, New Binge",
      "Midnight, Maybe",
      "The Countdown Collection",
    ],
    genres: ["new year", "party", "comedy", "romance", "music"],
    kind: "holiday",
    description:
      "Sparkling comedies, midnight romances and feel-good favourites to start the year with a bang.",
    regions: ["worldwide"],
    priority: 100,
    windowFor: annualWindow([12, 28], [1, 2]),
  },
  {
    id: "lunar-new-year",
    titles: [
      "Lunar New Year: Fortune Favours the Binge",
      "Red Envelopes & Plot Twists",
      "A Feast of Fortune",
    ],
    genres: [
      "lunar new year",
      "family",
      "festive",
      "animation",
      "adventure",
      "food",
    ],
    kind: "cultural",
    description:
      "Family reunions, auspicious adventures and feast-worthy stories for the Spring Festival.",
    regions: ["worldwide"],
    priority: 95,
    windowFor: tableWindow(LUNAR_NEW_YEAR_DATES, 1, 14),
  },
  {
    id: "valentines-day",
    titles: ["Love at First Stream", "Be Mine, Binge", "Two Hearts, One Queue"],
    genres: ["valentines", "romance", "romantic comedy", "drama"],
    kind: "holiday",
    description:
      "Swoon-worthy romances, sharp rom-coms and slow-burn dramas for the season of love.",
    regions: ["worldwide"],
    priority: 100,
    windowFor: annualWindow([2, 7], [2, 14]),
  },
  {
    id: "carnival",
    titles: [
      "Carnival: Rhythm & Reels",
      "Feathers, Funk & Film",
      "The Parade Never Ends",
    ],
    genres: ["carnival", "music", "dance", "comedy", "culture"],
    kind: "cultural",
    description:
      "Colourful musicals, joyful comedies and dance-fuelled stories for carnival week.",
    regions: ["worldwide", "Brazil"],
    priority: 90,
    windowFor: carnivalWindow,
  },
  {
    id: "st-patricks-day",
    titles: [
      "St. Patrick's Day: Luck of the Irish",
      "Craic on Camera",
      "The Green Light",
    ],
    genres: ["st patricks day", "irish", "comedy", "adventure", "fantasy"],
    kind: "cultural",
    description:
      "Charming comedies, lucky adventures and a little Irish magic for the craic.",
    regions: ["Ireland", "worldwide"],
    priority: 90,
    windowFor: fixedWindow([3, 15], 3),
  },
  {
    id: "holi",
    titles: [
      "Holi: Colour Your World",
      "A Rainbow in Every Frame",
      "Paint the Town",
    ],
    genres: ["holi", "colourful", "music", "dance", "family", "comedy"],
    kind: "religious",
    description:
      "Vibrant musicals, joyful comedies and springtime stories for the festival of colours.",
    regions: ["India", "Nepal", "worldwide"],
    priority: 95,
    windowFor: tableWindow(HOLI_DATES, 1, 1),
  },
  {
    id: "nowruz",
    titles: [
      "Nowruz: A New Day, A New Season",
      "Spring Has Entered the Chat",
      "Seven Plates, One Fresh Start",
    ],
    genres: ["nowruz", "spring", "family", "music", "drama"],
    kind: "cultural",
    description:
      "Renewal, family and fresh beginnings from Persian and Central Asian storytellers.",
    regions: ["Iran", "Central Asia", "worldwide"],
    priority: 90,
    windowFor: fixedWindow([3, 19], 3),
  },
  {
    id: "easter",
    titles: ["Hoppy Easter", "Egg-Spect the Unexpected", "Some Bunny to Watch"],
    genres: ["easter", "family", "animation", "adventure", "faith"],
    kind: "religious",
    description:
      "Egg hunts, animated adventures and uplifting family films for Easter weekend.",
    regions: ["worldwide"],
    priority: 100,
    windowFor: easterWindow,
  },
  {
    id: "orthodox-easter",
    titles: [
      "Orthodox Easter: Renewal & Light",
      "Candles at Midnight",
      "A Season of Light",
    ],
    genres: ["orthodox easter", "faith", "history", "drama", "family"],
    kind: "religious",
    description:
      "Faith, history and renewal for Orthodox Easter celebrations around the world.",
    regions: ["worldwide"],
    priority: 95,
    windowFor: orthodoxEasterWindow,
  },
  {
    id: "ramadan",
    titles: [
      "Ramadan Nights: Slow Burn & Soul",
      "Supper, Story, Repeat",
      "Moonlight & Reflection",
    ],
    genres: ["ramadan", "faith", "drama", "family", "reflection"],
    kind: "religious",
    description:
      "Reflective dramas, family stories and spiritual cinema for the holy month.",
    regions: ["worldwide"],
    priority: 95,
    windowFor: ramadanWindow,
  },
  {
    id: "eid-al-fitr",
    titles: [
      "Eid Mubarak: Together in Story",
      "Feast Mode On",
      "One Last Sweet Bite",
    ],
    genres: ["eid", "faith", "family", "comedy", "feast"],
    kind: "religious",
    description:
      "Warm family comedies, celebratory dramas and feel-good stories for Eid.",
    regions: ["worldwide"],
    priority: 100,
    windowFor: calendarWindow(
      "islamic-umalqura",
      (parts) => parts.month === "10" && parts.day <= 4,
      (parts) => parts.month === "10" && parts.day === 1,
      0,
      2,
      5,
    ),
  },
  {
    id: "eid-al-adha",
    titles: [
      "Eid al-Adha: A Feast for the Senses",
      "A Table for Everyone",
      "Faith, Family, Feast",
    ],
    genres: ["eid al-adha", "faith", "family", "drama", "sacrifice"],
    kind: "religious",
    description:
      "Stories of sacrifice, family and faith for the Feast of the Sacrifice.",
    regions: ["worldwide"],
    priority: 100,
    windowFor: calendarWindow(
      "islamic-umalqura",
      (parts) => parts.month === "12" && parts.day >= 9 && parts.day <= 13,
      (parts) => parts.month === "12" && parts.day === 10,
      1,
      3,
      6,
    ),
  },
  {
    id: "passover",
    titles: [
      "Passover: A Story of Freedom",
      "The Long Way Home",
      "Four Questions, One Answer",
    ],
    genres: ["passover", "faith", "history", "family", "drama"],
    kind: "religious",
    description:
      "Epic journeys, family sagas and stories of freedom for Passover.",
    regions: ["worldwide"],
    priority: 95,
    windowFor: calendarWindow(
      "hebrew",
      (parts) => parts.month === "nisan" && parts.day >= 14 && parts.day <= 22,
      (parts) => parts.month === "nisan" && parts.day === 15,
      1,
      7,
      10,
    ),
  },
  {
    id: "rosh-hashanah",
    titles: [
      "Rosh Hashanah: A Sweet New Chapter",
      "Apples, Honey & Fresh Starts",
      "The Book of New Beginnings",
    ],
    genres: ["rosh hashanah", "faith", "family", "drama", "new year"],
    kind: "religious",
    description:
      "New beginnings, family rituals and thoughtful dramas for the Jewish New Year.",
    regions: ["worldwide"],
    priority: 95,
    windowFor: calendarWindow(
      "hebrew",
      (parts) =>
        (parts.month === "elul" && parts.day === 29) ||
        (parts.month === "tishri" && parts.day <= 2),
      (parts) => parts.month === "tishri" && parts.day === 1,
      1,
      1,
      4,
    ),
  },
  {
    id: "hanukkah",
    titles: [
      "Hanukkah: Eight Nights, Endless Stories",
      "One More Candle",
      "The Eighth Night Marathon",
    ],
    genres: ["hanukkah", "faith", "family", "festive", "drama"],
    kind: "religious",
    description:
      "Festive family films, warm comedies and stories of light for all eight nights.",
    regions: ["worldwide"],
    priority: 95,
    windowFor: calendarWindow(
      "hebrew",
      (parts) =>
        (parts.month === "kislev" && parts.day >= 24) ||
        (parts.month === "tevet" && parts.day <= 3),
      (parts) => parts.month === "kislev" && parts.day === 25,
      1,
      7,
      10,
    ),
  },
  {
    id: "diwali",
    titles: [
      "Diwali: Lights, Camera, Celebration",
      "Sweeter Than Fireworks",
      "A House Full of Light",
    ],
    genres: ["diwali", "festive", "family", "romance", "comedy", "lights"],
    kind: "religious",
    description:
      "Bright family favourites, joyful romances and dazzling stories for the festival of lights.",
    regions: ["India", "Nepal", "worldwide"],
    priority: 100,
    windowFor: tableWindow(DIWALI_DATES, 2, 2),
  },
  {
    id: "day-of-the-dead",
    titles: [
      "Día de los Muertos: Remember Me",
      "Marigolds & Memories",
      "The Ancestors Are Watching",
    ],
    genres: ["day of the dead", "family", "fantasy", "music", "animation"],
    kind: "cultural",
    description:
      "Colourful animated adventures, music and family stories for Día de los Muertos.",
    regions: ["Mexico", "worldwide"],
    priority: 90,
    windowFor: fixedWindow([10, 31], 3),
  },
  {
    id: "thanksgiving",
    titles: [
      "Thanksgiving: Grateful for the Binge",
      "Pass the Plot",
      "Seconds? Always.",
    ],
    genres: ["thanksgiving", "family", "comedy", "drama", "food"],
    kind: "holiday",
    description:
      "Comfort comedies, family dramas and feel-good feasts for the long weekend.",
    regions: ["United States", "worldwide"],
    priority: 100,
    windowFor: thanksgivingWindow,
  },
  {
    id: "halloween",
    titles: [
      "Spooky Season: Halloween",
      "Fright Night Forever",
      "The Doorbell Is Ringing",
    ],
    genres: ["halloween", "spooky", "horror", "supernatural", "thriller"],
    kind: "holiday",
    description:
      "Haunted houses, supernatural thrillers and family-friendly frights for spooky season.",
    regions: ["worldwide"],
    priority: 100,
    windowFor: annualWindow([10, 1], [10, 31]),
  },
  {
    id: "christmas",
    titles: [
      "Merry Everything: Christmas",
      "Snow Place Like Home",
      "A Very Bingeable Christmas",
    ],
    genres: ["christmas", "festive", "holiday", "family", "romance", "comedy"],
    kind: "religious",
    description:
      "Cosy romances, family favourites and festive comedies for the most wonderful time of the year.",
    regions: ["worldwide"],
    priority: 100,
    windowFor: annualWindow([12, 1], [12, 27]),
  },
  {
    id: "orthodox-christmas",
    titles: [
      "Orthodox Christmas: A Winter Wonder",
      "Snowfall & Saints",
      "The Long Winter Lights",
    ],
    genres: ["orthodox christmas", "faith", "family", "winter", "drama"],
    kind: "religious",
    description:
      "Winter warmth, faith and family stories for Orthodox Christmas.",
    regions: ["worldwide"],
    priority: 95,
    windowFor: fixedWindow([1, 6], 2),
  },
  {
    id: "pride",
    titles: ["Pride: Loud & Proud", "Be Your Own First", "Rainbows After Dark"],
    genres: ["pride", "lgbtq", "romance", "drama", "comedy", "documentary"],
    kind: "cultural",
    description:
      "Bold romances, joyful comedies and powerful queer stories for Pride month.",
    regions: ["worldwide"],
    priority: 90,
    windowFor: annualWindow([6, 1], [6, 30]),
  },
  {
    id: "summer-blockbusters",
    titles: [
      "Summer Blockbuster Season",
      "Big Screen, Bigger Popcorn",
      "The $200 Million Weekend",
    ],
    genres: ["summer", "blockbuster", "action", "adventure", "comedy"],
    kind: "season",
    description:
      "Big-screen action, epic adventures and crowd-pleasing comedies for summer.",
    regions: ["worldwide"],
    priority: 40,
    windowFor: annualWindow([6, 1], [8, 31]),
  },
  {
    id: "awards-season",
    titles: [
      "Awards Season: The Frontrunners",
      "For Your Consideration",
      "The Race to the Envelope",
    ],
    genres: [
      "awards",
      "prestige",
      "drama",
      "biography",
      "critically acclaimed",
    ],
    kind: "award-season",
    description:
      "Prestige dramas, breakout performances and the films everyone will be talking about.",
    regions: ["worldwide"],
    priority: 50,
    windowFor: annualWindow([11, 1], [3, 15]),
  },
  {
    id: "golden-globes",
    titles: [
      "Golden Globes: Glamour & Grit",
      "The Table Is Serving Drama",
      "Glitz, Gowns & Surprises",
    ],
    genres: ["golden globes", "awards", "drama", "comedy", "musical"],
    kind: "award-season",
    description:
      "Glamorous winners, magnetic performances and the year's buzziest films and shows.",
    regions: ["United States", "worldwide"],
    priority: 70,
    windowFor: annualWindow([1, 1], [1, 15]),
  },
  {
    id: "sundance",
    titles: [
      "Sundance: Fresh Voices",
      "The Next Big Voice",
      "Sundance at First Sight",
    ],
    genres: ["sundance", "indie", "drama", "documentary", "discovery"],
    kind: "film-festival",
    description:
      "Bold independent voices, intimate documentaries and the next breakout filmmakers.",
    regions: ["United States", "worldwide"],
    priority: 70,
    windowFor: annualWindow([1, 15], [2, 5]),
  },
  {
    id: "bafta",
    titles: [
      "BAFTA: Best of British",
      "Tea, Prestige & Intrigue",
      "The British Are Screening",
    ],
    genres: ["bafta", "british", "drama", "prestige", "awards"],
    kind: "award-season",
    description:
      "British brilliance, prestige dramas and the performances stealing the season.",
    regions: ["United Kingdom", "worldwide"],
    priority: 70,
    windowFor: annualWindow([2, 1], [2, 28]),
  },
  {
    id: "berlinale",
    titles: [
      "Berlinale: The Golden Bear",
      "Winter Cinema, Wild Visions",
      "The Bear Goes to the Movies",
    ],
    genres: ["berlinale", "festival", "art house", "drama", "prestige"],
    kind: "film-festival",
    description:
      "Cold-weather premieres, bold world cinema and the films roaring for the Golden Bear.",
    regions: ["Germany", "worldwide"],
    priority: 70,
    windowFor: annualWindow([2, 5], [2, 25]),
  },
  {
    id: "oscars",
    titles: [
      "And the Winner Is...: The Oscars",
      "For the Record",
      "The Envelope, Please",
    ],
    genres: ["oscars", "awards", "drama", "biography", "prestige"],
    kind: "award-season",
    description:
      "The frontrunners, the speeches and the films chasing cinema's biggest prize.",
    regions: ["United States", "worldwide"],
    priority: 70,
    windowFor: annualWindow([2, 15], [3, 31]),
  },
  {
    id: "sxsw",
    titles: [
      "SXSW: Discover What's Next",
      "Austin, We Have a Film",
      "The Next Big Thing",
    ],
    genres: ["sxsw", "indie", "music", "comedy", "discovery"],
    kind: "film-festival",
    description:
      "Genre-bending debuts, music-fuelled stories and the films everyone will be quoting.",
    regions: ["United States", "worldwide"],
    priority: 70,
    windowFor: annualWindow([3, 1], [3, 20]),
  },
  {
    id: "cannes",
    titles: [
      "Cannes: The Croisette Collection",
      "Red Carpet, Blue Water",
      "The Palme d'Or Collection",
    ],
    genres: ["cannes", "festival", "art house", "drama", "prestige"],
    kind: "film-festival",
    description:
      "Arthouse gems, red-carpet premieres and the films defining the Croisette.",
    regions: ["France", "worldwide"],
    priority: 70,
    windowFor: annualWindow([5, 1], [5, 31]),
  },
  {
    id: "tribeca",
    titles: [
      "Tribeca: Stories That Stay",
      "Downtown Premieres",
      "New York, New Voices",
    ],
    genres: ["tribeca", "indie", "documentary", "drama", "new york"],
    kind: "film-festival",
    description:
      "Independent discoveries, documentaries and New York stories with staying power.",
    regions: ["United States", "worldwide"],
    priority: 70,
    windowFor: annualWindow([6, 1], [6, 30]),
  },
  {
    id: "venice",
    titles: [
      "Venice: The Golden Lion",
      "Lido Lights, Big Screen",
      "The Lion Takes the Lido",
    ],
    genres: ["venice", "festival", "art house", "drama", "prestige"],
    kind: "film-festival",
    description:
      "Lido premieres, bold arthouse visions and the films roaring into awards season.",
    regions: ["Italy", "worldwide"],
    priority: 70,
    windowFor: annualWindow([8, 25], [9, 10]),
  },
  {
    id: "tiff",
    titles: [
      "TIFF: The People's Choice",
      "Toronto's Standing Ovation",
      "Crowd-Pleasers & World Premieres",
    ],
    genres: ["tiff", "festival", "drama", "audience award", "prestige"],
    kind: "film-festival",
    description:
      "Audience favourites, world premieres and the films shaping the road to the Oscars.",
    regions: ["Canada", "worldwide"],
    priority: 70,
    windowFor: annualWindow([9, 1], [9, 20]),
  },
  {
    id: "emmys",
    titles: [
      "Emmys: Small Screen, Big Prestige",
      "TV's Biggest Night",
      "Prestige, Please",
    ],
    genres: ["emmys", "tv", "prestige", "drama", "comedy"],
    kind: "award-season",
    description:
      "Prestige television, unforgettable performances and the shows dominating the conversation.",
    regions: ["United States", "worldwide"],
    priority: 70,
    windowFor: annualWindow([9, 1], [9, 30]),
  },
];

/**
 * Returns every major holiday, religious observance, film festival or awards
 * window that contains the given date, ordered by priority.
 *
 * @example
 * getCatalogEventsForDate("24/dec/2026");
 * // [
 * //   { id: "christmas", title: "Merry Everything: Christmas", ... },
 * //   { id: "awards-season", title: "Awards Season: The Frontrunners", ... },
 * // ]
 *
 * getCatalogEventsForDate("24/dec/2027");
 * // Christmas, Hanukkah and Awards Season.
 *
 * getCatalogEventsForDate("2026-04-15");
 * // []
 */
export function getCatalogEventsForDate(
  date: HolidayDateInput,
): CatalogEvent[] {
  const calendarDate = resolveCalendarDate(date);
  const matches: CatalogEvent[] = [];

  for (const event of EVENTS) {
    const window = event.windowFor(calendarDate);
    if (!window) continue;

    matches.push({
      id: event.id,
      title: pickRandomTitle(event.titles),
      titles: [...event.titles],
      genres: [...event.genres],
      kind: event.kind,
      description: event.description,
      regions: [...event.regions],
      startsOn: formatIsoDate(window.start),
      endsOn: formatIsoDate(window.end),
      priority: event.priority,
    });
  }

  return matches.sort((a, b) => b.priority - a.priority);
}

/** Alias for `getCatalogEventsForDate`, using holiday-centric naming. */
export const getHolidaysForDate = getCatalogEventsForDate;

/**
 * Convenience wrapper for callers that only need the top catalogue event.
 * Returns `null` when the date has no matching event.
 */
export function getHolidayForDate(date: HolidayDateInput): CatalogEvent | null {
  const [event] = getCatalogEventsForDate(date);
  return event ?? null;
}
