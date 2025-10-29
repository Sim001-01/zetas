import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data', 'services.json')
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

function ensureDataFile() {
  const dir = path.dirname(DATA_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DATA_PATH)) fs.writeFileSync(DATA_PATH, '[]')
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  ensureDataFile()
  const id = params.id
  const updates = await request.json()
  const services = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8') || '[]')
  const idx = services.findIndex((s: any) => s.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { img: incomingImg, ...rest } = updates ?? {}
  const existing = services[idx] || {}
  const nextImg = normalizeImageValue(incomingImg, existing.img)
  services[idx] = { ...existing, ...rest, img: nextImg }
  fs.writeFileSync(DATA_PATH, JSON.stringify(services, null, 2))
  return NextResponse.json(services[idx])
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  ensureDataFile()
  const id = params.id
  const services = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8') || '[]')
  const filtered = services.filter((s: any) => s.id !== id)
  fs.writeFileSync(DATA_PATH, JSON.stringify(filtered, null, 2))
  return NextResponse.json({ success: true })
}
