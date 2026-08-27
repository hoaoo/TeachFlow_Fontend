'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, WifiOff } from 'lucide-react'

type ConnectionState = 'online' | 'offline' | 'reconnected' | 'server-starting'

export function NetworkStatus() {
  const [state, setState] = useState<ConnectionState>('online')
  const wasOffline = useRef(false)

  useEffect(() => {
    const offline = () => {
      wasOffline.current = true
      setState('offline')
    }
    const online = () => {
      if (wasOffline.current) {
        setState('reconnected')
        window.setTimeout(() => setState('online'), 3000)
      } else {
        setState('online')
      }
      wasOffline.current = false
    }
    const serverStarting = () => setState('server-starting')
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    window.addEventListener('teachflow:server-starting', serverStarting)
    window.addEventListener('teachflow:connection-restored', online)
    if (!navigator.onLine) offline()
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
      window.removeEventListener('teachflow:server-starting', serverStarting)
      window.removeEventListener('teachflow:connection-restored', online)
    }
  }, [])

  if (state === 'online') return null
  const recovered = state === 'reconnected'
  return (
    <div className={`fixed left-1/2 top-3 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-lg ${
      recovered ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'
    }`} role="status" aria-live="polite">
      {recovered ? <CheckCircle2 className="size-4" /> : state === 'server-starting' ? <Loader2 className="size-4 animate-spin" /> : <WifiOff className="size-4" />}
      {recovered ? 'Đã kết nối lại' : state === 'server-starting' ? 'Máy chủ đang khởi động, vui lòng chờ...' : 'Mất kết nối Internet — TeachFlow sẽ thử kết nối lại.'}
    </div>
  )
}
