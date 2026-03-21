"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, CalendarRange, Clock3, Save } from "lucide-react"
import { fetchSettings, type ScheduleConfig, type Settings, saveSettings } from "@/lib/settings"
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

type ScheduleFormState = {
  enabled: boolean
  start1: string
  end1: string
  hasBreak: boolean
  start2: string
  end2: string
}

const buildDefaultDaySchedules = (): Record<string, ScheduleConfig> => ({
  "0": { enabled: false, ranges: [{ start: "09:00", end: "20:00" }] },
  "1": { enabled: false, ranges: [{ start: "09:00", end: "20:00" }] },
  "2": { enabled: true, ranges: [{ start: "09:00", end: "20:15" }] },
  "3": { enabled: true, ranges: [{ start: "09:00", end: "20:15" }] },
  "4": { enabled: true, ranges: [{ start: "09:00", end: "20:15" }] },
  "5": { enabled: true, ranges: [{ start: "09:00", end: "20:15" }] },
  "6": { enabled: true, ranges: [{ start: "08:30", end: "20:00" }] },
})

const toScheduleForm = (config: ScheduleConfig, fallbackStart: string, fallbackEnd: string): ScheduleFormState => {
  const first = config.ranges?.[0] || { start: fallbackStart, end: fallbackEnd }
  const second = config.ranges?.[1] || { start: "15:00", end: fallbackEnd }
  return {
    enabled: config.enabled,
    start1: first.start,
    end1: first.end,
    hasBreak: (config.ranges?.length || 0) > 1,
    start2: second.start,
    end2: second.end,
  }
}

const fromScheduleForm = (form: ScheduleFormState): ScheduleConfig => {
  const ranges = [{ start: form.start1, end: form.end1 }]
  if (form.hasBreak) {
    ranges.push({ start: form.start2, end: form.end2 })
  }
  return {
    enabled: form.enabled,
    ranges,
  }
}

const formatRangesInline = (config: ScheduleConfig) => {
  if (!config.enabled) return "Chiuso"
  if (!config.ranges.length) return "Nessun orario"
  return config.ranges.map((r) => `${r.start}-${r.end}`).join(" | ")
}

const fallbackSettings: Settings = {
  openingDays: [2, 3, 4, 5, 6],
  daySchedules: buildDefaultDaySchedules(),
  specialDateSchedules: {},
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
    const incoming = (value.daySchedules as any)?.[key] ?? (value.daySchedules as any)?.[day] ?? null
    if (incoming && typeof incoming === "object") {
      const fallback = daySchedules[key]
      const legacyRanges = typeof incoming.start === "string" && typeof incoming.end === "string"
        ? [{ start: incoming.start, end: incoming.end }]
        : []
      const ranges = Array.isArray(incoming.ranges) && incoming.ranges.length
        ? incoming.ranges
        : legacyRanges
      daySchedules[key] = {
        enabled: typeof incoming.enabled === "boolean" ? incoming.enabled : fallback.enabled,
        ranges: ranges.length ? ranges.slice(0, 2) : fallback.ranges,
      }
      continue
    }

    daySchedules[key] = {
      ...daySchedules[key],
      enabled: value.openingDays.includes(day),
      ranges: [{ start: value.timeSlots.start, end: value.timeSlots.end }],
    }
  }

  const specialDateSchedules: Record<string, ScheduleConfig> = {}
  const incomingSpecial = (value as any).specialDateSchedules
  if (incomingSpecial && typeof incomingSpecial === "object") {
    for (const [date, schedule] of Object.entries(incomingSpecial)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      if (!schedule || typeof schedule !== "object") continue
      const fallback = { enabled: true, ranges: [{ start: value.timeSlots.start, end: value.timeSlots.end }] }
      const raw = schedule as any
      const ranges = Array.isArray(raw.ranges) && raw.ranges.length
        ? raw.ranges.slice(0, 2)
        : (typeof raw.start === "string" && typeof raw.end === "string" ? [{ start: raw.start, end: raw.end }] : fallback.ranges)
      specialDateSchedules[date] = {
        enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
        ranges,
      }
    }
  }

  ;(Array.isArray(value.openDates) ? value.openDates : []).forEach((date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    if (!specialDateSchedules[date]) {
      specialDateSchedules[date] = {
        enabled: true,
        ranges: [{ start: value.timeSlots.start, end: value.timeSlots.end }],
      }
    }
  })

  ;(Array.isArray(value.closedDates) ? value.closedDates : []).forEach((date) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    specialDateSchedules[date] = {
      enabled: false,
      ranges: [{ start: value.timeSlots.start, end: value.timeSlots.end }],
    }
  })

  const openingDays = Object.entries(daySchedules)
    .filter(([, day]) => day.enabled)
    .map(([day]) => Number(day))
    .sort((a, b) => a - b)

  return {
    ...value,
    daySchedules,
    specialDateSchedules,
    openingDays,
    timeSlots: {
      ...value.timeSlots,
      interval: 15,
    },
    openDates: Object.entries(specialDateSchedules).filter(([, s]) => s.enabled).map(([date]) => date).sort(),
    closedDates: Object.entries(specialDateSchedules).filter(([, s]) => !s.enabled).map(([date]) => date).sort(),
  }
}

export default function AdminSettings() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [specialDateForm, setSpecialDateForm] = useState<ScheduleFormState>({
    enabled: true,
    start1: "09:00",
    end1: "20:00",
    hasBreak: false,
    start2: "15:00",
    end2: "20:00",
  })
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

  const upsertSpecialDate = () => {
    if (!settings || !overrideDate) return
    const nextSpecial = {
      ...settings.specialDateSchedules,
      [overrideDate]: fromScheduleForm(specialDateForm),
    }

    setSettings({
      ...settings,
      specialDateSchedules: nextSpecial,
    })
    toast({ title: "Data speciale aggiornata" })
  }

  const removeSpecialDate = (date: string) => {
    if (!settings) return
    const next = { ...settings.specialDateSchedules }
    delete next[date]
    setSettings({
      ...settings,
      specialDateSchedules: next,
    })
  }

  const loadSpecialDateToForm = (date: string) => {
    if (!settings) return
    const schedule = settings.specialDateSchedules[date]
    if (!schedule) return
    setOverrideDate(date)
    setSpecialDateForm(toScheduleForm(schedule, settings.timeSlots.start, settings.timeSlots.end))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings) return

    try {
      setSaving(true)
      await saveSettings(normalizeWithDefaults(settings))
      toast({ title: "Impostazioni salvate" })
      router.push("/admin")
    } catch (e) {
      toast({ title: "Errore", description: "Impossibile salvare le impostazioni" })
    } finally {
      setSaving(false)
    }
  }

  const updateDay = (dayId: number, patch: Partial<ScheduleFormState>) => {
    if (!settings) return
    const key = dayId.toString()
    const prev = toScheduleForm(
      settings.daySchedules[key] || { enabled: false, ranges: [{ start: settings.timeSlots.start, end: settings.timeSlots.end }] },
      settings.timeSlots.start,
      settings.timeSlots.end,
    )
    const nextDay = { ...prev, ...patch }
    const nextSchedules = {
      ...settings.daySchedules,
      [key]: fromScheduleForm(nextDay),
    }
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
      updated[day.toString()] = {
        enabled: true,
        ranges: [{ start, end }],
      }
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
                onChange={() => setSettings({ ...settings, timeSlots: { ...settings.timeSlots, interval: 15 } })}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={15}>15 minuti</option>
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
              const dayConfig = toScheduleForm(
                settings.daySchedules[key] || { enabled: false, ranges: [{ start: settings.timeSlots.start, end: settings.timeSlots.end }] },
                settings.timeSlots.start,
                settings.timeSlots.end,
              )
              return (
                <div key={day.id} className="rounded-xl border border-white/10 bg-black/40 p-3 md:p-4 grid gap-3">
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

                  <div className="grid grid-cols-2 gap-3 w-full md:max-w-lg">
                    <input
                      type="time"
                      value={dayConfig.start1}
                      disabled={!dayConfig.enabled}
                      onChange={(e) => updateDay(day.id, { start1: e.target.value })}
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      type="time"
                      value={dayConfig.end1}
                      disabled={!dayConfig.enabled}
                      onChange={(e) => updateDay(day.id, { end1: e.target.value })}
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={dayConfig.hasBreak}
                      disabled={!dayConfig.enabled}
                      onChange={(e) => updateDay(day.id, { hasBreak: e.target.checked })}
                      className="w-4 h-4 accent-red-500"
                    />
                    Pausa pranzo
                  </label>

                  {dayConfig.hasBreak && (
                    <div className="grid grid-cols-2 gap-3 w-full md:max-w-lg">
                      <input
                        type="time"
                        value={dayConfig.start2}
                        disabled={!dayConfig.enabled}
                        onChange={(e) => updateDay(day.id, { start2: e.target.value })}
                        className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <input
                        type="time"
                        value={dayConfig.end2}
                        disabled={!dayConfig.enabled}
                        onChange={(e) => updateDay(day.id, { end2: e.target.value })}
                        className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}

                  <div className="text-xs text-gray-400 md:ml-auto">
                    {dayConfig.enabled ? formatRangesInline(fromScheduleForm(dayConfig)) : "Giorno chiuso"}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4 md:p-6 space-y-4">
          <div className="text-white font-semibold">Date speciali (eccezioni con orari)</div>
          <p className="text-sm text-gray-400">Qui imposti orario dedicato per una data precisa, con pausa o ciclo continuo.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data</label>
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-300 md:items-end">
              <input
                type="checkbox"
                checked={!specialDateForm.enabled}
                onChange={(e) => setSpecialDateForm((prev) => ({ ...prev, enabled: !e.target.checked }))}
                className="w-4 h-4 accent-red-500"
              />
              Giorno chiuso
            </label>

            <input
              type="time"
              value={specialDateForm.start1}
              disabled={!specialDateForm.enabled}
              onChange={(e) => setSpecialDateForm((prev) => ({ ...prev, start1: e.target.value }))}
              className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <input
              type="time"
              value={specialDateForm.end1}
              disabled={!specialDateForm.enabled}
              onChange={(e) => setSpecialDateForm((prev) => ({ ...prev, end1: e.target.value }))}
              className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={specialDateForm.hasBreak}
                disabled={!specialDateForm.enabled}
                onChange={(e) => setSpecialDateForm((prev) => ({ ...prev, hasBreak: e.target.checked }))}
                className="w-4 h-4 accent-red-500"
              />
              Pausa pranzo
            </label>

            {specialDateForm.hasBreak && (
              <>
                <input
                  type="time"
                  value={specialDateForm.start2}
                  disabled={!specialDateForm.enabled}
                  onChange={(e) => setSpecialDateForm((prev) => ({ ...prev, start2: e.target.value }))}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <input
                  type="time"
                  value={specialDateForm.end2}
                  disabled={!specialDateForm.enabled}
                  onChange={(e) => setSpecialDateForm((prev) => ({ ...prev, end2: e.target.value }))}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </>
            )}
          </div>

          <button
            type="button"
            onClick={upsertSpecialDate}
            className="h-10 px-4 w-full sm:w-auto bg-emerald-500/20 text-emerald-200 rounded-lg hover:bg-emerald-500/30 transition-colors"
          >
            Aggiungi / Aggiorna data speciale
          </button>

          <div className="mt-4 space-y-2">
            {Object.keys(settings.specialDateSchedules).length ? Object.keys(settings.specialDateSchedules).sort().map((date) => {
              const schedule = settings.specialDateSchedules[date]
              return (
                <div key={date} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border border-zinc-700 rounded-lg p-3 bg-zinc-800/40">
                  <div className="text-sm text-gray-200">
                    <span className="font-semibold">{date}</span>
                    <span className="ml-2 text-gray-400">{formatRangesInline(schedule)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadSpecialDateToForm(date)}
                      className="text-xs bg-white/10 text-gray-200 px-2 py-1 rounded hover:bg-white/20"
                    >
                      Modifica
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSpecialDate(date)}
                      className="text-xs bg-red-500/20 text-red-200 px-2 py-1 rounded hover:bg-red-500/30"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              )
            }) : (
              <div className="text-xs text-gray-400">Nessuna data speciale configurata.</div>
            )}
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
