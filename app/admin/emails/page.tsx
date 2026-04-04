import { getEmails } from '@/lib/assignments'

export const dynamic = 'force-dynamic'

export default function EmailLogPage() {
  const emails = getEmails()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Log</h1>
        <p className="text-gray-500 mt-1">All outbound notifications sent to parents</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Player</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">Recipient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Subject</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Sent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {emails.map(e => (
              <tr key={e.notificationId} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{e.playerName}</td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                  <p>{e.recipientName}</p>
                  <p className="text-xs text-gray-400">{e.recipientEmail}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-xs truncate">
                  {e.subject}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    e.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    e.status === 'sent'      ? 'bg-blue-100 text-blue-800' :
                    e.status === 'bounced'   ? 'bg-red-100 text-red-800' :
                    e.status === 'failed'    ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                  {e.sentAt ? new Date(e.sentAt).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {emails.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No emails sent yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
