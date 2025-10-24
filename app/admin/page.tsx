"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAdmin, logoutAdmin } from "@/lib/auth"
import AdminCalendar from "@/components/admin-calendar"
import { LogOut } from "lucide-react"
import Image from "next/image"

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin()) {
      router.push("/admin/login")
    } else {
      setIsAuthenticated(true)
    }
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    logoutAdmin()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Zeta's" width={120} height={40} className="h-10 w-auto" />
            <span className="text-gray-400">Admin Panel</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Esci</span>
          </button>
        </div>
      </div>
      <AdminCalendar />
    </div>
  )
}
