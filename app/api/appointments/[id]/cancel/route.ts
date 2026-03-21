import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyCancelToken } from '@/lib/cancel-token'
import { broadcastAppointmentEvent } from '@/lib/appointments-events'

export const runtime = 'nodejs'

async function findAppointmentById(idNumber: number) {
  try {
    const rows = await query<any>(
      `SELECT id, client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [idNumber],
    )
    return rows[0] ?? null
  } catch (error: any) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error
    const rows = await query<any>(
      `SELECT id, name AS client_name, surname AS client_surname, phone AS client_phone, email AS client_email, date, start AS start_time, end AS end_time, service, status
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [idNumber],
    )
    return rows[0] ?? null
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const idNumber = Number(params.id)
  if (Number.isNaN(idNumber)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const secret = process.env.CANCEL_TOKEN_SECRET || process.env.RESEND_API_KEY
  if (!secret) {
    return NextResponse.json({ error: 'Missing CANCEL_TOKEN_SECRET or RESEND_API_KEY' }, { status: 501 })
  }

  const token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const row = await findAppointmentById(idNumber)
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!row.client_email) {
    return NextResponse.json({ error: 'No email associated with appointment' }, { status: 400 })
  }

  const valid = verifyCancelToken({
    token,
    appointmentId: String(idNumber),
    email: row.client_email,
    secret,
  })

  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  return NextResponse.json({
    id: row.id.toString(),
    clientName: row.client_name,
    clientSurname: row.client_surname ?? null,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    service: row.service,
    date: String(row.date).slice(0, 10),
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    status: row.status,
  })
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const idNumber = Number(params.id)
  if (Number.isNaN(idNumber)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const secret = process.env.CANCEL_TOKEN_SECRET || process.env.RESEND_API_KEY
  if (!secret) {
    return NextResponse.json({ error: 'Missing CANCEL_TOKEN_SECRET or RESEND_API_KEY' }, { status: 501 })
  }

  const body = await request.json().catch(() => ({}))
  const token = body?.token
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const row = await findAppointmentById(idNumber)
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!row.client_email) {
    return NextResponse.json({ error: 'No email associated with appointment' }, { status: 400 })
  }

  const valid = verifyCancelToken({
    token,
    appointmentId: String(idNumber),
    email: row.client_email,
    secret,
  })

  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  if (row.status !== 'cancelled') {
    await query('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', idNumber])
    broadcastAppointmentEvent({ type: 'updated', id: idNumber.toString() })
  }

  return NextResponse.json({ success: true })
}
