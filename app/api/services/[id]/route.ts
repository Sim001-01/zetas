import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data', 'services.json')
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'services')

export const runtime = 'nodejs'

const isDataUrl = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('data:image/')

const ensureUploadsDir = () => {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

const sanitizeStoredImagePath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/uploads/services/')) return null
  return value
}

const deleteStoredImage = (storedPath: string | null | undefined) => {
  if (!storedPath) return
  const sanitized = sanitizeStoredImagePath(storedPath)
  if (!sanitized) return
  const absolute = path.join(process.cwd(), 'public', sanitized.replace(/^\//, ''))
  if (!absolute.startsWith(path.join(process.cwd(), 'public'))) return
  if (fs.existsSync(absolute)) {
    try {
      fs.unlinkSync(absolute)
    } catch (error) {
      // ignore cleanup failures
    }
  }
}

const writeImageFromDataUrl = (dataUrl: string): string | null => {
  if (!isDataUrl(dataUrl)) return null
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const [, mime, base64Content] = match
  const extension = (() => {
    const subtype = mime.split('/')[1] ?? 'jpeg'
    if (subtype.includes('svg')) return 'svg'
    if (subtype.includes('png')) return 'png'
    if (subtype.includes('webp')) return 'webp'
    if (subtype.includes('gif')) return 'gif'
    if (subtype.includes('bmp')) return 'bmp'
    return 'jpg'
  })()

  ensureUploadsDir()
  const filename = `svc-${Date.now()}-${randomUUID()}.${extension}`
  const absolute = path.join(UPLOADS_DIR, filename)
  try {
    const buffer = Buffer.from(base64Content, 'base64')
    fs.writeFileSync(absolute, buffer)
    return `/uploads/services/${filename}`
  } catch (error) {
    return null
  }
}

const processIncomingImage = (incoming: unknown, existing?: string | null): string | null => {
  if (typeof incoming === 'string' && incoming.length) {
    if (isDataUrl(incoming)) {
      const storedPath = writeImageFromDataUrl(incoming)
      if (storedPath) {
        deleteStoredImage(existing)
        return storedPath
      }
      return existing ? sanitizeStoredImagePath(existing) : incoming
    }
    return sanitizeStoredImagePath(incoming) ?? existing ?? null
  }
  if (incoming === null) {
    deleteStoredImage(existing)
    return null
  }
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
  const nextImg = processIncomingImage(incomingImg, existing.img)
  services[idx] = { ...existing, ...rest, img: nextImg }
  fs.writeFileSync(DATA_PATH, JSON.stringify(services, null, 2))
  return NextResponse.json(services[idx])
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  ensureDataFile()
  const id = params.id
  const services = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8') || '[]')
  const target = services.find((s: any) => s.id === id)
  if (target?.img) {
    deleteStoredImage(target.img)
  }
  const filtered = services.filter((s: any) => s.id !== id)
  fs.writeFileSync(DATA_PATH, JSON.stringify(filtered, null, 2))
  return NextResponse.json({ success: true })
}
