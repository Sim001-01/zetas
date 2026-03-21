"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CalendarRange, Clock3, Save } from "lucide-react"
import { fetchSettings, type Settings, saveSettings } from "@/lib/settings"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

type DayMeta = {
  id: number
  short: string
  label: string
}

const days: DayMeta[] = [
  { id: 1, short: "Lun", label: "Lunedì" },
  { id: 2, short: "Mar", label: "Martedì" },
  { id: 3, short: "Mer", label: "Mercoledì" },
  { id: 4, short: "Gio", label: "Giovedì" },
  { id: 5, short: "Ven", label: "Venerdì" },
  { id: 6, short: "Sab", label: "Sabato" },
  { id: 0, short: "Dom", label: "Domenica" },
]

const buildDefaultDaySchedules = () => ({
  "0": { enabled: false, start: "09:00", end: "20:00" },
  "1": { enabled: false, start: "09:00", end: "20:00" },
  "2": { enabled: true, start: "09:00", end: "20:15" },
  "3": { enabled: true, start: "09:00", end: "20:15" },
  "4": { enabled: true, start: "09:00", end: "20:15" },
  "5": { enabled: true, start: "09:00", end: "20:15" },
  "6": { enabled: true, start: "08:30", end: "20:00" },
})

const fallbackSettings: Settings = {
  openingDays: [2, 3, 4, 5, 6],
  daySchedules: buildDefaultDaySchedules(),
  timeSlots: {
    start: "09:00",
    end: "20:30",
    interval: 15,
  },
  closedDays: [0, 1],
  openDates: [],
  closedDates: [],
}

const normalizeWithDefaults = (value: Settings): Settings => {
  const daySchedules = buildDefaultDaySchedules()
  for (let day = 0; day <= 6; day += 1) {
    const key = day.toString()
    const incoming = (value.daySchedules as any)?.[key] ?? (value.daySchedules as any)?.[day]
    if (incoming) {
      daySchedules[key as keyof typeof daySchedules] = {
        enabled: typeof incoming.enabled === "boolean" ? incoming.enabled : daySchedules[key as keyof typeof daySchedules].enabled,
        start: typeof incoming.start === "string" ? incoming.start : daySchedules[key as keyof typeof daySchedules].start,
        end: typeof incoming.end === "string" ? incoming.end : daySchedules[key as keyof typeof daySchedules].end,
      }
      continue
    }

    daySchedules[key as keyof typeof daySchedules] = {
      ...daySchedules[key as keyof typeof daySchedules],
      enabled: value.openingDays.includes(day),
      start: value.timeSlots.start,
      end: value.timeSlots.end,
    }
  }

  const openingDays = Object.entries(daySchedules)
    .filter(([, day]) => day.enabled)
    .map(([day]) => Number(day))
    .sort((a, b) => a - b)

  return {
    ...value,
    daySchedules,
    openingDays,
    timeSlots: {
      ...value.timeSlots,
      interval: Number(value.timeSlots.interval) || 15,
    },
    openDates: Array.isArray(value.openDates) ? value.openDates : [],
    closedDates: Array.isArray(value.closedDates) ? value.closedDates : [],
  }
}

export default function AdminSettings() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [overrideDate, setOverrideDate] = useState("")
  const [loadError, setLoadError] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    void loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await fetchSettings()
      setLoadError(false)
      setSettings(normalizeWithDefaults(data))
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
      setSaving(true)
      await saveSettings(normalizeWithDefaults(settings))
      toast({ title: "Impostazioni salvate" })
      await loadSettings()
    } catch (e) {
      toast({ title: "Errore", description: "Impossibile salvare le impostazioni" })
    } finally {
      setSaving(false)
    }
  }

  const updateDay = (dayId: number, patch: Partial<{ enabled: boolean; start: string; end: string }>) => {
    if (!settings) return
    const key = dayId.toString()
    const prev = settings.daySchedules[key] || { enabled: false, start: settings.timeSlots.start, end: settings.timeSlots.end }
    const nextDay = { ...prev, ...patch }
    const nextSchedules = { ...settings.daySchedules, [key]: nextDay }
    const nextOpeningDays = Object.entries(nextSchedules)
      .filter(([, day]) => day.enabled)
      .map(([day]) => Number(day))
      .sort((a, b) => a - b)

    setSettings({
      ...settings,
      daySchedules: nextSchedules,
      openingDays: nextOpeningDays,
      closedDays: [0, 1, 2, 3, 4, 5, 6].filter((day) => !nextOpeningDays.includes(day)),
    })
  }

  const applyToOpenDays = () => {
    if (!settings) return
    const start = settings.timeSlots.start
    const end = settings.timeSlots.end
    const updated = { ...settings.daySchedules }
    settings.openingDays.forEach((day) => {
      updated[day.toString()] = { ...(updated[day.toString()] || { enabled: true, start, end }), enabled: true, start, end }
    })
    setSettings({ ...settings, daySchedules: updated })
  }

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-white">Caricamento...</div>

  if (!settings) return null

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Impossibile caricare i dati dal server. Stai modificando valori temporanei.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Impostazioni Orari</h2>
          <p className="text-sm text-gray-400 mt-1">Configura apertura/chiusura giorno per giorno in modo rapido.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna al calendario
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Clock3 className="h-4 w-4 text-red-400" />
            Orario base
          </div>
          <p className="text-sm text-gray-400">Imposta l'orario standard e poi applicalo ai giorni aperti.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Apertura base</label>
              <input
                type="time"
                value={settings.timeSlots.start}
                onChange={(e) => setSettings({ ...settings, timeSlots: { ...settings.timeSlots, start: e.target.value } })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Chiusura base</label>
              <input
                type="time"
                value={settings.timeSlots.end}
                onChange={(e) => setSettings({ ...settings, timeSlots: { ...settings.timeSlots, end: e.target.value } })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Intervallo slot</label>
              <select
                value={settings.timeSlots.interval}
                onChange={(e) => setSettings({ ...settings, timeSlots: { ...settings.timeSlots, interval: parseInt(e.target.value, 10) } })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={15}>15 minuti</option>
                <option value={20}>20 minuti</option>
                <option value={30}>30 minuti</option>
                <option value={45}>45 minuti</option>
                <option value={60}>60 minuti</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={applyToOpenDays}
            className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            Applica orario base ai giorni aperti
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <CalendarRange className="h-4 w-4 text-red-400" />
            Calendario settimanale professionale
          </div>
          <p className="text-sm text-gray-400">Per ogni giorno scegli se sei aperto e imposta orari personalizzati (aprire prima/tardi, chiudere prima).</p>

          <div className="grid gap-3">
            {days.map((day) => {
              const key = day.id.toString()
              const dayConfig = settings.daySchedules[key] || { enabled: false, start: settings.timeSlots.start, end: settings.timeSlots.end }
              return (
                <div key={day.id} className="rounded-xl border border-white/10 bg-black/40 p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <label className="inline-flex items-center gap-2 text-gray-200">
                      <input
                        type="checkbox"
                        checked={dayConfig.enabled}
                        onChange={(e) => updateDay(day.id, { enabled: e.target.checked })}
                        className="w-4 h-4 accent-red-500"
                      />
                      <span className="font-medium">{day.label}</span>
                    </label>
                    <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-300">{day.short}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full md:max-w-xs">
                    <input
                      type="time"
                      value={dayConfig.start}
                      disabled={!dayConfig.enabled}
                      onChange={(e) => updateDay(day.id, { start: e.target.value })}
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      type="time"
                      value={dayConfig.end}
                      disabled={!dayConfig.enabled}
                      onChange={(e) => updateDay(day.id, { end: e.target.value })}
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="text-xs text-gray-400 md:ml-auto">
                    {dayConfig.enabled ? "Giorno aperto" : "Giorno chiuso"}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 md:p-6 space-y-4">
          <div className="text-white font-semibold">Date speciali (eccezioni)</div>
          <p className="text-sm text-gray-400">Usa queste eccezioni per festività, aperture straordinarie o chiusure occasionali.</p>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] items-end">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data</label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
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

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-3 rounded-lg font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          <Save className="h-5 w-5" />
          {saving ? "Salvataggio in corso..." : "Salva Impostazioni"}
        </button>
      </form>
    </div>
  )
}
