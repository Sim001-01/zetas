"use client"

import { Instagram } from "lucide-react"

export default function InstagramFeed() {
  return (
    <div className="hex-background py-12 md:py-16 px-4 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-8 md:mb-12 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Instagram className="h-7 w-7 md:h-10 md:w-10 text-red-500" />
            <h2 className="text-3xl md:text-5xl font-bold text-white">Seguici su Instagram</h2>
          </div>
          <a
            href="https://www.instagram.com/zetas_barbershop_/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 font-semibold text-base md:text-xl transition-colors"
          >
            @zetas_barbershop_
          </a>
        </div>

        <div className="flex justify-center animate-scale-in" style={{ animationDelay: "0.2s" }}>
          <div className="w-full max-w-4xl">
            <iframe
              src="https://www.instagram.com/zetas_barbershop_/embed"
              className="w-full h-[400px] md:h-[600px] rounded-2xl bg-transparent"
              frameBorder="0"
              scrolling="no"
              allowTransparency
              title="Instagram Feed"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
