'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Gamepad2,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Presentation,
  Printer,
  RefreshCw,
  RotateCw,
  Video,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  detectResourceType,
  downloadResourceFile,
  getPresentationSlideBlob,
  getResourceFileArrayBuffer,
  getResourceFileBlob,
  getResourcePresentation,
  getResourceSignedUrl,
  retryResourcePreview,
  type CanonicalResourceType,
  type PresentationMetadata,
  type TeachingResource,
} from '@/services/resource-service'
import { getHtmlGamePlayUrl, type HtmlGame, type TeacherHtmlGame } from '@/services/html-game-service'
import { ResourceErrorBoundary } from './resource-error-boundary'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

export interface PlaylistItem {
  id: string
  title: string
  type?: CanonicalResourceType | 'HTML_GAME' | 'WORKSHEET' | string
  resource?: TeachingResource | null
  game?: HtmlGame | TeacherHtmlGame | null
  customGameId?: string
  worksheet?: any
  url?: string
}

export interface ResourceViewerProps {
  resource?: TeachingResource | null
  game?: HtmlGame | TeacherHtmlGame | null
  customGameId?: string
  worksheet?: any
  url?: string
  title?: string
  type?: CanonicalResourceType | 'HTML_GAME' | 'WORKSHEET' | string
  playlist?: PlaylistItem[]
  currentIndex?: number
  onIndexChange?: (index: number) => void
  onClose?: () => void
  onDownload?: () => void
  isEmbedded?: boolean
  showControls?: boolean
}

function sanitizeDocxHtml(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

export function ResourceViewer(props: ResourceViewerProps) {
  return (
    <ResourceErrorBoundary
      fallbackTitle="Không thể hiển thị tài nguyên này."
      onClose={props.onClose}
    >
      <ResourceViewerInner {...props} />
    </ResourceErrorBoundary>
  )
}

function ResourceViewerInner({
  resource,
  game,
  customGameId,
  worksheet,
  url,
  title,
  type,
  playlist,
  currentIndex = 0,
  onIndexChange,
  onClose,
  onDownload,
  isEmbedded = false,
  showControls = true,
}: ResourceViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)
  const activeBlobUrlRef = useRef<string | null>(null)

  // 1. Stable Active Item derivation
  const activeItem: PlaylistItem = useMemo(() => {
    if (playlist && playlist.length > 0 && currentIndex >= 0 && currentIndex < playlist.length) {
      return playlist[currentIndex]
    }
    return {
      id: resource?.id || game?.id || worksheet?.id || 'res-single',
      title: title || resource?.name || resource?.title || game?.title || worksheet?.title || 'Tài nguyên',
      type: type || (resource ? detectResourceType(resource) : game ? 'HTML_GAME' : worksheet ? 'WORKSHEET' : 'OTHER'),
      resource,
      game,
      customGameId,
      worksheet,
      url,
    }
  }, [playlist, currentIndex, resource, game, customGameId, worksheet, url, title, type])

  const activeResourceId = activeItem.resource?.id || (resource?.id === activeItem.id ? resource?.id : null)
  const activeGameId = activeItem.game?.id || (game?.id === activeItem.id ? game?.id : null)
  const activeCustomGameId = activeItem.customGameId || customGameId
  const activeWorksheet = activeItem.worksheet || worksheet

  const detectedType: string = useMemo(() => {
    if (activeItem.type) return activeItem.type
    if (activeGameId) return 'HTML_GAME'
    if (activeWorksheet) return 'WORKSHEET'
    if (activeItem.resource) return detectResourceType(activeItem.resource)
    if (resource) return detectResourceType(resource)
    return 'OTHER'
  }, [activeItem.type, activeItem.resource, activeGameId, activeWorksheet, resource])

  const displayName = activeItem.title || activeItem.resource?.name || 'Tài nguyên'

  // Viewer state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [xlsxSheets, setXlsxSheets] = useState<Array<{ name: string; rows: any[][] }>>([])
  const [activeSheetIdx, setActiveSheetIdx] = useState(0)
  const [txtContent, setTxtContent] = useState<string | null>(null)

  // PPTX Presentation states
  const [pptMetadata, setPptMetadata] = useState<PresentationMetadata | null>(null)
  const [pptSlideUrls, setPptSlideUrls] = useState<Record<number, string>>({})
  const [pptCurrentSlide, setPptCurrentSlide] = useState(1)
  const pptObjectUrlsRef = useRef<Map<number, string>>(new Map())
  const pptPendingLoadsRef = useRef<Map<number, Promise<void>>>(new Map())

  // Visual Controls state
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Cleanup object URLs safely
  const cleanupBlobs = useCallback(() => {
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current)
      activeBlobUrlRef.current = null
    }
    for (const u of pptObjectUrlsRef.current.values()) {
      URL.revokeObjectURL(u)
    }
    pptObjectUrlsRef.current.clear()
    pptPendingLoadsRef.current.clear()
  }, [])

  // 2. Load Content with Streaming & Memory Safety
  useEffect(() => {
    mountedRef.current = true
    const controller = new AbortController()

    setLoading(true)
    setError(null)
    cleanupBlobs()
    setMediaUrl(null)
    setDocxHtml(null)
    setTxtContent(null)
    setXlsxSheets([])
    setPptMetadata(null)
    setPptSlideUrls({})
    setPptCurrentSlide(1)
    setZoom(100)
    setRotation(0)

    async function load() {
      try {
        // A. HTML Game
        if (detectedType === 'HTML_GAME' && (activeGameId || activeResourceId)) {
          const gId = activeGameId || activeResourceId || ''
          const playUrl = await getHtmlGamePlayUrl(gId, activeCustomGameId)
          if (!mountedRef.current || controller.signal.aborted) return
          setMediaUrl(playUrl)
          setLoading(false)
          return
        }

        // B. Worksheet
        if (detectedType === 'WORKSHEET' && activeWorksheet) {
          setLoading(false)
          return
        }

        // C. Direct URL passed
        if (activeItem.url) {
          setMediaUrl(activeItem.url)
          setLoading(false)
          return
        }

        if (!activeResourceId) {
          throw new Error('Không tìm thấy thông tin tài nguyên để hiển thị.')
        }

        // D. VIDEO & AUDIO: Stream with signed URL without heap memory exhaustion
        if (detectedType === 'VIDEO' || detectedType === 'AUDIO') {
          const streamUrl = await getResourceSignedUrl(activeResourceId)
          if (!mountedRef.current || controller.signal.aborted) return
          setMediaUrl(streamUrl)
          setLoading(false)
          return
        }

        // E. PDF: Stream with signed URL or inline blob
        if (detectedType === 'PDF') {
          try {
            const streamUrl = await getResourceSignedUrl(activeResourceId)
            if (!mountedRef.current || controller.signal.aborted) return
            setMediaUrl(streamUrl)
            setLoading(false)
            return
          } catch {
            const { blob } = await getResourceFileBlob(activeResourceId, controller.signal)
            if (!mountedRef.current || controller.signal.aborted) return
            const objectUrl = URL.createObjectURL(blob)
            activeBlobUrlRef.current = objectUrl
            setMediaUrl(objectUrl)
            setLoading(false)
            return
          }
        }

        // F. IMAGE: Fetch blob safely for authenticated viewing
        if (detectedType === 'IMAGE') {
          const { blob } = await getResourceFileBlob(activeResourceId, controller.signal)
          if (!mountedRef.current || controller.signal.aborted) return
          const objectUrl = URL.createObjectURL(blob)
          activeBlobUrlRef.current = objectUrl
          setMediaUrl(objectUrl)
          setLoading(false)
          return
        }

        // G. POWERPOINT (PPT/PPTX)
        if (detectedType === 'POWERPOINT') {
          const presentation = await getResourcePresentation(activeResourceId, controller.signal)
          if (!mountedRef.current || controller.signal.aborted) return
          if (!presentation.slideCount) {
            throw new Error('Không thể hiển thị tệp PowerPoint này (không tìm thấy slide).')
          }
          setPptMetadata(presentation)

          // Load slide 1
          const firstSlide = presentation.slides.find((s) => s.index === 1)
          if (firstSlide) {
            const slideBlob = await getPresentationSlideBlob(firstSlide.url, controller.signal)
            if (!mountedRef.current || controller.signal.aborted) return
            const slideObjUrl = URL.createObjectURL(slideBlob)
            pptObjectUrlsRef.current.set(1, slideObjUrl)
            setPptSlideUrls({ 1: slideObjUrl })
          }

          // Prefetch slide 2
          const secondSlide = presentation.slides.find((s) => s.index === 2)
          if (secondSlide) {
            void getPresentationSlideBlob(secondSlide.url, controller.signal).then((blob) => {
              if (!mountedRef.current || controller.signal.aborted) return
              const u = URL.createObjectURL(blob)
              pptObjectUrlsRef.current.set(2, u)
              setPptSlideUrls((prev) => ({ ...prev, 2: u }))
            }).catch(() => undefined)
          }

          setLoading(false)
          return
        }

        // H. WORD (DOCX)
        if (detectedType === 'WORD') {
          const { buffer } = await getResourceFileArrayBuffer(activeResourceId, controller.signal)
          if (!mountedRef.current || controller.signal.aborted) return
          const mammothResult = await mammoth.convertToHtml({ arrayBuffer: buffer })
          const clean = sanitizeDocxHtml(mammothResult.value || '')
          setDocxHtml(clean || '<p class="text-slate-400 italic">Tài liệu không có nội dung văn bản.</p>')
          setLoading(false)
          return
        }

        // I. EXCEL (XLSX)
        if (detectedType === 'EXCEL') {
          const { buffer } = await getResourceFileArrayBuffer(activeResourceId, controller.signal)
          if (!mountedRef.current || controller.signal.aborted) return
          const wb = XLSX.read(buffer, { type: 'array' })
          const sheets = wb.SheetNames.map((name) => ({
            name,
            rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' }) as any[][],
          }))
          setXlsxSheets(sheets)
          setLoading(false)
          return
        }

        // J. TEXT
        if (detectedType === 'TEXT') {
          const { blob } = await getResourceFileBlob(activeResourceId, controller.signal)
          if (!mountedRef.current || controller.signal.aborted) return
          const text = await blob.text()
          setTxtContent(text)
          setLoading(false)
          return
        }

        // K. Fallback default
        const { blob } = await getResourceFileBlob(activeResourceId, controller.signal)
        if (!mountedRef.current || controller.signal.aborted) return
        const objectUrl = URL.createObjectURL(blob)
        activeBlobUrlRef.current = objectUrl
        setMediaUrl(objectUrl)
        setLoading(false)
      } catch (err: any) {
        if (!mountedRef.current || controller.signal.aborted) return
        const msg = err?.message || ''
        if (msg.includes('403') || msg.includes('quyền')) {
          setError('Bạn không có quyền truy cập tài nguyên này.')
        } else if (msg.includes('404') || msg.includes('không tìm thấy')) {
          setError('Không tìm thấy tệp tài nguyên.')
        } else if (detectedType === 'POWERPOINT') {
          setError(msg || 'Không thể tạo bản trình chiếu PowerPoint.')
        } else if (detectedType === 'VIDEO') {
          setError('Video không sử dụng định dạng được hỗ trợ.')
        } else {
          setError(msg || 'Không thể tải bản xem trước tài nguyên.')
        }
        setLoading(false)
      }
    }

    void load()

    return () => {
      mountedRef.current = false
      controller.abort()
      cleanupBlobs()
    }
  }, [activeResourceId, activeGameId, activeCustomGameId, activeItem.url, detectedType, activeWorksheet, cleanupBlobs, reloadTrigger])

  // Slide loader for PPTX
  const ensurePptSlide = useCallback(
    async (index: number, signal?: AbortSignal) => {
      if (!pptMetadata || index < 1 || index > pptMetadata.slideCount || pptObjectUrlsRef.current.has(index)) return
      const pending = pptPendingLoadsRef.current.get(index)
      if (pending) return pending

      const slide = pptMetadata.slides.find((item) => item.index === index)
      if (!slide) return

      const task = getPresentationSlideBlob(slide.url, signal)
        .then((blob) => {
          if (!mountedRef.current || signal?.aborted) return
          const objectUrl = URL.createObjectURL(blob)
          pptObjectUrlsRef.current.set(index, objectUrl)
          setPptSlideUrls((prev) => ({ ...prev, [index]: objectUrl }))
        })
        .finally(() => pptPendingLoadsRef.current.delete(index))
      pptPendingLoadsRef.current.set(index, task)
      return task
    },
    [pptMetadata],
  )

  const goToPptSlide = useCallback(
    (index: number) => {
      if (!pptMetadata) return
      const bounded = Math.max(1, Math.min(index, pptMetadata.slideCount))
      setPptCurrentSlide(bounded)
      void ensurePptSlide(bounded)
      void ensurePptSlide(bounded + 1)
      void ensurePptSlide(bounded - 1)
    },
    [pptMetadata, ensurePptSlide],
  )

  // Fullscreen Handler (Safe Browser & Desktop)
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current || typeof document === 'undefined') return
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen()
          setIsFullscreen(true)
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
          setIsFullscreen(false)
        }
      }
    } catch {
      setIsFullscreen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase()
      const isInput =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        activeTag === 'select' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'

      if (isInput) return

      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          void document.exitFullscreen().catch(() => setIsFullscreen(false))
        } else if (onClose) {
          onClose()
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (detectedType === 'POWERPOINT' && pptMetadata) {
          if (pptCurrentSlide < pptMetadata.slideCount) {
            goToPptSlide(pptCurrentSlide + 1)
          } else if (playlist && onIndexChange && currentIndex < playlist.length - 1) {
            onIndexChange(currentIndex + 1)
          }
        } else if (playlist && onIndexChange && currentIndex < (playlist.length - 1)) {
          onIndexChange(currentIndex + 1)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (detectedType === 'POWERPOINT' && pptMetadata) {
          if (pptCurrentSlide > 1) {
            goToPptSlide(pptCurrentSlide - 1)
          } else if (playlist && onIndexChange && currentIndex > 0) {
            onIndexChange(currentIndex - 1)
          }
        } else if (playlist && onIndexChange && currentIndex > 0) {
          onIndexChange(currentIndex - 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detectedType, pptMetadata, pptCurrentSlide, goToPptSlide, playlist, currentIndex, onIndexChange, onClose])

  // Retry handler
  const handleRetry = async () => {
    if (!activeResourceId) {
      setReloadTrigger((v) => v + 1)
      return
    }
    try {
      setRetrying(true)
      if (detectedType === 'POWERPOINT') {
        await retryResourcePreview(activeResourceId)
      }
    } catch {
      // Ignore retry request error, will re-load
    } finally {
      setRetrying(false)
      setReloadTrigger((v) => v + 1)
    }
  }

  // Download handler
  const handleDownload = () => {
    if (onDownload) {
      onDownload()
      return
    }
    if (activeResourceId) {
      void downloadResourceFile(activeResourceId, activeItem.resource?.originalFileName || displayName)
      return
    }
    if (mediaUrl) {
      const a = document.createElement('a')
      a.href = mediaUrl
      a.download = activeItem.resource?.originalFileName || `${displayName}.${detectedType.toLowerCase()}`
      a.click()
    }
  }

  // Print handler
  const handlePrint = () => {
    if (mediaUrl && detectedType === 'PDF') {
      const w = window.open(mediaUrl, '_blank')
      if (w) {
        w.focus()
        setTimeout(() => w.print(), 500)
      }
    } else {
      window.print()
    }
  }

  const hasPlaylist = playlist && playlist.length > 1
  const canGoPrev = hasPlaylist && currentIndex > 0
  const canGoNext = hasPlaylist && currentIndex < (playlist?.length || 0) - 1

  return (
    <div
      ref={containerRef}
      className={`${
        isEmbedded
          ? 'relative w-full h-full flex flex-col bg-slate-950 text-white rounded-2xl overflow-hidden'
          : 'fixed inset-0 z-50 flex flex-col bg-slate-950/95 text-white backdrop-blur-md'
      }`}
    >
      {/* Top Header */}
      {showControls && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            {onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-slate-300 hover:text-white hover:bg-slate-800 p-1.5 h-8 gap-1"
                title="Đóng trình xem (Esc)"
              >
                <ArrowLeft className="size-4" />
                <span className="hidden sm:inline text-xs font-semibold">Đóng</span>
              </Button>
            )}

            <div className="flex items-center gap-2 min-w-0">
              {detectedType === 'POWERPOINT' && <Presentation className="size-4 text-orange-400 shrink-0" />}
              {detectedType === 'PDF' && <FileText className="size-4 text-rose-400 shrink-0" />}
              {detectedType === 'WORD' && <FileText className="size-4 text-blue-400 shrink-0" />}
              {detectedType === 'IMAGE' && <ImageIcon className="size-4 text-teal-400 shrink-0" />}
              {detectedType === 'VIDEO' && <Video className="size-4 text-violet-400 shrink-0" />}
              {detectedType === 'AUDIO' && <Headphones className="size-4 text-emerald-400 shrink-0" />}
              {detectedType === 'EXCEL' && <FileSpreadsheet className="size-4 text-green-400 shrink-0" />}
              {detectedType === 'HTML_GAME' && <Gamepad2 className="size-4 text-amber-400 shrink-0" />}

              <h2 className="text-sm font-bold text-white truncate max-w-[280px] sm:max-w-md" title={displayName}>
                {displayName}
              </h2>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                {detectedType}
              </span>

              {hasPlaylist && (
                <span className="text-xs font-mono text-slate-400">
                  ({currentIndex + 1}/{playlist.length})
                </span>
              )}
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {detectedType === 'POWERPOINT' && pptMetadata && (
              <div className="flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-xs font-semibold mr-1">
                <button
                  onClick={() => goToPptSlide(pptCurrentSlide - 1)}
                  disabled={pptCurrentSlide <= 1}
                  className="hover:text-teal-400 disabled:opacity-30 transition cursor-pointer"
                  title="Slide trước"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="font-mono text-slate-200">
                  {pptCurrentSlide} / {pptMetadata.slideCount}
                </span>
                <button
                  onClick={() => goToPptSlide(pptCurrentSlide + 1)}
                  disabled={pptCurrentSlide >= pptMetadata.slideCount}
                  className="hover:text-teal-400 disabled:opacity-30 transition cursor-pointer"
                  title="Slide tiếp"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}

            {(detectedType === 'IMAGE' || detectedType === 'WORD') && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                <button
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-1 text-slate-300 hover:text-white cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="text-[11px] font-mono text-slate-300 min-w-[36px] text-center">{zoom}%</span>
                <button
                  onClick={() => setZoom((z) => Math.min(300, z + 25))}
                  className="p-1 text-slate-300 hover:text-white cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                {detectedType === 'IMAGE' && (
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1 text-slate-300 hover:text-white ml-1 border-l border-slate-700 pl-1.5 cursor-pointer"
                    title="Xoay 90°"
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                )}
              </div>
            )}

            {(detectedType === 'VIDEO' || detectedType === 'AUDIO') && (
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2 py-1 text-slate-200 focus:outline-none"
                title="Tốc độ phát"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>
            )}

            {detectedType === 'PDF' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePrint}
                className="text-slate-300 hover:text-white hover:bg-slate-800 p-1.5 h-8 cursor-pointer"
                title="In tài liệu"
              >
                <Printer className="size-4" />
              </Button>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              className="text-slate-300 hover:text-white hover:bg-slate-800 p-1.5 h-8 cursor-pointer"
              title="Tải xuống tệp gốc"
            >
              <Download className="size-4" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={toggleFullscreen}
              className="text-slate-300 hover:text-white hover:bg-slate-800 p-1.5 h-8 cursor-pointer"
              title={isFullscreen ? 'Thu nhỏ (Esc)' : 'Toàn màn hình (F)'}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>

            {!isEmbedded && onClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-slate-400 hover:text-rose-400 hover:bg-slate-800 p-1.5 h-8 ml-1 cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="size-5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Presentation Viewport */}
      <div className="relative flex-1 w-full h-full min-h-0 flex items-center justify-center overflow-hidden p-2 sm:p-4 bg-slate-950">
        {hasPlaylist && canGoPrev && (
          <button
            onClick={() => onIndexChange?.(currentIndex - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-xl transition opacity-75 hover:opacity-100 cursor-pointer"
            title={`Tài nguyên trước: ${playlist[currentIndex - 1]?.title}`}
          >
            <ChevronLeft className="size-6" />
          </button>
        )}

        {hasPlaylist && canGoNext && (
          <button
            onClick={() => onIndexChange?.(currentIndex + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-xl transition opacity-75 hover:opacity-100 cursor-pointer"
            title={`Tài nguyên tiếp theo: ${playlist[currentIndex + 1]?.title}`}
          >
            <ChevronRight className="size-6" />
          </button>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 text-slate-400 py-16">
            <Loader2 className="size-10 animate-spin text-teal-500" />
            <span className="text-sm font-medium">Đang chuẩn bị nội dung trình chiếu...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center gap-4 text-center max-w-md p-6 bg-slate-900 rounded-2xl border border-slate-800 text-slate-300">
            <AlertCircle className="size-12 text-rose-500" />
            <div>
              <p className="font-bold text-white text-base">{error}</p>
              <p className="text-xs text-slate-400 mt-1">
                Vui lòng thử tải lại hoặc tải xuống tệp tin về máy tính để mở trực tiếp.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
              <Button
                size="sm"
                onClick={() => void handleRetry()}
                disabled={retrying}
                className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold"
              >
                {retrying ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
                Thử xử lý lại
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="gap-1.5 text-xs border-slate-700 hover:bg-slate-800 text-slate-200"
              >
                <Download className="size-3.5" /> Tải xuống tệp tin
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            {/* 1. IMAGE VIEWER */}
            {detectedType === 'IMAGE' && mediaUrl && (
              <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
                <img
                  src={mediaUrl}
                  alt={displayName}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out',
                    maxHeight: zoom <= 100 ? '92vh' : 'none',
                    maxWidth: zoom <= 100 ? '92vw' : 'none',
                  }}
                  className="object-contain rounded-lg select-none shadow-2xl"
                  draggable={false}
                />
              </div>
            )}

            {/* 2. PDF VIEWER */}
            {detectedType === 'PDF' && mediaUrl && (
              <div className="w-full h-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col">
                <iframe
                  src={`${mediaUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="w-full h-full border-none rounded-xl"
                  title={displayName}
                />
              </div>
            )}

            {/* 3. DOCX VIEWER */}
            {detectedType === 'WORD' && docxHtml && (
              <div className="w-full h-full overflow-y-auto bg-slate-900 rounded-2xl p-6 sm:p-12 border border-slate-800 flex justify-center">
                <div
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                  className="w-full max-w-4xl bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-2xl prose prose-slate max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: docxHtml }}
                />
              </div>
            )}

            {/* 4. PPTX PRESENTATION VIEWER */}
            {detectedType === 'POWERPOINT' && pptMetadata && (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                <div className="relative flex-1 w-full max-h-[82vh] flex items-center justify-center p-2">
                  {pptSlideUrls[pptCurrentSlide] ? (
                    <img
                      src={pptSlideUrls[pptCurrentSlide]}
                      alt={`Slide ${pptCurrentSlide}`}
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-800 select-none aspect-video bg-black"
                    />
                  ) : (
                    <div className="aspect-video w-full max-w-4xl bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-400">
                      <Loader2 className="size-8 animate-spin text-orange-500" />
                      <span className="text-xs">Đang tải slide {pptCurrentSlide}...</span>
                    </div>
                  )}

                  <button
                    onClick={() => goToPptSlide(pptCurrentSlide - 1)}
                    disabled={pptCurrentSlide <= 1}
                    className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-0 transition cursor-pointer backdrop-blur-xs"
                    title="Slide trước (←)"
                  >
                    <ChevronLeft className="size-6" />
                  </button>

                  <button
                    onClick={() => goToPptSlide(pptCurrentSlide + 1)}
                    disabled={pptCurrentSlide >= pptMetadata.slideCount}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-0 transition cursor-pointer backdrop-blur-xs"
                    title="Slide tiếp theo (→)"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                </div>

                <div className="w-full py-2 px-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-[85vw]">
                    {pptMetadata.slides.map((s) => {
                      const isActive = s.index === pptCurrentSlide
                      return (
                        <button
                          key={s.index}
                          onClick={() => goToPptSlide(s.index)}
                          className={`relative shrink-0 h-14 aspect-video rounded-md overflow-hidden border-2 transition cursor-pointer ${
                            isActive
                              ? 'border-orange-500 scale-105 shadow-lg ring-2 ring-orange-500/50'
                              : 'border-slate-700 opacity-60 hover:opacity-100'
                          }`}
                        >
                          {pptSlideUrls[s.index] ? (
                            <img src={pptSlideUrls[s.index]} alt={`Thumbnail ${s.index}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-400">
                              {s.index}
                            </div>
                          )}
                          <span className="absolute bottom-0.5 right-1 text-[9px] font-bold px-1 rounded bg-black/80 text-white">
                            {s.index}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <span className="text-xs font-mono text-slate-400 ml-4 shrink-0">
                    Trang {pptCurrentSlide} / {pptMetadata.slideCount}
                  </span>
                </div>
              </div>
            )}

            {/* 5. VIDEO VIEWER (HTTP RANGE STREAMING) */}
            {detectedType === 'VIDEO' && mediaUrl && (
              <div className="w-full h-full max-h-[85vh] max-w-5xl flex items-center justify-center p-2">
                <video
                  src={mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full max-h-[82vh] object-contain rounded-2xl bg-black border border-slate-800 shadow-2xl"
                />
              </div>
            )}

            {/* 6. AUDIO VIEWER */}
            {detectedType === 'AUDIO' && mediaUrl && (
              <div className="flex flex-col items-center justify-center gap-6 p-8 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full">
                <div className="size-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
                  <Headphones className="size-12" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-white text-base">{displayName}</h3>
                  <p className="text-xs text-slate-400 mt-1">Học liệu âm thanh bài giảng</p>
                </div>
                <audio src={mediaUrl} controls autoPlay className="w-full" />
              </div>
            )}

            {/* 7. HTML GAME VIEWER (SANDBOXED IFRAME) */}
            {detectedType === 'HTML_GAME' && mediaUrl && (
              <div className="w-full h-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex flex-col">
                <iframe
                  src={mediaUrl}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  className="w-full h-full border-none"
                  title={displayName}
                />
              </div>
            )}

            {/* 8. EXCEL VIEWER */}
            {detectedType === 'EXCEL' && xlsxSheets.length > 0 && (
              <div className="w-full h-full max-w-6xl bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
                <div className="flex items-center gap-1.5 p-2 bg-slate-950 border-b border-slate-800 overflow-x-auto">
                  {xlsxSheets.map((sh, idx) => (
                    <button
                      key={sh.name}
                      onClick={() => setActiveSheetIdx(idx)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        activeSheetIdx === idx
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sh.name}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <table className="w-full text-xs text-left border-collapse text-slate-200">
                    <tbody>
                      {(xlsxSheets[activeSheetIdx]?.rows || []).map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-800 font-bold' : 'border-b border-slate-800/60'}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2 border-r border-slate-800/60">
                              {cell !== undefined && cell !== null ? String(cell) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 9. TEXT VIEWER */}
            {detectedType === 'TEXT' && txtContent !== null && (
              <div className="w-full h-full max-w-4xl bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-800 overflow-auto text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap shadow-xl">
                {txtContent}
              </div>
            )}

            {/* 10. WORKSHEET VIEWER */}
            {detectedType === 'WORKSHEET' && activeWorksheet && (
              <div className="w-full h-full max-w-4xl bg-white text-slate-900 p-8 rounded-2xl shadow-2xl overflow-y-auto">
                <div className="text-center pb-4 border-b border-slate-200 mb-6">
                  <h2 className="text-xl font-bold uppercase">{activeWorksheet.title || 'Phiếu bài tập'}</h2>
                  {activeWorksheet.subtitle && <p className="text-sm text-slate-500 mt-1">{activeWorksheet.subtitle}</p>}
                </div>
                <div className="space-y-4 text-sm">
                  {Array.isArray(activeWorksheet.questions) && activeWorksheet.questions.map((q: any, i: number) => (
                    <div key={q.id || i} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="font-semibold text-slate-900">Câu {i + 1}: {q.content}</p>
                      {q.options && Array.isArray(q.options) && (
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                          {q.options.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="p-2 rounded-lg bg-white border border-slate-200">
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
