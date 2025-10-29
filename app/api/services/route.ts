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

export async function GET() {
  ensureDataFile()
  const raw = fs.readFileSync(DATA_PATH, 'utf-8')
  const data = JSON.parse(raw || '[]')
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  ensureDataFile()
  const body = await request.json()
  const { img: incomingImg, ...rest } = body ?? {}
  const services = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8') || '[]')
  const id = `svc-${Date.now()}`
  const imageValue = normalizeImageValue(incomingImg)
  const newSvc = {
    id,
    ...rest,
    img: imageValue,
    created_at: new Date().toISOString(),
  }
  services.push(newSvc)
  fs.writeFileSync(DATA_PATH, JSON.stringify(services, null, 2))
  return NextResponse.json(newSvc, { status: 201 })
}
