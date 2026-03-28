import Link from 'next/link'

const sections = [
  {
    href: '/admin/fields',
    title: 'Field Status',
    description: 'Update open/delay/closed status and notes for each field.',
    accent: 'bg-green-500',
    emoji: '⚽',
  },
  {
    href: '/admin/programs',
    title: 'Programs',
    description: 'Manage registration status, pricing, capacity, and details.',
    accent: 'bg-blue-500',
    emoji: '📋',
  },
  {
    href: '/admin/sponsors',
    title: 'Sponsors',
    description: 'Add, edit, or remove club sponsors and their links.',
    accent: 'bg-purple-500',
    emoji: '🤝',
  },
  {
    href: '/admin/alumni',
    title: 'Alumni',
    description: 'Manage alumni success stories and milestones.',
    accent: 'bg-orange-500',
    emoji: '🏆',
  },
  {
    href: '/admin/staff',
    title: 'Staff',
    description: 'Manage coaching staff and contact information.',
    accent: 'bg-teal-500',
    emoji: '👤',
  },
]

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Elk Grove Soccer — Admin Panel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(section => (
          <Link
            key={section.href}
            href={section.href}
            className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md hover:border-gray-300 transition-all group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 ${section.accent} rounded-xl flex items-center justify-center text-lg`}>
                {section.emoji}
              </div>
              <h2 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {section.title}
              </h2>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">{section.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-sm text-gray-500">
          <span className="font-medium text-gray-700">Live site:</span>{' '}
          <a href="https://www.sacramento.soccer" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            www.sacramento.soccer
          </a>
        </p>
      </div>
    </div>
  )
}
