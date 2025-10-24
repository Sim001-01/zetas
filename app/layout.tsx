import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToastProvider, ToastViewport } from '@/components/ui/toast'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Zeta's Barbershop | Prenota il Tuo Appuntamento",
  description: "Barbiere moderno a Milano. Prenota online il tuo appuntamento per taglio capelli, barba e styling.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </body>
    </html>
  )
}
