import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { broadcastAppointmentEvent } from '@/lib/appointments-events'
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

export async function GET() {
  let rows: any[] = []
  try {
    rows = await query<any>(
      `SELECT id, client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status, notes, created_at
       FROM appointments
       ORDER BY date ASC, start_time ASC`,
    )
  } catch (error: any) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error
    rows = await query<any>(
      `SELECT id, name AS client_name, surname AS client_surname, phone AS client_phone, email AS client_email, date, start AS start_time, end AS end_time, service, status, notes, created_at
       FROM appointments
       ORDER BY date ASC, start ASC`,
    )
  }

  const data = rows.map((row) => ({
    id: row.id.toString(),
    clientName: row.client_name,
    clientSurname: row.client_surname ?? null,
    clientPhone: row.client_phone,
    clientEmail: row.client_email ?? null,
    date: toYYYYMMDD(row.date),
    startTime: toHHMM(row.start_time),
    endTime: toHHMM(row.end_time),
    service: row.service,
    status: row.status,
    notes: row.notes ?? null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }))

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()

  if (!body?.date || !body?.startTime || !body?.clientName || !body?.service) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const normalizedPhone = typeof body.clientPhone === 'string' ? body.clientPhone.trim() : ''
  const normalizedEmail = typeof body.clientEmail === 'string' ? body.clientEmail.trim() : ''

  try {
    const params = [
      body.clientName,
      body.clientSurname ?? null,
      normalizedPhone,
      normalizedEmail || null,
      body.date,
      body.startTime,
      body.endTime ?? body.startTime,
      body.service,
      body.status ?? 'pending',
      body.notes ?? null,
    ]

    let legacySchema = false
    let slotRows: any[] = []
    try {
      slotRows = await query<any>(
        `SELECT id, status
         FROM appointments
         WHERE date = ? AND start_time = ?
         LIMIT 1`,
        [body.date, body.startTime],
      )
    } catch (error: any) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error
      legacySchema = true
      slotRows = await query<any>(
        `SELECT id, status
         FROM appointments
         WHERE date = ? AND start = ?
         LIMIT 1`,
        [body.date, body.startTime],
      )
    }

    const existingSlot = slotRows[0]
    if (existingSlot && existingSlot.status !== 'cancelled') {
      return NextResponse.json({ error: 'Slot already booked' }, { status: 409 })
    }

    let inserted: any[] = []
    if (existingSlot) {
      if (legacySchema) {
        await query(
          `UPDATE appointments
           SET name = ?, surname = ?, phone = ?, email = ?, end = ?, service = ?, status = ?, notes = ?
           WHERE id = ?`,
          [
            body.clientName,
            body.clientSurname ?? null,
            normalizedPhone,
            normalizedEmail || null,
            body.endTime ?? body.startTime,
            body.service,
            body.status ?? 'pending',
            body.notes ?? null,
            existingSlot.id,
          ],
        )
        inserted = await query<any>(
          `SELECT id, name AS client_name, surname AS client_surname, phone AS client_phone, email AS client_email, date, start AS start_time, end AS end_time, service, status, notes, created_at
           FROM appointments
           WHERE id = ?
           LIMIT 1`,
          [existingSlot.id],
        )
      } else {
        await query(
          `UPDATE appointments
           SET client_name = ?, client_surname = ?, client_phone = ?, client_email = ?, end_time = ?, service = ?, status = ?, notes = ?
           WHERE id = ?`,
          [
            body.clientName,
            body.clientSurname ?? null,
            normalizedPhone,
            normalizedEmail || null,
            body.endTime ?? body.startTime,
            body.service,
            body.status ?? 'pending',
            body.notes ?? null,
            existingSlot.id,
          ],
        )
        inserted = await query<any>(
          `SELECT id, client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status, notes, created_at
           FROM appointments
           WHERE id = ?
           LIMIT 1`,
          [existingSlot.id],
        )
      }
    } else {
      if (legacySchema) {
        await query(
          `INSERT INTO appointments
            (name, surname, phone, email, date, start, end, service, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params,
        )

        inserted = await query<any>(
          `SELECT id, name AS client_name, surname AS client_surname, phone AS client_phone, email AS client_email, date, start AS start_time, end AS end_time, service, status, notes, created_at
           FROM appointments
           ORDER BY id DESC
           LIMIT 1`,
        )
      } else {
        await query(
          `INSERT INTO appointments
            (client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params,
        )

        inserted = await query<any>(
          `SELECT id, client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status, notes, created_at
           FROM appointments
           ORDER BY id DESC
           LIMIT 1`,
        )
      }
    }

    const row = inserted[0]
    const id = row.id.toString()

    let emailSent = false
    if (row.client_email && process.env.RESEND_API_KEY) {
      try {
        const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin
        const secret = process.env.CANCEL_TOKEN_SECRET || process.env.RESEND_API_KEY
        const cancelToken = createCancelToken({
          appointmentId: id,
          email: row.client_email,
          secret,
        })
        const cancelUrl = `${baseUrl}/disdici?id=${id}&token=${encodeURIComponent(cancelToken)}`

        const resend = new Resend(process.env.RESEND_API_KEY)
        const subject = 'Avvenuta conferma prenotazione'
        const html = buildBookingConfirmationEmail({
          customerName: `${row.client_name}${row.client_surname ? ` ${row.client_surname}` : ''}`,
          service: row.service,
          date: toYYYYMMDD(row.date),
          startTime: toHHMM(row.start_time),
          endTime: toHHMM(row.end_time),
          cancelUrl,
          variant: 'confirmation',
        })

        const from = process.env.RESEND_FROM_EMAIL || 'no-reply@zetasbarbershop.it'
        try {
          await resend.emails.send({ from, to: row.client_email, subject, html })
        } catch {
          await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: row.client_email,
            subject,
            html,
          })
        }

        // Temporary immediate reminder email (requested). Later we can schedule this in advance.
        const reminderSubject = 'Promemoria prenotazione'
        const reminderHtml = buildBookingConfirmationEmail({
          customerName: `${row.client_name}${row.client_surname ? ` ${row.client_surname}` : ''}`,
          service: row.service,
          date: toYYYYMMDD(row.date),
          startTime: toHHMM(row.start_time),
          endTime: toHHMM(row.end_time),
          cancelUrl,
          variant: 'reminder',
        })

        try {
          await resend.emails.send({ from, to: row.client_email, subject: reminderSubject, html: reminderHtml })
        } catch {
          await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: row.client_email,
            subject: reminderSubject,
            html: reminderHtml,
          })
        }
        emailSent = true
      } catch (emailError) {
        console.error('Confirmation email error:', emailError)
      }
    }

    broadcastAppointmentEvent({ type: existingSlot ? 'updated' : 'created', id: row.id?.toString?.() })
    return NextResponse.json(
      {
        id,
        clientName: row.client_name,
        clientSurname: row.client_surname ?? null,
        clientPhone: row.client_phone,
        clientEmail: row.client_email ?? null,
        date: toYYYYMMDD(row.date),
        startTime: toHHMM(row.start_time),
        endTime: toHHMM(row.end_time),
        service: row.service,
        status: row.status,
        notes: row.notes ?? null,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        emailSent,
      },
      { status: 201 },
    )
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Slot already booked' }, { status: 409 })
    }
    console.error('API Error /appointments POST:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
