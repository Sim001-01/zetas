"use client"

import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold mb-4">Sito temporaneamente non disponibile</h1>
        <p className="mb-6 text-gray-300">La homepage è stata oscurata per la consegna del progetto. Per favore accedi alla pagina amministrativa.</p>
        <Link href="/admin" className="inline-block rounded-md bg-white text-gray-900 px-4 py-2 font-medium">Vai alla pagina Admin</Link>
      </div>
    </main>
  )
}


//push