import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const idNumber = Number(params.id)
  if (Number.isNaN(idNumber)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const updates = await request.json()

  try {
    const existingRows = await query<any>(
      `SELECT id, client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status, notes, created_at
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [idNumber],
    )
    const existing = existingRows[0]
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const nextDate = updates.date ?? existing.date
    const nextStart = updates.startTime ?? existing.start_time

    await query(
      `UPDATE appointments
       SET client_name = ?, client_surname = ?, client_phone = ?, client_email = ?, date = ?, start_time = ?, end_time = ?, service = ?, status = ?, notes = ?
       WHERE id = ?`,
      [
        updates.clientName ?? existing.client_name,
        updates.clientSurname ?? existing.client_surname,
        updates.clientPhone ?? existing.client_phone,
        updates.clientEmail ?? existing.client_email,
        nextDate,
        nextStart,
        updates.endTime ?? existing.end_time,
        updates.service ?? existing.service,
        updates.status ?? existing.status,
        updates.notes ?? existing.notes,
        idNumber,
      ],
    )

    const updatedRows = await query<any>(
      `SELECT id, client_name, client_surname, client_phone, client_email, date, start_time, end_time, service, status, notes, created_at
       FROM appointments
       WHERE id = ?
       LIMIT 1`,
      [idNumber],
    )
    const row = updatedRows[0]
    return NextResponse.json({
      id: row.id.toString(),
      clientName: row.client_name,
      clientSurname: row.client_surname ?? null,
      clientPhone: row.client_phone,
      clientEmail: row.client_email ?? null,
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      service: row.service,
      status: row.status,
      notes: row.notes ?? null,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    })
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Slot already booked' }, { status: 409 })
    }
    console.error('API Error /appointments PATCH:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const idNumber = Number(params.id)
  if (Number.isNaN(idNumber)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    await query('DELETE FROM appointments WHERE id = ?', [idNumber])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error /appointments DELETE:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
