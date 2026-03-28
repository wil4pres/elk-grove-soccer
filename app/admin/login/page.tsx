import { login } from './actions'

type Props = { searchParams: Promise<{ error?: string }> }

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-[#080d1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0080ff] to-[#004ccc] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">EG</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-white/50 text-sm mt-1">Elk Grove Soccer</p>
        </div>

        <form action={login} className="bg-white/[0.05] border border-white/[0.1] rounded-2xl p-6 flex flex-col gap-4">
          {error && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 border border-red-400/20 rounded-xl py-2">
              Incorrect password
            </p>
          )}
          <div>
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wide block mb-2">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              autoFocus
              className="w-full bg-white/[0.08] border border-white/[0.12] rounded-xl px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#0080ff]/60 transition-colors"
              placeholder="Enter admin password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#0080ff] to-[#004ccc] text-white font-semibold rounded-xl py-3 hover:opacity-90 transition-opacity"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
