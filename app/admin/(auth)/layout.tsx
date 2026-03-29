// Auth pages (login) use a plain layout — no admin nav, no prefetching of admin routes
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
