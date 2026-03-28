'use client'

import Link from 'next/link'
import { useState } from 'react'

const navLinks = [
  { label: 'Play', href: '/programs' },
  { label: 'Register', href: '/register' },
  { label: 'Field Status', href: '/field-status', hasDot: true },
  { label: 'Maps & Schedules', href: '/maps' },
  { label: 'Alumni', href: '/alumni' },
  { label: 'Sponsors', href: '/sponsors' },
]

function SoccerBall() {
  return (
    <span className="logo-ball-bounce inline-flex shrink-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/soccer-ball.png"
        alt=""
        aria-hidden="true"
        className="logo-ball-spin"
        style={{ width: 32, height: 32 }}
      />
    </span>
  )
}

function EgsLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity" aria-label="Elk Grove Soccer — home">
      <SoccerBall />
      <span className="relative overflow-hidden" style={{ height: '1.25rem', width: '11rem' }}>
        <span className="logo-word-a absolute inset-0 flex items-center font-bold text-base tracking-tight whitespace-nowrap">
          <span className="text-cloud">Elk</span>
          <span style={{ color: '#ff8900' }}>Grove</span>
          <span className="text-cloud">Soccer</span>
        </span>
        <span className="logo-word-b absolute inset-0 flex items-center font-bold text-base tracking-tight whitespace-nowrap" style={{ color: '#ff8900' }}>
          Sacramento Soccer
        </span>
      </span>
    </Link>
  )
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-midnight/90 border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side: Logo + hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <EgsLogo />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-xl hover:bg-white/[0.06] transition-colors"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span
                className={`block w-5 h-0.5 bg-cloud rounded-full transition-transform duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}
              />
              <span
                className={`block w-5 h-0.5 bg-cloud rounded-full transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`}
              />
              <span
                className={`block w-5 h-0.5 bg-cloud rounded-full transition-transform duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}
              />
            </button>
          </div>

          {/* Desktop nav (center) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-cloud/70 hover:text-cloud hover:bg-white/[0.06] transition-colors"
              >
                {link.hasDot && (
                  <span className="w-2 h-2 rounded-full bg-leaf inline-block shrink-0" aria-label="Live status" />
                )}
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: Register CTA */}
          <Link
            href="/register"
            className="hidden lg:block bg-gradient-to-r from-leaf to-sunset text-midnight font-bold text-sm rounded-2xl py-2.5 px-5 hover:opacity-90 transition-opacity"
          >
            Register 2026
          </Link>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-white/[0.08] bg-midnight/95 backdrop-blur-md">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3.5 rounded-2xl text-base font-medium text-cloud/80 hover:text-cloud hover:bg-white/[0.06] transition-colors"
              >
                {link.hasDot && (
                  <span className="w-2 h-2 rounded-full bg-leaf shrink-0" aria-label="Live status" />
                )}
                {link.label}
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t border-white/[0.08]">
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="block text-center bg-gradient-to-r from-leaf to-sunset text-midnight font-bold text-base rounded-2xl py-4 px-6 hover:opacity-90 transition-opacity"
              >
                Register for 2026
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
