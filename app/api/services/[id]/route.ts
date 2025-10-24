import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data', 'services.json')

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
  services[idx] = { ...services[idx], ...updates }
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
