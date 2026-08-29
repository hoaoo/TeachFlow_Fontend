'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, X } from 'lucide-react'
import {
  getPresentationSlideBlob,
  getResourcePresentation,
  type PresentationMetadata,
  type TeachingResource,
} from '@/services/resource-service'

export function PowerPointPresentationViewer({
  resource,
  onClose,
}: {
  resource: TeachingResource
  onClose: () => void
}) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const objectUrlsRef = useRef(new Map<number, string>())
  const pendingLoadsRef = useRef(new Map<number, Promise<void>>())
  const [metadata, setMetadata] = useState<PresentationMetadata | null>(null)
  const [slideUrls, setSlideUrls] = useState<Record<number, string>>({})
  const [currentSlide, setCurrentSlide] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const ensureSlide = useCallback(
    async (index: number, presentation: PresentationMetadata, signal?: AbortSignal) => {
      if (index < 1 || index > presentation.slideCount || objectUrlsRef.current.has(index)) return
      const pending = pendingLoadsRef.current.get(index)
      if (pending) return pending
      const slide = presentation.slides.find((item) => item.index === index)
      if (!slide) return

      const task = getPresentationSlideBlob(slide.url, signal)
        .then((blob) => {
          if (!mountedRef.current || signal?.aborted) return
          const objectUrl = URL.createObjectURL(blob)
          objectUrlsRef.current.set(index, objectUrl)
          setSlideUrls((current) => ({ ...current, [index]: objectUrl }))
        })
        .finally(() => pendingLoadsRef.current.delete(index))
      pendingLoadsRef.current.set(index, task)
      return task
    },
    [],
  )

  useEffect(() => {
    mountedRef.current = true
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setMetadata(null)
    setCurrentSlide(1)

    getResourcePresentation(resource.id, controller.signal)
      .then(async (presentation) => {
        if (!presentation.slideCount) throw new Error('Bản trình chiếu không có slide')
        if (!mountedRef.current || controller.signal.aborted) return
        setMetadata(presentation)
        await ensureSlide(1, presentation, controller.signal)
        if (!mountedRef.current || controller.signal.aborted) return
        setLoading(false)
        void ensureSlide(2, presentation, controller.signal).catch(() => undefined)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || !mountedRef.current) return
        setError(reason instanceof Error ? reason.message : 'Không thể chuẩn bị bản trình chiếu')
        setLoading(false)
      })

    return () => {
      mountedRef.current = false
      controller.abort()
      for (const url of objectUrlsRef.current.values()) URL.revokeObjectURL(url)
      objectUrlsRef.current.clear()
      pendingLoadsRef.current.clear()
    }
  }, [ensureSlide, resource.id])

  useEffect(() => {
    if (!metadata) return
    const controller = new AbortController()
    void ensureSlide(currentSlide, metadata, controller.signal).catch((reason: unknown) => {
      if (!controller.signal.aborted && mountedRef.current) {
        setError(reason instanceof Error ? reason.message : 'Không thể tải trang trình chiếu')
      }
    })
    void ensureSlide(currentSlide + 1, metadata, controller.signal).catch(() => undefined)
    void ensureSlide(currentSlide - 1, metadata, controller.signal).catch(() => undefined)
    return () => controller.abort()
  }, [currentSlide, ensureSlide, metadata])

  const goTo = useCallback(
    (index: number) => {
      if (!metadata) return
      setCurrentSlide(Math.max(1, Math.min(metadata.slideCount, index)))
    },
    [metadata],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowRight', ' ', 'PageDown'].includes(event.key)) {
        event.preventDefault()
        goTo(currentSlide + 1)
      } else if (['ArrowLeft', 'PageUp'].includes(event.key)) {
        event.preventDefault()
        goTo(currentSlide - 1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        goTo(1)
      } else if (event.key === 'End' && metadata) {
        event.preventDefault()
        goTo(metadata.slideCount)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        if (document.fullscreenElement) void document.exitFullscreen()
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [currentSlide, goTo, metadata, onClose])

  useEffect(() => {
    const synchronizeFullscreen = () => setIsFullscreen(document.fullscreenElement === viewerRef.current)
    document.addEventListener('fullscreenchange', synchronizeFullscreen)
    return () => document.removeEventListener('fullscreenchange', synchronizeFullscreen)
  }, [])

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement && viewerRef.current?.requestFullscreen) {
      await viewerRef.current.requestFullscreen()
    } else if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
  }

  const closeViewer = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    onClose()
  }

  const currentUrl = slideUrls[currentSlide]
  const title = metadata?.title || resource.title || resource.name

  return (
    <div
      ref={viewerRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Trình chiếu ${title}`}
      className="fixed inset-0 z-[70] flex flex-col bg-slate-950 text-white"
    >
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-slate-400">
            Slide {currentSlide} / {metadata?.slideCount || 0}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            disabled={!viewerRef.current?.requestFullscreen && !isFullscreen}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}</span>
          </button>
          <button
            type="button"
            onClick={closeViewer}
            aria-label="Thoát trình chiếu"
            className="grid size-9 place-items-center rounded-lg border border-white/15 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-center text-slate-200">
            <Loader2 className="size-9 animate-spin text-teal-400" />
            <p className="text-sm font-semibold">Đang chuẩn bị bản trình chiếu...</p>
          </div>
        ) : error ? (
          <div className="max-w-md rounded-xl border border-rose-400/30 bg-rose-950/40 p-5 text-center">
            <p className="font-semibold text-rose-100">Không thể mở bản trình chiếu</p>
            <p className="mt-1 text-sm text-rose-200/80">{error}</p>
          </div>
        ) : currentUrl ? (
          <img
            src={currentUrl}
            alt={`Slide ${currentSlide} / ${metadata?.slideCount || 0}`}
            draggable={false}
            className="max-h-full max-w-full select-none object-contain shadow-2xl"
          />
        ) : (
          <Loader2 className="size-8 animate-spin text-teal-400" />
        )}
      </main>

      <footer className="flex min-h-16 items-center justify-center gap-3 border-t border-white/10 bg-black/30 px-3">
        <button
          type="button"
          onClick={() => goTo(currentSlide - 1)}
          disabled={!metadata || currentSlide <= 1}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="size-5" /> Trước
        </button>
        <span className="min-w-24 text-center text-sm font-semibold tabular-nums">
          {currentSlide} / {metadata?.slideCount || 0}
        </span>
        <button
          type="button"
          onClick={() => goTo(currentSlide + 1)}
          disabled={!metadata || currentSlide >= metadata.slideCount}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Tiếp <ChevronRight className="size-5" />
        </button>
      </footer>
    </div>
  )
}
