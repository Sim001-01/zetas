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
    images: [
      {
        url: "/barbierecassino.jpeg",
        width: 1200,
        height: 800,
        alt: "Matteo Di Zazzo barbiere a Cassino",
      },
      {
        url: "/matteodizazzobarbierecassino.jpeg",
        width: 1200,
        height: 800,
        alt: "Dettagli di uno styling firmato Zeta's Barbershop Cassino",
      },
      {
        url: "/zetasbarbershopcassino.jpeg",
        width: 1200,
        height: 800,
        alt: "Ingresso di Zeta's Barbershop Cassino",
      },
      {
        url: "/zetasbarbiere.jpeg",
        width: 1200,
        height: 800,
        alt: "Postazione di lavoro del barbiere a Cassino",
      },
    ],
  },
}

export default function Home() {
  const imageLd = {
    "@context": "https://schema.org",
    "@graph": [
      ...[
        {
          url: "/barbierecassino.jpeg",
          name: "barbierecassino",
          description: "Matteo Di Zazzo al lavoro nel barbershop di Cassino",
        },
        {
          url: "/matteodizazzobarbierecassino.jpeg",
          name: "matteodizazzobarbierecassino",
          description: "Dettagli di uno styling sfumato Zeta's Barbershop",
        },
        {
          url: "/zetasbarbershopcassino.jpeg",
          name: "zetasbarbershopcassino",
          description: "Ingresso dello studio di grooming a Cassino",
        },
        {
          url: "/zetasbarbiere.jpeg",
          name: "zetasbarbiere",
          description: "Postazione professionale del barbiere",
        },
      ].map((img) => ({
        "@type": "ImageObject",
        contentUrl: img.url,
        url: img.url,
        name: img.name,
        description: img.description,
      })),
    ],
  }

  return (
    <>
      <ClientCalendar showCalendar={false} />
      {/* JSON-LD to help search engines discover and index the curated images (not visible to users) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageLd) }}
      />
    </>
  )
}
