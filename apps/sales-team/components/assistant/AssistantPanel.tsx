'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, ChevronDown } from 'lucide-react'
import MessageBubble from './MessageBubble'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STORAGE_KEY = 'assistant_conversation'
const MAX_HISTORY = 20

export default function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load conversation from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (stored) setMessages(JSON.parse(stored) as Message[])
    } catch {
      // ignore
    }
  }, [])

  // Persist to sessionStorage on every update
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function sendMessage() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg].slice(-MAX_HISTORY)
    setMessages(history)
    setInput('')
    setStreaming(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: history.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        setMessages((prev) => [...prev, { role: 'assistant', content: err.error ?? 'Something went wrong.' }])
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const parsed = JSON.parse(line.slice(6)) as { text?: string; done?: boolean; error?: string }
              if (parsed.text) {
                accumulated += parsed.text
                setStreamingText(accumulated)
              }
              if (parsed.done || parsed.error) break
            } catch {
              // ignore malformed SSE
            }
          }
        }
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: accumulated || 'No response.' }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setStreaming(false)
      setStreamingText('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  return (
    <>
      {/* Trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full shadow-lg transition-colors"
          aria-label="Open AI Coach"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className={`
            fixed z-50 bg-gray-950 border border-gray-800 shadow-2xl flex flex-col
            /* Mobile: bottom sheet */
            inset-x-0 bottom-0 h-[70vh] rounded-t-2xl
            /* Desktop: side drawer */
            md:inset-x-auto md:right-6 md:bottom-6 md:top-auto md:h-[520px] md:w-[380px] md:rounded-2xl
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
            <div>
              <p className="text-sm font-semibold text-white">AI Strategy Coach</p>
              <p className="text-xs text-gray-500">Ask anything about your analysis</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            >
              <X className="w-4 h-4 md:hidden" />
              <ChevronDown className="w-4 h-4 hidden md:block" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-600 text-sm text-center px-4">
                  Ask me to break down your analysis, suggest next steps, or help refine your offer.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} />
            ))}
            {streaming && streamingText && (
              <MessageBubble role="assistant" content={streamingText} isStreaming />
            )}
            {streaming && !streamingText && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-800 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your coach..."
                maxLength={500}
                disabled={streaming}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
              <button
                onClick={() => void sendMessage()}
                disabled={!input.trim() || streaming}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-colors text-sm font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
