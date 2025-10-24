"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loginAdmin } from "@/lib/auth"
import Image from "next/image"
import { Lock } from "lucide-react"

export default function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (loginAdmin(password)) {
      router.push("/admin")
    } else {
      setError("Password non corretta")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8 animate-fade-in">
          <Image src="/logo.png" alt="Zeta's" width={200} height={80} className="h-16 w-auto mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-red-500 mb-2">Accesso Amministratore</h1>
          <p className="text-gray-400">Inserisci la password per accedere</p>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Inserisci password"
                  required
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => router.push("/")} className="text-gray-400 hover:text-white transition-colors text-sm">
            ← Torna alla homepage
          </button>
        </div>
      </div>
    </div>
  )
}
