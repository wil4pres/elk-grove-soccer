'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
}

interface ToolCall {
  name: string
  input: Record<string, unknown>
  result?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  async function send() {
    const text = input.trim()
    if (!text || streaming) return

    const userMessage: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    // Build API messages (only role + content for the API)
    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error || res.statusText}` }])
        setStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')
      const decoder = new TextDecoder()

      let assistantText = ''
      let currentToolCalls: ToolCall[] = []

      // Add placeholder assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '', toolCalls: [] }])

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)

            if (event.type === 'text') {
              assistantText += event.text
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: assistantText, toolCalls: [...currentToolCalls] }
                }
                return updated
              })
            }

            if (event.type === 'tool_call') {
              currentToolCalls = [...currentToolCalls, { name: event.name, input: event.input }]
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, toolCalls: [...currentToolCalls] }
                }
                return updated
              })
            }

            if (event.type === 'tool_result') {
              currentToolCalls = currentToolCalls.map(tc =>
                tc.name === event.name && !tc.result
                  ? { ...tc, result: event.result }
                  : tc
              )
              // After tool result, Claude will stream more text — reset for next chunk
              assistantText = ''
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, toolCalls: [...currentToolCalls] }
                }
                return updated
              })
            }

            if (event.type === 'error') {
              assistantText += `\n\nError: ${event.error}`
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: assistantText }
                }
                return updated
              })
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : String(e)}` }])
    } finally {
      setStreaming(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Coordinator Chat</h1>
        <p className="text-gray-500 text-sm mt-1">
          Ask questions about players, teams, and assignments — powered by Claude
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <p className="text-lg font-medium mb-2">Ask me anything about the 2026 season</p>
            <div className="text-sm space-y-1.5 max-w-md mx-auto text-left">
              <p className="text-gray-500 font-medium mb-2">Try:</p>
              <SuggestedQuery text="Show me all players at Miwok Elementary" onSend={q => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0) }} />
              <SuggestedQuery text="How full is the Destroyers roster?" onSend={q => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0) }} />
              <SuggestedQuery text="Why was Esharveer Singh assigned to the Destroyers?" onSend={q => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0) }} />
              <SuggestedQuery text="Show me the assignment report summary" onSend={q => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0) }} />
              <SuggestedQuery text="List all unassigned players" onSend={q => { setInput(q); setTimeout(() => inputRef.current?.focus(), 0) }} />
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {streaming && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about players, teams, or assignments..."
          rows={1}
          className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={streaming}
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function SuggestedQuery({ text, onSend }: { text: string; onSend: (q: string) => void }) {
  return (
    <button
      onClick={() => onSend(text)}
      className="block w-full text-left px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
    >
      {text}
    </button>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : ''}`}>
        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2 space-y-2">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Message text */}
        {message.content && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <div className="whitespace-pre-wrap">{formatMarkdown(message.content)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function ToolCallBadge({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false)

  const toolLabels: Record<string, string> = {
    list_players: 'Searching players',
    get_team_roster: 'Loading roster',
    assign_player: 'Assigning player',
    get_report: 'Loading report',
    explain_score: 'Explaining score',
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-700 font-medium hover:bg-amber-100 transition-colors"
      >
        <span className="w-4 h-4 flex items-center justify-center">
          {toolCall.result ? '✓' : '⏳'}
        </span>
        {toolLabels[toolCall.name] ?? toolCall.name}
        {toolCall.input && Object.keys(toolCall.input).length > 0 && (
          <span className="text-amber-500 font-normal">
            ({Object.entries(toolCall.input).map(([k, v]) => `${k}: ${v}`).join(', ')})
          </span>
        )}
        <span className="ml-auto text-amber-400">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && toolCall.result && (
        <div className="px-3 py-2 border-t border-amber-200 bg-white text-xs text-gray-600 max-h-60 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-mono">{toolCall.result}</pre>
        </div>
      )}
    </div>
  )
}

// Simple markdown-ish formatting (bold only — no full parser needed)
function formatMarkdown(text: string): string {
  return text
}
