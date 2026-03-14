"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Calendar, Clock, Phone, User, X, Mail } from "lucide-react"
import Image from "next/image"
import { getAppointments, type Appointment, fetchAppointmentsRemote, createAppointmentRemote } from "@/lib/appointments"
import { fetchSettings, type Settings } from "@/lib/settings"
import InstagramFeed from "./instagram-feed"
import { useToast } from "@/hooks/use-toast"

const SERVICE_PLACEHOLDER_IMAGE = "/placeholder.jpg"

const showcaseImages: { src: string; alt: string; caption: string }[] = [
  {
    src: "/barbierecassino.jpeg",
    alt: "Barbiere a Cassino Matteo Di Zazzo in salone",
    caption: "Matteo Di Zazzo al lavoro nel barbershop di Cassino",
  },
  {
    src: "/matteodizazzobarbierecassino.jpeg",
    alt: "Dettaglio taglio sfumato da Zeta's Barbershop Cassino",
    caption: "Dettagli di uno styling sfumato Zeta's Barbershop",
  },
  {
    src: "/zetasbarbershopcassino.jpeg",
    alt: "Ingresso di Zeta's Barbershop Cassino",
    caption: "Ingresso dello studio di grooming a Cassino",
  },
  {
    src: "/zetasbarbiere.jpeg",
    alt: "Postazione lavoro del barbiere Zeta's Cassino",
    caption: "Postazione professionale del barbiere",
  },
]

// gallery images (showcase) are separate from service images


export default function ClientCalendar({ showCalendar = true, minimal = false }: { showCalendar?: boolean; minimal?: boolean }) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [currentDate] = useState(new Date())
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null)
  const [formData, setFormData] = useState({
    clientName: "",
    clientSurname: "",
    clientPhone: "",
    clientEmail: "",
    service: "Taglio Capelli",
    notes: "",
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Initial load
    loadData()

    // Polling every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [remoteApts, settingsData] = await Promise.all([
        fetchAppointmentsRemote(),
        fetchSettings().catch(() => null)
      ])
      
      if (remoteApts) {
        setAppointments(remoteApts.filter((apt) => apt.status === 'confirmed' || apt.status === 'pending'))
      } else {
        const local = getAppointments()
        setAppointments(local.filter((apt) => apt.status === 'confirmed' || apt.status === 'pending'))
      }

      if (settingsData) {
        setSettings(settingsData)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadAppointments = () => {
    // Legacy function support if needed, but loadData handles it
    const allAppointments = getAppointments()
    setAppointments(allAppointments.filter((apt) => apt.status === "confirmed" || apt.status === "pending"))
  }

  const weekDays = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"]
  
  // Use settings for time slots or defaults
  const generateTimeSlots = () => {
    if (!settings) {
      return [
        "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
        "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
        "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
      ]
    }
    const { start, end, interval } = settings.timeSlots
    const slots = []
    let current = new Date(`2000-01-01T${start}`)
    const endTime = new Date(`2000-01-01T${end}`)
    
    while (current <= endTime) {
      const hours = current.getHours().toString().padStart(2, '0')
      const minutes = current.getMinutes().toString().padStart(2, '0')
      slots.push(`${hours}:${minutes}`)
      current.setMinutes(current.getMinutes() + interval)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()
  const normalizeServiceImage = (value?: string | null) => {
    if (!value || typeof value !== 'string') return SERVICE_PLACEHOLDER_IMAGE
    const trimmed = value.trim()
    if (!trimmed) return SERVICE_PLACEHOLDER_IMAGE
    if (trimmed.startsWith('data:image/')) return trimmed
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
    if (trimmed.startsWith('/')) return trimmed
    return SERVICE_PLACEHOLDER_IMAGE
  }

  const defaultPriceList = [
    { name: 'Taglio Capelli', price: '€10', img: SERVICE_PLACEHOLDER_IMAGE, desc: 'Taglio tradizionale' },
    { name: 'Taglio Capelli + Shampoo', price: '€12', img: SERVICE_PLACEHOLDER_IMAGE, desc: 'Taglio con shampoo' },
    { name: 'Taglio Capelli + Barba', price: '€13', img: SERVICE_PLACEHOLDER_IMAGE, desc: 'Taglio capelli con rifinitura barba' },
    { name: 'Taglio Capelli + Shampoo + Barba', price: '€15', img: SERVICE_PLACEHOLDER_IMAGE, desc: 'Pacchetto completo' },
    { name: 'Solo Shampoo', price: '€4', img: SERVICE_PLACEHOLDER_IMAGE, desc: 'Solo shampoo' },
    { name: 'Solo Barba', price: '€5', img: SERVICE_PLACEHOLDER_IMAGE, desc: 'Rifinitura barba' },
  ]

  const [priceList, setPriceList] = useState(defaultPriceList)
  const [serviceOptions, setServiceOptions] = useState(defaultPriceList.map((p) => p.name))

  const formatPrice = (value?: number) => {
    if (value === undefined || value === null) return "€0"
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return "€0"
    const hasDecimals = Math.round((numeric % 1) * 100) !== 0
    return `€${hasDecimals ? numeric.toFixed(2).replace(".", ",") : numeric.toString()}`
  }

  // load services from API if available and map to price list
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { fetchServicesRemote } = await import('@/lib/services')
        const remote = await fetchServicesRemote()
        if (!mounted) return
        if (remote && remote.length) {
          const mapped = remote.map((r) => {
            return {
              name: r.name,
              price: formatPrice(r.price),
              img: normalizeServiceImage(r.img),
              desc: r.description || "",
            }
          })
          setPriceList(mapped)
          setServiceOptions(remote.map((r) => r.name))
        }
      } catch (e) {
        // ignore, keep defaults
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setFormData((prev) => {
      if (serviceOptions.length && !serviceOptions.includes(prev.service)) {
        return { ...prev, service: serviceOptions[0] }
      }
      return prev
    })
  }, [serviceOptions])

  const getWeekDates = () => {
    const start = new Date(currentDate)
    const day = start.getDay()
    const diff = day === 0 ? -6 : 1 - day
    start.setDate(start.getDate() + diff)

    // Return 7 days (Mon-Sun) to match settings logic
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      return date
    })
  }

  const weekDates = getWeekDates()

  const formatDate = (date: Date) => {
    // format in local time to keep saved dates stable across timezones
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const isDayOpen = (date: Date) => {
    const dayOfWeek = date.getDay()
    const dateStr = formatDate(date)
    if (settings) {
      if ((settings.closedDates || []).includes(dateStr)) return false
      if ((settings.openDates || []).includes(dateStr)) return true
      return settings.openingDays.includes(dayOfWeek)
    }
    return dayOfWeek !== 0 && dayOfWeek !== 1
  }

  const isSlotAvailable = (date: Date, time: string) => {
    const dateStr = formatDate(date)
    const isPast = new Date(`${dateStr}T${time}`) < new Date()
    const hasAppointment = appointments.some((apt) => apt.date === dateStr && apt.startTime === time)

    if (!isDayOpen(date)) return false

    return !isPast && !hasAppointment
  }

  const getAppointmentForSlot = (date: Date, time: string) => {
    const dateStr = formatDate(date)
    return appointments.find((apt) => apt.date === dateStr && apt.startTime === time)
  }

  const handleSlotClick = (date: Date, time: string) => {
    if (isSlotAvailable(date, time)) {
      setSelectedSlot({ date: formatDate(date), time })
      setFormData({ 
        clientName: "", 
        clientSurname: "",
        clientPhone: "", 
        clientEmail: "",
        service: serviceOptions[0] ?? "Taglio Capelli", 
        notes: "" 
      })
      setShowBookingModal(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSlot) {
      const slotTime = settings ? settings.timeSlots.interval : 30
      const [hours, minutes] = selectedSlot.time.split(":").map(Number)
      const endMinutes = minutes + slotTime
      const endHours = hours + Math.floor(endMinutes / 60)
      const endTime = `${endHours.toString().padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`
      
      try {
        await createAppointmentRemote({
          ...formData,
          date: selectedSlot.date,
          startTime: selectedSlot.time,
          endTime,
          status: "pending",
        })
      } catch (error: any) {
        if (error?.code === 'SLOT_TAKEN') {
          toast({
            title: "Orario non disponibile",
            description: "Questo slot è già stato prenotato. Seleziona un altro orario.",
            variant: "destructive",
          })
          return
        }
        toast({
          title: "Errore",
          description: "Impossibile completare la prenotazione. Riprova.",
          variant: "destructive",
        })
        return
      }
      
      // Update local state immediately
      setAppointments(prev => [...prev, {
        id: Date.now().toString(), // temporary
        ...formData,
        date: selectedSlot.date,
        startTime: selectedSlot.time,
        endTime,
        status: "pending",
        createdAt: new Date().toISOString()
      }])
      
      // Refresh form source
      loadData()
      
      setShowBookingModal(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
      setSelectedSlot(null)
    }
  }

  return (
    <div className="min-h-screen hex-background">
      {!minimal && (
        <div className="relative py-12 md:py-20 px-4 animate-fade-in">
          <div className="max-w-7xl mx-auto text-center relative z-10">
            <div className="flex justify-center animate-scale-in">
              <Image
                src="/logo.png"
                alt="Zeta's Barbershop"
                width={800}
                height={240}
                className="h-48 md:h-64 lg:h-80 w-auto drop-shadow-2xl"
                priority
              />
            </div>
            <p
              className="text-xl md:text-3xl text-white max-w-3xl mx-auto font-medium animate-slide-up mt-8"
              style={{ animationDelay: "0.2s" }}
            >
              Prenota il tuo appuntamento e scopri l'arte del barbiere moderno
            </p>
            <p
              className="mt-4 text-base md:text-lg text-gray-200 max-w-3xl mx-auto animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              Matteo Di Zazzo guida Zeta's Barbershop a Cassino con un approccio sartoriale: ogni taglio nasce da una consulenza
              personalizzata e dall'attenzione ai dettagli di un barbiere che coniuga tecnica moderna, prodotti selezionati e rispetto
              della tradizione. Se cerchi un Barbiere a Cassino che curi stile, barba e immagine professionale, qui trovi un'esperienza
              completa pensata per chi desidera il meglio.
            </p>
          </div>
        </div>
      )}

      {!minimal && <InstagramFeed />}

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8 relative z-10">
        {!minimal && (
          <div className="mb-6 md:mb-8 animate-slide-up">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Prenota il Tuo Appuntamento</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
                <div className="text-sm uppercase tracking-wide text-gray-400">Domenica / Lunedì</div>
                <div className="mt-2 text-2xl font-bold text-white">Chiuso</div>
                <p className="mt-2 text-sm text-gray-400">Riposo settimanale del barbershop.</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6">
                <div className="text-sm uppercase tracking-wide text-gray-400">Martedì / Sabato</div>
                <div className="mt-2 text-2xl font-bold text-white">09:00 - 13:00</div>
                <div className="text-xl font-semibold text-red-400">15:30 - 20:30</div>
                <p className="mt-2 text-sm text-gray-400">Orari continuativi per offrirti il massimo comfort.</p>
              </div>
            </div>
          </div>
        )}

        {showCalendar && (
          <>
            {minimal && (
              <div className="text-center mb-8 animate-slide-up">
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-2">Prenota Ora</h2>
                <p className="text-gray-400">Seleziona data e orario per il tuo appuntamento</p>
              </div>
            )}
            <div
              className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-scale-in"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="grid grid-cols-8 border-b border-white/10 bg-black/20">
                <div className="p-2 md:p-3 text-center text-gray-500 text-xs md:text-sm"></div>
                {weekDays.map((day, i) => {
                  // weekDates[i] is the actual Date object
                  // weekDays[i] is just "LUN", "MAR"...
                  const dayDate = weekDates[i]
                  const dayId = dayDate.getDay()
                  // If no settings are loaded yet, we can't reliably know. 
                  // But usually settings load fast. 
                  // Standard: Sun=0 (Chiuso), Mon=1 (Chiuso) if logic demands it.
                  // Existing settings mock/default fallback in "isSlotAvailable" didn't do much.
                  // Let's rely on settings if present, else default Mon/Sun closed visually.
                  const isOpen = isDayOpen(dayDate)

                  return (
                    <div key={i} className={`p-2 md:p-3 text-center border-l border-white/10 ${!isOpen ? "bg-black/40 text-gray-600" : ""}`}>
                      <div className={`text-xs md:text-sm font-medium ${!isOpen ? "text-gray-600" : "text-gray-400"}`}>{day}</div>
                      <div
                        className={`text-base md:text-xl font-bold mt-1 ${
                          dayDate.toDateString() === new Date().toDateString()
                            ? "text-red-500 animate-pulse-glow"
                            : !isOpen ? "text-gray-600" : "text-white"
                        }`}
                      >
                        {dayDate.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-8 overflow-x-auto max-h-[600px] md:max-h-none overflow-y-auto">
                <div className="text-gray-400 bg-black/20 sticky left-0 z-10">
                  {timeSlots.map((time, i) => (
                    <div
                      key={i}
                      className="h-14 md:h-16 border-b border-white/10 pr-2 text-right text-xs md:text-sm flex items-center justify-end font-medium"
                    >
                      {time}
                    </div>
                  ))}
                </div>

                {weekDates.map((date, dayIndex) => {
                  const dayId = date.getDay()
                  const isOpen = isDayOpen(date)

                  return (
                    <div key={dayIndex} className={`border-l border-white/10 relative ${!isOpen ? "bg-black/60" : ""}`}>
                      {!isOpen && (
                         <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden">
                           <div className="-rotate-90 text-gray-800 text-3xl md:text-5xl font-black tracking-widest uppercase opacity-40 select-none">
                             Chiuso
                           </div>
                         </div>
                      )}
                      
                      {timeSlots.map((time, timeIndex) => {
                        const available = isSlotAvailable(date, time)
                        const appointment = getAppointmentForSlot(date, time)
                        
                        if (!isOpen) { 
                           // If closed, render empty/dark slot
                           return (
                             <div
                               key={timeIndex}
                               className="h-14 md:h-16 border-b border-white/5 bg-transparent cursor-not-allowed"
                             />
                           )
                        }

                        return (
                          <div
                            key={timeIndex}
                            className={`h-14 md:h-16 border-b border-white/10 transition-all duration-300 ${
                              available
                                ? "cursor-pointer hover:bg-white/10 active:bg-white/20 hover:scale-105"
                                : appointment
                                ? "bg-black/80 border-l-4 border-gray-600"
                                : "bg-black/20 cursor-not-allowed"
                            }`}
                            onClick={() => available && handleSlotClick(date, time)}
                          >
                            {appointment ? (
                              <div className="h-full flex items-center justify-center p-1.5 md:p-2 bg-black/50 animate-slide-in-left">
                                <div className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                                  Non Disponibile
                                </div>
                              </div>
                            ) : available ? (
                              <div className="h-full flex items-center justify-center text-green-400 text-[10px] md:text-xs font-medium opacity-0 hover:opacity-100 transition-opacity">
                                Disponibile
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            <div
              className="mt-6 flex flex-wrap gap-3 md:gap-4 text-xs md:text-sm animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-green-400/20 border-2 border-green-400 rounded"></div>
                <span className="text-gray-300">Disponibile</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 md:w-4 md:h-4 bg-black/80 border-l-4 border-gray-600"></div>
                <span className="text-gray-300">Non Disponibile</span>
              </div>
            </div>
          </>
        )}
        

        {!minimal && (
          <div className="mt-8 md:mt-12 text-center animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {!showCalendar && (
                <a
                  href="/prenotazioni"
                  className="inline-flex items-center gap-3 px-8 md:px-12 py-4 md:py-6 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-2xl md:rounded-3xl font-bold text-lg md:text-2xl shadow-2xl hover:shadow-red-500/50 hover:scale-105 transition-all duration-300"
                >
                  <Calendar className="h-6 w-6 md:h-8 md:w-8 animate-pulse" />
                  PRENOTA ORA
                </a>
              )}
              <a
                href="tel:+393920487764"
                className={`inline-flex items-center gap-3 px-8 md:px-12 py-4 md:py-6 ${!showCalendar ? "bg-white/10 text-white hover:bg-white/20" : "bg-gradient-to-r from-red-600 to-red-500 text-white hover:shadow-red-500/50"} rounded-2xl md:rounded-3xl font-bold text-lg md:text-2xl shadow-2xl hover:scale-105 transition-all duration-300`}
              >
                <Phone className="h-6 w-6 md:h-8 md:w-8 animate-pulse" />
                CHIAMA ORA
              </a>
            </div>
            <div className="mt-10">
              <h3 className="text-2xl md:text-3xl font-bold text-white">Galleria</h3>
              <p className="text-gray-300 mt-3 text-sm md:text-base max-w-2xl mx-auto">
                Uno sguardo autenticato dentro Zeta&apos;s Barbershop Cassino: ambiente, dettagli e finiture firmate Matteo Di Zazzo.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {showcaseImages.map((image) => (
                  <div key={image.src} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                      />
                    </div>
                    <div className="px-4 py-3 text-left">
                      {/* keep caption in DOM for accessibility and indexing, but visually hidden */}
                      <span className="sr-only">{image.caption}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Services heading */}
            <div className="mt-10">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Servizi</h3>
            </div>

            {/* Price list */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {priceList.map((p) => (
                <div key={p.name} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3">
                  <div className="w-full h-36 md:h-44 overflow-hidden rounded-lg">
                    <Image src={p.img} alt={p.name} width={600} height={400} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-gray-300 text-sm">{p.desc}</div>
                  </div>
                  <div className="mt-2 text-red-400 font-bold text-lg">{p.price}</div>
                </div>
              ))}
            </div>

            {/* Location section */}
            <div className="mt-12 md:mt-16 text-center">
              <h3 className="text-2xl md:text-3xl font-bold text-white">Posizione</h3>
              <p className="text-gray-300 mt-2 text-sm md:text-base">Vieni a trovarci in SS430, 10-16, 03043 San Cesario FR</p>
              <div className="mt-6 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <iframe
                  title="Mappa Zeta's Barbershop"
                  src="https://www.google.com/maps?q=41.429973689847515,13.898272247814868&z=17&hl=it&output=embed"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-72 md:h-96"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        )}
      </div>

      {!minimal && (
        <footer className="mt-16 py-6 text-center text-sm text-gray-400">
          Progetto realizzato con cura da{` `}
          <a
            href="https://studiowebdesigner.com"
            className="text-red-400 hover:text-red-300 transition-colors relative z-50 pointer-events-auto"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              // defensive: if something intercepts the click, force-open the external site
              e.stopPropagation()
              e.preventDefault()
              window.open('https://studiowebdesigner.com', '_blank', 'noopener,noreferrer')
            }}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              // open on Enter or Space for keyboard users
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                window.open('https://studiowebdesigner.com', '_blank', 'noopener,noreferrer')
              }
            }}
          >
            StudioWebDesigner
          </a>
        </footer>
      )}

      {showBookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-black border-2 border-red-500/50 rounded-2xl max-w-md w-full p-6 animate-scale-in shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-red-500">Prenota Appuntamento</h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                <span>
                  {new Date(selectedSlot.date).toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                <span>{selectedSlot.time}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input
                      type="text"
                      required
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full bg-black/60 border-2 border-red-500/30 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Mario"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Cognome</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.clientSurname}
                      onChange={(e) => setFormData({ ...formData, clientSurname: e.target.value })}
                      className="w-full bg-black/60 border-2 border-red-500/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Rossi"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={formData.clientEmail}
                    onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                    className="w-full bg-black/60 border-2 border-red-500/30 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="mario.rossi@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Telefono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="tel"
                    required
                    value={formData.clientPhone}
                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                    className="w-full bg-black/60 border-2 border-red-500/30 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="+39 123 456 7890"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Servizio</label>
                <select
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full bg-black/60 border-2 border-red-500/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {serviceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Note (opzionale)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-black/60 border-2 border-red-500/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent h-20 resize-none"
                  placeholder="Richieste speciali..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-600 transition-all font-semibold text-lg shadow-lg hover:shadow-red-500/50 hover:scale-105"
              >
                Conferma Prenotazione
              </button>
            </form>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-8 right-8 bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-4 rounded-xl shadow-2xl animate-slide-in-right z-50 border-2 border-green-400">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center animate-scale-in">
              <span className="text-green-500 text-xl font-bold">✓</span>
            </div>
            <div>
              <div className="font-bold text-lg">Richiesta inviata!</div>
              <div className="text-sm opacity-90">Ti contatteremo presto per confermare</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
