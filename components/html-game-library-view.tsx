'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  CheckCircle2,
  Code2,
  Edit2,
  Eye,
  Gamepad2,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getGrades, type GradeOption } from '@/services/classroom-service'
import { getLessonPlans, type LessonPlan } from '@/services/lesson-service'
import { getSubjects, type SubjectOption } from '@/services/teaching-assignment-service'
import {
  attachHtmlGameCustomizationToLessonPlan,
  attachHtmlGameToLessonPlan,
  createOrGetHtmlGameCustomization,
  createHtmlGame,
  deleteHtmlGame,
  getHtmlGamePlay,
  getHtmlGameCustomizationPlay,
  getHtmlGames,
  updateHtmlGame,
  updateHtmlGameStatus,
  uploadHtmlGameSource,
  uploadHtmlGamePackage,
  type HtmlGame,
  type HtmlGamePayload,
  type HtmlGamePlay,
  type HtmlGameStatus,
} from '@/services/html-game-service'
import { GamePlayer } from '@/components/html-games/game-player'
import { HtmlGameQuestionEditor } from '@/components/html-games/html-game-question-editor'

type GameForm = {
  title: string
  description: string
  thumbnailUrl: string
  thumbnailAlt: string
  gradeId: string
  subjectId: string
  supportsQuestionConfig: boolean
}

const EMPTY_FORM: GameForm = {
  title: '',
  description: '',
  thumbnailUrl: '',
  thumbnailAlt: '',
  gradeId: '',
  subjectId: '',
  supportsQuestionConfig: false,
}

const STATUS_LABELS: Record<HtmlGameStatus, string> = {
  DRAFT: 'Bản nháp',
  PUBLISHED: 'Đã xuất bản',
  DISABLED: 'Đã vô hiệu hóa',
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function statusClasses(status: HtmlGameStatus) {
  if (status === 'PUBLISHED') return 'bg-emerald-100 text-emerald-700'
  if (status === 'DISABLED') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-100 text-slate-600'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function payloadFromForm(form: GameForm): HtmlGamePayload {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    thumbnail: form.thumbnailUrl.trim()
      ? { url: form.thumbnailUrl.trim(), alt: form.thumbnailAlt.trim() || undefined }
      : null,
    gradeId: form.gradeId || null,
    subjectId: form.subjectId || null,
    supportsQuestionConfig: form.supportsQuestionConfig,
    configSchemaVersion: form.supportsQuestionConfig ? 1 : null,
  }
}

function formFromGame(game: HtmlGame): GameForm {
  return {
    title: game.title,
    description: game.description || '',
    thumbnailUrl: game.thumbnail?.url || '',
    thumbnailAlt: game.thumbnail?.alt || '',
    gradeId: game.gradeId || '',
    subjectId: game.subjectId || '',
    supportsQuestionConfig: game.supportsQuestionConfig,
  }
}

export function HtmlGameLibraryView() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [games, setGames] = useState<HtmlGame[]>([])
  const [grades, setGrades] = useState<GradeOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [gradeId, setGradeId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [status, setStatus] = useState<HtmlGameStatus | ''>('')
  const [refreshKey, setRefreshKey] = useState(0)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<HtmlGame | null>(null)
  const [form, setForm] = useState<GameForm>(EMPTY_FORM)
  const [packageFile, setPackageFile] = useState<File | null>(null)
  const [contentMode, setContentMode] = useState<'FILE' | 'SOURCE'>('FILE')
  const [sourceHtml, setSourceHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [detail, setDetail] = useState<HtmlGame | null>(null)
  const [play, setPlay] = useState<HtmlGamePlay | null>(null)
  const [playLoading, setPlayLoading] = useState(false)
  const [attachGame, setAttachGame] = useState<HtmlGame | null>(null)
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([])
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState('')
  const [attachLoading, setAttachLoading] = useState(false)
  const [questionTarget, setQuestionTarget] = useState<{ mode: 'ADMIN' | 'TEACHER'; id: string; title: string } | null>(null)

  const loadGames = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHtmlGames({
        search: search.trim() || undefined,
        gradeId: gradeId || undefined,
        subjectId: subjectId || undefined,
        status: isAdmin && status ? status : undefined,
      })
      setGames(data)
    } catch (err: any) {
      setGames([])
      setError(err?.message || 'Không thể tải thư viện trò chơi HTML')
    } finally {
      setLoading(false)
    }
  }, [gradeId, isAdmin, search, status, subjectId])

  useEffect(() => {
    const timer = window.setTimeout(loadGames, 250)
    return () => window.clearTimeout(timer)
  }, [loadGames, refreshKey])

  useEffect(() => {
    Promise.all([getGrades(), getSubjects()])
      .then(([gradeList, subjectList]) => {
        setGrades(gradeList.filter((grade) => UUID_PATTERN.test(grade.id)))
        setSubjects(subjectList.filter((subject) => UUID_PATTERN.test(subject.id)))
      })
      .catch(() => {
        setGrades([])
        setSubjects([])
      })
  }, [])

  const visibleCount = useMemo(
    () => games.filter((game) => game.status === 'PUBLISHED').length,
    [games],
  )

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setPackageFile(null)
    setContentMode('FILE')
    setSourceHtml('')
    setFormOpen(true)
  }

  const openEdit = (game: HtmlGame) => {
    setEditing(game)
    setForm(formFromGame(game))
    setPackageFile(null)
    setContentMode('FILE')
    setSourceHtml('')
    setFormOpen(true)
  }

  const saveGame = async () => {
    if (!form.title.trim()) {
      toast.error('Vui lòng nhập tên trò chơi')
      return
    }
    setSaving(true)
    try {
      const saved = editing
        ? await updateHtmlGame(editing.id, payloadFromForm(form))
        : await createHtmlGame(payloadFromForm(form))
      if (contentMode === 'FILE' && packageFile) await uploadHtmlGamePackage(saved.id, packageFile)
      if (contentMode === 'SOURCE' && sourceHtml.trim()) await uploadHtmlGameSource(saved.id, sourceHtml)
      toast.success(editing ? 'Đã cập nhật trò chơi' : 'Đã tạo trò chơi ở trạng thái bản nháp')
      setFormOpen(false)
      setRefreshKey((value) => value + 1)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể lưu trò chơi')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (game: HtmlGame, nextStatus: HtmlGameStatus) => {
    setBusyId(game.id)
    try {
      await updateHtmlGameStatus(game.id, nextStatus)
      toast.success(`Đã chuyển sang trạng thái “${STATUS_LABELS[nextStatus]}”`)
      setRefreshKey((value) => value + 1)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật trạng thái')
    } finally {
      setBusyId(null)
    }
  }

  const removeGame = async (game: HtmlGame) => {
    if (!window.confirm(`Xóa vĩnh viễn trò chơi “${game.title}” và toàn bộ gói HTML/ZIP?`)) return
    setBusyId(game.id)
    try {
      await deleteHtmlGame(game.id)
      toast.success('Đã xóa trò chơi')
      setRefreshKey((value) => value + 1)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xóa trò chơi')
    } finally {
      setBusyId(null)
    }
  }

  const openPlay = async (game: HtmlGame) => {
    setPlayLoading(true)
    try {
      setPlay(
        !isAdmin && game.customizationId
          ? await getHtmlGameCustomizationPlay(game.customizationId)
          : await getHtmlGamePlay(game.id),
      )
    } catch (err: any) {
      toast.error(err?.message || 'Trò chơi chưa có gói HTML hợp lệ')
    } finally {
      setPlayLoading(false)
    }
  }

  const previewSource = () => {
    if (!sourceHtml.trim()) {
      toast.error('Vui lòng dán mã HTML trước khi preview')
      return
    }
    const playUrl = URL.createObjectURL(new Blob([sourceHtml], { type: 'text/html' }))
    setPlay({
      id: 'source-preview',
      title: form.title || 'Preview mã HTML',
      playUrl,
      sandbox: 'allow-scripts',
      referrerPolicy: 'no-referrer',
      supportsQuestionConfig: false,
      configSchemaVersion: null,
    })
  }

  const closePlay = () => {
    if (play?.playUrl.startsWith('blob:')) URL.revokeObjectURL(play.playUrl)
    setPlay(null)
  }

  const openCustomization = async (game: HtmlGame) => {
    setBusyId(game.id)
    try {
      const customization = await createOrGetHtmlGameCustomization(game.id)
      setGames((current) => current.map((item) => item.id === game.id ? { ...item, customizationId: customization.id } : item))
      setQuestionTarget({ mode: 'TEACHER', id: customization.id, title: customization.title || game.title })
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo bản tùy chỉnh')
    } finally {
      setBusyId(null)
    }
  }

  const openAttach = async (game: HtmlGame) => {
    setAttachGame(game)
    setSelectedLessonPlanId('')
    setAttachLoading(true)
    try {
      const plans = await getLessonPlans()
      setLessonPlans(plans.filter((plan) => Boolean(plan.id)))
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải danh sách giáo án')
      setLessonPlans([])
    } finally {
      setAttachLoading(false)
    }
  }

  const attachToLessonPlan = async () => {
    if (!attachGame || !selectedLessonPlanId) return
    setAttachLoading(true)
    try {
      if (attachGame.customizationId) {
        await attachHtmlGameCustomizationToLessonPlan(selectedLessonPlanId, attachGame.customizationId)
      } else {
        await attachHtmlGameToLessonPlan(selectedLessonPlanId, attachGame.id)
      }
      toast.success('Đã gắn trò chơi vào giáo án')
      setAttachGame(null)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể gắn trò chơi vào giáo án')
    } finally {
      setAttachLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
            <Gamepad2 className="size-4" /> {isAdmin ? 'Quản trị nội dung' : 'Học liệu tương tác'}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Trò chơi HTML
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isAdmin
              ? 'Tạo, tải gói HTML/ZIP, xem thử và kiểm soát trạng thái xuất bản.'
              : 'Khám phá trò chơi đã xuất bản, chơi ngay hoặc gắn vào giáo án của bạn.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
            <Plus className="size-4" /> Tạo trò chơi
          </Button>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <label className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên hoặc mô tả..."
            className="pl-9"
          />
        </label>
        <select
          value={gradeId}
          onChange={(event) => setGradeId(event.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-500"
          aria-label="Lọc theo khối"
        >
          <option value="">Tất cả khối</option>
          {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
        </select>
        <select
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-500"
          aria-label="Lọc theo môn"
        >
          <option value="">Tất cả môn</option>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
        </select>
        {isAdmin ? (
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as HtmlGameStatus | '')}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-500"
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        ) : (
          <div className="flex h-9 items-center justify-between rounded-lg bg-teal-50 px-3 text-xs font-semibold text-teal-700">
            <span>Đã xuất bản</span><span>{visibleCount}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
          <Loader2 className="size-6 animate-spin text-teal-600" /> Đang tải thư viện...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
          <XCircle className="mx-auto size-9 text-rose-500" />
          <p className="mt-3 text-sm font-medium text-rose-800">{error}</p>
          <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => setRefreshKey((value) => value + 1)}>
            <RefreshCw className="size-3.5" /> Thử lại
          </Button>
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Gamepad2 className="mx-auto size-12 text-slate-300" />
          <h2 className="mt-4 font-semibold text-slate-800">Chưa có trò chơi phù hợp</h2>
          <p className="mt-1 text-sm text-slate-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <article key={game.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative flex aspect-[16/8] items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
                {game.thumbnail?.url ? (
                  <img src={game.thumbnail.url} alt={game.thumbnail.alt || game.title} className="size-full object-cover" />
                ) : (
                  <Gamepad2 className="size-14 text-teal-300" />
                )}
                {isAdmin && (
                  <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClasses(game.status)}`}>
                    {STATUS_LABELS[game.status]}
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="flex min-h-14 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-900">{game.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                      {game.description || 'Trò chơi tương tác HTML.'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
                  {game.grade && <span className="rounded-full bg-slate-100 px-2.5 py-1">{game.grade.name}</span>}
                  {game.subject && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{game.subject.name}</span>}
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Button size="sm" onClick={() => openPlay(game)} disabled={playLoading} className="gap-1.5">
                    <Gamepad2 className="size-3.5" /> {isAdmin ? 'Xem thử' : 'Chơi ngay'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDetail(game)} className="gap-1.5">
                    <Info className="size-3.5" /> Xem chi tiết
                  </Button>
                  {!isAdmin && (
                    <>
                      {game.supportsQuestionConfig && (
                        <Button size="sm" variant="outline" disabled={busyId === game.id} onClick={() => openCustomization(game)} className="gap-1.5 text-violet-700">
                          <Edit2 className="size-3.5" /> Tùy chỉnh
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openAttach(game)} className="gap-1.5">
                        <BookOpen className="size-3.5" /> Gắn {game.customizationId ? 'bản tùy chỉnh' : 'vào giáo án'}
                      </Button>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEdit(game)} className="gap-1.5">
                        <Edit2 className="size-3.5" /> Sửa
                      </Button>
                      {game.supportsQuestionConfig && (
                        <Button size="sm" variant="outline" onClick={() => setQuestionTarget({ mode: 'ADMIN', id: game.id, title: game.title })} className="gap-1.5 text-violet-700">
                          <Code2 className="size-3.5" /> Câu hỏi mặc định
                        </Button>
                      )}
                      {game.status !== 'PUBLISHED' ? (
                        <Button size="sm" variant="outline" disabled={busyId === game.id} onClick={() => changeStatus(game, 'PUBLISHED')} className="gap-1.5 text-emerald-700">
                          <Send className="size-3.5" /> Xuất bản
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled={busyId === game.id} onClick={() => changeStatus(game, 'DISABLED')} className="gap-1.5 text-amber-700">
                          <XCircle className="size-3.5" /> Vô hiệu hóa
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={busyId === game.id} onClick={() => removeGame(game)} className="gap-1.5 text-rose-600">
                        <Trash2 className="size-3.5" /> Xóa
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Chỉnh sửa trò chơi HTML' : 'Tạo trò chơi HTML'}</DialogTitle>
            <DialogDescription>Metadata được lưu trước; gói chạy chỉ nhận một tệp HTML hoặc ZIP có index.html ở thư mục gốc.</DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 gap-4 overflow-y-auto py-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="game-title">Tên trò chơi *</Label>
              <Input id="game-title" maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 sm:col-span-2">
              <input type="checkbox" checked={form.supportsQuestionConfig} onChange={(event) => setForm({ ...form, supportsQuestionConfig: event.target.checked })} className="mt-0.5 size-4" />
              <span><b className="block text-sm text-violet-900">TeachFlow configurable game</b><span className="text-xs leading-5 text-violet-700">Chỉ bật khi game tích hợp runtime bridge. Game legacy vẫn chơi được nhưng không có chỉnh sửa câu hỏi.</span></span>
            </label>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="game-description">Mô tả</Label>
              <textarea id="game-description" maxLength={5000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" />
            </div>
            <div className="space-y-2">
              <Label>Khối lớp</Label>
              <select value={form.gradeId} onChange={(event) => setForm({ ...form, gradeId: event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                <option value="">Không giới hạn</option>
                {grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Môn học</Label>
              <select value={form.subjectId} onChange={(event) => setForm({ ...form, subjectId: event.target.value })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                <option value="">Không giới hạn</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail-url">URL ảnh bìa</Label>
              <Input id="thumbnail-url" type="url" placeholder="https://..." value={form.thumbnailUrl} onChange={(event) => setForm({ ...form, thumbnailUrl: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="thumbnail-alt">Mô tả ảnh bìa</Label>
              <Input id="thumbnail-alt" maxLength={200} value={form.thumbnailAlt} onChange={(event) => setForm({ ...form, thumbnailAlt: event.target.value })} />
            </div>
            <div className="space-y-3 sm:col-span-2">
              <Label>Nội dung trò chơi</Label>
              <div className="inline-flex rounded-lg bg-slate-100 p-1 text-sm"><button type="button" onClick={() => setContentMode('FILE')} className={`rounded-md px-3 py-1.5 ${contentMode === 'FILE' ? 'bg-white font-semibold text-teal-700 shadow-sm' : 'text-slate-500'}`}>Tải file</button><button type="button" onClick={() => setContentMode('SOURCE')} className={`rounded-md px-3 py-1.5 ${contentMode === 'SOURCE' ? 'bg-white font-semibold text-teal-700 shadow-sm' : 'text-slate-500'}`}>Dán mã</button></div>
              {contentMode === 'FILE' ? (
                <><label htmlFor="game-package" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 hover:border-teal-400"><Upload className="size-5 text-teal-600" /><span className="min-w-0 truncate">{packageFile?.name || `${editing ? 'Thay gói (không bắt buộc)' : 'Chọn'} .html hoặc .zip (tối đa 25 MB)`}</span></label><input id="game-package" type="file" accept=".html,.zip,text/html,application/zip" className="sr-only" onChange={(event) => setPackageFile(event.target.files?.[0] || null)} /></>
              ) : (
                <div className="space-y-2"><textarea value={sourceHtml} onChange={(event) => setSourceHtml(event.target.value)} maxLength={2000000} rows={12} spellCheck={false} placeholder="<!doctype html>..." className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-5 text-emerald-300 outline-none focus:border-teal-500" /><div className="flex items-center justify-between text-xs text-slate-400"><span>{new Blob([sourceHtml]).size.toLocaleString('vi-VN')} / 2.097.152 bytes</span><Button type="button" size="sm" variant="outline" onClick={previewSource} className="gap-2"><Eye className="size-3.5" /> Preview mã</Button></div></div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>Hủy</Button>
            <Button onClick={saveGame} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {editing ? 'Lưu thay đổi' : 'Tạo bản nháp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Info className="size-4 text-teal-600" /> {detail?.title}</DialogTitle>
            <DialogDescription>Thông tin trò chơi HTML</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 overflow-y-auto py-4">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{detail.description || 'Chưa có mô tả.'}</p>
              <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-slate-400">Khối lớp</dt><dd className="mt-1 font-medium">{detail.grade?.name || 'Không giới hạn'}</dd></div>
                <div><dt className="text-xs text-slate-400">Môn học</dt><dd className="mt-1 font-medium">{detail.subject?.name || 'Không giới hạn'}</dd></div>
                {isAdmin && <div><dt className="text-xs text-slate-400">Trạng thái</dt><dd className="mt-1 font-medium">{STATUS_LABELS[detail.status]}</dd></div>}
                <div><dt className="text-xs text-slate-400">Cập nhật</dt><dd className="mt-1 font-medium">{formatDate(detail.updatedAt)}</dd></div>
              </dl>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Đóng</Button>
            {detail && <Button onClick={() => { setDetail(null); openPlay(detail) }} className="gap-2"><Gamepad2 className="size-4" /> {isAdmin ? 'Xem thử' : 'Chơi ngay'}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(play)} onOpenChange={(open) => !open && closePlay()}>
        <DialogContent size="full" className="h-[92dvh] p-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Gamepad2 className="size-4 text-teal-600" /> {play?.title}</DialogTitle>
            <DialogDescription>Nội dung chạy trong vùng cách ly; không được cấp quyền truy cập cùng nguồn.</DialogDescription>
          </DialogHeader>
          {play && <GamePlayer play={play} onExit={closePlay} />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(attachGame)} onOpenChange={(open) => !open && setAttachGame(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="size-4 text-teal-600" /> Gắn vào giáo án</DialogTitle>
            <DialogDescription>Chọn giáo án của bạn để gắn “{attachGame?.title}”. Thao tác lặp lại không tạo bản gắn trùng.</DialogDescription>
          </DialogHeader>
          <div className="py-5">
            {attachLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" /> Đang tải giáo án...</div>
            ) : lessonPlans.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Bạn chưa có giáo án để gắn trò chơi.</div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="lesson-plan-game">Giáo án</Label>
                <select id="lesson-plan-game" value={selectedLessonPlanId} onChange={(event) => setSelectedLessonPlanId(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                  <option value="">Chọn giáo án...</option>
                  {lessonPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title} · {plan.subject || 'Chưa có môn'}</option>)}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachGame(null)}>Hủy</Button>
            <Button onClick={attachToLessonPlan} disabled={!selectedLessonPlanId || attachLoading} className="gap-2">
              {attachLoading ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />} Gắn vào giáo án
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {playLoading && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/25">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-medium shadow-xl"><Loader2 className="size-4 animate-spin text-teal-600" /> Đang mở trò chơi...</div>
        </div>
      )}
      <HtmlGameQuestionEditor
        target={questionTarget}
        open={Boolean(questionTarget)}
        onOpenChange={(open) => !open && setQuestionTarget(null)}
        onPreview={() => {
          if (!questionTarget) return
          setPlayLoading(true)
          const request = questionTarget.mode === 'ADMIN'
            ? getHtmlGamePlay(questionTarget.id)
            : getHtmlGameCustomizationPlay(questionTarget.id)
          request.then(setPlay).catch((err: any) => toast.error(err?.message || 'Không thể preview')).finally(() => setPlayLoading(false))
        }}
      />
    </div>
  )
}
