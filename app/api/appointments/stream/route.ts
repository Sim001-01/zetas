import { addAppointmentSubscriber } from '@/lib/appointments-events'

export const runtime = 'nodejs'

export async function GET() {
  const encoder = new TextEncoder()
  let cleanup = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: string) => {
        controller.enqueue(encoder.encode(payload))
      }

      const unsubscribe = addAppointmentSubscriber(send)
      send('event: ready\ndata: {"ok":true}\n\n')

      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch (error) {
          // ignore write errors when connection closes
        }
      }, 25000)

      cleanup = () => {
        clearInterval(ping)
        unsubscribe()
      }
    },
    cancel() {
      cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
