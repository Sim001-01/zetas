import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'

const defaultSettings = {
  openingDays: [2, 3, 4, 5, 6], // Tue-Sat (0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)
  timeSlots: {
    start: "09:00",
    end: "20:30",
    interval: 30,
  },
  closedDays: [0, 1], // Legacy/unused for now in new logic but kept for safety
  openDates: [], // YYYY-MM-DD overrides to force open
  closedDates: [], // YYYY-MM-DD overrides to force closed
}

function normalizeSettings(input: any) {
  const timeSlots = {
    ...defaultSettings.timeSlots,
    ...(input?.timeSlots ?? {}),
  }

  return {
    timeSlots,
    openingDays: Array.isArray(input?.openingDays) ? input.openingDays : defaultSettings.openingDays,
    closedDays: Array.isArray(input?.closedDays) ? input.closedDays : defaultSettings.closedDays,
    openDates: Array.isArray(input?.openDates) ? input.openDates : defaultSettings.openDates,
    closedDates: Array.isArray(input?.closedDates) ? input.closedDates : defaultSettings.closedDates,
  }
}

const SETTINGS_ID = 1

export async function GET() {
  try {
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
          JSON.stringify(defaultSettings.timeSlots),
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
        JSON.stringify(normalized.timeSlots),
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