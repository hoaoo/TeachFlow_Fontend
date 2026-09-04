'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Loader2, Maximize2, Minimize2, RotateCw, X } from 'lucide-react'
import {
  downloadResourceFile,
  getPresentationSlideBlob,
  getResourcePresentation,
  retryResourcePreview,
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
  const [retrying, setRetrying] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
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
        if (!presentation.slideCount) throw new Error('Không tìm thấy slide trong bài giảng PowerPoint.')
        if (!mountedRef.current || controller.signal.aborted) return
        setMetadata(presentation)
        await ensureSlide(1, presentation, controller.signal)
        if (!mountedRef.current || controller.signal.aborted) return
        setLoading(false)
        void ensureSlide(2, presentation, controller.signal).catch(() => undefined)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted || !mountedRef.current) return
        setError(reason instanceof Error ? reason.message : 'Không thể chuẩn bị bản trình chiếu PowerPoint.')
        setLoading(false)
      })

    return () => {
      mountedRef.current = false
      controller.abort()
      for (const url of objectUrlsRef.current.values()) URL.revokeObjectURL(url)
      objectUrlsRef.current.clear()
      pendingLoadsRef.current.clear()
    }
  }, [ensureSlide, resource.id, reloadKey])

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

  const handleRetry = async () => {
    try {
      setRetrying(true)
      await retryResourcePreview(resource.id)
    } catch {
      // Ignored, will re-fetch
    } finally {
      setRetrying(false)
      setReloadKey((k) => k + 1)
    }
  }

  const handleDownload = () => {
    void downloadResourceFile(resource.id, title)
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
          <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-950/60 p-6 text-center shadow-2xl">
            <p className="text-base font-bold text-rose-100">Không thể tạo bản trình chiếu PowerPoint</p>
            <p className="text-xs text-rose-200/80">{error}</p>
            <p className="text-xs text-slate-400">
              Bạn có thể thử xử lý lại hoặc tải xuống tệp PowerPoint để mở trực tiếp trên máy tính.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => void handleRetry()}
                disabled={retrying}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-600 px-4 text-xs font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {retrying ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
                Thử xử lý lại
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                <Download className="size-3.5" /> Tải xuống tệp tin
              </button>
            </div>
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
