const stats = [
  { value: '1,200+', label: 'Players' },
  { value: '45+', label: 'Teams' },
  { value: 'Est. 2001', label: 'Years of community' },
  { value: 'NorCal Premier', label: 'League member' },
]

export default function TrustStrip() {
  return (
    <section className="bg-pitch/30 border-y border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/[0.06]">
          {stats.map((stat) => (
            <div key={stat.label} className="px-4 md:px-8 py-2 first:pl-0 last:pr-0 text-center md:text-left">
              <p className="text-2xl md:text-3xl font-bold text-cloud leading-none mb-1">{stat.value}</p>
              <p className="text-xs font-medium text-cloud/40 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
