'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Fullscreen, Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { HtmlGamePlay } from '@/services/html-game-service'

const BRIDGE_VERSION = 1
const MAX_MESSAGE_BYTES = 256 * 1024
const ALLOWED_MESSAGES = new Set([
  'TEACHFLOW_GAME_READY',
  'TEACHFLOW_GAME_STARTED',
  'TEACHFLOW_GAME_ANSWER_SUBMITTED',
  'TEACHFLOW_GAME_COMPLETED',
  // Kept for games uploaded before the full lifecycle bridge was introduced.
  'TEACHFLOW_GAME_RESULT',
])

type GameLifecycleEvent =
  | 'GAME_READY'
  | 'GAME_STARTED'
  | 'ANSWER_SUBMITTED'
  | 'GAME_COMPLETED'

function payloadSize(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length
  } catch {
    return MAX_MESSAGE_BYTES + 1
  }
}

function normalizeLifecycleEvent(type: string): GameLifecycleEvent {
  if (type === 'TEACHFLOW_GAME_READY') return 'GAME_READY'
  if (type === 'TEACHFLOW_GAME_STARTED') return 'GAME_STARTED'
  if (type === 'TEACHFLOW_GAME_ANSWER_SUBMITTED') return 'ANSWER_SUBMITTED'
  return 'GAME_COMPLETED'
}

export function GamePlayer({ play, onExit }: { play: HtmlGamePlay; onExit?: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ score: number; total: number } | null>(null)
  const [lifecycleEvent, setLifecycleEvent] = useState<GameLifecycleEvent | null>(null)
  const instanceId = useMemo(
    () => globalThis.crypto?.randomUUID?.() || `game-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    [retryKey],
  )
  const src = useMemo(() => {
    const url = new URL(play.playUrl)
    url.searchParams.set('teachflowGameInstanceId', instanceId)
    return url.toString()
  }, [instanceId, play.playUrl])
  const expectedOrigin = useMemo(() => new URL(play.playUrl).origin, [play.playUrl])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (event.origin !== 'null' && event.origin !== expectedOrigin) return
      const data = event.data
      if (!data || typeof data !== 'object' || payloadSize(data) > MAX_MESSAGE_BYTES) return
      if (!ALLOWED_MESSAGES.has(data.type) || data.version !== BRIDGE_VERSION || data.gameInstanceId !== instanceId) return

      if (data.type === 'TEACHFLOW_GAME_READY') {
        setLoading(false)
        const init = {
          type: 'TEACHFLOW_GAME_INIT',
          version: BRIDGE_VERSION,
          gameInstanceId: instanceId,
          questions: play.supportsQuestionConfig && Array.isArray(play.questions) ? play.questions : [],
        }
        if (payloadSize(init) > MAX_MESSAGE_BYTES) {
          setError('Bộ câu hỏi vượt quá giới hạn truyền sang trò chơi')
          return
        }
        // The sandbox intentionally has an opaque origin. Both sides validate
        // source, instance id, protocol version, message type, and payload size.
        iframeRef.current?.contentWindow?.postMessage(init, '*')
      } else if (data.type === 'TEACHFLOW_GAME_STARTED') {
        if (!Number.isFinite(data.startedAt)) return
      } else if (data.type === 'TEACHFLOW_GAME_ANSWER_SUBMITTED') {
        if (
          typeof data.questionId !== 'string' ||
          !data.questionId ||
          !Object.prototype.hasOwnProperty.call(data, 'answer') ||
          !Number.isFinite(data.submittedAt)
        ) return
      } else {
        if (
          !Number.isFinite(data.score) ||
          !Number.isFinite(data.total) ||
          data.score < 0 ||
          data.total < 0 ||
          data.score > data.total ||
          !Array.isArray(data.answers)
        ) return
        setResult({ score: Number(data.score), total: Number(data.total) })
      }

      const normalizedType = normalizeLifecycleEvent(data.type)
      setLifecycleEvent(normalizedType)
      window.dispatchEvent(new CustomEvent('teachflow:html-game-event', {
        detail: { type: normalizedType, gameId: play.id, gameInstanceId: instanceId },
      }))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [expectedOrigin, instanceId, play.id, play.questions, play.supportsQuestionConfig])

  const retry = () => {
    setError(null)
    setResult(null)
    setLifecycleEvent(null)
    setLoading(true)
    setRetryKey((value) => value + 1)
  }

  return (
    <div ref={containerRef} className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-slate-950">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-3 py-2 text-white">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{play.title}</p>
          <p className="text-[11px] text-slate-400">{play.supportsQuestionConfig ? 'TeachFlow configurable' : 'Legacy HTML'}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {lifecycleEvent && <span className="hidden rounded-lg bg-sky-500/15 px-2 py-1 text-[10px] font-semibold text-sky-200 sm:inline">{lifecycleEvent}</span>}
          {result && <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-200">{result.score}/{result.total}</span>}
          <Button size="icon-sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => containerRef.current?.requestFullscreen()} title="Toàn màn hình">
            <Fullscreen className="size-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" className="text-white hover:bg-white/10" onClick={retry} title="Tải lại">
            <RefreshCw className="size-4" />
          </Button>
          {onExit && <Button size="icon-sm" variant="ghost" className="text-white hover:bg-white/10" onClick={onExit} title="Thoát"><X className="size-4" /></Button>}
        </div>
      </div>
      {loading && !error && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/80 text-white">
          <div className="flex items-center gap-3 text-sm"><Loader2 className="size-5 animate-spin text-teal-400" /> Đang tải trò chơi...</div>
        </div>
      )}
      {error ? (
        <div className="grid min-h-80 flex-1 place-items-center p-8 text-center text-white">
          <div><AlertTriangle className="mx-auto size-10 text-amber-400" /><p className="mt-3 text-sm">{error}</p><Button className="mt-4 gap-2" onClick={retry}><RefreshCw className="size-4" /> Thử lại</Button></div>
        </div>
      ) : (
        <iframe
          key={retryKey}
          ref={iframeRef}
          title={play.title}
          src={src}
          sandbox="allow-scripts allow-forms allow-pointer-lock"
          referrerPolicy="no-referrer"
          allow="fullscreen"
          className="min-h-80 flex-1 border-0 bg-white"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError('Không thể tải nội dung trò chơi') }}
        />
      )}
    </div>
  )
}
