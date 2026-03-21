'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

type CancelPreview = {
  clientName: string
  clientSurname?: string | null
  clientPhone?: string | null
  clientEmail?: string | null
  service: string
  date: string
  startTime: string
  endTime: string
  status: string
}

export default function CancelAppointmentPage() {
  const searchParams = useSearchParams()
  const id = useMemo(() => searchParams.get('id') || '', [searchParams])
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState<CancelPreview | null>(null)

  useEffect(() => {
    const loadPreview = async () => {
      if (!id || !token) {
        setStatus('error')
        setMessage('Link non valido. Controlla di aver aperto il link completo ricevuto via email.')
        setLoadingPreview(false)
        return
      }

      try {
        const res = await fetch(`/api/appointments/${id}/cancel?token=${encodeURIComponent(token)}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || 'Link non valido o scaduto')
        }
        const data = await res.json()
        setPreview(data)
      } catch (error: any) {
        setStatus('error')
        setMessage(error?.message || 'Impossibile caricare i dettagli della prenotazione.')
      } finally {
        setLoadingPreview(false)
      }
    }

    loadPreview()
  }, [id, token])

  const cancelAppointment = async () => {
    if (!id || !token) {
      setStatus('error')
      setMessage('Link non valido. Controlla di aver aperto il link completo ricevuto via email.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Errore durante la disdetta')
      }

      setStatus('success')
      setMessage('La prenotazione e stata disdetta con successo.')
      setTimeout(() => {
        window.location.href = 'https://zetasbarbershop.it'
      }, 1200)
    } catch (error: any) {
      setStatus('error')
      setMessage(error?.message || 'Impossibile disdire la prenotazione.')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Zeta's Barbershop</p>
        <h1 className="mt-3 text-3xl font-semibold">Disdetta Prenotazione</h1>
        <p className="mt-3 text-sm text-zinc-300">
          Conferma qui la disdetta del tuo appuntamento. L'operazione e definitiva.
        </p>

        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/60 p-5 text-sm text-zinc-300 space-y-2">
          {loadingPreview ? <p>Caricamento dettagli...</p> : null}
          {!loadingPreview && preview ? (
            <>
              <p><span className="text-zinc-400">Cliente:</span> <span className="text-zinc-100 font-medium">{preview.clientName} {preview.clientSurname || ''}</span></p>
              <p><span className="text-zinc-400">Telefono:</span> <span className="text-zinc-100">{preview.clientPhone || '-'}</span></p>
              <p><span className="text-zinc-400">Email:</span> <span className="text-zinc-100">{preview.clientEmail || '-'}</span></p>
              <p><span className="text-zinc-400">Servizio:</span> <span className="text-zinc-100">{preview.service}</span></p>
              <p><span className="text-zinc-400">Data:</span> <span className="text-zinc-100">{preview.date}</span></p>
              <p><span className="text-zinc-400">Orario:</span> <span className="text-zinc-100">{preview.startTime} - {preview.endTime}</span></p>
            </>
          ) : null}
        </div>

        {status === 'success' ? (
          <div className="mt-6 rounded-lg border border-emerald-700/50 bg-emerald-900/25 p-4 text-emerald-200">{message}</div>
        ) : null}

        {status === 'error' ? (
          <div className="mt-6 rounded-lg border border-red-700/50 bg-red-900/25 p-4 text-red-200">{message}</div>
        ) : null}

        <Button
          className="mt-8 w-full bg-red-600 hover:bg-red-500 text-white"
          onClick={cancelAppointment}
          disabled={status === 'loading' || status === 'success' || loadingPreview || !preview}
        >
          {status === 'loading' ? 'Disdetta in corso...' : 'Conferma disdetta'}
        </Button>
      </div>
    </main>
  )
}
