'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa_install_dismissed'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Never show if already dismissed, already installed, or on desktop
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (typeof navigator !== 'undefined' && 'standalone' in navigator && (navigator as { standalone?: boolean }).standalone) return

    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  // Show after first analysis — listen for the custom event fired by StreamingResult
  useEffect(() => {
    if (!deferredPrompt) return

    function handleAnalysisComplete() {
      if (!localStorage.getItem(DISMISSED_KEY)) setVisible(true)
    }

    window.addEventListener('analysis:complete', handleAnalysisComplete)
    return () => window.removeEventListener('analysis:complete', handleAnalysisComplete)
  }, [deferredPrompt])

  function handleInstall() {
    if (!deferredPrompt) return
    void deferredPrompt.prompt()
    void deferredPrompt.userChoice.then(() => {
      setVisible(false)
      setDeferredPrompt(null)
    })
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible || !deferredPrompt) return null

  return (
    <div
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+8px)] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50"
      role="banner"
      aria-label="Install app prompt"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">$</span>
        </div>

        {/* Copy */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">
            Add $100M Sales to your home screen
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Instant access — no browser needed</p>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
            >
              Not now
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-gray-600 hover:text-gray-400 transition-colors p-1 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
