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

export async function GET() {
  let rows: any[] = []
  try {
    rows = await query<any>(
      `SELECT id, name, duration_minutes, description, price, img, created_at
       FROM services
       ORDER BY name ASC`,
    )
  } catch (error: any) {
    if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error
    rows = await query<any>(
      `SELECT id, name, duration_minutes, description, price, NULL AS img, created_at
       FROM services
       ORDER BY name ASC`,
    )
  }
  return NextResponse.json(rows.map(serializeService))
}

export async function POST(request: Request) {
  const body = await request.json()
  const { img: incomingImg, duration_minutes, durationMinutes, ...rest } = body ?? {}
  const imageValue = normalizeImageValue(incomingImg)
  const trimmedName = typeof rest?.name === 'string' ? rest.name.trim() : ''
  if (!trimmedName) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 })
  }
  const priceValue = rest?.price === undefined || rest?.price === null ? null : Number(rest.price)
  if (priceValue !== null && Number.isNaN(priceValue)) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }

  try {
    let rows: any[] = []
    try {
      await query(
        `INSERT INTO services (name, duration_minutes, description, price, img)
         VALUES (?, ?, ?, ?, ?)`,
        [trimmedName, durationMinutes ?? duration_minutes ?? 30, rest?.description ?? null, priceValue, imageValue],
      )
      rows = await query<any>(
        `SELECT id, name, duration_minutes, description, price, img, created_at
         FROM services
         WHERE name = ?
         ORDER BY id DESC
         LIMIT 1`,
        [trimmedName],
      )
    } catch (error: any) {
      if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error
      await query(
        `INSERT INTO services (name, duration_minutes, description, price)
         VALUES (?, ?, ?, ?)`,
        [trimmedName, durationMinutes ?? duration_minutes ?? 30, rest?.description ?? null, priceValue],
      )
      rows = await query<any>(
        `SELECT id, name, duration_minutes, description, price, NULL AS img, created_at
         FROM services
         WHERE name = ?
         ORDER BY id DESC
         LIMIT 1`,
        [trimmedName],
      )
    }
    return NextResponse.json(serializeService(rows[0]), { status: 201 })
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Service name already exists' }, { status: 409 })
    }
    console.error('API Error /services POST:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}
