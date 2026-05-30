'use client'

import { useCallback, useRef, useState } from 'react'
import { getAccessToken } from '@/lib/auth/tokens'
import { env } from '@/lib/env'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function useAssistantChat(pageContext: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (userText: string) => {
      const userMsg: Message = { role: 'user', content: userText }
      const nextMessages = [...messages, userMsg]
      setMessages(nextMessages)
      setIsStreaming(true)

      abortRef.current?.abort()
      abortRef.current = new AbortController()

      try {
        const token = getAccessToken()
        const res = await fetch(`${env.apiUrl}/assistant/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ messages: nextMessages, page_context: pageContext }),
          signal: abortRef.current.signal,
        })

        if (!res.ok || !res.body) throw new Error('Stream failed')

        let assistantContent = ''
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') break
            assistantContent += data
            setMessages((prev) => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: assistantContent },
            ])
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
          ])
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [messages, pageContext],
  )

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setIsStreaming(false)
  }, [])

  return { messages, isStreaming, send, clear }
}
