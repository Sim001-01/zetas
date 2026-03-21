import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Resend } from 'resend'
import { createCancelToken } from '@/lib/cancel-token'
import { buildBookingConfirmationEmail } from '@/lib/booking-email'

export const runtime = 'nodejs'

const toYYYYMMDD = (value: any) => {
  if (typeof value === 'string') return value.slice(0, 10)
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(value ?? '').slice(0, 10)
}

const toHHMM = (value: any) => {
  if (typeof value === 'string') return value.slice(0, 5)
  if (value instanceof Date) return value.toTimeString().slice(0, 5)
  return String(value ?? '').slice(0, 5)
}

const targetDatePlusDays = (days: number) => {
  const now = new Date()
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const isAuthorized = (request: Request) => {
  const configuredSecret = process.env.REMINDER_CRON_SECRET
  if (!configuredSecret) return true

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    return token === configuredSecret
  }

  const url = new URL(request.url)
  return url.searchParams.get('secret') === configuredSecret
}

const ensureReminderLogTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS appointment_reminder_emails (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      appointment_id BIGINT NOT NULL,
      reminder_type VARCHAR(32) NOT NULL,
      sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_appointment_reminder (appointment_id, reminder_type)
    )
  `)
}

type AppointmentRow = {
  id: number
  client_name: string
  client_surname: string | null
  client_email: string | null
  date: string | Date
  start_time: string | Date
  end_time: string | Date
  service: string
  status: string
}

async function loadAppointmentsForDate(targetDate: string): Promise<AppointmentRow[]> {
  try {
    return await query<AppointmentRow>(
      `SELECT id, client_name, client_surname, client_email, date, start_time, end_time, service, status
       FROM appointments
       WHERE date = ?
       ORDER BY start_time ASC`,
      [targetDate],
    )
  } catch (error: any) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error
    return await query<AppointmentRow>(
      `SELECT id, name AS client_name, surname AS client_surname, email AS client_email, date, start AS start_time, end AS end_time, service, status
       FROM appointments
       WHERE date = ?
       ORDER BY start ASC`,
      [targetDate],
    )
  }
}

async function alreadySent(appointmentId: number) {
  const rows = await query<{ id: number }>(
    `SELECT id
     FROM appointment_reminder_emails
     WHERE appointment_id = ? AND reminder_type = '2_days_before'
     LIMIT 1`,
    [appointmentId],
  )
  return rows.length > 0
}

async function markSent(appointmentId: number) {
  await query(
    `INSERT INTO appointment_reminder_emails (appointment_id, reminder_type)
     VALUES (?, '2_days_before')`,
    [appointmentId],
  )
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Missing RESEND_API_KEY' }, { status: 501 })
  }

  const secret = process.env.CANCEL_TOKEN_SECRET || process.env.RESEND_API_KEY
  if (!secret) {
    return NextResponse.json({ error: 'Missing CANCEL_TOKEN_SECRET or RESEND_API_KEY' }, { status: 501 })
  }

  await ensureReminderLogTable()

  const targetDate = targetDatePlusDays(2)
  const appointments = await loadAppointmentsForDate(targetDate)
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.RESEND_FROM_EMAIL || 'no-reply@zetasbarbershop.it'
  const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin

  let scanned = 0
  let sent = 0
  let skipped = 0
  const errors: Array<{ appointmentId: number; message: string }> = []

  for (const row of appointments) {
    scanned += 1

    if (!row.client_email || row.status === 'cancelled') {
      skipped += 1
      continue
    }

    try {
      if (await alreadySent(row.id)) {
        skipped += 1
        continue
      }

      const cancelToken = createCancelToken({
        appointmentId: row.id.toString(),
        email: row.client_email,
        secret,
      })
      const cancelUrl = `${baseUrl}/disdici?id=${row.id}&token=${encodeURIComponent(cancelToken)}`

      const subject = 'Promemoria prenotazione (tra 2 giorni)'
      const html = buildBookingConfirmationEmail({
        customerName: `${row.client_name}${row.client_surname ? ` ${row.client_surname}` : ''}`,
        service: row.service,
        date: toYYYYMMDD(row.date),
        startTime: toHHMM(row.start_time),
        endTime: toHHMM(row.end_time),
        cancelUrl,
        variant: 'reminder',
      })

      try {
        await resend.emails.send({
          from,
          to: row.client_email,
          subject,
          html,
        })
      } catch {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: row.client_email,
          subject,
          html,
        })
      }

      await markSent(row.id)
      sent += 1
    } catch (error: any) {
      errors.push({ appointmentId: row.id, message: error?.message || 'Unknown error' })
    }
  }

  return NextResponse.json({
    ok: true,
    targetDate,
    scanned,
    sent,
    skipped,
    errors,
  })
}
