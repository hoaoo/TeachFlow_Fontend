'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import {
  Search, Plus, Sparkles, Filter, MoreHorizontal, Copy, Edit2,
  Trash2, Eye, BookOpen, Clock, Layers, Award, Tag, Check,
  Loader2, AlertCircle, WandSparkles, Play, Gamepad2, ArrowRight,
  HelpCircle, UserCheck, Lock, Globe, RefreshCw, X, ChevronRight
} from 'lucide-react'
import {
  getLibraryActivities, getLibraryActivityById, createLibraryActivity,
  updateLibraryActivity, deleteLibraryActivity, duplicateLibraryActivity,
  addLibraryActivityToLessonPlan, type LibraryActivity
} from '@/services/activity-service'
import { getLessonPlans, type LessonPlan } from '@/services/lesson-service'
import { generateActivity, type GeneratedActivity } from '@/services/ai-service'
import { useAuth } from '@/context/auth-context'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GameCreatorModal } from '@/components/games/game-creator-modal'
import { GameRenderer } from '@/components/games/game-renderer'
import { GamePayload } from '@/components/games/game-types'

const ACTIVITY_TYPES = [
  'Tất cả',
  'Khởi động',
  'Khám phá',
  'Hình thành kiến thức',
  'Luyện tập',
  'Thực hành',
  'Vận dụng',
  'Trò chơi',
  'Hoạt động nhóm',
  'Phiếu học tập',
  'Plickers',
  'Quiz',
  'Sơ đồ tư duy',
  'Khác',
]

const SUBJECT_OPTIONS = [
  'Tất cả',
  'Toán',
  'Tiếng Việt',
  'Khoa học',
  'Lịch sử & Địa lí',
  'Đạo đức',
  'Tin học',
  'Công nghệ',
  'Hoạt động trải nghiệm',
]

const GRADE_OPTIONS = ['Tất cả', 'Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5']

const METHOD_OPTIONS = [
  'Tất cả',
  'Thảo luận nhóm',
  'Trực quan',
  'Trò chơi học tập',
  'Giải quyết vấn đề',
  'Dạy học hợp tác',
  'Vấn đáp',
  'Đóng vai',
  'Thực hành luyện tập',
]

const TECHNIQUE_OPTIONS = [
  'Tất cả',
  'Think-Pair-Share',
  'Khăn trải bàn',
  'Mảnh ghép',
  'Sơ đồ tư duy',
  'Tia chớp',
  'Động não',
  'Bể cá',
  'Kĩ thuật 3-2-1',
  'Phỏng vấn nhanh',
]

export function LibraryView({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const { user } = useAuth()

  const [activities, setActivities] = useState<LibraryActivity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filters
  const [keyword, setKeyword] = useState('')
  const [scope, setScope] = useState<'ALL' | 'MINE' | 'SYSTEM'>('ALL')
  const [selectedType, setSelectedType] = useState('Tất cả')
  const [selectedSubject, setSelectedSubject] = useState('Tất cả')
  const [selectedGrade, setSelectedGrade] = useState('Tất cả')
  const [selectedMethod, setSelectedMethod] = useState('Tất cả')
  const [selectedTechnique, setSelectedTechnique] = useState('Tất cả')
  const [page, setPage] = useState(1)

  // Dialog targets
  const [viewDetailTarget, setViewDetailTarget] = useState<LibraryActivity | null>(null)
  const [createEditTarget, setCreateEditTarget] = useState<LibraryActivity | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<LibraryActivity | null>(null)
  const [addToLessonTarget, setAddToLessonTarget] = useState<LibraryActivity | null>(null)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [gameCreatorOpen, setGameCreatorOpen] = useState(false)
  const [playGamePayload, setPlayGamePayload] = useState<GamePayload | null>(null)

  const reqSeqRef = useRef(0)

  // Load activities
  const loadData = useCallback(async () => {
    const seq = ++reqSeqRef.current
    setLoading(true)
    setError(null)
    try {
      const res = await getLibraryActivities({
        keyword: keyword.trim() || undefined,
        scope,
        type: selectedType !== 'Tất cả' ? selectedType : undefined,
        subject: selectedSubject !== 'Tất cả' ? selectedSubject : undefined,
        grade: selectedGrade !== 'Tất cả' ? selectedGrade : undefined,
        method: selectedMethod !== 'Tất cả' ? selectedMethod : undefined,
        technique: selectedTechnique !== 'Tất cả' ? selectedTechnique : undefined,
        page,
        limit: 24,
      })
      if (seq === reqSeqRef.current) {
        setActivities(res.items || [])
        setTotalCount(res.total || 0)
      }
    } catch (err: any) {
      if (seq === reqSeqRef.current) {
        setError(err?.message || 'Không thể tải danh sách hoạt động')
        setActivities([])
      }
    } finally {
      if (seq === reqSeqRef.current) {
        setLoading(false)
      }
    }
  }, [keyword, scope, selectedType, selectedSubject, selectedGrade, selectedMethod, selectedTechnique, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDuplicate = async (act: LibraryActivity) => {
    try {
      toast.info('Đang nhân bản hoạt động...')
      const dup = await duplicateLibraryActivity(act.id)
      setActivities((prev) => [dup, ...prev])
      toast.success(`Đã nhân bản "${act.title}" thành công`)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi nhân bản hoạt động')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteLibraryActivity(deleteTarget.id)
      setActivities((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      toast.success('Đã xóa hoạt động khỏi thư viện')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa hoạt động')
    }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-600">
            <BookOpen className="size-4" /> Kho tài nguyên
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Thư viện hoạt động
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tạo, khám phá và tái sử dụng các hoạt động dạy học tương tác cho kế hoạch bài dạy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => setGameCreatorOpen(true)}
            className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 gap-1.5 shadow-2xs font-semibold"
          >
            <Gamepad2 className="size-4 text-amber-600" /> Tạo trò chơi
          </Button>
          <Button
            variant="outline"
            onClick={() => setAiModalOpen(true)}
            className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 gap-1.5 shadow-2xs font-semibold"
          >
            <Sparkles className="size-4 text-violet-600" /> Tạo bằng AI
          </Button>
          <Button
            onClick={() => {
              setCreateEditTarget(null)
              setIsCreating(true)
            }}
            className="bg-teal-600 hover:bg-teal-700 gap-1.5 shadow-sm font-semibold"
          >
            <Plus className="size-4" /> Tạo hoạt động
          </Button>
        </div>
      </div>

      {/* Scope switch & Search Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Scope Pills */}
          <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
            <button
              onClick={() => { setScope('ALL'); setPage(1) }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                scope === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất cả ({totalCount})
            </button>
            <button
              onClick={() => { setScope('MINE'); setPage(1) }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                scope === 'MINE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Của tôi
            </button>
            <button
              onClick={() => { setScope('SYSTEM'); setPage(1) }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                scope === 'SYSTEM' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Hệ thống mẫu
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
              placeholder="Tìm hoạt động theo tên, mô tả, từ khóa..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs sm:text-sm outline-none focus:border-teal-400 shadow-2xs"
            />
            {keyword && (
              <button
                onClick={() => { setKeyword(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Loại hoạt động"
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs"
            value={selectedType}
            onChange={(e) => { setSelectedType(e.target.value); setPage(1) }}
          >
            {ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>{t === 'Tất cả' ? 'Tất cả loại hoạt động' : t}</option>
            ))}
          </select>

          <select
            aria-label="Môn học"
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs"
            value={selectedSubject}
            onChange={(e) => { setSelectedSubject(e.target.value); setPage(1) }}
          >
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s === 'Tất cả' ? 'Tất cả môn' : s}</option>
            ))}
          </select>

          <select
            aria-label="Khối lớp"
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs"
            value={selectedGrade}
            onChange={(e) => { setSelectedGrade(e.target.value); setPage(1) }}
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g === 'Tất cả' ? 'Tất cả khối lớp' : g}</option>
            ))}
          </select>

          <select
            aria-label="Phương pháp"
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs"
            value={selectedMethod}
            onChange={(e) => { setSelectedMethod(e.target.value); setPage(1) }}
          >
            {METHOD_OPTIONS.map((m) => (
              <option key={m} value={m}>{m === 'Tất cả' ? 'Tất cả phương pháp' : m}</option>
            ))}
          </select>

          <select
            aria-label="Kĩ thuật"
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-2xs"
            value={selectedTechnique}
            onChange={(e) => { setSelectedTechnique(e.target.value); setPage(1) }}
          >
            {TECHNIQUE_OPTIONS.map((k) => (
              <option key={k} value={k}>{k === 'Tất cả' ? 'Tất cả kĩ thuật' : k}</option>
            ))}
          </select>

          {(selectedType !== 'Tất cả' || selectedSubject !== 'Tất cả' || selectedGrade !== 'Tất cả' || selectedMethod !== 'Tất cả' || selectedTechnique !== 'Tất cả' || keyword) && (
            <button
              onClick={() => {
                setSelectedType('Tất cả')
                setSelectedSubject('Tất cả')
                setSelectedGrade('Tất cả')
                setSelectedMethod('Tất cả')
                setSelectedTechnique('Tất cả')
                setKeyword('')
                setPage(1)
              }}
              className="text-xs text-rose-600 hover:underline font-semibold px-1"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="size-8 animate-spin text-teal-600" />
          <span className="text-sm font-medium">Đang tải thư viện hoạt động...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-xs">
          <AlertCircle className="mx-auto size-8 text-rose-500 mb-2" />
          <p className="text-sm font-semibold text-rose-900">{error}</p>
          <Button onClick={loadData} size="sm" className="mt-3 bg-rose-600 hover:bg-rose-700 text-white">
            Thử lại
          </Button>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 rounded-2xl border border-dashed border-slate-200 bg-white p-8">
          <div className="grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-600">
            <Gamepad2 className="size-7" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-800 text-base">Chưa có hoạt động nào phù hợp</p>
            <p className="text-xs text-slate-500 mt-1">
              Thử thay đổi từ khóa tìm kiếm hoặc tạo hoạt động mới bằng AI.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setAiModalOpen(true)} variant="outline" className="border-violet-200 text-violet-700">
              <Sparkles className="size-4" /> Tạo với AI
            </Button>
            <Button
              onClick={() => {
                setCreateEditTarget(null)
                setIsCreating(true)
              }}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="size-4" /> Tạo hoạt động
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((a) => {
            const isGame = a.type === 'Trò chơi' || a.typeName === 'Trò chơi'
            const isSystem = a.isSystem || !a.teacherId
            const currentTeacherId = user?.teacher?.id || (user as any)?.teacherId
            const isOwner = a.isOwner || (a.teacherId && currentTeacherId && a.teacherId === currentTeacherId)

            return (
              <div
                key={a.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-200">
                      {a.type || 'Hoạt động'}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="size-3.5" />
                      <span>{a.durationMinutes || 10} phút</span>
                    </div>
                  </div>

                  {/* Title & Subject */}
                  <h3
                    onClick={() => setViewDetailTarget(a)}
                    className="mt-3 font-bold text-slate-900 text-base leading-snug cursor-pointer hover:text-teal-700 transition"
                  >
                    {a.title}
                  </h3>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {[a.subject, a.grade].filter(Boolean).join(' · ')}
                  </p>

                  {/* Objective / Description */}
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {a.objective || a.description || 'Hoạt động tương tác hỗ trợ phát triển năng lực học sinh.'}
                  </p>

                  {/* Pedagogical pills */}
                  {(a.method || a.technique) && (
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      {a.method && (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600 font-medium truncate max-w-[180px]">
                          {a.method}
                        </span>
                      )}
                      {a.technique && (
                        <span className="rounded bg-violet-50 px-2 py-0.5 text-violet-700 font-medium border border-violet-100 truncate max-w-[180px]">
                          {a.technique}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer & Actions */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    {isSystem ? (
                      <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                        <Lock className="size-3" /> Mẫu hệ thống
                      </span>
                    ) : (
                      <span className="text-teal-700 font-medium">Của tôi</span>
                    )}
                    <span>· {a.uses ?? 0} lượt dùng</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {(isGame || a.questionsJson) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const payload: GamePayload = (a.questionsJson as any)?.gameType
                            ? (a.questionsJson as any)
                            : {
                                gameType: 'QUIZ',
                                title: a.title,
                                quizItems: [
                                  {
                                    question: `Nội dung cốt lõi của hoạt động: "${a.title}"?`,
                                    options: ['Phát triển tư duy & hợp tác', 'Ghi nhớ máy móc', 'Hoạt động cá nhân', 'Luyện viết nhanh'],
                                    correctAnswer: 'Phát triển tư duy & hợp tác',
                                    explanation: a.objective || 'Mục tiêu phẩm chất năng lực GDPT',
                                  },
                                ],
                              };
                          setPlayGamePayload(payload);
                        }}
                        className="text-xs h-7 gap-1 text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 font-bold"
                        title="Chạy trò chơi (Máy chiếu)"
                      >
                        <Play className="size-3 fill-amber-600 text-amber-600" /> Chơi
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewDetailTarget(a)}
                      className="size-8 p-0 text-slate-500 hover:text-teal-700"
                      title="Xem chi tiết"
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddToLessonTarget(a)}
                      className="text-xs h-7 gap-1 text-teal-700 border-teal-200 hover:bg-teal-50 font-semibold"
                      title="Thêm snapshot vào giáo án"
                    >
                      <Plus className="size-3" /> Giáo án
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDuplicate(a)}
                      className="size-8 p-0 text-slate-400 hover:text-slate-600"
                      title="Nhân bản hoạt động"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    {isOwner && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setCreateEditTarget(a)
                            setIsCreating(false)
                          }}
                          className="size-8 p-0 text-slate-400 hover:text-slate-600"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(a)}
                          className="size-8 p-0 text-slate-400 hover:text-rose-600"
                          title="Xóa hoạt động"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: View Activity Detail */}
      <ActivityDetailModal
        target={viewDetailTarget}
        onClose={() => setViewDetailTarget(null)}
        onAddToLessonPlan={(act) => {
          setViewDetailTarget(null)
          setAddToLessonTarget(act)
        }}
      />

      {/* Modal: Create or Edit Activity */}
      <CreateEditActivityModal
        open={isCreating || !!createEditTarget}
        target={createEditTarget}
        onClose={() => {
          setIsCreating(false)
          setCreateEditTarget(null)
        }}
        onSaved={() => {
          setIsCreating(false)
          setCreateEditTarget(null)
          loadData()
        }}
      />

      {/* Modal: Add to Lesson Plan (Snapshot Copy) */}
      <AddToLessonPlanModal
        target={addToLessonTarget}
        onClose={() => setAddToLessonTarget(null)}
        onNavigate={onNavigate}
      />

      {/* Modal: AI Activity Generator */}
      <AiLibraryActivityModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSaved={() => {
          setAiModalOpen(false)
          loadData()
        }}
      />

      {/* Modal: Game Creator */}
      <GameCreatorModal
        open={gameCreatorOpen}
        onOpenChange={setGameCreatorOpen}
        onGameCreated={() => {
          setGameCreatorOpen(false)
          loadData()
        }}
      />

      {/* Modal: Interactive Game Player / Projector */}
      <Dialog open={!!playGamePayload} onOpenChange={(val) => !val && setPlayGamePayload(null)}>
        <DialogContent className="max-w-4xl p-2 sm:p-4 bg-slate-950 border-slate-800 text-white">
          {playGamePayload && (
            <GameRenderer
              payload={playGamePayload}
              onFinish={(score, total) => {
                toast.success(`Hoàn thành trò chơi! Đạt ${score}/${total} điểm.`);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(val) => !val && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa hoạt động</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa hoạt động "{deleteTarget?.title}" khỏi thư viện cá nhân?
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-slate-500 my-2">
            Các giáo án đã chèn hoạt động này trước đây sẽ không bị ảnh hưởng do hoạt động được lưu dạng snapshot độc lập.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete}>Xác nhận xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Modal: View Activity Detail ──────────────────────────────────────────────
function ActivityDetailModal({
  target,
  onClose,
  onAddToLessonPlan,
}: {
  target: LibraryActivity | null
  onClose: () => void
  onAddToLessonPlan: (act: LibraryActivity) => void
}) {
  if (!target) return null

  return (
    <Dialog open={!!target} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 border border-teal-200">
              {target.type || 'Hoạt động'}
            </span>
            <span className="text-xs text-slate-400">⏱ {target.durationMinutes} phút</span>
          </div>
          <DialogTitle className="text-lg font-bold text-slate-900 mt-1">
            {target.title}
          </DialogTitle>
          <DialogDescription className="text-xs font-medium text-slate-500">
            {[target.subject, target.grade].filter(Boolean).join(' · ')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 my-3 text-xs leading-relaxed text-slate-700">
          {target.objective && (
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <strong className="text-slate-900 block mb-0.5">🎯 Mục tiêu hoạt động:</strong>
              <p>{target.objective}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs">
            {target.method && (
              <div className="rounded-lg border p-2.5">
                <span className="font-semibold text-slate-500 block text-[11px]">Phương pháp dạy học:</span>
                <span className="font-medium text-slate-900">{target.method}</span>
              </div>
            )}
            {target.technique && (
              <div className="rounded-lg border p-2.5">
                <span className="font-semibold text-slate-500 block text-[11px]">Kĩ thuật dạy học:</span>
                <span className="font-medium text-violet-700">{target.technique}</span>
              </div>
            )}
            {target.equipment && (
              <div className="rounded-lg border p-2.5 col-span-2">
                <span className="font-semibold text-slate-500 block text-[11px]">Thiết bị / Chuẩn bị:</span>
                <span className="font-medium text-slate-800">{target.equipment}</span>
              </div>
            )}
          </div>

          {target.gameRules && (
            <div className="rounded-xl bg-amber-50/70 p-3.5 border border-amber-200">
              <strong className="text-amber-900 block mb-1">🎮 Luật chơi & Cách tiến hành:</strong>
              <p className="text-amber-950 whitespace-pre-line leading-relaxed">{target.gameRules}</p>
            </div>
          )}

          {/* 2-Column teacher vs student */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5">
              <strong className="text-teal-900 block mb-1 font-bold">Hoạt động của Giáo viên:</strong>
              <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                {target.teacherActivity || 'GV hướng dẫn và điều phối hoạt động.'}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
              <strong className="text-blue-900 block mb-1 font-bold">Hoạt động của Học sinh:</strong>
              <p className="text-slate-800 whitespace-pre-line leading-relaxed">
                {target.studentActivity || 'HS tham gia hoạt động theo hướng dẫn.'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t flex justify-between sm:justify-between items-center">
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
          <Button
            size="sm"
            onClick={() => onAddToLessonPlan(target)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1.5"
          >
            <Plus className="size-4" /> Thêm vào giáo án
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: Create or Edit Activity ───────────────────────────────────────────
function CreateEditActivityModal({
  open,
  target,
  onClose,
  onSaved,
}: {
  open: boolean
  target: LibraryActivity | null
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Trò chơi')
  const [subject, setSubject] = useState('Toán')
  const [grade, setGrade] = useState('Lớp 4')
  const [durationMinutes, setDurationMinutes] = useState(10)
  const [objective, setObjective] = useState('')
  const [method, setMethod] = useState('')
  const [technique, setTechnique] = useState('')
  const [equipment, setEquipment] = useState('')
  const [teacherActivity, setTeacherActivity] = useState('')
  const [studentActivity, setStudentActivity] = useState('')
  const [gameRules, setGameRules] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (target) {
        setTitle(target.title || '')
        setType(target.type || 'Trò chơi')
        setSubject(target.subject || 'Toán')
        setGrade(target.grade || 'Lớp 4')
        setDurationMinutes(target.durationMinutes || 10)
        setObjective(target.objective || '')
        setMethod(target.method || '')
        setTechnique(target.technique || '')
        setEquipment(target.equipment || '')
        setTeacherActivity(target.teacherActivity || '')
        setStudentActivity(target.studentActivity || '')
        setGameRules(target.gameRules || '')
        setDescription(target.description || '')
      } else {
        setTitle('')
        setType('Trò chơi')
        setSubject('Toán')
        setGrade('Lớp 4')
        setDurationMinutes(10)
        setObjective('')
        setMethod('Trò chơi học tập')
        setTechnique('Think-Pair-Share')
        setEquipment('')
        setTeacherActivity('')
        setStudentActivity('')
        setGameRules('')
        setDescription('')
      }
    }
  }, [open, target])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Vui lòng nhập tên hoạt động'); return }
    setSubmitting(true)
    try {
      const payload: Partial<LibraryActivity> = {
        title: title.trim(),
        type,
        subject,
        grade,
        durationMinutes,
        objective: objective.trim() || undefined,
        method: method.trim() || undefined,
        technique: technique.trim() || undefined,
        equipment: equipment.trim() || undefined,
        teacherActivity: teacherActivity.trim() || undefined,
        studentActivity: studentActivity.trim() || undefined,
        gameRules: gameRules.trim() || undefined,
        description: description.trim() || undefined,
      }

      if (target) {
        await updateLibraryActivity(target.id, payload)
        toast.success('Đã cập nhật hoạt động thành công')
      } else {
        await createLibraryActivity(payload)
        toast.success('Đã thêm hoạt động vào thư viện')
      }
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu hoạt động')
    } finally {
      setSubmitting(false)
    }
  }

  const isGame = type === 'Trò chơi' || type === 'Plickers' || type === 'Quiz'

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{target ? 'Chỉnh sửa hoạt động' : 'Tạo hoạt động mới'}</DialogTitle>
          <DialogDescription>
            {target ? 'Cập nhật cấu trúc và phương pháp hoạt động trong thư viện.' : 'Thêm hoạt động học tập tương tác tái sử dụng cho giáo án.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold">Tên hoạt động *</Label>
            <Input
              className="mt-1"
              placeholder="VD: Trò chơi Bingo phân số"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs font-semibold">Loại hoạt động *</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {ACTIVITY_TYPES.filter((t) => t !== 'Tất cả').map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Môn học</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {SUBJECT_OPTIONS.filter((s) => s !== 'Tất cả').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Khối lớp</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                {GRADE_OPTIONS.filter((g) => g !== 'Tất cả').map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Thời lượng (p)</Label>
              <Input
                type="number"
                min={2}
                max={45}
                className="mt-1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 10)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Mục tiêu hoạt động</Label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
              placeholder="Học sinh nhận biết và vận dụng..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Phương pháp dạy học</Label>
              <Input
                className="mt-1"
                placeholder="VD: Trò chơi học tập"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Kĩ thuật dạy học</Label>
              <Input
                className="mt-1"
                placeholder="VD: Tia chớp, Mảnh ghép"
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Thiết bị / Chuẩn bị</Label>
              <Input
                className="mt-1"
                placeholder="VD: Bảng phụ, thẻ số"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
              />
            </div>
          </div>

          {isGame && (
            <div>
              <Label className="text-xs font-semibold text-amber-900">Luật chơi & Cách thức tiến hành</Label>
              <textarea
                rows={2}
                className="mt-1 w-full rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                placeholder="Quy tắc tính điểm, điều kiện thắng cuộc..."
                value={gameRules}
                onChange={(e) => setGameRules(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-teal-800">Hoạt động của Giáo viên</Label>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
                placeholder="GV hướng dẫn, giao nhiệm vụ..."
                value={teacherActivity}
                onChange={(e) => setTeacherActivity(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-blue-800">Hoạt động của Học sinh</Label>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-blue-400"
                placeholder="HS lắng nghe, thảo luận, thực hành..."
                value={studentActivity}
                onChange={(e) => setStudentActivity(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700 font-semibold">
              {submitting && <Loader2 className="size-3.5 animate-spin mr-1" />}
              {target ? 'Lưu thay đổi' : 'Tạo hoạt động'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: Add to Lesson Plan (Snapshot Copy) ─────────────────────────────────
function AddToLessonPlanModal({
  target,
  onClose,
  onNavigate,
}: {
  target: LibraryActivity | null
  onClose: () => void
  onNavigate?: (view: any) => void
}) {
  const [plans, setPlans] = useState<LessonPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  useEffect(() => {
    if (target) {
      setLoading(true)
      getLessonPlans()
        .then(setPlans)
        .catch(() => setPlans([]))
        .finally(() => setLoading(false))
    }
  }, [target])

  if (!target) return null

  const handleAdd = async (planId: string, planTitle: string) => {
    setSubmittingId(planId)
    try {
      await addLibraryActivityToLessonPlan(target.id, planId)
      toast.success(`Đã thêm hoạt động vào giáo án "${planTitle}"`, {
        action: onNavigate ? {
          label: 'Mở giáo án',
          onClick: () => onNavigate('Giáo án'),
        } : undefined,
      })
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi thêm hoạt động vào giáo án')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Thêm hoạt động vào Giáo án</DialogTitle>
          <DialogDescription>
            Chọn giáo án để sao chép bản snapshot của "{target.title}".
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[220px] my-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-teal-600" />
            </div>
          ) : plans.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Bạn chưa có giáo án nào để chèn. Hãy tạo giáo án trước.
            </div>
          ) : (
            plans.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 rounded-xl transition"
              >
                <div>
                  <p className="font-bold text-slate-900">{p.title}</p>
                  <p className="text-slate-500 mt-0.5">
                    {p.subject} · {p.grade} {p.date ? `· ${new Date(p.date + 'T00:00:00').toLocaleDateString('vi-VN')}` : ''}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAdd(p.id!, p.title)}
                  disabled={submittingId !== null}
                  className="text-xs bg-teal-600 hover:bg-teal-700 font-semibold"
                >
                  {submittingId === p.id ? (
                    <Loader2 className="size-3.5 animate-spin mr-1" />
                  ) : (
                    <Plus className="size-3.5 mr-1" />
                  )}
                  Thêm vào
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal: AI Activity Generator for Library ─────────────────────────────────
function AiLibraryActivityModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [phase, setPhase] = useState('Trò chơi')
  const [subject, setSubject] = useState('Toán')
  const [grade, setGrade] = useState('Lớp 4')
  const [lessonTitle, setLessonTitle] = useState('')
  const [duration, setDuration] = useState(10)
  const [requirement, setRequirement] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generated, setGenerated] = useState<GeneratedActivity | null>(null)

  useEffect(() => {
    if (open) {
      setPhase('Trò chơi')
      setSubject('Toán')
      setGrade('Lớp 4')
      setLessonTitle('')
      setDuration(10)
      setRequirement('')
      setGenerated(null)
    }
  }, [open])

  const handleGenerate = async () => {
    if (!lessonTitle.trim()) {
      toast.error('Vui lòng nhập tên bài học hoặc chủ đề')
      return
    }
    setLoading(true)
    setGenerated(null)
    try {
      const gradeNum = parseInt(grade.replace(/\D/g, ''), 10) || 4
      const result = await generateActivity({
        grade: gradeNum,
        subject,
        lessonTitle: lessonTitle.trim(),
        activityType: phase,
        durationMinutes: duration,
        requirement: requirement.trim() || undefined,
      })
      setGenerated(result)
      toast.success('AI đã tạo hoạt động thành công! Xem trước bên dưới.')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo hoạt động bằng AI lúc này')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveToLibrary = async () => {
    if (!generated) return
    setSaving(true)
    try {
      await createLibraryActivity({
        title: generated.title,
        type: phase,
        subject,
        grade,
        durationMinutes: generated.durationMinutes || duration,
        objective: generated.objective,
        method: (generated.methods || []).join(', ') || undefined,
        technique: (generated.techniques || []).join(', ') || undefined,
        competencies: (generated.competencies || []).join(', ') || undefined,
        qualities: (generated.qualities || []).join(', ') || undefined,
        teacherActivity: generated.teacherActivity,
        studentActivity: generated.studentActivity,
        description: generated.objective,
        isPublic: true,
      })
      toast.success('Đã lưu hoạt động vào Thư viện thành công')
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu vào thư viện')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[580px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Sparkles className="size-5 text-violet-600" /> Trợ lý AI thiết kế hoạt động
          </DialogTitle>
          <DialogDescription>
            AI tự động biên soạn hoạt động tương tác, phương pháp sư phạm và nội dung 2 cột GV/HS.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold">Loại hoạt động</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
              >
                <option value="Trò chơi">Trò chơi học tập</option>
                <option value="Khởi động">Khởi động tạo hứng thú</option>
                <option value="Khám phá">Khám phá kiến thức mới</option>
                <option value="Luyện tập">Luyện tập / Thực hành</option>
                <option value="Vận dụng">Vận dụng / Mở rộng</option>
                <option value="Hoạt động nhóm">Hoạt động nhóm</option>
                <option value="Plickers">Plickers / Quiz</option>
                <option value="Sơ đồ tư duy">Sơ đồ tư duy</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Môn học</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {SUBJECT_OPTIONS.filter((s) => s !== 'Tất cả').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Khối lớp</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-2.5 text-xs"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                {GRADE_OPTIONS.filter((g) => g !== 'Tất cả').map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Tên bài học / Chủ đề *</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="VD: Phân số bằng nhau, Từ đồng nghĩa, Năng lượng mặt trời..."
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Yêu cầu sư phạm bổ sung (tùy chọn)</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="VD: Áp dụng kĩ thuật khăn trải bàn, tăng tính vận động..."
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-1.5 mt-1"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <WandSparkles className="size-4" />
            )}
            {loading ? 'AI đang tư duy và biên soạn hoạt động...' : 'Bắt đầu thiết kế với AI'}
          </Button>

          {/* Preview result */}
          {generated && (
            <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-violet-900">{generated.title}</span>
                <span className="text-xs text-violet-700 font-medium">{generated.durationMinutes} phút</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                🎯 <strong>Mục tiêu:</strong> {generated.objective}
              </p>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-violet-100">
                  <strong className="text-teal-800 block mb-1">Hoạt động Giáo viên:</strong>
                  <p className="text-slate-700 leading-relaxed">{generated.teacherActivity}</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-violet-100">
                  <strong className="text-blue-800 block mb-1">Hoạt động Học sinh:</strong>
                  <p className="text-slate-700 leading-relaxed">{generated.studentActivity}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-violet-200/80">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="text-xs h-8 gap-1"
                >
                  <RefreshCw className="size-3" /> Tạo lại
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveToLibrary}
                  disabled={saving}
                  className="text-xs h-8 bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1"
                >
                  {saving && <Loader2 className="size-3.5 animate-spin" />}
                  <Check className="size-3.5" /> Lưu vào Thư viện
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
