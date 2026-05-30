'use client'

import { AnimatePresence, motion, useMotionValue } from 'framer-motion'
import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useRef, useState } from 'react'
import { useAssistantChat, type Message } from '@/lib/hooks/useAssistantChat'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { usePersistentPosition } from '@/lib/hooks/usePersistentPosition'
import { cn } from '@/lib/utils/cn'

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm font-sans',
          isUser
            ? 'bg-amber text-bg-base'
            : 'bg-bg-overlay border border-border text-text-primary',
        )}
      >
        {message.content || (
          <span className="flex gap-1">
            <span className="animate-pulse">&#9632;</span>
            <span className="animate-pulse delay-75">&#9632;</span>
            <span className="animate-pulse delay-150">&#9632;</span>
          </span>
        )}
      </div>
    </div>
  )
}

function AssistantInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void
  disabled: boolean
}) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 border-t border-border bg-bg-surface"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask me anything..."
        disabled={disabled}
        className="flex-1 bg-transparent text-sm font-sans text-text-primary placeholder:text-text-muted
          outline-none focus:outline-none border-none p-0"
      />
      <button
        type="submit"
        disabled={!value.trim() || disabled}
        className="text-amber hover:text-amber/80 transition-colors disabled:opacity-30 font-mono text-xs uppercase tracking-widest"
      >
        Send
      </button>
    </form>
  )
}

export function AiBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const constraintsRef = useRef<HTMLDivElement>(null)
  const pageContext = pathname.split('/')[1] || 'dashboard'

  const { position, savePosition } = usePersistentPosition('ai-bubble')
  const x = useMotionValue(position.x)
  const y = useMotionValue(position.y)

  const { messages, isStreaming, send } = useAssistantChat(pageContext)

  const chatPanel = (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 16 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'z-50 bg-bg-elevated border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden',
        isMobile
          ? 'fixed inset-x-0 bottom-0 rounded-b-none'
          : 'fixed bottom-24 right-6 w-80 md:w-96',
      )}
      style={{ maxHeight: isMobile ? '80vh' : 'min(480px, 70vh)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-surface shrink-0">
        {isMobile && (
          <div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-border" />
        )}
        <div className="flex items-center gap-2">
          <span className="status-live" />
          <span className="font-display text-sm text-text-primary">AI Assistant</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close assistant"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-text-muted text-sm font-sans text-center py-8">
            Ask me anything about your {pageContext}
          </p>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}
      </div>

      <AssistantInput onSend={send} disabled={isStreaming} />
    </motion.div>
  )

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-40" />

      <AnimatePresence>{isOpen && chatPanel}</AnimatePresence>

      <motion.button
        drag={!isMobile}
        dragConstraints={constraintsRef}
        dragElastic={0.08}
        dragMomentum={false}
        style={isMobile ? undefined : { x, y }}
        onDragEnd={() => savePosition({ x: x.get(), y: y.get() })}
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'z-50 rounded-full bg-amber flex items-center justify-center
          cursor-grab active:cursor-grabbing shadow-lg shadow-amber/25
          hover:shadow-amber/40 hover:shadow-xl transition-shadow',
          isMobile ? 'fixed bottom-20 right-4 w-12 h-12' : 'fixed w-14 h-14',
        )}
        aria-label="Open AI Assistant"
      >
        <span className="absolute inset-0 rounded-full bg-amber/20 animate-ping pointer-events-none" />
        <span className="text-bg-base text-lg font-mono font-bold select-none pointer-events-none">
          &#9678;
        </span>
      </motion.button>
    </>
  )
}
