import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'

const SLOT_INTERVAL_MINUTES = 15

const defaultSettings = {
  openingDays: [2, 3, 4, 5, 6], // Tue-Sat (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
  timeSlots: {
    start: "09:00",
    end: "20:30",
    interval: SLOT_INTERVAL_MINUTES,
  },
  daySchedules: {
    "0": { enabled: false, ranges: [{ start: "09:00", end: "20:00" }] },
    "1": { enabled: false, ranges: [{ start: "09:00", end: "20:00" }] },
    "2": { enabled: true, ranges: [{ start: "09:00", end: "20:15" }] },
    "3": { enabled: true, ranges: [{ start: "09:00", end: "20:15" }] },
    "4": { enabled: true, ranges: [{ start: "09:00", end: "20:15" }] },
    "5": { enabled: true, ranges: [{ start: "09:00", end: "20:15" }] },
    "6": { enabled: true, ranges: [{ start: "08:30", end: "20:00" }] },
  },
  specialDateSchedules: {},
  closedDays: [0, 1], // Legacy/unused for now in new logic but kept for safety
  openDates: [], // YYYY-MM-DD overrides to force open
  closedDates: [], // YYYY-MM-DD overrides to force closed
}

const clampInterval = (value: any) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return SLOT_INTERVAL_MINUTES
  return SLOT_INTERVAL_MINUTES
}

const normalizeTimeString = (value: any, fallback: string) => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return fallback
  return trimmed
}

const normalizeRanges = (ranges: any, fallbackStart: string, fallbackEnd: string) => {
  if (!Array.isArray(ranges) || !ranges.length) {
    return [{ start: fallbackStart, end: fallbackEnd }]
  }
  const normalized = ranges
    .map((range) => ({
      start: normalizeTimeString(range?.start, fallbackStart),
      end: normalizeTimeString(range?.end, fallbackEnd),
    }))
    .filter((range) => range.start < range.end)
  return normalized.length ? normalized.slice(0, 2) : [{ start: fallbackStart, end: fallbackEnd }]
}

const normalizeScheduleConfig = (raw: any, fallbackEnabled: boolean, fallbackStart: string, fallbackEnd: string) => {
  const enabled = typeof raw?.enabled === 'boolean' ? raw.enabled : fallbackEnabled
  const legacyStart = normalizeTimeString(raw?.start, fallbackStart)
  const legacyEnd = normalizeTimeString(raw?.end, fallbackEnd)
  const ranges = normalizeRanges(raw?.ranges, legacyStart, legacyEnd)
  return {
    enabled,
    ranges,
  }
}

const buildLegacyFallbackSchedules = (input: any) => {
  const openingDays = Array.isArray(input?.openingDays) ? input.openingDays : defaultSettings.openingDays
  const start = normalizeTimeString(input?.timeSlots?.start, defaultSettings.timeSlots.start)
  const end = normalizeTimeString(input?.timeSlots?.end, defaultSettings.timeSlots.end)
  const result: Record<string, { enabled: boolean; ranges: Array<{ start: string; end: string }> }> = {}
  for (let day = 0; day <= 6; day += 1) {
    result[day.toString()] = {
      enabled: openingDays.includes(day),
      ranges: [{ start, end }],
    }
  }
  return result
}

const normalizeDaySchedules = (input: any) => {
  const fallback = buildLegacyFallbackSchedules(input)
  const incoming = input?.daySchedules ?? input?.timeSlots?.daySchedules
  if (!incoming || typeof incoming !== 'object') {
    return fallback
  }

  const normalized: Record<string, { enabled: boolean; ranges: Array<{ start: string; end: string }> }> = {}
  for (let day = 0; day <= 6; day += 1) {
    const key = day.toString()
    const fallbackDay = fallback[key] || defaultSettings.daySchedules[key as keyof typeof defaultSettings.daySchedules]
    const incomingDay = incoming[key] || incoming[day]
    normalized[key] = normalizeScheduleConfig(
      incomingDay,
      fallbackDay.enabled,
      fallbackDay.ranges[0]?.start ?? defaultSettings.timeSlots.start,
      fallbackDay.ranges[0]?.end ?? defaultSettings.timeSlots.end,
    )
  }
  return normalized
}

const normalizeSpecialDateSchedules = (input: any) => {
  const incoming = input?.specialDateSchedules ?? input?.timeSlots?.specialDateSchedules
  const normalized: Record<string, { enabled: boolean; ranges: Array<{ start: string; end: string }> }> = {}

  if (incoming && typeof incoming === 'object') {
    for (const [key, raw] of Object.entries(incoming)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
      normalized[key] = normalizeScheduleConfig(raw, true, defaultSettings.timeSlots.start, defaultSettings.timeSlots.end)
    }
  }

  const openDates = Array.isArray(input?.openDates) ? input.openDates : []
  const closedDates = Array.isArray(input?.closedDates) ? input.closedDates : []

  for (const date of openDates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    if (!normalized[date]) {
      normalized[date] = {
        enabled: true,
        ranges: [{ start: defaultSettings.timeSlots.start, end: defaultSettings.timeSlots.end }],
      }
    }
  }

  for (const date of closedDates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    normalized[date] = {
      enabled: false,
      ranges: [{ start: defaultSettings.timeSlots.start, end: defaultSettings.timeSlots.end }],
    }
  }

  return normalized
}

function normalizeSettings(input: any) {
  const timeSlots = {
    ...defaultSettings.timeSlots,
    ...(input?.timeSlots ?? {}),
    interval: clampInterval(input?.timeSlots?.interval ?? defaultSettings.timeSlots.interval),
  }

  const daySchedules = normalizeDaySchedules(input)
  const specialDateSchedules = normalizeSpecialDateSchedules(input)
  const openingDays = Object.entries(daySchedules)
    .filter(([, day]) => day.enabled)
    .map(([day]) => Number(day))
    .sort((a, b) => a - b)

  const openDates = Object.entries(specialDateSchedules)
    .filter(([, schedule]) => schedule.enabled)
    .map(([date]) => date)
    .sort()

  const closedDates = Object.entries(specialDateSchedules)
    .filter(([, schedule]) => !schedule.enabled)
    .map(([date]) => date)
    .sort()

  return {
    timeSlots,
    daySchedules,
    specialDateSchedules,
    openingDays,
    closedDays: Array.isArray(input?.closedDays) ? input.closedDays : defaultSettings.closedDays,
    openDates,
    closedDates,
  }
}

const SETTINGS_ID = 1

const ensureSettingsTable = async () => {
  await query(
    `CREATE TABLE IF NOT EXISTS settings (
      id INT NOT NULL PRIMARY KEY,
      opening_days JSON NOT NULL,
      time_slots JSON NOT NULL,
      closed_days JSON NOT NULL,
      open_dates JSON NOT NULL,
      closed_dates JSON NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  )
}

export async function GET() {
  try {
    await ensureSettingsTable()
    const rows = await query<any>(
      `SELECT id, opening_days, time_slots, closed_days, open_dates, closed_dates
       FROM settings
       WHERE id = ?
       LIMIT 1`,
      [SETTINGS_ID],
    )

    if (!rows.length) {
      await query(
        `INSERT INTO settings (id, opening_days, time_slots, closed_days, open_dates, closed_dates)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          SETTINGS_ID,
          JSON.stringify(defaultSettings.openingDays),
          JSON.stringify({ ...defaultSettings.timeSlots, daySchedules: defaultSettings.daySchedules, specialDateSchedules: defaultSettings.specialDateSchedules }),
          JSON.stringify(defaultSettings.closedDays),
          JSON.stringify(defaultSettings.openDates),
          JSON.stringify(defaultSettings.closedDates),
        ],
      )
      return NextResponse.json(defaultSettings)
    }

    const row = rows[0]
    const data = {
      openingDays: typeof row.opening_days === 'string' ? JSON.parse(row.opening_days) : row.opening_days,
      timeSlots: typeof row.time_slots === 'string' ? JSON.parse(row.time_slots) : row.time_slots,
      closedDays: typeof row.closed_days === 'string' ? JSON.parse(row.closed_days) : row.closed_days,
      openDates: typeof row.open_dates === 'string' ? JSON.parse(row.open_dates) : row.open_dates,
      closedDates: typeof row.closed_dates === 'string' ? JSON.parse(row.closed_dates) : row.closed_dates,
    }

    return NextResponse.json(normalizeSettings(data))
  } catch (error) {
    console.error('API Error /settings GET:', error)
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureSettingsTable()
    const body = await request.json()
    const normalized = normalizeSettings(body)
    await query(
      `INSERT INTO settings (id, opening_days, time_slots, closed_days, open_dates, closed_dates)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         opening_days = VALUES(opening_days),
         time_slots = VALUES(time_slots),
         closed_days = VALUES(closed_days),
         open_dates = VALUES(open_dates),
         closed_dates = VALUES(closed_dates)`,
      [
        SETTINGS_ID,
        JSON.stringify(normalized.openingDays),
        JSON.stringify({ ...normalized.timeSlots, daySchedules: normalized.daySchedules, specialDateSchedules: normalized.specialDateSchedules }),
        JSON.stringify(normalized.closedDays),
        JSON.stringify(normalized.openDates),
        JSON.stringify(normalized.closedDates),
      ],
    )
    return NextResponse.json(normalized)
  } catch (error) {
    console.error('API Error /settings POST:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}