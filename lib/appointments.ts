export interface Appointment {
  id: string
  clientName: string
  clientPhone: string
  date: string
  startTime: string
  endTime: string
  service: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  notes?: string
  createdAt: string
}

const STORAGE_KEY = "zetas_appointments"

export function getAppointments(): Appointment[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export function saveAppointments(appointments: Appointment[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments))
}

export function addAppointment(appointment: Omit<Appointment, "id" | "createdAt">): Appointment {
  const appointments = getAppointments()
  const newAppointment: Appointment = {
    ...appointment,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  }
  appointments.push(newAppointment)
  saveAppointments(appointments)
  return newAppointment
}

export function updateAppointment(id: string, updates: Partial<Appointment>): void {
  const appointments = getAppointments()
  const index = appointments.findIndex((apt) => apt.id === id)
  if (index !== -1) {
    appointments[index] = { ...appointments[index], ...updates }
    saveAppointments(appointments)
  }
}

export function deleteAppointment(id: string): void {
  const appointments = getAppointments()
  const filtered = appointments.filter((apt) => apt.id !== id)
  saveAppointments(filtered)
}

export function getAppointmentsByDate(date: string): Appointment[] {
  const appointments = getAppointments()
  return appointments.filter((apt) => apt.date === date)
}

// --- Remote / server-backed helpers (async) ---
// These functions call the app API endpoints. They are optional: if the
// server-side API isn't available the app falls back to localStorage functions above.

export async function fetchAppointmentsRemote(): Promise<Appointment[]> {
  try {
    const res = await fetch('/api/appointments')
    if (!res.ok) throw new Error('Network response not ok')
    const data = await res.json()
    // keep local cache in sync
    try { saveAppointments(data) } catch (e) {}
    return data as Appointment[]
  } catch (err) {
    // fallback to local storage when offline or API not configured
    return getAppointments()
  }
}

export async function createAppointmentRemote(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointment),
    })
    if (!res.ok) throw new Error('Failed to create')
    const created = await res.json() as Appointment
    // update local cache
    try {
      const list = getAppointments()
      // avoid duplicates
      if (!list.find((a) => a.id === created.id)) {
        list.push(created)
        saveAppointments(list)
      }
    } catch (e) {}
    return created
  } catch (err) {
    // fallback to local add
    return addAppointment(appointment)
  }
}

export async function updateAppointmentRemote(id: string, updates: Partial<Appointment>): Promise<void> {
  try {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update')
    // update local cache
    try {
      const list = getAppointments()
      const idx = list.findIndex((a) => a.id === id)
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates }
        saveAppointments(list)
      }
    } catch (e) {}
  } catch (err) {
    // fallback to local update
    updateAppointment(id, updates)
  }
}

export async function deleteAppointmentRemote(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete')
    // update local cache
    try {
      const list = getAppointments()
      const filtered = list.filter((a) => a.id !== id)
      saveAppointments(filtered)
    } catch (e) {}
  } catch (err) {
    deleteAppointment(id)
  }
}
