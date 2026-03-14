type AppointmentSubscriber = (payload: string) => void

type AppointmentEvent = {
  type: "created" | "updated" | "deleted"
  id?: string
}

const globalStore = globalThis as typeof globalThis & {
  __zetasAppointmentSubscribers?: Set<AppointmentSubscriber>
}

const subscribers = globalStore.__zetasAppointmentSubscribers ?? new Set<AppointmentSubscriber>()
if (!globalStore.__zetasAppointmentSubscribers) {
  globalStore.__zetasAppointmentSubscribers = subscribers
}

export const addAppointmentSubscriber = (subscriber: AppointmentSubscriber) => {
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}

export const broadcastAppointmentEvent = (event: AppointmentEvent) => {
  const payload = `event: update\ndata: ${JSON.stringify(event)}\n\n`
  subscribers.forEach((subscriber) => subscriber(payload))
}
