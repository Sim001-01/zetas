"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { fetchAppointmentsRemote, createAppointmentRemote, type Appointment } from "@/lib/appointments"
import { fetchSettings, type Settings } from "@/lib/settings"
import { fetchServicesRemote, type Service } from "@/lib/services"
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, Clock, User, Check, Loader2, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { it } from "date-fns/locale"


const BUSINESS_SLOT_MINUTES = 15

const BUSINESS_WINDOWS_BY_DAY: Record<number, Array<{ start: string; end: string }>> = {
  2: [ // Tuesday
    { start: "09:00", end: "12:45" },
    { start: "15:30", end: "20:15" },
  ],
  3: [ // Wednesday
    { start: "09:00", end: "12:45" },
    { start: "15:30", end: "20:15" },
  ],
  4: [ // Thursday
    { start: "09:00", end: "12:45" },
    { start: "15:30", end: "20:15" },
  ],
  5: [ // Friday
    { start: "09:00", end: "13:00" },
    { start: "15:00", end: "20:15" },
  ],
  6: [ // Saturday
    { start: "08:30", end: "20:00" },
  ],
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

const formatMinutes = (value: number) => {
  const hh = Math.floor(value / 60).toString().padStart(2, "0")
  const mm = (value % 60).toString().padStart(2, "0")
  return `${hh}:${mm}`
}

const getBusinessSlotsForDay = (dayOfWeek: number) => {
  const windows = BUSINESS_WINDOWS_BY_DAY[dayOfWeek] || []
  const slots: string[] = []
  for (const window of windows) {
    const start = toMinutes(window.start)
    const end = toMinutes(window.end)
    for (let minute = start; minute <= end; minute += BUSINESS_SLOT_MINUTES) {
      slots.push(formatMinutes(minute))
    }
  }
  return slots
}

const isBusinessSlotForDay = (dayOfWeek: number, time: string) => {
  const minute = toMinutes(time)
  const windows = BUSINESS_WINDOWS_BY_DAY[dayOfWeek] || []
  return windows.some((window) => {
    const start = toMinutes(window.start)
    const end = toMinutes(window.end)
    if (minute < start || minute > end) return false
    return (minute - start) % BUSINESS_SLOT_MINUTES === 0
  })
}

const defaultServices = [
  "Taglio Capelli",
  "Taglio Capelli + Shampoo",
  "Taglio Capelli + Barba",
  "Taglio Capelli + Shampoo + Barba",
  "Solo Shampoo",
  "Solo Barba"
]

export default function BookingWizard() {
  const { toast } = useToast()
  
  // Steps: 1=Service/Date/Time, 2=Details, 3=Success
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [availableServices, setAvailableServices] = useState<string[]>(defaultServices)

  // Selection
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string>("")

  // Form
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    notes: ""
  })

  const mountedRef = useRef(true)
  const syncInFlightRef = useRef(false)
  const stepRef = useRef(step)
  const submittingRef = useRef(submitting)

  useEffect(() => {
    stepRef.current = step
  }, [step])

  useEffect(() => {
    submittingRef.current = submitting
  }, [submitting])

  // Load Data
  const loadData = useCallback(async () => {
    if (syncInFlightRef.current) return
    syncInFlightRef.current = true
    try {
      const [remoteApts, settingsData, remoteServices] = await Promise.all([
        fetchAppointmentsRemote(),
        fetchSettings().catch(() => null),
        fetchServicesRemote().catch(() => [])
      ])

      if (!mountedRef.current) return

      if (remoteApts) {
        setAppointments(remoteApts.filter((a) => a.status === 'confirmed' || a.status === 'pending'))
      }

      if (settingsData) {
        setSettings(settingsData)
      }

      if (remoteServices && remoteServices.length > 0) {
        setServices(remoteServices as Service[])
        setAvailableServices(remoteServices.map((s: Service) => s.name))
      }
    } catch (e) {
      console.error("Error loading data", e)
    } finally {
      syncInFlightRef.current = false
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadData()

    const refreshIfIdle = () => {
      if (submittingRef.current) return
      if (stepRef.current !== 1) return
      void loadData()
    }

    const interval = setInterval(refreshIfIdle, 5000)

    const source = new EventSource('/api/appointments/stream')
    const handleUpdate = () => {
      refreshIfIdle()
    }
    source.addEventListener('update', handleUpdate)
    source.addEventListener('ready', handleUpdate)

    const handleVisibilitySync = () => {
      refreshIfIdle()
    }
    window.addEventListener('focus', handleVisibilitySync)
    document.addEventListener('visibilitychange', handleVisibilitySync)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
      source.removeEventListener('update', handleUpdate)
      source.removeEventListener('ready', handleUpdate)
      window.removeEventListener('focus', handleVisibilitySync)
      document.removeEventListener('visibilitychange', handleVisibilitySync)
      source.close()
    }
  }, [loadData])

  // Auto-select first service if not selected
  useEffect(() => {
    if (availableServices.length > 0 && !selectedService) {
      setSelectedService(availableServices[0])
    }
  }, [availableServices, selectedService])

  // Slot Generation Logic
  const generateTimeSlots = () => {
    if (!date) return []
    return getBusinessSlotsForDay(date.getDay())
  }

  const isSlotAvailable = (checkDate: Date, time: string) => {
    const dateStr = format(checkDate, "yyyy-MM-dd")
    const isPast = new Date(`${dateStr}T${time}`) < new Date()
    const hasAppointment = appointments.some((apt) => apt.date === dateStr && apt.startTime === time)

    const dayOfWeek = checkDate.getDay() // 0=Sun
    if (settings) {
      if ((settings.closedDates || []).includes(dateStr)) return false
      if ((settings.openDates || []).includes(dateStr)) return !isPast && !hasAppointment
      if (!settings.openingDays.includes(dayOfWeek)) return false
    } else {
      // Default fallback: closed Sun(0) and Mon(1)
      if (dayOfWeek === 0 || dayOfWeek === 1) return false
    }

    if (!isBusinessSlotForDay(dayOfWeek, time)) return false

    return !isPast && !hasAppointment
  }

  const timeSlots = generateTimeSlots()

  // Handler for booking
  const handleBooking = async () => {
    if (!date || !selectedTime || !selectedService) return

    setSubmitting(true)
    try {
      const dateStr = format(date, "yyyy-MM-dd")
      
      // Calculate end time
      // Default duration 30 mins or from settings/service
      // Using simple logic: 30 mins default or settings interval
      const interval = BUSINESS_SLOT_MINUTES
      
      const [hours, minutes] = selectedTime.split(":").map(Number)
      const endDate = new Date()
      endDate.setHours(hours, minutes + interval)
      const endHours = endDate.getHours().toString().padStart(2, '0')
      const endMinutes = endDate.getMinutes().toString().padStart(2, '0')
      const endTime = `${endHours}:${endMinutes}`

      await createAppointmentRemote({
        clientName: formData.name,
        clientSurname: formData.surname,
        clientEmail: formData.email,
        clientPhone: formData.phone,
        service: selectedService,
        date: dateStr,
        startTime: selectedTime,
        endTime: endTime,
        status: 'pending',
        notes: formData.notes
      })
      
      setStep(3)
      toast({
        title: "Prenotazione Inviata",
        description: "Riceverai una conferma a breve.",
      })
    } catch (e: any) {
      if (e?.code === 'SLOT_TAKEN') {
        toast({
          title: "Orario non disponibile",
          description: "Questo slot è già stato prenotato. Seleziona un altro orario.",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Errore",
        description: "Qualcosa è andato storto. Riprova.",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const isDateClosed = (date: Date) => {
    const dayOfWeek = date.getDay()
    const dateStr = format(date, "yyyy-MM-dd")
    if (settings) {
      if ((settings.closedDates || []).includes(dateStr)) return true
      if ((settings.openDates || []).includes(dateStr)) return false
    }
    return !Object.prototype.hasOwnProperty.call(BUSINESS_WINDOWS_BY_DAY, dayOfWeek)
  }

  // Render Step 1: Selection
  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Servizio</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="bg-black/50 border-zinc-700 text-white">
                <SelectValue placeholder="Seleziona un servizio" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                {availableServices.map((s) => (
                  <SelectItem key={s} value={s} className="focus:bg-zinc-800 focus:text-white">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Data</Label>
            <div className="border rounded-md p-4 bg-background/50 backdrop-blur-sm flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={it}
                disabled={(d) => d < new Date(new Date().setHours(0,0,0,0)) || isDateClosed(d)}
                className="rounded-md border-0"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
           <Label>Orario Disponibile</Label>
           <div className="h-[350px] overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
             {date ? (
               isDateClosed(date) ? (
                 <div className="col-span-full flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center border rounded-lg bg-muted/20">
                    <Info className="h-8 w-8 mb-2 opacity-50" />
                    <p>Giorno di chiusura</p>
                 </div>
               ) : (
                 timeSlots.map((time) => {
                   const available = isSlotAvailable(date, time)
                   const selected = selectedTime === time
                   return (
                     <Button
                       key={time}
                       variant={selected ? "default" : "outline"}
                       className={cn(
                         "w-full transition-all",
                         selected && "ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground scale-105",
                         !available && "opacity-50 cursor-not-allowed bg-muted"
                       )}
                       disabled={!available}
                       onClick={() => setSelectedTime(time)}
                     >
                       {time}
                     </Button>
                   )
                 })
               )
             ) : (
                <div className="col-span-full flex items-center justify-center h-full text-muted-foreground">
                   Seleziona una data per vedere gli orari
                </div>
             )}
           </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button 
          onClick={() => setStep(2)} 
          disabled={!date || !selectedTime || !selectedService || (date && isDateClosed(date))}
          className="w-full md:w-auto text-lg py-6"
        >
          Prosegui <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  )

  // Render Step 2: Details
  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="bg-muted/30 p-4 rounded-lg border flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-full text-primary">
               <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
               <p className="font-semibold">{date ? format(date, "d MMMM yyyy", { locale: it }) : ''}</p>
               <p className="text-sm text-muted-foreground">{selectedTime} • {selectedService}</p>
            </div>
         </div>
         <Button variant="ghost" size="sm" onClick={() => setStep(1)}>Modifica</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
         <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input 
              id="name" 
              placeholder="Mario" 
              className="bg-black/50 border-zinc-700 text-white placeholder:text-zinc-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
         </div>
         <div className="space-y-2">
            <Label htmlFor="surname">Cognome *</Label>
            <Input 
              id="surname" 
              placeholder="Rossi" 
              className="bg-black/50 border-zinc-700 text-white placeholder:text-zinc-500"
              value={formData.surname}
              onChange={(e) => setFormData({...formData, surname: e.target.value})}
            />
         </div>
         <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input 
              id="email" 
              type="email"
              placeholder="mario@example.com" 
              className="bg-black/50 border-zinc-700 text-white placeholder:text-zinc-500"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
         </div>
         <div className="space-y-2">
            <Label htmlFor="phone">Telefono *</Label>
            <Input 
              id="phone" 
              type="tel"
              placeholder="+39 333 1234567" 
              className="bg-black/50 border-zinc-700 text-white placeholder:text-zinc-500"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
         </div>
         <div className="col-span-full space-y-2">
            <Label htmlFor="notes">Note (opzionale)</Label>
            <Textarea 
              id="notes" 
              placeholder="Richieste specifiche..." 
              className="bg-black/50 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[100px]"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
         </div>
      </div>

      <div className="flex gap-4 pt-4 border-t">
        <Button variant="outline" onClick={() => setStep(1)} className="flex-1 py-6" disabled={submitting}>
           <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
        </Button>
          <Button 
            onClick={handleBooking} 
            disabled={!formData.name || !formData.surname || !formData.email || !formData.phone || submitting}
            className="flex-[2] py-4 text-base bg-red-600 hover:bg-red-700 text-white"
          >
          {submitting ? (
             <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Invio...</>
          ) : (
             <>Prenota <Check className="ml-2 h-5 w-5" /></>
          )}
        </Button>
      </div>
    </div>
  )

  // Render Step 3: Success
  const renderStep3 = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6 text-center animate-in zoom-in duration-300">
       <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
       </div>
       <div className="space-y-2">
          <h2 className="text-3xl font-bold">Prenotazione Confermata!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
             Grazie {formData.name}, il tuo appuntamento è stato registrato.
             Ti aspettiamo il {date ? format(date, "d MMMM", { locale: it }) : ''} alle {selectedTime}.
          </p>
       </div>
       <Button onClick={() => window.location.reload()} className="mt-8">
          Nuova Prenotazione
       </Button>
    </div>
  )

  return (
    <div className="min-h-screen hex-background flex items-center justify-center p-4 dark">
      <Card className="w-full max-w-4xl border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl text-white">
        <CardHeader className="text-center space-y-2">
           <CardTitle className="text-3xl md:text-4xl font-bold text-white">Prenota il tuo appuntamento</CardTitle>
           <CardDescription className="text-gray-300">
             {step === 1 && "Seleziona i dettagli del servizio"}
             {step === 2 && "Inserisci i tuoi dati"}
             {step === 3 && "Operazione completata"}
           </CardDescription>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
           {loading ? (
             <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
             </div>
           ) : (
             <>
               {step === 1 && renderStep1()}
               {step === 2 && renderStep2()}
               {step === 3 && renderStep3()}
             </>
           )}
        </CardContent>
      </Card>
    </div>
  )
}
