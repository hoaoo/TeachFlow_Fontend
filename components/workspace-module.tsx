'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import * as mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import {
  Download,
  FileText,
  Filter,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Search,
  School,
  Sparkles,
  Trash2,
  Users,
  FileDown,
  FileType,
  Loader2,
  ChevronDown,
  UploadCloud,
  File,
  Film,
  Image as ImageIcon,
  Presentation,
  Table as TableIcon,
  Link2,
  X,
  BookOpen,
  CheckCircle2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Music,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  deleteWorkspaceRecord,
  listWorkspaceRecords,
  saveWorkspaceRecord,
  type WorkspaceRecord,
} from '@/services/teachflow-service'
import {
  getResources,
  uploadResourceFileWithProgress,
  deleteResource as apiDeleteResource,
  downloadResourceFile,
  attachResourceToLessonPlan,
  getResourceFileBlob,
  getResourceFileArrayBuffer,
  getResourcePreviewBlob,
  getResourceInlineUrl,
  openResourceInDefaultApp,
  updateResource as apiUpdateResource,
  detectResourceType,
  type TeachingResource,
  type CanonicalResourceType,
} from '@/services/resource-service'
import { getLessonPlans, type LessonPlan } from '@/services/lesson-service'
import { generateImage } from '@/services/ai-service'
import { exportService } from '@/services/export-service'

type View =
  | 'Chủ nhiệm'
  | 'Tài nguyên'
  | 'Cài đặt'
  | 'Phiếu học tập'

const iconFor = (view: View) =>
  ({
    'Chủ nhiệm': School,
    'Tài nguyên': Download,
    'Cài đặt': School,
    'Phiếu học tập': FileText,
  }[view])

const descriptions: Record<View, string> = {
  'Chủ nhiệm': 'Quản lý công việc chủ nhiệm, trao đổi phụ huynh và kế hoạch lớp.',
  'Tài nguyên': 'Lưu trữ, tải lên và quản lý kho học liệu số (tài liệu, hình ảnh, audio, video) dùng cho các tiết dạy.',
  'Cài đặt': 'Cá nhân hóa workspace, thông báo và thông tin giáo viên.',
  'Phiếu học tập': 'Quản lý phiếu bài tập, câu hỏi và tài liệu học tập.',
}

function getResourceIcon(detected: CanonicalResourceType) {
  if (detected === 'VIDEO') return <Film className="size-5 text-purple-600" />
  if (detected === 'AUDIO') return <Music className="size-5 text-amber-600" />
  if (detected === 'IMAGE') return <ImageIcon className="size-5 text-emerald-600" />
  if (detected === 'POWERPOINT') return <Presentation className="size-5 text-orange-600" />
  if (detected === 'EXCEL') return <TableIcon className="size-5 text-green-600" />
  if (detected === 'PDF') return <FileText className="size-5 text-rose-600" />
  return <FileText className="size-5 text-blue-600" />
}

function sanitizeDocxHtml(rawHtml: string): string {
  if (!rawHtml) return ''
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '')
}

function ResourcePreviewModal({
  resource,
  onClose,
  onDownload,
  onAttach,
  onDelete,
  onOpenDefault,
}: {
  resource: TeachingResource
  onClose: () => void
  onDownload: () => void
  onAttach: () => void
  onDelete: () => void
  onOpenDefault?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [docxHtml, setDocxHtml] = useState<string | null>(null)
  const [txtContent, setTxtContent] = useState<string | null>(null)
  const [xlsxSheets, setXlsxSheets] = useState<Array<{ name: string; rows: any[][] }>>([])
  const [activeSheetIdx, setActiveSheetIdx] = useState(0)
  const [zoom, setZoom] = useState(100)
  const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

  const detected = detectResourceType(resource)
  const isImage = detected === 'IMAGE'
  const isVideo = detected === 'VIDEO'
  const isAudio = detected === 'AUDIO'
  const isPdf = detected === 'PDF'
  const isDocx = detected === 'WORD'
  const isXlsx = detected === 'EXCEL'
  const isTxt = detected === 'TEXT'
  const isPptx = detected === 'POWERPOINT'
  const name = resource.name || resource.title || 'Tài nguyên chưa đặt tên'
  const ext = (resource.extension || (resource.originalFileName?.includes('.') ? resource.originalFileName.split('.').pop() : '') || detected).toUpperCase()
  const formattedSize = resource.formattedSize || '0 KB'
  const createdAtFormatted = resource.createdAt ? new Date(resource.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    setBlobUrl(null)
    setDocxHtml(null)
    setTxtContent(null)
    setXlsxSheets([])

    async function loadPreview() {
      try {
        if (detected === 'IMAGE' || detected === 'VIDEO' || detected === 'AUDIO' || detected === 'PDF') {
          const { blob } = await getResourceFileBlob(resource.id)
          if (!alive) return
          const url = URL.createObjectURL(blob)
          setBlobUrl(url)
        } else if (detected === 'POWERPOINT') {
          if (resource.previewStatus === 'READY') {
            const { blob } = await getResourcePreviewBlob(resource.id)
            if (!alive) return
            const url = URL.createObjectURL(blob)
            setBlobUrl(url)
          } else {
            // Presentation preview pending or fallback
          }
        } else if (detected === 'TEXT') {
          const { blob } = await getResourceFileBlob(resource.id)
          if (!alive) return
          const text = await blob.text()
          setTxtContent(text)
        } else if (detected === 'WORD') {
          const { buffer } = await getResourceFileArrayBuffer(resource.id)
          if (!alive) return
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
          const cleanHtml = sanitizeDocxHtml(result.value || '')
          setDocxHtml(cleanHtml || '<p class="text-slate-400 italic">Tài liệu không có nội dung văn bản.</p>')
        } else if (detected === 'EXCEL') {
          const { buffer } = await getResourceFileArrayBuffer(resource.id)
          if (!alive) return
          const wb = XLSX.read(buffer, { type: 'array' })
          const sheets = wb.SheetNames.map((sheetName) => {
            const ws = wb.Sheets[sheetName]
            const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][]
            return {
              name: sheetName,
              rows: rawRows.slice(0, 100),
            }
          })
          setXlsxSheets(sheets)
        }
      } catch (err: any) {
        if (alive) {
          setError(err?.message || 'Không thể tải bản xem trước tệp tin.')
        }
      } finally {
        if (alive) {
          setLoading(false)
        }
      }
    }

    loadPreview()

    return () => {
      alive = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [resource.id, detected, resource.previewStatus])

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="flex flex-col w-[94vw] max-w-6xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <span className="grid size-9 place-items-center rounded-lg bg-white border border-slate-200 shrink-0 shadow-2xs">
              {getResourceIcon(detected)}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate leading-tight">
                {name}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                <span className="font-semibold uppercase text-teal-700">{ext}</span>
                <span>•</span>
                <span>{formattedSize}</span>
                <span>•</span>
                <span>{createdAtFormatted}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {detected === 'IMAGE' && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs mr-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 25))}
                  className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="text-[10px] font-bold px-1.5 text-slate-600 min-w-[36px] text-center">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(200, z + 25))}
                  className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                  title="Phóng to"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(100)}
                  className="p-1 text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                  title="Đặt lại"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50 flex flex-col items-center justify-center min-h-[360px] max-h-[calc(92vh-130px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2.5 py-16 text-slate-500">
              <Loader2 className="size-8 animate-spin text-teal-600" />
              <p className="text-xs font-semibold">Đang chuẩn bị bản xem trước trực tiếp...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center max-w-md bg-white p-6 rounded-2xl border border-rose-100 shadow-2xs">
              <AlertCircle className="size-9 text-rose-500" />
              <div>
                <p className="text-sm font-bold text-slate-800">Không thể phát tệp này</p>
                <p className="text-xs text-slate-500 mt-1">{error}</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" onClick={onDownload} className="bg-teal-600 hover:bg-teal-700 text-xs font-semibold gap-1.5">
                  <Download className="size-3.5" /> Tải xuống tệp gốc
                </Button>
                {isDesktop && onOpenDefault && (
                  <Button size="sm" variant="outline" onClick={onOpenDefault} className="text-xs font-semibold gap-1.5">
                    <ExternalLink className="size-3.5" /> Mở bằng ứng dụng
                  </Button>
                )}
              </div>
            </div>
          ) : detected === 'IMAGE' && blobUrl ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={blobUrl}
                alt={name}
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
                className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-md transition-transform duration-100"
              />
            </div>
          ) : detected === 'VIDEO' && blobUrl ? (
            <div className="w-full flex items-center justify-center">
              <video
                src={blobUrl}
                controls
                playsInline
                preload="metadata"
                className="max-h-[65vh] w-full max-w-4xl rounded-xl bg-black object-contain shadow-lg"
              >
                Trình duyệt của bạn không hỗ trợ phát video trực tiếp.
              </video>
            </div>
          ) : detected === 'AUDIO' && blobUrl ? (
            <div className="w-full max-w-lg bg-white p-8 rounded-2xl border border-slate-200 shadow-md space-y-5 text-center">
              <div className="size-20 mx-auto rounded-full bg-linear-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Music className="size-10" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{name}</h3>
                <p className="text-xs text-slate-500 mt-1">{formattedSize} • Âm thanh ({ext})</p>
                {resource.description && (
                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    {resource.description}
                  </p>
                )}
              </div>
              <audio src={blobUrl} controls className="w-full" preload="metadata" />
            </div>
          ) : detected === 'PDF' && blobUrl ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={blobUrl}
                title={name}
                className="w-full h-[68vh] rounded-xl border border-slate-200 bg-white shadow-sm"
              />
            </div>
          ) : detected === 'POWERPOINT' ? (
            resource.previewStatus === 'READY' && blobUrl ? (
              <div className="w-full h-full flex flex-col">
                <iframe
                  src={blobUrl}
                  title={name}
                  className="w-full h-[68vh] rounded-xl border border-slate-200 bg-white shadow-sm"
                />
              </div>
            ) : resource.previewStatus === 'PENDING' ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center max-w-md bg-white p-6 rounded-2xl border border-orange-100 shadow-2xs">
                <Loader2 className="size-8 animate-spin text-orange-500" />
                <h3 className="font-bold text-slate-800 text-sm">Đang tạo bản xem trước trực tiếp...</h3>
                <p className="text-xs text-slate-500">Hệ thống đang chuyển đổi slide PowerPoint sang tài liệu xem nhanh.</p>
              </div>
            ) : (
              <div className="w-full max-w-lg bg-white p-8 rounded-2xl border border-slate-200 shadow-md text-center space-y-4">
                <div className="size-16 mx-auto rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Presentation className="size-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Bài trình chiếu PowerPoint ({ext}) • {formattedSize}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Mở bằng PowerPoint hoặc ứng dụng mặc định trên máy để trình chiếu đầy đủ hiệu ứng.
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <Button onClick={onDownload} className="bg-teal-600 hover:bg-teal-700 text-xs font-semibold gap-1.5 cursor-pointer">
                    <Download className="size-3.5" /> Tải về máy
                  </Button>
                  {isDesktop && onOpenDefault && (
                    <Button variant="outline" onClick={onOpenDefault} className="text-xs font-semibold gap-1.5 cursor-pointer">
                      <ExternalLink className="size-3.5" /> Mở bằng PowerPoint
                    </Button>
                  )}
                </div>
              </div>
            )
          ) : detected === 'TEXT' && txtContent !== null ? (
            <div className="w-full h-full overflow-y-auto max-w-3xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-slate-800 text-xs font-mono whitespace-pre-wrap leading-relaxed">
              {txtContent}
            </div>
          ) : detected === 'WORD' && docxHtml ? (
            <div className="w-full h-full overflow-y-auto max-w-3xl bg-white p-6 sm:p-10 rounded-xl border border-slate-200 shadow-sm text-slate-800 text-sm leading-relaxed space-y-3 prose prose-slate max-w-none">
              <div
                dangerouslySetInnerHTML={{ __html: docxHtml }}
                className="[&_table]:w-full [&_table]:border [&_table]:border-collapse [&_th]:border [&_th]:p-2 [&_th]:bg-slate-50 [&_td]:border [&_td]:p-2 [&_p]:mb-2.5 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-semibold"
              />
            </div>
          ) : detected === 'EXCEL' && xlsxSheets.length > 0 ? (
            <div className="w-full h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Sheet tabs */}
              {xlsxSheets.length > 1 && (
                <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto">
                  {xlsxSheets.map((sh, idx) => (
                    <button
                      key={sh.name}
                      onClick={() => setActiveSheetIdx(idx)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                        activeSheetIdx === idx
                          ? 'bg-white text-teal-700 shadow-2xs border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <FileSpreadsheet className="size-3 inline mr-1 text-emerald-600" />
                      {sh.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Table Data */}
              <div className="overflow-auto max-h-[58vh] flex-1">
                <table className="w-full text-xs text-left border-collapse">
                  <tbody>
                    {xlsxSheets[activeSheetIdx]?.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={rIdx === 0 ? 'bg-slate-100 font-bold sticky top-0 border-b border-slate-300' : 'hover:bg-slate-50/70 border-b border-slate-100'}
                      >
                        <td className="py-1 px-2 text-center text-[10px] text-slate-400 bg-slate-50 border-r border-slate-200 select-none font-mono">
                          {rIdx + 1}
                        </td>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="py-1.5 px-3 border-r border-slate-100 whitespace-nowrap">
                            {String(cell ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                <span>Trang tính: {xlsxSheets[activeSheetIdx]?.name}</span>
                <span>Hiển thị tối đa 100 dòng đầu</span>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-md text-center space-y-3">
              <File className="size-12 mx-auto text-slate-400" />
              <h3 className="font-bold text-slate-900 text-sm">{name}</h3>
              <p className="text-xs text-slate-500">{formattedSize} • {ext}</p>
              <div className="flex justify-center gap-2 pt-2">
                <Button onClick={onDownload} className="bg-teal-600 text-xs font-semibold gap-1.5 cursor-pointer">
                  <Download className="size-3.5" /> Tải xuống tệp tin
                </Button>
                {isDesktop && onOpenDefault && (
                  <Button variant="outline" onClick={onOpenDefault} className="text-xs font-semibold gap-1.5 cursor-pointer">
                    <ExternalLink className="size-3.5" /> Mở bằng ứng dụng
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 bg-white">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Trash2 className="size-3.5" /> Xóa tệp
          </Button>

          <div className="flex items-center gap-2">
            {isDesktop && onOpenDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenDefault}
                className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-50 gap-1.5 cursor-pointer"
              >
                <ExternalLink className="size-3.5" /> Mở bằng ứng dụng
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onAttach}
              className="text-xs font-semibold text-teal-700 border-teal-200 hover:bg-teal-50 gap-1.5 cursor-pointer"
            >
              <Link2 className="size-3.5" /> Gắn vào giáo án
            </Button>
            <Button
              size="sm"
              onClick={onDownload}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="size-3.5" /> Lưu thành...
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-medium text-slate-600 cursor-pointer"
            >
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResourceCard({
  resource,
  onPreview,
  onDownload,
  onAttach,
  onDelete,
  onRename,
  onOpenDefault,
}: {
  resource: TeachingResource
  onPreview: (res: TeachingResource) => void
  onDownload: (res: TeachingResource) => void
  onAttach: (res: TeachingResource) => void
  onDelete: (res: TeachingResource) => void
  onRename: (res: TeachingResource) => void
  onOpenDefault?: (res: TeachingResource) => void
}) {
  if (!resource || !resource.id) {
    return (
      <article className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-rose-200 bg-rose-50/50 text-rose-700 text-xs text-center">
        <AlertCircle className="size-6 mb-1.5 opacity-80" />
        <p className="font-semibold">Không thể hiển thị tài nguyên này.</p>
      </article>
    )
  }

  const detected = detectResourceType(resource)
  const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  const name = resource.name || resource.title || 'Tài nguyên chưa đặt tên'
  const ext = (resource.extension || (resource.originalFileName?.includes('.') ? resource.originalFileName.split('.').pop() : '') || detected).toUpperCase()
  const formattedSize = resource.formattedSize || '0 KB'
  const createdAtFormatted = resource.createdAt ? new Date(resource.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật'

  return (
    <article className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-md hover:border-teal-300 transition-all duration-150 overflow-hidden">
      {/* 1. Thumbnail Header */}
      <div
        onClick={() => onPreview(resource)}
        className="relative aspect-16/9 w-full bg-slate-100 overflow-hidden flex items-center justify-center cursor-pointer group-hover:opacity-95 transition select-none"
      >
        {detected === 'IMAGE' ? (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center relative">
            <img
              src={getResourceInlineUrl(resource.id)}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLElement).style.display = 'none'
              }}
            />
            <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="p-2 rounded-full bg-white/90 shadow-md text-teal-700">
                <Eye className="size-4" />
              </span>
            </div>
          </div>
        ) : detected === 'VIDEO' ? (
          <div className="w-full h-full bg-linear-to-br from-purple-900 via-indigo-900 to-slate-900 flex flex-col items-center justify-center text-white relative">
            <div className="size-11 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition shadow-lg">
              <Play className="size-5 fill-white text-white translate-x-0.5" />
            </div>
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-white">
              🎬 Video
            </span>
          </div>
        ) : detected === 'AUDIO' ? (
          <div className="w-full h-full bg-linear-to-br from-amber-600 via-orange-600 to-slate-800 flex flex-col items-center justify-center text-white relative">
            <div className="size-11 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center group-hover:scale-110 transition shadow-lg">
              <Music className="size-5 text-white" />
            </div>
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-white">
              🎵 Audio
            </span>
          </div>
        ) : detected === 'POWERPOINT' ? (
          <div className="w-full h-full bg-linear-to-br from-orange-500 to-amber-600 flex flex-col items-center justify-center text-white p-4">
            <Presentation className="size-10 text-white/90 group-hover:scale-110 transition drop-shadow" />
            <span className="text-[11px] font-bold text-white/90 mt-1">Bài giảng trình chiếu</span>
          </div>
        ) : detected === 'EXCEL' ? (
          <div className="w-full h-full bg-linear-to-br from-emerald-600 to-teal-700 flex flex-col items-center justify-center text-white p-4">
            <TableIcon className="size-10 text-white/90 group-hover:scale-110 transition drop-shadow" />
            <span className="text-[11px] font-bold text-white/90 mt-1">Bảng tính Excel</span>
          </div>
        ) : detected === 'PDF' ? (
          <div className="w-full h-full bg-linear-to-br from-rose-600 to-red-700 flex flex-col items-center justify-center text-white p-4">
            <FileText className="size-10 text-white/90 group-hover:scale-110 transition drop-shadow" />
            <span className="text-[11px] font-bold text-white/90 mt-1">Tài liệu PDF</span>
          </div>
        ) : (
          <div className="w-full h-full bg-linear-to-br from-blue-600 to-indigo-700 flex flex-col items-center justify-center text-white p-4">
            <FileText className="size-10 text-white/90 group-hover:scale-110 transition drop-shadow" />
            <span className="text-[11px] font-bold text-white/90 mt-1">{detected === 'TEXT' ? 'Văn bản Text' : 'Văn bản Word'}</span>
          </div>
        )}

        {/* Extension Badge */}
        <span className="absolute top-2 right-2 rounded-md bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white uppercase shadow-2xs">
          {ext}
        </span>
      </div>

      {/* 2. Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          <h2
            onClick={() => onPreview(resource)}
            title={name}
            className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug hover:text-teal-700 transition cursor-pointer"
          >
            {name}
          </h2>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span>{detected === 'VIDEO' ? '🎬 Video' : detected === 'AUDIO' ? '🎵 Audio' : detected === 'IMAGE' ? '🖼️ Ảnh' : '📄 Tài liệu'}</span>
            <span>•</span>
            <span>{formattedSize}</span>
            <span>•</span>
            <span>{createdAtFormatted}</span>
          </div>
          {resource.description && (
            <p className="text-[11px] text-slate-400 line-clamp-1 leading-normal pt-0.5">
              {resource.description}
            </p>
          )}
        </div>

        {/* 3. Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPreview(resource)}
              className="h-7 px-2.5 text-xs font-semibold text-teal-700 border-teal-200 hover:bg-teal-50 gap-1 cursor-pointer shadow-2xs"
            >
              <Eye className="size-3" /> Xem
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDownload(resource)}
              title="Tải xuống tệp tin"
              className="h-7 px-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1 cursor-pointer"
            >
              <Download className="size-3" /> Lưu...
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-7 text-slate-400 hover:text-slate-700 cursor-pointer">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => onPreview(resource)}>
                <Eye className="size-3.5 mr-2 text-teal-600" /> Xem trực tiếp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload(resource)}>
                <Download className="size-3.5 mr-2 text-slate-600" /> Lưu thành...
              </DropdownMenuItem>
              {isDesktop && onOpenDefault && (
                <DropdownMenuItem onClick={() => onOpenDefault(resource)}>
                  <ExternalLink className="size-3.5 mr-2 text-indigo-600" /> Mở bằng ứng dụng
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onRename(resource)}>
                <FileType className="size-3.5 mr-2 text-amber-600" /> Đổi tên
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAttach(resource)}>
                <Link2 className="size-3.5 mr-2 text-blue-600" /> Gắn vào giáo án
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(resource)} className="text-rose-600">
                <Trash2 className="size-3.5 mr-2" /> Xóa tệp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  )
}

export function WorkspaceModule({ view }: { view: View }) {
  const [items, setItems] = useState<WorkspaceRecord[]>([])
  const [resources, setResources] = useState<TeachingResource[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('Tất cả')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<WorkspaceRecord | null>(null)
  const [selectedResource, setSelectedResource] = useState<TeachingResource | null>(null)
  const [exportMenuId, setExportMenuId] = useState<string | null>(null)
  const [exportingKey, setExportingKey] = useState<string | null>(null)

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadDesc, setUploadDesc] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const uploadAbortRef = useRef<AbortController | null>(null)

  // Rename modal state
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameTargetResource, setRenameTargetResource] = useState<TeachingResource | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renaming, setRenaming] = useState(false)

  const [aiImageOpen, setAiImageOpen] = useState(false)
  const [aiImagePrompt, setAiImagePrompt] = useState('')
  const [aiImageStyle, setAiImageStyle] = useState('minh họa sách giáo khoa')
  const [aiImageRatio, setAiImageRatio] = useState('1:1')
  const [aiImageGenerating, setAiImageGenerating] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Attach to lesson plan state
  const [attachModalOpen, setAttachModalOpen] = useState(false)
  const [attachTargetResource, setAttachTargetResource] = useState<TeachingResource | null>(null)
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([])
  const [attaching, setAttaching] = useState(false)

  const Icon = iconFor(view)

  const loadData = async () => {
    setLoading(true)
    try {
      if (view === 'Tài nguyên') {
        const data = await getResources({
          search: query.trim() || undefined,
        })
        setResources(data)
      } else {
        const data = await listWorkspaceRecords(view)
        setItems(data)
      }
    } catch (err: any) {
      toast.error('Lỗi khi tải dữ liệu: ' + (err.message || 'Vui lòng thử lại'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [view])

  // Load lesson plans when attach modal opens
  useEffect(() => {
    if (attachModalOpen) {
      getLessonPlans().then((plans) => setLessonPlans(Array.isArray(plans) ? plans : [])).catch(() => setLessonPlans([]))
    }
  }, [attachModalOpen])

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item &&
          (status === 'Tất cả' || item.status === status) &&
          `${item.title || ''} ${item.subtitle || ''} ${item.meta || ''}`
            .toLowerCase()
            .includes((query || '').toLowerCase().trim()),
      ),
    [items, query, status],
  )

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (!r) return false
      const detected = detectResourceType(r)
      if (resourceTypeFilter !== 'ALL') {
        if (resourceTypeFilter === 'DOCUMENT' && !['PDF', 'WORD', 'TEXT'].includes(detected)) return false
        if (resourceTypeFilter === 'IMAGE' && detected !== 'IMAGE') return false
        if (resourceTypeFilter === 'AUDIO' && detected !== 'AUDIO') return false
        if (resourceTypeFilter === 'VIDEO' && detected !== 'VIDEO') return false
        if (resourceTypeFilter === 'PRESENTATION' && detected !== 'POWERPOINT') return false
        if (resourceTypeFilter === 'SPREADSHEET' && detected !== 'EXCEL') return false
      }
      const q = (query || '').toLowerCase().trim()
      if (!q) return true
      const hay = `${r.name || ''} ${r.title || ''} ${r.subtitle || ''} ${r.description || ''} ${r.originalFileName || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [resources, query, resourceTypeFilter])

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2400)
  }

  const create = async () => {
    if (view === 'Tài nguyên') {
      setUploadModalOpen(true)
      return
    }
    const draft = await saveWorkspaceRecord(view, {
      id: '',
      title: `Nội dung ${view.toLowerCase()} mới`,
      subtitle: `${view} · Bản ghi mới`,
      status: 'Bản nháp',
      meta: 'Vừa tạo',
      tone: 'teal',
    })
    setItems((current) => [draft, ...current])
    setSelected(draft)
    flash('Đã tạo nội dung mới')
  }

  const remove = async (item: WorkspaceRecord) => {
    await deleteWorkspaceRecord(view, item.id)
    setItems((current) => current.filter((entry) => entry.id !== item.id))
    flash('Đã xóa nội dung')
  }

  const handleExportWorksheet = async (
    item: WorkspaceRecord,
    type: 'docx' | 'pdf',
    includeAnswers: boolean,
  ) => {
    const key = `${item.id}-${type}-${includeAnswers}`
    try {
      setExportingKey(key)
      setExportMenuId(null)
      toast.info(
        `Đang tạo file ${type === 'docx' ? 'Word' : 'PDF'}${
          includeAnswers ? ' (có đáp án)' : ''
        }...`,
      )

      if (type === 'docx') {
        await exportService.exportWorksheetDocx(item.id, includeAnswers, item.title)
      } else {
        await exportService.exportWorksheetPdf(item.id, includeAnswers, item.title)
      }
      toast.success(`Đã xuất file ${type.toUpperCase()} thành công!`)
    } catch (err: any) {
      toast.error(`Lỗi khi xuất phiếu học tập: ${err.message || 'Vui lòng thử lại'}`)
    } finally {
      setExportingKey(null)
    }
  }

  // Upload handler with progress
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      toast.error('Vui lòng chọn tập tin để tải lên')
      return
    }

    const ext = '.' + (uploadFile.name.split('.').pop() || '').toLowerCase()
    const allowed = [
      '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt',
      '.png', '.jpg', '.jpeg', '.webp', '.gif',
      '.mp3', '.wav', '.m4a', '.aac',
      '.mp4', '.webm', '.mov',
    ]

    if (!allowed.includes(ext)) {
      toast.error(`File không được hỗ trợ (${ext}). Hệ thống chỉ hỗ trợ Tài liệu, Hình ảnh, Audio và Video.`)
      return
    }

    const isVideo = ['.mp4', '.webm', '.mov'].includes(ext)
    const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)
    const isAudio = ['.mp3', '.wav', '.m4a', '.aac'].includes(ext)
    const maxSizeMb = isVideo ? 500 : isAudio ? 50 : isImage ? 20 : 100

    if (uploadFile.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File vượt quá dung lượng cho phép (${maxSizeMb}MB). Dung lượng file: ${(uploadFile.size / (1024 * 1024)).toFixed(1)}MB`)
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)
      const controller = new AbortController()
      uploadAbortRef.current = controller

      const formData = new FormData()
      formData.append('file', uploadFile)
      if (uploadName.trim()) formData.append('name', uploadName.trim())
      if (uploadDesc.trim()) formData.append('description', uploadDesc.trim())

      const newRes = await uploadResourceFileWithProgress(
        formData,
        (pct) => setUploadProgress(pct),
        controller.signal,
      )

      toast.success(`Đã tải lên thành công: ${newRes.name}`)
      setUploadModalOpen(false)
      setUploadFile(null)
      setUploadName('')
      setUploadDesc('')
      setUploadProgress(0)
      setResources((prev) => [newRes, ...prev])
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message === 'Tải lên đã bị hủy') {
        toast.info('Đã hủy tải lên tập tin')
      } else {
        toast.error(`Lỗi tải lên: ${err.message || 'Vui lòng kiểm tra kết nối mạng và thử lại'}`)
      }
    } finally {
      setUploading(false)
      uploadAbortRef.current = null
    }
  }

  const handleDeleteResource = async (resource: TeachingResource) => {
    try {
      await apiDeleteResource(resource.id)
      setResources((prev) => prev.filter((r) => r.id !== resource.id))
      toast.success(`Đã xóa tài nguyên ${resource.name}`)
      if (selectedResource?.id === resource.id) setSelectedResource(null)
    } catch (err: any) {
      toast.error(`Lỗi khi xóa tài nguyên: ${err.message || 'Vui lòng thử lại'}`)
    }
  }

  const handleDownloadResource = async (resource: TeachingResource) => {
    try {
      toast.info(`Đang tải xuống: ${resource.name}...`)
      await downloadResourceFile(resource.id, resource.originalFileName || resource.name)
      toast.success('Tải xuống hoàn tất!')
    } catch (err: any) {
      toast.error(`Lỗi tải xuống: ${err.message || 'Vui lòng thử lại'}`)
    }
  }

  const handleOpenDefaultApp = async (resource: TeachingResource) => {
    try {
      toast.info(`Đang mở tệp: ${resource.name}...`)
      await openResourceInDefaultApp(resource.id, resource.originalFileName || resource.name)
    } catch (err: any) {
      toast.error(`Lỗi khi mở tệp: ${err.message || 'Vui lòng thử lại'}`)
    }
  }

  const handleStartRename = (resource: TeachingResource) => {
    setRenameTargetResource(resource)
    setRenameName(resource.name || resource.title || '')
    setRenameModalOpen(true)
  }

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renameTargetResource || !renameName.trim()) return
    try {
      setRenaming(true)
      const updated = await apiUpdateResource(renameTargetResource.id, {
        name: renameName.trim(),
        title: renameName.trim(),
      })
      setResources((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, name: updated.name, title: updated.title } : r)),
      )
      toast.success('Đã đổi tên tài nguyên thành công')
      setRenameModalOpen(false)
      setRenameTargetResource(null)
    } catch (err: any) {
      toast.error(`Lỗi đổi tên: ${err.message || 'Vui lòng thử lại'}`)
    } finally {
      setRenaming(false)
    }
  }

  const handleAttachToLessonPlan = async (lessonPlanId: string) => {
    if (!attachTargetResource) return
    try {
      setAttaching(true)
      await attachResourceToLessonPlan(lessonPlanId, attachTargetResource.id)
      toast.success(`Đã đính kèm tài nguyên vào giáo án thành công!`)
      setAttachModalOpen(false)
      setAttachTargetResource(null)
    } catch (err: any) {
      toast.error(`Lỗi đính kèm: ${err.message || 'Vui lòng thử lại'}`)
    } finally {
      setAttaching(false)
    }
  }

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setUploadFile(file)
      if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''))
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {notice && (
        <div
          role="status"
          className="fixed right-5 top-5 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {notice}
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Icon className="size-4" /> TeachFlow workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{view}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{descriptions[view]}</p>
        </div>
        <div className="flex items-center gap-2">
          {view === 'Tài nguyên' && (
            <button
              onClick={() => setAiImageOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100"
            >
              <Sparkles className="size-4" /> Tạo ảnh bằng AI
            </button>
          )}
          <button
            onClick={create}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {view === 'Tài nguyên' ? (
              <>
                <UploadCloud className="size-4" /> + Tải tài nguyên lên
              </>
            ) : (
              <>
                <Plus className="size-4" /> Tạo mới
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Tổng số tài nguyên"
          value={String(view === 'Tài nguyên' ? resources.length : items.length)}
          helper="Trong kho dữ liệu cá nhân"
          icon={<Icon />}
        />
        <Stat
          label="Tài liệu & Bài giảng"
          value={String(
            view === 'Tài nguyên'
              ? resources.filter((r) => ['PDF', 'WORD', 'POWERPOINT', 'EXCEL', 'TEXT'].includes(detectResourceType(r))).length
              : items.filter((item) => item.status !== 'Bản nháp').length,
          )}
          helper="PDF, Word, PPTX, Excel"
          icon={<CheckCircle2 />}
        />
        <Stat
          label="Đa phương tiện"
          value={String(
            view === 'Tài nguyên'
              ? resources.filter((r) => ['IMAGE', 'VIDEO', 'AUDIO'].includes(detectResourceType(r))).length
              : items.filter((item) => item.status === 'Bản nháp').length,
          )}
          helper="Hình ảnh, Audio & Video"
          icon={<Sparkles />}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') loadData()
            }}
            placeholder={`Tìm kiếm trong ${view.toLowerCase()}...`}
            className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>

        {view === 'Tài nguyên' ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Filter className="my-3 size-4 text-muted-foreground" />
            {[
              { label: 'Tất cả', value: 'ALL' },
              { label: 'Tài liệu (PDF/Word)', value: 'DOCUMENT' },
              { label: 'Hình ảnh', value: 'IMAGE' },
              { label: 'Audio / Âm thanh', value: 'AUDIO' },
              { label: 'Video / Clip', value: 'VIDEO' },
              { label: 'Bài giảng PPT', value: 'PRESENTATION' },
              { label: 'Bảng tính Excel', value: 'SPREADSHEET' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setResourceTypeFilter(option.value)}
                className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium transition cursor-pointer ${
                  resourceTypeFilter === option.value
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto">
            <Filter className="my-3 size-4 text-muted-foreground" />
            {['Tất cả', 'Bản nháp', 'Đang hoạt động', 'Đã lưu', 'Đã xuất bản'].map((option) => (
              <button
                key={option}
                onClick={() => setStatus(option)}
                className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm ${
                  status === option
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>Đang tải dữ liệu học liệu...</span>
        </div>
      ) : view === 'Tài nguyên' ? (
        /* Real Teaching Resources Responsive Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5 w-full">
          {filteredResources.map((res) => (
            <ResourceCard
              key={res.id}
              resource={res}
              onPreview={(target) => setSelectedResource(target)}
              onDownload={(target) => handleDownloadResource(target)}
              onAttach={(target) => {
                setAttachTargetResource(target)
                setAttachModalOpen(true)
              }}
              onDelete={(target) => handleDeleteResource(target)}
              onRename={(target) => handleStartRename(target)}
              onOpenDefault={(target) => handleOpenDefaultApp(target)}
            />
          ))}
        </div>
      ) : (
        /* Workspace Generic Modules */
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span
                  className={`grid size-11 place-items-center rounded-xl ${
                    item.tone === 'teal'
                      ? 'bg-primary/10 text-primary'
                      : item.tone === 'orange'
                      ? 'bg-orange-100 text-orange-700'
                      : item.tone === 'violet'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <Icon className="size-5" />
                </span>

                {/* Export Action for Worksheets */}
                {view === 'Phiếu học tập' ? (
                  <div className="relative">
                    <button
                      onClick={() => setExportMenuId(exportMenuId === item.id ? null : item.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <FileDown className="size-3.5" />
                      <span>Xuất</span>
                      <ChevronDown className="size-3" />
                    </button>

                    {exportMenuId === item.id && (
                      <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
                        <button
                          onClick={() => handleExportWorksheet(item, 'docx', false)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium hover:bg-muted"
                        >
                          <FileType className="size-3.5 text-blue-600" />
                          <span>Xuất Word (.docx)</span>
                        </button>
                        <button
                          onClick={() => handleExportWorksheet(item, 'pdf', false)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium hover:bg-muted"
                        >
                          <FileType className="size-3.5 text-rose-600" />
                          <span>Xuất PDF (.pdf)</span>
                        </button>
                        <div className="my-1 border-t border-border" />
                        <button
                          onClick={() => handleExportWorksheet(item, 'docx', true)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-primary hover:bg-muted"
                        >
                          <FileType className="size-3.5" />
                          <span>Word (có đáp án)</span>
                        </button>
                        <button
                          onClick={() => handleExportWorksheet(item, 'pdf', true)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-primary hover:bg-muted"
                        >
                          <FileType className="size-3.5" />
                          <span>PDF (có đáp án)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button aria-label={`Tùy chọn ${item.title}`} className="text-muted-foreground">
                    <MoreHorizontal className="size-4" />
                  </button>
                )}
              </div>

              <button onClick={() => setSelected(item)} className="mt-5 text-left">
                <h2 className="font-semibold group-hover:text-primary">{item.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{item.subtitle}</p>
              </button>

              <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-1">{item.status}</span>
                <span>{item.meta}</span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => remove(item)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Xóa
                </button>

                {exportingKey?.startsWith(item.id) && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <Loader2 className="size-3 animate-spin" /> Đang xuất...
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading &&
        ((view === 'Tài nguyên' && !filteredResources.length) ||
          (view !== 'Tài nguyên' && !filteredItems.length)) && (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <Users className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-3 font-semibold">Chưa có tài nguyên phù hợp</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {view === 'Tài nguyên'
                ? 'Nhấn nút "+ Tải tài nguyên lên" để thêm giáo án, bài giảng, hình ảnh, audio hoặc video học liệu.'
                : 'Thử thay đổi từ khóa hoặc bộ lọc.'}
            </p>
          </div>
        )}

      {/* Upload Modal for Resources */}
      {uploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-2xl sm:max-w-[720px] rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Kho học liệu số
                </p>
                <h2 className="mt-1 text-lg font-semibold">Tải lên tài nguyên dạy học</h2>
              </div>
              <button
                onClick={() => {
                  if (uploading && uploadAbortRef.current) {
                    uploadAbortRef.current.abort()
                  }
                  setUploadModalOpen(false)
                }}
                className="text-muted-foreground hover:text-foreground text-lg cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 flex flex-col gap-4">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
                  uploading
                    ? 'border-teal-400 bg-teal-50/20 pointer-events-none'
                    : dragActive
                    ? 'border-primary bg-primary/5 cursor-pointer'
                    : uploadFile
                    ? 'border-teal-400 bg-teal-50/40 cursor-pointer'
                    : 'border-border hover:border-primary/50 cursor-pointer'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0]
                      setUploadFile(file)
                      if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''))
                    }
                  }}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp,.gif,.mp3,.wav,.m4a,.aac,.mp4,.webm,.mov"
                  className="hidden"
                />

                {uploadFile ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="grid size-12 place-items-center rounded-xl bg-teal-100 text-teal-700">
                      {uploadFile.type.startsWith('video/') ? (
                        <Film className="size-6" />
                      ) : uploadFile.type.startsWith('audio/') ? (
                        <Music className="size-6" />
                      ) : uploadFile.type.startsWith('image/') ? (
                        <ImageIcon className="size-6" />
                      ) : (
                        <FileText className="size-6" />
                      )}
                    </span>
                    <p className="font-semibold text-sm text-foreground">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB · {uploadFile.type || 'Tập tin'}
                    </p>
                    {!uploading && (
                      <span className="text-[11px] text-teal-700 font-semibold underline mt-1">
                        Nhấn để chọn tệp khác
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <UploadCloud className="size-6" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      Kéo thả tập tin vào đây hoặc <span className="text-primary underline">duyệt tệp</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-md">
                      Hỗ trợ: 📄 Tài liệu (PDF, Word, Excel, PPTX, TXT), 🖼️ Ảnh (JPG, PNG, WEBP, GIF), 🎵 Audio (MP3, WAV, M4A, AAC), 🎬 Video (MP4, WEBM, MOV)
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="space-y-1.5 rounded-xl bg-slate-50 p-3.5 border border-teal-100">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5 text-teal-700">
                      <Loader2 className="size-3.5 animate-spin" /> Đang tải lên và xử lý...
                    </span>
                    <span className="font-mono text-teal-800">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-linear-to-r from-teal-500 to-emerald-500 transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Tên hiển thị học liệu
                </label>
                <input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Ví dụ: Phiếu bài tập Toán tuần 3, Bài hát khởi động, Video thí nghiệm..."
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary"
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Mô tả / Ghi chú sư phạm
                </label>
                <textarea
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  rows={2}
                  placeholder="Ghi chú cách sử dụng tài nguyên trong tiết học..."
                  className="w-full rounded-xl border border-border p-3 text-xs outline-none focus:border-primary"
                  disabled={uploading}
                />
              </div>

              <div className="mt-2 flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => {
                    if (uploading && uploadAbortRef.current) {
                      uploadAbortRef.current.abort()
                    }
                    setUploadModalOpen(false)
                  }}
                  className="rounded-xl border px-4 py-2 text-sm cursor-pointer"
                >
                  {uploading ? 'Hủy tải lên' : 'Hủy'}
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> {uploadProgress}%
                    </>
                  ) : (
                    <>
                      <UploadCloud className="size-4" /> Tải lên ngay
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Resource Modal */}
      {renameModalOpen && renameTargetResource && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Cập nhật tài nguyên
                </p>
                <h2 className="mt-1 text-base font-semibold">Đổi tên học liệu</h2>
              </div>
              <button onClick={() => setRenameModalOpen(false)} className="text-muted-foreground cursor-pointer">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleRenameSubmit} className="mt-4 flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Tên hiển thị mới
                </label>
                <input
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setRenameModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-sm cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={renaming || !renameName.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 cursor-pointer"
                >
                  {renaming ? <Loader2 className="size-4 animate-spin" /> : null} Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach to Lesson Plan Modal */}
      {attachModalOpen && attachTargetResource && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-lg sm:max-w-[540px] rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
                  Liên kết tài nguyên
                </p>
                <h2 className="mt-1 text-base font-semibold">Gắn vào giáo án giảng dạy</h2>
              </div>
              <button
                onClick={() => {
                  setAttachModalOpen(false)
                  setAttachTargetResource(null)
                }}
                className="text-muted-foreground hover:text-foreground text-lg cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs">
              <p className="font-semibold text-foreground">{attachTargetResource.name}</p>
              <p className="text-muted-foreground mt-0.5">
                {attachTargetResource.formattedSize} · {attachTargetResource.extension}
              </p>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">
                Chọn giáo án muốn đính kèm:
              </label>

              {lessonPlans.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Chưa có giáo án nào. Hãy tạo giáo án trước.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {lessonPlans.map((plan) => (
                    <button
                      key={plan.id}
                      disabled={attaching}
                      onClick={() => handleAttachToLessonPlan(plan.id!)}
                      className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left hover:border-teal-400 hover:bg-teal-50/50 transition cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-foreground truncate">{plan.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {plan.subjectName || plan.subject || 'Môn học'} · {plan.gradeName || plan.grade || 'Khối'}
                        </p>
                      </div>
                      <BookOpen className="size-4 text-teal-600 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setAttachModalOpen(false)
                  setAttachTargetResource(null)
                }}
                className="rounded-xl border px-4 py-2 text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource In-Browser Preview Modal */}
      {selectedResource && (
        <ResourcePreviewModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onDownload={() => handleDownloadResource(selectedResource)}
          onOpenDefault={() => handleOpenDefaultApp(selectedResource)}
          onAttach={() => {
            setAttachTargetResource(selectedResource)
            setSelectedResource(null)
            setAttachModalOpen(true)
          }}
          onDelete={() => {
            const target = selectedResource
            setSelectedResource(null)
            handleDeleteResource(target)
          }}
        />
      )}

      {/* Generic Item Detail Modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-2xl sm:max-w-[720px] rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Chi tiết nội dung
                </p>
                <h2 className="mt-2 text-xl font-semibold">{selected.title}</h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Đóng chi tiết"
                className="text-muted-foreground hover:text-foreground text-lg cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="mt-5 grid gap-3 rounded-xl bg-muted/60 p-4 text-sm">
              <p>
                <b>Phạm vi:</b> {selected.subtitle}
              </p>
              <p>
                <b>Trạng thái:</b> {selected.status}
              </p>
              <p>
                <b>Thông tin:</b> {selected.meta}
              </p>
            </div>

            {view === 'Phiếu học tập' && (
              <div className="mt-4 rounded-xl border border-border p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                  Tùy chọn xuất file
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExportWorksheet(selected, 'docx', false)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium hover:bg-muted cursor-pointer"
                  >
                    <FileType className="size-3.5 text-blue-600" />
                    <span>Xuất Word</span>
                  </button>
                  <button
                    onClick={() => handleExportWorksheet(selected, 'pdf', false)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium hover:bg-muted cursor-pointer"
                  >
                    <FileType className="size-3.5 text-rose-600" />
                    <span>Xuất PDF</span>
                  </button>
                  <button
                    onClick={() => handleExportWorksheet(selected, 'docx', true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100 cursor-pointer"
                  >
                    <FileType className="size-3.5" />
                    <span>Word (có đáp án)</span>
                  </button>
                  <button
                    onClick={() => handleExportWorksheet(selected, 'pdf', true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100 cursor-pointer"
                  >
                    <FileType className="size-3.5" />
                    <span>PDF (có đáp án)</span>
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setSelected(null)}
                className="rounded-xl border px-4 py-2 text-sm cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {aiImageOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-600">AI</p>
                <h2 className="mt-1 text-base font-semibold">✨ Tạo ảnh bằng AI</h2>
              </div>
              <button onClick={() => setAiImageOpen(false)} className="text-muted-foreground cursor-pointer"><X className="size-5" /></button>
            </div>
            <div className="mt-4 grid gap-3 text-xs">
              <textarea
                rows={3}
                value={aiImagePrompt}
                onChange={(e) => setAiImagePrompt(e.target.value)}
                placeholder="Mô tả ảnh minh họa..."
                className="w-full rounded-xl border p-3"
              />
              <input
                value={aiImageStyle}
                onChange={(e) => setAiImageStyle(e.target.value)}
                placeholder="Phong cách"
                className="h-10 rounded-xl border px-3"
              />
              <select
                value={aiImageRatio}
                onChange={(e) => setAiImageRatio(e.target.value)}
                className="h-10 rounded-xl border px-3"
              >
                <option value="1:1">Tỷ lệ 1:1</option>
                <option value="4:3">Tỷ lệ 4:3</option>
                <option value="16:9">Tỷ lệ 16:9</option>
                <option value="3:4">Tỷ lệ 3:4</option>
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setAiImageOpen(false)} className="rounded-xl border px-4 py-2 text-sm cursor-pointer" disabled={aiImageGenerating}>Hủy</button>
              <button
                disabled={aiImageGenerating}
                onClick={async () => {
                  if (!aiImagePrompt.trim()) {
                    toast.error('Vui lòng nhập mô tả ảnh')
                    return
                  }
                  setAiImageGenerating(true)
                  try {
                    toast.info('AI đang tạo ảnh...')
                    const result = await generateImage({
                      prompt: aiImagePrompt.trim(),
                      style: aiImageStyle,
                      aspectRatio: aiImageRatio,
                      purpose: 'resource',
                    })
                    toast.success(`Đã lưu ảnh: ${result.name || result.fileName}`)
                    setAiImageOpen(false)
                    setAiImagePrompt('')
                    loadData()
                  } catch (err: any) {
                    toast.error(err?.message || 'Không thể tạo ảnh lúc này')
                  } finally {
                    setAiImageGenerating(false)
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                {aiImageGenerating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {aiImageGenerating ? 'AI đang tạo nội dung...' : 'Tạo ảnh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  helper,
  icon,
}: {
  label: string
  value: string
  helper: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
      </div>
    </div>
  )
}
