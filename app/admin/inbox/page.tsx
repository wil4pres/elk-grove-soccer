'use client'

import { useState } from 'react'
import { getInbox, type InboundMessage } from '@/lib/assignments'

export default function InboxPage() {
  const messages = getInbox()
  const [selected, setSelected] = useState<InboundMessage | null>(null)

  const unreadCount = messages.filter(m => m.status === 'unread').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Inbox
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-sm font-semibold bg-red-100 text-red-800">
              {unreadCount} new
            </span>
          )}
        </h1>
        <p className="text-gray-500 mt-1">Parent replies and inbound messages</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
        {/* Message list */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {messages.map(m => (
              <button
                key={m.messageId}
                onClick={() => setSelected(m)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                  selected?.messageId === m.messageId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {m.status === 'unread' && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${m.status === 'unread' ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {m.fromName}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">
                        {new Date(m.receivedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{m.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{m.bodyText}</p>
                    {m.playerName && (
                      <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                        Re: {m.playerName}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {messages.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-400">
                No messages yet.
              </div>
            )}
          </div>
        </div>

        {/* Message detail */}
        {selected ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-gray-900">{selected.fromName}</h2>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  selected.status === 'unread'    ? 'bg-blue-100 text-blue-800' :
                  selected.status === 'actioned'  ? 'bg-green-100 text-green-800' :
                  selected.status === 'archived'  ? 'bg-gray-100 text-gray-600' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {selected.status}
                </span>
              </div>
              <p className="text-xs text-gray-400">{selected.fromEmail}</p>
              <p className="text-sm text-gray-600 mt-1">{selected.subject}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(selected.receivedAt).toLocaleString()}</p>
            </div>

            <hr className="border-gray-200 my-4" />

            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {selected.bodyText}
            </p>

            {selected.coordinatorNotes && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs font-medium text-yellow-800 mb-0.5">Coordinator notes</p>
                <p className="text-sm text-yellow-700">{selected.coordinatorNotes}</p>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => alert('[Mock] Mark as actioned')}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
              >
                Mark actioned
              </button>
              <button
                onClick={() => alert('[Mock] Archive message')}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                Archive
              </button>
              <button
                onClick={() => alert('[Mock] Add coordinator notes')}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
              >
                Add notes
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Select a message to view</p>
          </div>
        )}
      </div>
    </div>
  )
}
