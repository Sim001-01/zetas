import Image from "next/image"
import Link from "next/link"
import { Metadata } from "next"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Info — Zeta's Barbershop",
  description: "Link rapidi: visita il sito, seguici su Instagram e lascia una recensione su Google.",
  alternates: { canonical: "/info" },
}

export default function InfoPage() {
  // Visita Sito Web punta a un dominio esterno richiesto dall'utente
  const sitoUrl = "https://zetasbarbershop.it/"
  const igUrl = "https://www.instagram.com/zetas_barbershop_/"
  const recensioneUrl =
    "https://www.google.com/maps/place/Zeta's+Barber+Shop/@41.430058,13.8956714,17z/data=!3m1!4b1!4m6!3m5!1s0x133abf3ee21222b5:0xf767ae8689eaa44c!8m2!3d41.430054!4d13.8982463!16s%2Fg%2F11ylfzj87d?hl=it&authuser=0&entry=ttu&g_ep=EgoyMDI1MTAyOC4wIKXMDSoASAFQAw%3D%3D"
  // Numero per chiamare
  const telefono = "+393920487764"
  // Posizione — link che apre Google Maps / Mappe con l'indirizzo fornito
  const posizioneQuery =
    "https://www.google.com/maps/search/?api=1&query=Zeta%27s+Barber+Shop+SS430+21+03043+San+Cesario+FR"

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-black to-red-800">
      <div className="w-full max-w-md px-6 py-12 text-center">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="Zeta's Barbershop"
            width={160}
            height={160}
            className="rounded-full shadow-lg"
          />
        </div>

        <h1 className="mb-6 text-2xl font-semibold text-white">Zeta's Barbershop</h1>
        <p className="mb-8 text-sm text-red-200">Link rapidi e contatti</p>

        <div className="flex flex-col gap-4">
          <Button asChild size="lg" className="bg-white text-black hover:opacity-95">
            <a href={sitoUrl} target="_blank" rel="noopener noreferrer">
              Visita Sito Web
            </a>
          </Button>

          <Button asChild size="lg" className="bg-white text-black hover:opacity-95">
            <a href={`tel:${telefono}`}>Chiama Ora</a>
          </Button>

          <Button
            asChild
            size="lg"
            className="bg-[#E1306C] text-white hover:opacity-95"
          >
            <a href={igUrl} target="_blank" rel="noopener noreferrer">
              Seguici su Instagram
            </a>
          </Button>

          <Button
            asChild
            size="lg"
            className="bg-black text-white border border-red-600 hover:opacity-90"
          >
            <a href={recensioneUrl} target="_blank" rel="noopener noreferrer">
              Invia Una Recensione
            </a>
          </Button>

          <Button asChild size="lg" className="bg-red-700 text-white hover:opacity-95">
            <a href={posizioneQuery} target="_blank" rel="noopener noreferrer">
              Posizione (Apri Mappe)
            </a>
          </Button>
        </div>

        <p className="mt-8 text-xs text-red-100">Grazie per il supporto — Zeta's Barbershop</p>
      </div>
    </main>
  )
}
