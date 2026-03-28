interface GameDayItem {
  icon: React.ReactNode
  label: string
  value: string
}

interface GameDayCardProps {
  title: string
  icon: React.ReactNode
  items: GameDayItem[]
  accentColor?: string
}

export default function GameDayCard({ title, icon, items, accentColor = 'text-leaf' }: GameDayCardProps) {
  return (
    <div className="bg-white/[0.05] border border-white/[0.08] rounded-3xl p-6 flex flex-col gap-5">
      {/* Card header */}
      <div className="flex items-center gap-3">
        <div className={`${accentColor}`}>{icon}</div>
        <h3 className="text-base font-bold text-cloud">{title}</h3>
      </div>

      {/* Items list */}
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="text-cloud/30 mt-0.5 shrink-0">{item.icon}</span>
            <div>
              <p className="text-xs font-semibold text-cloud/40 uppercase tracking-wide mb-0.5">{item.label}</p>
              <p className="text-sm text-cloud/80 leading-snug">{item.value}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
