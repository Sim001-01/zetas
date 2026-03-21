import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

type SendEmailBody = {
  to?: string
  subject?: string
  html?: string
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const defaultTo = process.env.RESEND_TO_EMAIL || 'zetasbarbershop@gmail.com'

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Resend not configured. Set RESEND_API_KEY in your environment.' },
      { status: 501 },
    )
  }

  const body = (await request.json().catch(() => ({}))) as SendEmailBody

  const to = body.to || defaultTo
  const subject = body.subject || 'Hello World'
  const html = body.html || '<p>Congrats on sending your <strong>first email</strong>!</p>'

  try {
    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
    })

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to send email',
        details: error?.message || 'Unknown error',
      },
      { status: 502 },
    )
  }
}