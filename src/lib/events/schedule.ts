/*
 * 遊戲活動的時間計算。固定週期活動以台灣時間（UTC+8，無日光節約時間）計算，
 * 與瀏覽器所在時區無關。
 */
import rawData from '../../data/events.json' with { type: 'json' };

export type Rule =
  | { type: 'monthly'; day: number; hour: number }
  | { type: 'weekly'; weekday: number; hour: number }
  | { type: 'last_monday'; hour: number };

export interface RecurringEvent {
  key: string;
  icon: string;
  image: string;
  title: string;
  schedule: string;
  calendar_date: string;
  calendar_text: string;
  rule: Rule;
}

export interface SpecialEvent {
  icon: string;
  title: string;
  description: string;
  /** ISO 8601 */
  start: string;
  end: string;
}

export interface EventsData {
  recurring: RecurringEvent[];
  special: SpecialEvent[];
}

export const DATA = rawData as unknown as EventsData;

const TAIPEI_OFFSET_MS = 8 * 3600 * 1000;

/** 台灣時間的年月日時 → 實際時間 */
function taipei(year: number, month: number, day: number, hour: number): Date {
  return new Date(Date.UTC(year, month, day, hour) - TAIPEI_OFFSET_MS);
}

/** 實際時間 → 台灣時間的各欄位（用 UTC getter 讀取） */
function toTaipeiClock(date: Date): Date {
  return new Date(date.getTime() + TAIPEI_OFFSET_MS);
}

function lastMondayOfMonth(year: number, month: number, hour: number): Date {
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const back = (lastDay.getUTCDay() + 6) % 7; // 週一為 0
  return taipei(year, month, lastDay.getUTCDate() - back, hour);
}

/** 下一次活動開始的時間；剛好等於現在時視為已開始，回傳下一次 */
export function nextOccurrence(rule: Rule, now: Date): Date {
  const clock = toTaipeiClock(now);
  const year = clock.getUTCFullYear();
  const month = clock.getUTCMonth();

  if (rule.type === 'monthly') {
    const candidate = taipei(year, month, rule.day, rule.hour);
    return candidate > now ? candidate : taipei(year, month + 1, rule.day, rule.hour);
  }
  if (rule.type === 'weekly') {
    let days = (rule.weekday - clock.getUTCDay() + 7) % 7;
    if (days === 0 && clock.getUTCHours() >= rule.hour) days = 7;
    return taipei(year, month, clock.getUTCDate() + days, rule.hour);
  }
  const candidate = lastMondayOfMonth(year, month, rule.hour);
  return candidate > now ? candidate : lastMondayOfMonth(year, month + 1, rule.hour);
}

export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function splitDuration(ms: number): Duration {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** 首頁卡片用的短格式（與舊版相同） */
export function formatCountdown(ms: number): string {
  const d = splitDuration(ms);
  if (d.days > 0) return `${d.days}天 ${d.hours}時 ${d.minutes}分`;
  if (d.hours > 0) return `${d.hours}時 ${d.minutes}分 ${d.seconds}秒`;
  return `${d.minutes}分 ${d.seconds}秒`;
}

export type SpecialStatus = 'upcoming' | 'live' | 'ended';

export function specialStatus(event: SpecialEvent, now: Date): SpecialStatus {
  if (now < new Date(event.start)) return 'upcoming';
  if (now < new Date(event.end)) return 'live';
  return 'ended';
}

/** 進行中與即將開始的限時活動，依開始時間排序 */
export function activeSpecials(events: SpecialEvent[], now: Date): (SpecialEvent & { status: SpecialStatus })[] {
  return events
    .map((event) => ({ ...event, status: specialStatus(event, now) }))
    .filter((event) => event.status !== 'ended')
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
