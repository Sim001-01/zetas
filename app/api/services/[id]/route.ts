import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export const runtime = 'nodejs'

const isDataUrl = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().toLowerCase().startsWith('data:image/')

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value)

const isSafePublicPath = (value: string) => value.startsWith('/') && !value.startsWith('//')

const normalizeImageValue = (incoming: unknown, existing?: string | null): string | null => {
  if (incoming === undefined) return existing ?? null
  if (incoming === null) return null
  if (typeof incoming !== 'string') return existing ?? null

  const trimmed = incoming.trim()
  if (!trimmed.length) return null

  if (isDataUrl(trimmed)) return trimmed
  if (isHttpUrl(trimmed)) return trimmed
  if (isSafePublicPath(trimmed)) return trimmed

  return existing ?? null
}

const serializeService = (service: any) => ({
  id: service.id.toString(),
  name: service.name,
  duration_minutes: service.duration_minutes,
  description: service.description ?? null,
  price: service.price !== null && service.price !== undefined ? Number(service.price) : null,
  img: service.img ?? null,
  created_at: service.created_at instanceof Date ? service.created_at.toISOString() : service.created_at,
})

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const idNumber = Number(params.id)
  if (Number.isNaN(idNumber)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const updates = await request.json()
  const { img: incomingImg, duration_minutes, durationMinutes, ...rest } = updates ?? {}
  const priceValue = rest?.price === undefined || rest?.price === null ? undefined : Number(rest.price)
  if (priceValue !== undefined && Number.isNaN(priceValue)) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }

  try {
    const existingRows = await query<any>(
      `SELECT id, name, duration_minutes, description, price, img, created_at
       FROM services
       WHERE id = ?
       LIMIT 1`,
      [idNumber],
    )
    const existing = existingRows[0]
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const nextImg = normalizeImageValue(incomingImg, existing.img)
    await query(
      `UPDATE services
       SET name = ?, duration_minutes = ?, description = ?, price = ?, img = ?
       WHERE id = ?`,
      [
        rest?.name ?? existing.name,
        durationMinutes ?? duration_minutes ?? existing.duration_minutes,
        rest?.description ?? existing.description,
        priceValue ?? existing.price,
        nextImg,
        idNumber,
      ],
    )

    const updatedRows = await query<any>(
      `SELECT id, name, duration_minutes, description, price, img, created_at
       FROM services
       WHERE id = ?
       LIMIT 1`,
      [idNumber],
    )
    return NextResponse.json(serializeService(updatedRows[0]))
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Service name already exists' }, { status: 409 })
    }
    console.error('API Error /services PATCH:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const idNumber = Number(params.id)
  if (Number.isNaN(idNumber)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  try {
    await query('DELETE FROM services WHERE id = ?', [idNumber])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API Error /services DELETE:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
