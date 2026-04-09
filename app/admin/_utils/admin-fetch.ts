'use client'

/**
 * Drop-in replacement for fetch() in admin client components.
 * Automatically reads the csrf_token cookie and injects it as x-csrf-token header
 * on state-changing requests (POST, PUT, DELETE, PATCH).
 */

const CSRF_MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

function getCsrfToken(): string {
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith('csrf_token='))
  return match ? match.split('=')[1] : ''
}

export function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase()

  if (!CSRF_MUTATING_METHODS.has(method)) {
    return fetch(url, init)
  }

  const headers = new Headers(init?.headers)
  headers.set('x-csrf-token', getCsrfToken())

  return fetch(url, { ...init, headers })
}
