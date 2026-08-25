'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import {
  Download,
  FileText,
  Filter,
  MoreHorizontal,
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
} from 'lucide-react'
import {
  deleteWorkspaceRecord,
  listWorkspaceRecords,
  saveWorkspaceRecord,
  type WorkspaceRecord,
} from '@/services/teachflow-service'
import {
  getResources,
  uploadResourceFile,
  deleteResource as apiDeleteResource,
  downloadResourceFile,
  attachResourceToLessonPlan,
  type TeachingResource,
} from '@/services/resource-service'
import { getLessonPlans, type LessonPlan } from '@/services/lesson-service'
import { exportService } from '@/services/export-service'
import { generateImage } from '@/services/ai-service'
import { toast } from 'sonner'

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
  'Tài nguyên': 'Lưu trữ, tải lên và quản lý kho học liệu số dùng cho các tiết dạy.',
  'Cài đặt': 'Cá nhân hóa workspace, thông báo và thông tin giáo viên.',
  'Phiếu học tập': 'Quản lý phiếu bài tập, câu hỏi và tài liệu học tập.',
}

function getResourceIcon(type: string, ext?: string) {
  if (type === 'VIDEO' || ext === 'MP4') return <Film className="size-5 text-purple-600" />
  if (type === 'IMAGE' || ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext || ''))
    return <ImageIcon className="size-5 text-emerald-600" />
  if (type === 'PRESENTATION' || ['PPT', 'PPTX'].includes(ext || ''))
    return <Presentation className="size-5 text-orange-600" />
  if (type === 'SPREADSHEET' || ['XLS', 'XLSX'].includes(ext || ''))
    return <TableIcon className="size-5 text-green-600" />
  return <FileText className="size-5 text-blue-600" />
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
  const [uploadSubject, setUploadSubject] = useState('Tiếng Việt')
  const [uploading, setUploading] = useState(false)
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
          search: query || undefined,
          resourceType: resourceTypeFilter !== 'ALL' ? resourceTypeFilter : undefined,
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
  }, [view, resourceTypeFilter])

  // Load lesson plans when attach modal opens
  useEffect(() => {
    if (attachModalOpen) {
      getLessonPlans().then(setLessonPlans)
    }
  }, [attachModalOpen])

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (status === 'Tất cả' || item.status === status) &&
          `${item.title} ${item.subtitle} ${item.meta}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [items, query, status],
  )

  const filteredResources = useMemo(
    () =>
      resources.filter(
        (r) =>
          `${r.name} ${r.title} ${r.subtitle} ${r.description} ${r.originalFileName}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [resources, query],
  )

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

  // Upload handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      toast.error('Vui lòng chọn tập tin để tải lên')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', uploadFile)
      if (uploadName.trim()) formData.append('name', uploadName.trim())
      if (uploadDesc.trim()) formData.append('description', uploadDesc.trim())

      toast.info('Đang tải lên tập tin và phân tích học liệu...')
      const newRes = await uploadResourceFile(formData)
      toast.success(`Đã tải lên thành công: ${newRes.name}`)

      setUploadModalOpen(false)
      setUploadFile(null)
      setUploadName('')
      setUploadDesc('')
      setResources((prev) => [newRes, ...prev])
    } catch (err: any) {
      toast.error(`Lỗi tải lên: ${err.message || 'Vui lòng thử lại'}`)
    } finally {
      setUploading(false)
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
                <UploadCloud className="size-4" /> Tải lên tài nguyên
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
          label="Tổng số"
          value={String(view === 'Tài nguyên' ? resources.length : items.length)}
          helper="Trong kho dữ liệu"
          icon={<Icon />}
        />
        <Stat
          label="Tài liệu & Bài giảng"
          value={String(
            view === 'Tài nguyên'
              ? resources.filter((r) => ['DOCUMENT', 'PRESENTATION'].includes(r.resourceType)).length
              : items.filter((item) => item.status !== 'Bản nháp').length,
          )}
          helper="Sẵn sàng giảng dạy"
          icon={<CheckCircle2 />}
        />
        <Stat
          label="Đa phương tiện"
          value={String(
            view === 'Tài nguyên'
              ? resources.filter((r) => ['IMAGE', 'VIDEO'].includes(r.resourceType)).length
              : items.filter((item) => item.status === 'Bản nháp').length,
          )}
          helper="Hình ảnh & Video"
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
          <div className="flex gap-2 overflow-x-auto">
            <Filter className="my-3 size-4 text-muted-foreground" />
            {[
              { label: 'Tất cả', value: 'ALL' },
              { label: 'Văn bản (PDF/Word)', value: 'DOCUMENT' },
              { label: 'Bài giảng PPT', value: 'PRESENTATION' },
              { label: 'Bảng tính Excel', value: 'SPREADSHEET' },
              { label: 'Hình ảnh', value: 'IMAGE' },
              { label: 'Video', value: 'VIDEO' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setResourceTypeFilter(option.value)}
                className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-medium ${
                  resourceTypeFilter === option.value
                    ? 'border-primary bg-primary/10 text-primary'
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
        /* Real Teaching Resources Grid */
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredResources.map((res) => (
            <article
              key={res.id}
              className="group relative rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  {getResourceIcon(res.resourceType, res.extension)}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownloadResource(res)}
                    title="Tải xuống tệp tin"
                    className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Download className="size-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setAttachTargetResource(res)
                      setAttachModalOpen(true)
                    }}
                    title="Gắn vào giáo án"
                    className="grid size-8 place-items-center rounded-lg border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
                  >
                    <Link2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedResource(res)}
                className="mt-4 text-left w-full"
              >
                <h2 className="font-semibold text-foreground group-hover:text-primary line-clamp-1">
                  {res.name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                  {res.originalFileName || res.subtitle}
                </p>
                {res.description && (
                  <p className="mt-2 text-xs text-slate-500 line-clamp-2 leading-4">
                    {res.description}
                  </p>
                )}
              </button>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium uppercase">
                  {res.extension || res.resourceType}
                </span>
                <span>{res.formattedSize || '0 KB'}</span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button
                  onClick={() => handleDeleteResource(res)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Xóa
                </button>
                <button
                  onClick={() => setSelectedResource(res)}
                  className="text-xs text-primary hover:underline"
                >
                  Xem chi tiết
                </button>
              </div>
            </article>
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
                ? 'Nhấn nút "Tải lên tài nguyên" để thêm giáo án, bài giảng hoặc học liệu số.'
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
          <div className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Kho học liệu số
                </p>
                <h2 className="mt-1 text-lg font-semibold">Tải lên tài nguyên dạy học</h2>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg"
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
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : uploadFile
                    ? 'border-teal-400 bg-teal-50/40'
                    : 'border-border hover:border-primary/50'
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
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.mp4"
                  className="hidden"
                />

                {uploadFile ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="grid size-12 place-items-center rounded-xl bg-teal-100 text-teal-700">
                      <File className="size-6" />
                    </span>
                    <p className="font-semibold text-sm text-foreground">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB · Nhấn để đổi tệp khác
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
                      <UploadCloud className="size-6" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      Kéo thả tập tin vào đây hoặc <span className="text-primary underline">duyệt tệp</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Hỗ trợ PDF, Word, PPTX, Excel, PNG, JPG, MP4 (Tài liệu: 50MB, Trình chiếu: 100MB, Video: 500MB, Ảnh: 20MB)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Tên hiển thị học liệu
                </label>
                <input
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Ví dụ: Phiếu bài tập Toán tuần 3, Bài giảng Powerpoint..."
                  className="h-10 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary"
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
                />
              </div>

              <div className="mt-2 flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Đang tải lên...
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

      {/* Attach to Lesson Plan Modal */}
      {attachModalOpen && attachTargetResource && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl">
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
                className="text-muted-foreground hover:text-foreground text-lg"
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
                      className="flex w-full items-center justify-between rounded-xl border border-border p-3 text-left hover:border-teal-400 hover:bg-teal-50/50 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-foreground truncate">{plan.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {plan.subject} · {plan.grade}
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
                className="rounded-xl border px-4 py-2 text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resource Detail Modal */}
      {selectedResource && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-start justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-muted">
                  {getResourceIcon(selectedResource.resourceType, selectedResource.extension)}
                </span>
                <div>
                  <h2 className="text-base font-semibold text-foreground">{selectedResource.name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedResource.originalFileName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedResource(null)}
                className="text-muted-foreground hover:text-foreground text-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 rounded-xl bg-muted/60 p-4 text-xs">
              <p>
                <b>Loại học liệu:</b> {selectedResource.resourceType} ({selectedResource.extension})
              </p>
              <p>
                <b>Dung lượng:</b> {selectedResource.formattedSize} ({selectedResource.size} bytes)
              </p>
              <p>
                <b>MIME type:</b> {selectedResource.mimeType || 'application/octet-stream'}
              </p>
              {selectedResource.description && (
                <p>
                  <b>Mô tả:</b> {selectedResource.description}
                </p>
              )}
              <p className="text-muted-foreground">
                Tải lên lúc {new Date(selectedResource.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="mt-5 flex justify-between gap-2">
              <button
                onClick={() => handleDeleteResource(selectedResource)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="size-3.5" /> Xóa tệp
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setAttachTargetResource(selectedResource)
                    setSelectedResource(null)
                    setAttachModalOpen(true)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-100"
                >
                  <Link2 className="size-3.5" /> Gắn vào giáo án
                </button>
                <button
                  onClick={() => handleDownloadResource(selectedResource)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Download className="size-3.5" /> Tải về máy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generic Item Detail Modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl border bg-background p-6 shadow-xl">
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
                className="text-muted-foreground hover:text-foreground text-lg"
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium hover:bg-muted"
                  >
                    <FileType className="size-3.5 text-blue-600" />
                    <span>Xuất Word</span>
                  </button>
                  <button
                    onClick={() => handleExportWorksheet(selected, 'pdf', false)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-2 text-xs font-medium hover:bg-muted"
                  >
                    <FileType className="size-3.5 text-rose-600" />
                    <span>Xuất PDF</span>
                  </button>
                  <button
                    onClick={() => handleExportWorksheet(selected, 'docx', true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100"
                  >
                    <FileType className="size-3.5" />
                    <span>Word (có đáp án)</span>
                  </button>
                  <button
                    onClick={() => handleExportWorksheet(selected, 'pdf', true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 py-2 text-xs font-medium text-teal-700 hover:bg-teal-100"
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
                className="rounded-xl border px-4 py-2 text-sm"
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
              <button onClick={() => setAiImageOpen(false)} className="text-muted-foreground"><X className="size-5" /></button>
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
              <button onClick={() => setAiImageOpen(false)} className="rounded-xl border px-4 py-2 text-sm" disabled={aiImageGenerating}>Hủy</button>
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
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
