import type { Metadata } from "next"

import ClientCalendar from "@/components/client-calendar"

const baseKeywords = [
  "Barbiere Cassino",
  "Barbieri Cassino",
  "Matteo Di Zazzo barbiere",
  "Cassino Barbieri",
  "Taglio capelli Cassino",
  "Barber shop Cassino",
]

export const metadata: Metadata = {
  title: "Zeta's Barbershop Cassino | Matteo Di Zazzo",
  description:
    "Zeta's Barbershop di Matteo Di Zazzo a Cassino offre tagli di capelli moderni, cura della barba e servizi premium per ogni stile.",
  keywords: baseKeywords,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Zeta's Barbershop Cassino",
    description:
      "Prenota il tuo taglio da Matteo Di Zazzo, barbiere a Cassino specializzato in styling moderno e cura della barba.",
  },
}

export default function Home() {
  return <ClientCalendar showCalendar={false} />
}
