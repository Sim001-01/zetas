const ADMIN_KEY = "zetas_admin_logged_in"
const ADMIN_PASSWORD = "zetas2025" // In production, use proper authentication

export function isAdmin(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(ADMIN_KEY) === "true"
}

export function loginAdmin(password: string): boolean {
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(ADMIN_KEY, "true")
    return true
  }
  return false
}

export function logoutAdmin(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(ADMIN_KEY)
}
