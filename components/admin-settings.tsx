"use client"

import { useState, useEffect } from "react"
import { X, Save } from "lucide-react"
import { fetchSettings, type Settings, saveSettings } from "@/lib/settings"
import { useToast } from "@/hooks/use-toast"

interface AdminSettingsProps {
  onClose: () => void
}

export default function AdminSettings({ onClose }: AdminSettingsProps) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [overrideDate, setOverrideDate] = useState("")
  const [loadError, setLoadError] = useState(false)
  const { toast } = useToast()

  const fallbackSettings: Settings = {
    openingDays: [2, 3, 4, 5, 6],
    timeSlots: {
      start: "09:00",
      end: "19:00",
      interval: 30,
    },
    closedDays: [0, 1],
    openDates: [],
    closedDates: [],
  }

  const days = [
    { id: 1, label: "Lunedì" },
    { id: 2, label: "Martedì" },
    { id: 3, label: "Mercoledì" },
    { id: 4, label: "Giovedì" },
    { id: 5, label: "Venerdì" },
    { id: 6, label: "Sabato" },
    { id: 0, label: "Domenica" },
  ]

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await fetchSettings()
      setLoadError(false)
      setSettings({
        ...data,
        openDates: Array.isArray(data.openDates) ? data.openDates : [],
        closedDates: Array.isArray(data.closedDates) ? data.closedDates : [],
      })
    } catch (e) {
      setLoadError(true)
      setSettings(fallbackSettings)
      toast({ title: "Errore", description: "Impossibile caricare le impostazioni" })
    } finally {
      setLoading(false)
    }
  }

  const addDateOverride = (type: "open" | "closed") => {
    if (!settings || !overrideDate) return
    const openDates = new Set(settings.openDates || [])
    const closedDates = new Set(settings.closedDates || [])

    if (type === "open") {
      closedDates.delete(overrideDate)
      openDates.add(overrideDate)
    } else {
      openDates.delete(overrideDate)
      closedDates.add(overrideDate)
    }

    setSettings({
      ...settings,
      openDates: Array.from(openDates).sort(),
      closedDates: Array.from(closedDates).sort(),
    })
  }

  const removeDateOverride = (type: "open" | "closed", date: string) => {
    if (!settings) return
    if (type === "open") {
      setSettings({
        ...settings,
        openDates: (settings.openDates || []).filter((d) => d !== date),
      })
      return
    }

    setSettings({
      ...settings,
      closedDates: (settings.closedDates || []).filter((d) => d !== date),
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    try {
      await saveSettings(settings)
      toast({ title: "Impostazioni salvate" })
      onClose()
      // Ideally trigger a refresh in the parent, but page reload works for now or simpler reload logic
      window.location.reload() 
    } catch (e) {
      toast({ title: "Errore", description: "Impossibile salvare le impostazioni" })
    }
  }

  const toggleDay = (dayId: number) => {
    if (!settings) return
    const current = settings.openingDays || []
    const updated = current.includes(dayId)
      ? current.filter(d => d !== dayId)
      : [...current, dayId]
    setSettings({ ...settings, openingDays: updated, closedDays: settings.closedDays }) // closedDays is legacy/unused in new logic but kept for type safety
  }

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-black/80 text-white z-50">Caricamento...</div>
  
  if (!settings) return null

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {loadError && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Impossibile caricare dal server. Stai modificando valori temporanei.
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Impostazioni Orari</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 block">Giorni di Apertura</h4>
            <div className="grid grid-cols-2 gap-3">
              {days.map(day => (
                <label key={day.id} className="flex items-center space-x-3 p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition">
                  <input
                    type="checkbox"
                    checked={settings.openingDays.includes(day.id)}
                    onChange={() => toggleDay(day.id)}
                    className="w-5 h-5 rounded border-gray-600 text-red-500 focus:ring-red-500 bg-zinc-900"
                  />
                  <span className="text-gray-200">{day.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 block">Date Specifiche (Aperto/Chiuso)</h4>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Data</label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                type="button"
                onClick={() => addDateOverride("open")}
                className="h-10 px-4 w-full sm:w-auto bg-emerald-500/20 text-emerald-200 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                Segna Aperto
              </button>
              <button
                type="button"
                onClick={() => addDateOverride("closed")}
                className="h-10 px-4 w-full sm:w-auto bg-red-500/20 text-red-200 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Segna Chiuso
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3">
                <div className="text-xs uppercase tracking-wide text-emerald-300 mb-2">Aperti</div>
                {settings.openDates.length ? (
                  <div className="flex flex-wrap gap-2">
                    {settings.openDates.map((date) => (
                      <button
                        key={`open-${date}`}
                        type="button"
                        onClick={() => removeDateOverride("open", date)}
                        className="text-xs bg-emerald-500/20 text-emerald-100 px-2 py-1 rounded-md hover:bg-emerald-500/30"
                      >
                        {date} x
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Nessuna data aperta extra</div>
                )}
              </div>
              <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-3">
                <div className="text-xs uppercase tracking-wide text-red-300 mb-2">Chiusi</div>
                {settings.closedDates.length ? (
                  <div className="flex flex-wrap gap-2">
                    {settings.closedDates.map((date) => (
                      <button
                        key={`closed-${date}`}
                        type="button"
                        onClick={() => removeDateOverride("closed", date)}
                        className="text-xs bg-red-500/20 text-red-100 px-2 py-1 rounded-md hover:bg-red-500/30"
                      >
                        {date} x
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Nessuna data chiusa extra</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Ora Inizio</label>
              <input
                type="time"
                value={settings.timeSlots.start}
                onChange={(e) => setSettings({
                  ...settings,
                  timeSlots: { ...settings.timeSlots, start: e.target.value }
                })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Ora Fine</label>
              <input
                type="time"
                value={settings.timeSlots.end}
                onChange={(e) => setSettings({
                  ...settings,
                  timeSlots: { ...settings.timeSlots, end: e.target.value }
                })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-400 mb-2">Intervallo (minuti)</label>
             <select
                value={settings.timeSlots.interval}
                onChange={(e) => setSettings({
                  ...settings,
                  timeSlots: { ...settings.timeSlots, interval: parseInt(e.target.value) }
                })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
             >
               <option value={15}>15 minuti</option>
               <option value={30}>30 minuti</option>
               <option value={45}>45 minuti</option>
               <option value={60}>60 minuti</option>
             </select>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Save className="h-5 w-5" />
            Salva Impostazioni
          </button>
        </form>
      </div>
    </div>
  )
}
