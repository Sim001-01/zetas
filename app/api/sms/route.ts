import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { to, message } = body
  const SID = process.env.TWILIO_ACCOUNT_SID
  const AUTH = process.env.TWILIO_AUTH_TOKEN
  const FROM = process.env.TWILIO_FROM_NUMBER

  if (!SID || !AUTH || !FROM) {
    return NextResponse.json({ error: 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER.' }, { status: 501 })
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages.json`
  const params = new URLSearchParams()
  params.append('To', to)
  params.append('From', FROM)
  params.append('Body', message)

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${SID}:${AUTH}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const data = await resp.text()
  if (!resp.ok) {
    return NextResponse.json({ error: 'Twilio error', details: data }, { status: 502 })
  }

  return NextResponse.json({ success: true, details: data })
}
