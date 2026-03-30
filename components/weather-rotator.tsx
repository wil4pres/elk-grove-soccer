'use client'

import { useState, useEffect } from 'react'
import type { WeatherData } from '@/lib/weather'

const INTERVAL_MS = 15000

export function WeatherRotator({ cities }: { cities: WeatherData[] }) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (cities.length <= 1) return
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % cities.length)
        setVisible(true)
      }, 300)
    }, INTERVAL_MS)
    return () => clearInterval(timer)
  }, [cities.length])

  if (cities.length === 0) {
    return (
      <div className="sm:col-span-3 bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4 text-center">
        <p className="text-sm text-cloud/45">Weather data unavailable — check back shortly.</p>
      </div>
    )
  }

  const current = cities[index]

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-cloud/40 mb-2">
          Weather · Today&apos;s conditions
        </p>
        <div
          className="transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <h2 className="text-2xl font-bold text-cloud">{current.city}</h2>
        </div>

        {/* City dots / nav */}
        <div className="flex items-center gap-2 mt-3">
          {cities.map((c, i) => (
            <button
              key={c.city}
              onClick={() => {
                setVisible(false)
                setTimeout(() => {
                  setIndex(i)
                  setVisible(true)
                }, 300)
              }}
              aria-label={c.city}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'bg-cloud w-4' : 'bg-cloud/25 w-1.5 hover:bg-cloud/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Weather cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-1">Temperature</p>
          <p className="text-xl font-bold text-cloud leading-tight">{current.tempF}°F</p>
          <p className="text-xs text-cloud/45 mt-1">{current.tempNote}</p>
        </div>
        <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-1">UV Index</p>
          <p className="text-xl font-bold text-cloud leading-tight">{current.uvIndex} · {current.uvLabel}</p>
          <p className="text-xs text-cloud/45 mt-1">{current.uvNote}</p>
        </div>
        <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-cloud/35 mb-1">Wind</p>
          <p className="text-xl font-bold text-cloud leading-tight">{current.windSpeedMph} mph {current.windDirection}</p>
          <p className="text-xs text-cloud/45 mt-1">{current.windNote}</p>
        </div>
      </div>
    </div>
  )
}
