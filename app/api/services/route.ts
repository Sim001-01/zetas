import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data', 'services.json')

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
  const services = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8') || '[]')
  const id = `svc-${Date.now()}`
  const newSvc = {
    id,
    ...body,
    created_at: new Date().toISOString(),
  }
  services.push(newSvc)
  fs.writeFileSync(DATA_PATH, JSON.stringify(services, null, 2))
  return NextResponse.json(newSvc, { status: 201 })
}
