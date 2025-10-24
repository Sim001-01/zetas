import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'data', 'appointments.json')

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
  const appointments = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8') || '[]')
  const newApt = {
    ...body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  }
  appointments.push(newApt)
  fs.writeFileSync(DATA_PATH, JSON.stringify(appointments, null, 2))
  return NextResponse.json(newApt, { status: 201 })
}
