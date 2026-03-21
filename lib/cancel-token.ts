import { createHmac, timingSafeEqual } from 'crypto'

type TokenData = {
  appointmentId: string
  email: string
  exp: number
}

const toSignature = (data: TokenData, secret: string) => {
  const payload = `${data.appointmentId}|${data.email.toLowerCase()}|${data.exp}`
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function createCancelToken(params: {
  appointmentId: string
  email: string
  secret: string
  ttlSeconds?: number
}) {
  const ttl = params.ttlSeconds ?? 60 * 60 * 24 * 30
  const exp = Math.floor(Date.now() / 1000) + ttl
  const signature = toSignature(
    {
      appointmentId: params.appointmentId,
      email: params.email,
      exp,
    },
    params.secret,
  )

  return `${exp}.${signature}`
}

export function verifyCancelToken(params: {
  token: string
  appointmentId: string
  email: string
  secret: string
}) {
  const [expRaw, signatureRaw] = params.token.split('.')
  const exp = Number(expRaw)
  if (!expRaw || !signatureRaw || Number.isNaN(exp)) return false
  if (exp < Math.floor(Date.now() / 1000)) return false

  const expected = toSignature(
    {
      appointmentId: params.appointmentId,
      email: params.email,
      exp,
    },
    params.secret,
  )

  const receivedBuffer = Buffer.from(signatureRaw, 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  if (receivedBuffer.length !== expectedBuffer.length) return false

  return timingSafeEqual(receivedBuffer, expectedBuffer)
}
