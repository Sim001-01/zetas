import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

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
  const rows = await query<any>(
    `SELECT id, client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status, notes, created_at
     FROM appointments
     ORDER BY date ASC, start_time ASC`,
  )

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

  if (!body?.date || !body?.startTime || !body?.clientName || !body?.clientPhone || !body?.service) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const params = [
      body.clientName,
      body.clientSurname ?? null,
      body.clientPhone,
      body.clientEmail ?? null,
      body.date,
      body.startTime,
      body.endTime ?? body.startTime,
      body.service,
      body.status ?? 'pending',
      body.notes ?? null,
    ]

    await query(
      `INSERT INTO appointments
        (client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params,
    )

    const inserted = await query<any>(
      `SELECT id, client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status, notes, created_at
       FROM appointments
       WHERE date = ? AND start_time = ?
       ORDER BY id DESC
       LIMIT 1`,
      [body.date, body.startTime],
    )

    const row = inserted[0]
    return NextResponse.json(
      {
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
