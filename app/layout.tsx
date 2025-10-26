import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ToastProvider, ToastViewport } from '@/components/ui/toast'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Zeta's Barbershop | Barbiere a Cassino",
  description: "Zeta's Barbershop di Matteo Di Zazzo a Cassino: tagli di capelli moderni, cura della barba e styling su misura.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
      </head>
      <body className={inter.className}>
        <ToastProvider>
          {children}
          <ToastViewport />
        </ToastProvider>
      </body>
    </html>
  )
}
