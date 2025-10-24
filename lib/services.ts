export type Service = {
  id: string
  name: string
  duration_minutes?: number
  price?: number
  description?: string
  img?: string
}

const API_BASE = '/api/services'

export async function fetchServicesRemote(): Promise<Service[]> {
  try {
    const res = await fetch(API_BASE)
    if (!res.ok) return []
    const data = await res.json()
    return data
  } catch (e) {
    return []
  }
}

export async function createServiceRemote(svc: Partial<Service>): Promise<Service | null> {
  try {
    const res = await fetch(API_BASE, { method: 'POST', body: JSON.stringify(svc), headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch (e) {
    return null
  }
}

export async function updateServiceRemote(id: string, updates: Partial<Service>): Promise<Service | null> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(updates), headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch (e) {
    return null
  }
}

export async function deleteServiceRemote(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (e) {
    return false
  }
}
