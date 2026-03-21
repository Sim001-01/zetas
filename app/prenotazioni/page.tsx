import BookingWizard from "@/components/booking-wizard"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata = {
  title: "Prenota Appuntamento | Zeta's Barbershop Cassino",
  description: "Prenota online il tuo appuntamento da Zeta's Barbershop Cassino. Scegli il servizio e l'orario che preferisci.",
}

export default function BookingPage() {
  return <BookingWizard />
}
