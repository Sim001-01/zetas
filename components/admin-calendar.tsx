"use client"

import type React from "react"

import { useState, useEffect, useMemo, useRef } from "react"
import { ChevronLeft, ChevronRight, X, Check, Trash2 } from "lucide-react"
import {
  getAppointments,
  updateAppointment,
  deleteAppointment,
  type Appointment,
  fetchAppointmentsRemote,
  createAppointmentRemote,
  updateAppointmentRemote,
  deleteAppointmentRemote,
} from "@/lib/appointments"
import {
  fetchServicesRemote,
  createServiceRemote,
  updateServiceRemote,
  deleteServiceRemote,
  type Service,
} from "@/lib/services"
import { useToast } from '@/hooks/use-toast'

type ServiceFormState = {
  id?: string
  name: string
  price: string
  description: string
  imgData: string | null
  preview: string | null
}

export default function AdminCalendar() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const defaultServiceOptions = [
    "Taglio Capelli",
    "Taglio Capelli + Shampoo",
    "Taglio Capelli + Barba",
    "Taglio Capelli + Shampoo + Barba",
    "Solo Shampoo",
    "Solo Barba",
  ]

  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    service: defaultServiceOptions[0],
    notes: "",
  })

  useEffect(() => {
    // load local first, then try server
    loadAppointments()
    let mounted = true
    ;(async () => {
      const remote = await fetchAppointmentsRemote()
      if (mounted && remote && remote.length) setAppointments(remote)
    })()

    // start polling for upcoming reminders
    const notified = new Set<string>()
    const interval = setInterval(async () => {
      try {
        const remote = await fetchAppointmentsRemote()
        if (!mounted) return
        setAppointments(remote)
        const now = new Date()
        for (const apt of remote) {
          if (notified.has(apt.id)) continue
          // notify if appointment is within next 15 minutes and status is confirmed
          const aptDate = new Date(`${apt.date}T${apt.startTime}`)
          const diff = (aptDate.getTime() - now.getTime()) / 1000 / 60
          if (diff <= 15 && diff >= -5 && (apt.status === 'confirmed' || apt.status === 'pending')) {
            // show toast and beep
            toast?.toast({ title: 'Promemoria Appuntamento', description: `${apt.clientName} alle ${apt.startTime}` })
            try { playBeep() } catch (e) {}
            notified.add(apt.id)
          }
        }
      } catch (e) {
        // ignore
      }
    }, 30 * 1000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const loadAppointments = () => {
    setAppointments(getAppointments())
  }

  const weekDays = ["MAR", "MER", "GIO", "VEN", "SAB"]
  const timeSlots = useMemo(() => {
    const slots: string[] = []
    const startMinutes = 9 * 60
    const endMinutes = 20 * 60 + 30
    for (let minutes = startMinutes; minutes <= endMinutes; minutes += 15) {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`)
    }
    return slots
  }, [])

  const [serviceOptions, setServiceOptions] = useState<string[]>(defaultServiceOptions)
  const [servicesList, setServicesList] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [servicesSaving, setServicesSaving] = useState(false)
  const [serviceForm, setServiceForm] = useState<ServiceFormState | null>(null)
  const [showServicesModal, setShowServicesModal] = useState(false)
  const serviceImageInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let mounted = true
    const loadServices = async () => {
      try {
        setServicesLoading(true)
        const remote = await fetchServicesRemote()
        if (!mounted) return
        if (remote && remote.length) {
          setServicesList(remote)
        } else {
          setServicesList([])
        }
      } catch (e) {
        if (!mounted) return
        setServicesList([])
      } finally {
        if (mounted) setServicesLoading(false)
      }
    }
    loadServices()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (servicesList.length) {
      setServiceOptions(servicesList.map((service) => service.name))
    } else {
      setServiceOptions(defaultServiceOptions)
    }
  }, [servicesList])

  useEffect(() => {
    setFormData((prev) => {
      if (serviceOptions.length && !serviceOptions.includes(prev.service)) {
        return { ...prev, service: serviceOptions[0] }
      }
      return prev
    })
  }, [serviceOptions])

  const getWeekDates = () => {
    const desiredStartDay = 2 // Tuesday
    const start = new Date(currentDate)
    const day = start.getDay()
    const diff = desiredStartDay - day
    start.setDate(start.getDate() + diff)
    return Array.from({ length: weekDays.length }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return date
    })
  }

  const weekDates = getWeekDates()

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0]
  }

  const getAppointmentForSlot = (date: Date, time: string) => {
    const dateStr = formatDate(date)
    return appointments.find((apt) => apt.date === dateStr && apt.startTime === time)
  }

  const handleSlotClick = (date: Date, time: string) => {
    const existing = getAppointmentForSlot(date, time)
    if (existing) {
      setEditingAppointment(existing)
      setFormData({
        clientName: existing.clientName,
        clientPhone: existing.clientPhone,
        service: existing.service,
        notes: existing.notes || "",
      })
      setShowAddModal(true)
    } else {
      setSelectedSlot({ date: formatDate(date), time })
      setEditingAppointment(null)
      const defaultService = serviceOptions[0] ?? defaultServiceOptions[0]
      setFormData({ clientName: "", clientPhone: "", service: defaultService, notes: "" })
      setShowAddModal(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingAppointment) {
      // Preserve the current status selected in the modal (it may have been changed via the status buttons).
      const newStatus = editingAppointment.status ?? 'confirmed'
      updateAppointment(editingAppointment.id, {
        ...formData,
        status: newStatus,
      })
      // update remote and refresh using the preserved status
      await updateAppointmentRemote(editingAppointment.id, { ...formData, status: newStatus })
      const remote = await fetchAppointmentsRemote()
      setAppointments(remote)
    } else if (selectedSlot) {
      const [hours, minutes] = selectedSlot.time.split(":").map(Number)
      const endMinutes = minutes + 30
      const endHours = hours + Math.floor(endMinutes / 60)
      const endTime = `${endHours.toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`
      // create remote (preferred) and refresh
      await createAppointmentRemote({
        ...formData,
        date: selectedSlot.date,
        startTime: selectedSlot.time,
        endTime,
        status: "confirmed",
      })
      const remote = await fetchAppointmentsRemote()
      setAppointments(remote)
    }
    loadAppointments()
    setShowAddModal(false)
    setSelectedSlot(null)
    setEditingAppointment(null)
  }

  const handleDelete = (id: string) => {
    if (confirm("Sei sicuro di voler eliminare questo appuntamento?")) {
      // delete remote and refresh
      deleteAppointmentRemote(id).then(async () => {
        const remote = await fetchAppointmentsRemote()
        setAppointments(remote)
      })
      // also remove local immediately for snappy UI
      deleteAppointment(id)
      setShowAddModal(false)
      setEditingAppointment(null)
    }
  }

  const handleStatusChange = async (id: string, status: Appointment["status"]) => {
    const originalStatus = appointments.find((apt) => apt.id === id)?.status
    setAppointments((prev) => prev.map((apt) => (apt.id === id ? { ...apt, status } : apt)))
    setEditingAppointment((prev) => (prev && prev.id === id ? { ...prev, status } : prev))
    updateAppointment(id, { status })
    try {
      await updateAppointmentRemote(id, { status })
      const remote = await fetchAppointmentsRemote()
      if (remote) {
        setAppointments(remote)
      }
    } catch (error) {
      if (originalStatus && originalStatus !== status) {
        updateAppointment(id, { status: originalStatus })
        setAppointments((prev) => prev.map((apt) => (apt.id === id ? { ...apt, status: originalStatus } : apt)))
        setEditingAppointment((prev) => (prev && prev.id === id ? { ...prev, status: originalStatus } : prev))
      }
      toast?.toast({ title: "Aggiornamento non riuscito", description: "Controlla la connessione e riprova." })
    }
  }

  // toast + beep helpers
  const toast = useToast()
  const playBeep = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = 880
      o.connect(g)
      g.connect(ctx.destination)
      o.start()
      g.gain.setValueAtTime(0.0001, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
      setTimeout(() => {
        try { o.stop() } catch (e) {}
        try { ctx.close() } catch (e) {}
      }, 300)
    } catch (e) {
      // ignore
    }
  }

  const previousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const refreshServices = async () => {
    try {
      const remote = await fetchServicesRemote()
      if (remote && remote.length) {
        setServicesList(remote)
      } else {
        setServicesList([])
      }
    } catch (e) {
      // keep current list on error
    }
  }

  const formatServicePrice = (value?: number) => {
    if (value === undefined || value === null) return "€0"
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return "€0"
    const hasDecimals = Math.round((numeric % 1) * 100) !== 0
    return `€${hasDecimals ? numeric.toFixed(2).replace(".", ",") : numeric.toString()}`
  }

  const openServiceForm = (svc?: Service) => {
    if (svc) {
      setServiceForm({
        id: svc.id,
        name: svc.name ?? "",
        price: svc.price !== undefined && svc.price !== null ? svc.price.toString() : "",
        description: svc.description ?? "",
        imgData: null,
        preview: svc.img ?? null,
      })
    } else {
      setServiceForm({ id: undefined, name: "", price: "", description: "", imgData: null, preview: null })
    }
    if (serviceImageInputRef.current) {
      serviceImageInputRef.current.value = ""
    }
  }

  const handleServiceDelete = async (id: string) => {
    if (!confirm("Eliminare questo servizio?")) return
    try {
      setServicesSaving(true)
      await deleteServiceRemote(id)
      await refreshServices()
      if (serviceForm?.id === id) {
        closeServiceForm()
      }
      toast?.toast({ title: "Servizio eliminato" })
    } catch (e) {
      toast?.toast({ title: "Errore", description: "Impossibile eliminare il servizio. Riprova." })
    } finally {
      setServicesSaving(false)
    }
  }

  const handleServiceImageChange = (file: File | null) => {
    if (!serviceForm) return
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast?.toast({ title: "Formato non supportato", description: "Carica un file immagine (JPG, PNG, WEBP)." })
      if (serviceImageInputRef.current) serviceImageInputRef.current.value = ""
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const base64 = reader.result
        setServiceForm((prev) => (prev ? { ...prev, imgData: base64, preview: base64 } : prev))
      }
    }
    reader.readAsDataURL(file)
  }

  const closeServiceForm = () => {
    setServiceForm(null)
    if (serviceImageInputRef.current) serviceImageInputRef.current.value = ""
  }

  const handleServiceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!serviceForm) return
    const trimmedName = serviceForm.name.trim()
    if (!trimmedName) {
      toast?.toast({ title: "Nome del servizio obbligatorio" })
      return
    }

    const normalizedPrice = serviceForm.price.replace(",", ".").trim()
    const priceValue = normalizedPrice ? Number(normalizedPrice) : undefined
    if (normalizedPrice && Number.isNaN(priceValue)) {
      toast?.toast({ title: "Prezzo non valido", description: "Inserisci un numero (es. 12 o 12,50)." })
      return
    }

    const payload: Partial<Service> = {
      name: trimmedName,
      price: priceValue,
      description: serviceForm.description.trim() || undefined,
    }

    // Make image optional: if provided, include it, otherwise allow creation without an image
    if (serviceForm.imgData) {
      payload.img = serviceForm.imgData
    }

    try {
      setServicesSaving(true)
      if (serviceForm.id) {
        await updateServiceRemote(serviceForm.id, payload)
        toast?.toast({ title: "Servizio aggiornato" })
      } else {
        await createServiceRemote(payload)
        toast?.toast({ title: "Servizio creato" })
      }
      await refreshServices()
      closeServiceForm()
    } catch (e) {
      toast?.toast({ title: "Errore", description: "Salvataggio non riuscito. Riprova." })
    } finally {
      setServicesSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-red-500 mb-2">Pannello Amministratore</h1>
          <p className="text-gray-400">Gestisci gli appuntamenti del barbiere</p>
        </div>

        {/* Calendar Controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 animate-slide-up">
          <div className="flex items-center gap-4">
            <button onClick={previousWeek} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-semibold">
              {weekDates[0].toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
            </h2>
            <button onClick={nextWeek} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 md:mt-0">
            <button onClick={() => setShowServicesModal(true)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
              Gestisci Servizi
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div
          className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          {/* Week Header */}
          <div className="grid grid-cols-7 border-b border-white/10 bg-black/20">
            <div className="p-2 md:p-3 text-center text-gray-500 text-xs md:text-sm"></div>
            {weekDays.map((day, i) => (
              <div key={i} className="p-2 md:p-3 text-center border-l border-white/10">
                <div className="text-xs md:text-sm text-gray-400 font-medium">{day}</div>
                <div
                  className={`text-base md:text-xl font-semibold mt-1 ${weekDates[i].toDateString() === new Date().toDateString() ? "text-red-500" : "text-white"}`}
                >
                  {weekDates[i].getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-7 overflow-x-auto max-h-[600px] md:max-h-none overflow-y-auto">
            <div className="text-gray-400 bg-black/20 sticky left-0 z-10">
              {timeSlots.map((time, i) => (
                <div
                  key={i}
                  className="h-14 md:h-16 border-b border-white/10 pr-2 text-right text-xs md:text-sm flex items-center justify-end"
                >
                  {time}
                </div>
              ))}
            </div>

            {weekDates.map((date, dayIndex) => (
              <div key={dayIndex} className="border-l border-white/10 relative">
                {timeSlots.map((time, timeIndex) => {
                  const appointment = getAppointmentForSlot(date, time)
                  return (
                    <div
                      key={timeIndex}
                      className={`h-14 md:h-16 border-b border-white/10 cursor-pointer transition-all duration-300 ${
                        appointment ? "" : "hover:bg-white/5 active:bg-white/10"
                      }`}
                      onClick={() => handleSlotClick(date, time)}
                    >
                      {appointment && (
                        <div
                          className={`h-full p-1.5 md:p-2 text-[10px] md:text-xs ${
                            appointment.status === "confirmed"
                              ? "bg-red-500/20 border-l-4 border-red-500"
                              : appointment.status === "pending"
                                ? "bg-yellow-500/20 border-l-4 border-yellow-500"
                                : appointment.status === "completed"
                                  ? "bg-green-500/20 border-l-4 border-green-500"
                                  : "bg-gray-500/20 border-l-4 border-gray-500"
                          }`}
                        >
                          <div className="font-semibold truncate text-white">{appointment.clientName}</div>
                          <div className="text-gray-300 truncate">{appointment.service}</div>
                          <div className="text-gray-400 text-[8px] md:text-[10px] mt-0.5 md:mt-1 truncate">
                            {appointment.clientPhone}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500/20 border-l-4 border-yellow-500"></div>
            <span className="text-gray-400">In Attesa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500/20 border-l-4 border-red-500"></div>
            <span className="text-gray-400">Confermato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500/20 border-l-4 border-green-500"></div>
            <span className="text-gray-400">Completato</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500/20 border-l-4 border-gray-500"></div>
            <span className="text-gray-400">Cancellato</span>
          </div>
        </div>
      </div>

      {/* Services management modal */}
      {showServicesModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 animate-slide-up">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="text-left">
                <h3 className="text-2xl font-bold text-white">Gestione Servizi</h3>
                <p className="text-sm text-gray-400 mt-1">Aggiungi, modifica o elimina i servizi mostrati ai clienti.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openServiceForm()}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold"
                >
                  + Nuovo Servizio
                </button>
                <button
                  onClick={() => { setShowServicesModal(false); closeServiceForm() }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold"
                >
                  Chiudi
                </button>
              </div>
            </div>

            {serviceForm && (
              <form onSubmit={handleServiceSubmit} className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">
                    {serviceForm.id ? "Modifica Servizio" : "Nuovo Servizio"}
                  </h4>
                  <button
                    type="button"
                    onClick={closeServiceForm}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Annulla
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300" htmlFor="service-name">Nome</label>
                    <input
                      id="service-name"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                      className="w-full bg-black border border-white/15 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Es. Taglio Capelli"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-300" htmlFor="service-price">Prezzo (€)</label>
                    <input
                      id="service-price"
                      value={serviceForm.price}
                      onChange={(e) => setServiceForm((prev) => (prev ? { ...prev, price: e.target.value } : prev))}
                      className="w-full bg-black border border-white/15 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Es. 15 o 15,50"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <label className="text-sm font-medium text-gray-300" htmlFor="service-description">Descrizione</label>
                    <textarea
                      id="service-description"
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                      className="w-full bg-black border border-white/15 rounded-lg px-4 py-2 text-sm h-24 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      placeholder="Aggiungi una descrizione breve"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <span className="text-sm font-medium text-gray-300">Immagine</span>
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold cursor-pointer w-fit">
                        <input
                          ref={serviceImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleServiceImageChange(e.target.files?.[0] ?? null)}
                        />
                        <span>Carica foto</span>
                      </label>
                      {serviceForm.preview && (
                        <div className="h-20 w-20 rounded-xl overflow-hidden border border-white/10">
                          <img
                            src={serviceForm.preview}
                            alt={serviceForm.name || "Anteprima servizio"}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">Carica un'immagine dal dispositivo (consigliato 600x400, formati JPG/PNG/WEBP).</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={servicesSaving}
                    className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
                  >
                    {servicesSaving ? "Salvataggio..." : "Salva Servizio"}
                  </button>
                  <button
                    type="button"
                    onClick={closeServiceForm}
                    className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                  >
                    Chiudi form
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {servicesLoading ? (
                <div className="text-sm text-gray-400">Caricamento servizi...</div>
              ) : servicesList.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {servicesList.map((service) => (
                    <div key={service.id} className="rounded-xl border border-white/10 bg-black/40 p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        {service.img ? (
                          <img src={service.img} alt={service.name} className="w-20 h-20 rounded-xl object-cover border border-white/10" />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs text-gray-400">
                            Nessuna foto
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <div className="text-lg font-semibold text-white leading-tight">{service.name}</div>
                          <div className="text-sm text-red-400 mt-1">{formatServicePrice(service.price)}</div>
                          {service.description && (
                            <p className="text-xs text-gray-400 mt-2 leading-snug">{service.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => openServiceForm(service)}
                          className="flex-1 min-w-[120px] px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleServiceDelete(service.id)}
                          className="flex-1 min-w-[120px] px-3 py-2 bg-red-500/80 hover:bg-red-500 text-sm rounded-lg transition-colors"
                          disabled={servicesSaving}
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-400 bg-black/30 border border-white/10 rounded-xl p-4 text-center">
                  Nessun servizio disponibile. Aggiungi un servizio per iniziare.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-red-500">
                {editingAppointment ? "Modifica Appuntamento" : "Nuovo Appuntamento"}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome Cliente</label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Telefono</label>
                <input
                  type="tel"
                  required
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Servizio</label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Note (opzionale)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 h-20 resize-none"
                />
              </div>

              {editingAppointment && (
                <div>
                  <label className="block text-sm font-medium mb-2">Stato</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(editingAppointment.id, "pending")}
                      className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                        editingAppointment.status === "pending"
                          ? "bg-yellow-500 text-black"
                          : "bg-yellow-500/20 text-yellow-500"
                      }`}
                    >
                      In Attesa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(editingAppointment.id, "confirmed")}
                      className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                        editingAppointment.status === "confirmed"
                          ? "bg-red-500 text-white"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      Confermato
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(editingAppointment.id, "completed")}
                      className={`flex-1 py-2 rounded-lg text-sm transition-colors ${
                        editingAppointment.status === "completed"
                          ? "bg-green-500 text-black"
                          : "bg-green-500/20 text-green-500"
                      }`}
                    >
                      Completato
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {editingAppointment && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingAppointment.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Elimina
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  {editingAppointment ? "Salva" : "Crea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
