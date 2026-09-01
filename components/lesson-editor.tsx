'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import {
  ArrowLeft, Bot, Check, ChevronDown, Clock3, Copy, Edit2,
  Eye, FileDown, FileText, Film, Image as ImageIcon,
  Layers, Lightbulb, Link2, Loader2, MoreHorizontal, Paperclip,
  Plus, Printer, Presentation, RefreshCw, Save, Search, Sparkles,
  Table as TableIcon, Trash2, UploadCloud, UserCheck, WandSparkles,
  X, AlertCircle, CheckCircle2, ChevronUp, History, BookOpen,
  Calendar, MapPin, Download, ArrowUpDown, ShieldAlert, ArrowRight,
  Upload, FileCheck, FileSpreadsheet, ExternalLink
} from 'lucide-react'
import {
  getLessonPlans, getLessonPlanById, createLessonPlan, updateLessonPlan,
  deleteLessonPlan, duplicateLessonPlan, reorderActivities, saveActivityToLibrary,
  getLessonPlanVersions, restoreLessonPlanVersion, linkLessonPlanSchedule,
  unlinkLessonPlanSchedule, uploadLessonPlanFile, getLessonPlanFileUrl,
  downloadLessonPlanFile, type LessonPlan, type Activity, type LessonPlanVersionRecord
} from '@/services/lesson-service'
import { getClasses, type ClassRecord } from '@/services/classroom-service'
import { getLibraryActivities, type LibraryActivity } from '@/services/activity-service'
import { getSchedules, type ScheduleEntry } from '@/services/schedule-service'
import {
  generateActivity, generateLessonPlan as aiGenerateLessonPlan, generateImage,
  type GeneratedActivity, type GeneratedLessonPlan, type LessonPlanEditorDraft
} from '@/services/ai-service'
import { exportService } from '@/services/export-service'
import { useAuth } from '@/context/auth-context'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GameRenderer } from '@/components/games/game-renderer'
import { GamePayload } from '@/components/games/game-types'

// ─── Starter Templates ───────────────────────────────────────────────────────
const starterActivities: Activity[] = []

const emptyActivity = (index: number): Activity => ({
  id: `act-${Date.now()}-${index}`,
  phase: 'Khởi động',
  title: 'Hoạt động mới',
  minutes: 5,
  method: 'Thảo luận nhóm',
  technique: 'Động não',
  competencies: 'Giao tiếp và hợp tác',
  qualities: 'Chăm chỉ',
  equipment: '',
  objective: '',
  teacher: '',
  students: '',
  sortOrder: index,
})

export function computeLessonStatus(status?: string): { label: string; tone: 'slate' | 'blue' | 'teal' } {
  if (status === 'COMPLETED') return { label: 'Đã hoàn thành', tone: 'blue' }
  if (status === 'TAUGHT') return { label: 'Đã sử dụng', tone: 'teal' }
  return { label: 'Bản nháp', tone: 'slate' }
}

// ─── Main LessonView Component ────────────────────────────────────────────────
export function LessonView({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const { user } = useAuth()

  // Navigation mode: 'list' (List of lesson plans) | 'editor' (Single lesson plan editor)
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list')
  const [editorSubTab, setEditorSubTab] = useState<'edit' | 'preview'>('edit')

  // List State
  const [plans, setPlans] = useState<LessonPlan[]>([])
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClassId, setFilterClassId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Current Lesson Plan under edit
  const [lesson, setLesson] = useState<LessonPlan>({
    title: '',
    topic: '',
    subject: '',
    grade: '',
    date: new Date().toISOString().split('T')[0],
    duration: 40,
    objective: '',
    specificCompetencies: '',
    generalCompetencies: '',
    qualities: '',
    teachingEquipment: '',
    postLessonAdjustment: '',
    notes: '',
    status: 'DRAFT',
    sourceType: 'NATIVE',
    version: 1,
    activities: [],
    resources: [],
    schedules: [],
  })

  const [selectedActivityId, setSelectedActivityId] = useState<string>('')
  const [autosaveStatus, setAutosaveStatus] = useState<string>('Đã lưu')
  const [isAutosaving, setIsAutosaving] = useState(false)

  // Dialog States
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [pdfPreviewTarget, setPdfPreviewTarget] = useState<LessonPlan | null>(null)
  const [duplicateTarget, setDuplicateTarget] = useState<LessonPlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LessonPlan | null>(null)
  const [playGamePayload, setPlayGamePayload] = useState<GamePayload | null>(null)
  const [linkScheduleTarget, setLinkScheduleTarget] = useState<LessonPlan | null>(null)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false)
  const [aiDraftOpen, setAiDraftOpen] = useState(false)
  const [aiImageOpen, setAiImageOpen] = useState(false)
  const [aiOverwriteOpen, setAiOverwriteOpen] = useState(false)
  const [pendingAiDraft, setPendingAiDraft] = useState<LessonPlan | null>(null)
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false)
  const [exportingType, setExportingType] = useState<'docx' | 'pdf' | null>(null)

  const reqSeqRef = useRef(0)
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isDirtyRef = useRef(false)

  // Load lesson plan list
  const loadPlans = useCallback(async () => {
    if (!user) { setPlans([]); setLoadingList(false); return }
    const seq = ++reqSeqRef.current
    setLoadingList(true)
    setListError(null)
    try {
      const data = await getLessonPlans({
        classroomId: filterClassId || undefined,
        status: filterStatus || undefined,
        search: searchQuery.trim() || undefined,
      })
      if (seq === reqSeqRef.current) {
        setPlans(Array.isArray(data) ? data : [])
      }
    } catch (err: any) {
      if (seq === reqSeqRef.current) {
        setListError(err?.message || 'Không thể tải danh sách giáo án lúc này')
        setPlans([])
      }
    } finally {
      if (seq === reqSeqRef.current) {
        setLoadingList(false)
      }
    }
  }, [user, filterClassId, filterStatus, searchQuery])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  useEffect(() => {
    getClasses().then(setClasses).catch(() => setClasses([]))
  }, [])

  // Open single lesson plan into editor
  const handleOpenEditor = async (id: string) => {
    try {
      toast.info('Đang tải chi tiết giáo án...')
      const fullPlan = await getLessonPlanById(id)
      setLesson(fullPlan)
      if (fullPlan.activities && fullPlan.activities.length > 0) {
        setSelectedActivityId(fullPlan.activities[0].id)
      }
      setViewMode('editor')
      setEditorSubTab('edit')
      setAutosaveStatus(`Đã tải phiên bản v${fullPlan.version || 1}`)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tải giáo án')
    }
  }

  const handleOpenPreview = async (id: string) => {
    try {
      const fullPlan = await getLessonPlanById(id)
      setLesson(fullPlan)
      if (fullPlan.activities?.length) setSelectedActivityId(fullPlan.activities[0].id)
      setViewMode('editor')
      setEditorSubTab('preview')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải giáo án để xem')
    }
  }
  // Autosave mechanism (for all editable lesson plans)
  const triggerAutosave = useCallback((updatedLesson: LessonPlan) => {
    if (!updatedLesson.id) return
    isDirtyRef.current = true
    setAutosaveStatus('Đang lưu...')

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(async () => {
      if (!isDirtyRef.current) return
      setIsAutosaving(true)
      try {
        const saved = await updateLessonPlan(updatedLesson.id!, {
          title: updatedLesson.title,
          topic: updatedLesson.topic,
          subject: updatedLesson.subject,
          grade: updatedLesson.grade,
          date: updatedLesson.date,
          duration: updatedLesson.duration,
          objective: updatedLesson.objective,
          specificCompetencies: updatedLesson.specificCompetencies,
          generalCompetencies: updatedLesson.generalCompetencies,
          qualities: updatedLesson.qualities,
          teachingEquipment: updatedLesson.teachingEquipment,
          postLessonAdjustment: updatedLesson.postLessonAdjustment,
          notes: updatedLesson.notes,
          status: updatedLesson.status,
          version: updatedLesson.version,
          activities: updatedLesson.activities,
        })
        isDirtyRef.current = false
        setLesson(saved)
        const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setAutosaveStatus(`Đã lưu tự động lúc ${timeStr} (v${saved.version || 1})`)
      } catch (err: any) {
        const msg = err?.message || ''
        if (msg.includes('phiên') || msg.includes('cập nhật') || err?.status === 409) {
          setAutosaveStatus('Xung đột phiên bản (Vui lòng tải lại)')
          toast.error('Giáo án đã được thay đổi ở một phiên khác. Vui lòng tải lại trước khi lưu.')
        } else {
          setAutosaveStatus('Lưu thất bại (vui lòng thử lại)')
          toast.error(msg || 'Lỗi lưu tự động giáo án')
        }
      } finally {
        setIsAutosaving(false)
      }
    }, 1500)
  }, [])

  const handleManualSave = async () => {
    if (!lesson.id) return
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }
    setIsAutosaving(true)
    setAutosaveStatus('Đang lưu...')
    try {
      const saved = await updateLessonPlan(lesson.id, {
        title: lesson.title,
        topic: lesson.topic,
        subject: lesson.subject,
        grade: lesson.grade,
        date: lesson.date,
        duration: lesson.duration,
        objective: lesson.objective,
        specificCompetencies: lesson.specificCompetencies,
        generalCompetencies: lesson.generalCompetencies,
        qualities: lesson.qualities,
        teachingEquipment: lesson.teachingEquipment,
        postLessonAdjustment: lesson.postLessonAdjustment,
        notes: lesson.notes,
        status: lesson.status,
        version: lesson.version,
        activities: lesson.activities,
      })
      isDirtyRef.current = false
      setLesson(saved)
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setAutosaveStatus(`Đã lưu lúc ${timeStr} (v${saved.version || 1})`)
      toast.success('Đã lưu giáo án thành công!')
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg.includes('phiên') || msg.includes('cập nhật') || err?.status === 409) {
        setAutosaveStatus('Xung đột phiên bản (Vui lòng tải lại)')
        toast.error('Giáo án đã được thay đổi ở một phiên khác. Vui lòng tải lại trước khi lưu.')
      } else {
        setAutosaveStatus('Lưu thất bại')
        toast.error(msg || 'Lỗi khi lưu giáo án')
      }
    } finally {
      setIsAutosaving(false)
    }
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current && viewMode === 'editor') {
        e.preventDefault()
        e.returnValue = 'Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?'
        return e.returnValue
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [viewMode])

  const handleBackToList = () => {
    if (isDirtyRef.current) {
      const confirmed = window.confirm('Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?')
      if (!confirmed) return
    }
    isDirtyRef.current = false
    setViewMode('list')
    loadPlans()
  }

  // Update top-level lesson field
  const updateLessonField = (key: keyof LessonPlan, value: any) => {
    setLesson((prev) => {
      const next = { ...prev, [key]: value }
      triggerAutosave(next)
      return next
    })
  }

  // Update activity field
  const updateActivityField = (activityId: string, key: keyof Activity, value: any) => {
    setLesson((prev) => {
      const nextActivities = prev.activities.map((a) =>
        a.id === activityId ? { ...a, [key]: value } : a
      )
      const next = { ...prev, activities: nextActivities }
      triggerAutosave(next)
      return next
    })
  }

  // Add new activity
  const handleAddActivity = (phase: string = 'Hoạt động mới') => {
    const newAct = emptyActivity(lesson.activities.length)
    newAct.phase = phase
    setLesson((prev) => {
      const next = { ...prev, activities: [...prev.activities, newAct] }
      triggerAutosave(next)
      return next
    })
    setSelectedActivityId(newAct.id)
    toast.success('Đã thêm hoạt động mới')
  }

  // Duplicate activity
  const handleDuplicateActivity = (activityId: string) => {
    const idx = lesson.activities.findIndex((a) => a.id === activityId)
    if (idx === -1) return
    const src = lesson.activities[idx]
    const clone: Activity = {
      ...src,
      id: `act-${Date.now()}`,
      title: `${src.title} (Bản sao)`,
      sortOrder: idx + 1,
    }
    const nextList = [...lesson.activities]
    nextList.splice(idx + 1, 0, clone)
    nextList.forEach((a, i) => { a.sortOrder = i })
    setLesson((prev) => {
      const next = { ...prev, activities: nextList }
      triggerAutosave(next)
      return next
    })
    setSelectedActivityId(clone.id)
    toast.success('Đã nhân bản hoạt động')
  }

  // Remove activity
  const handleRemoveActivity = (activityId: string) => {
    if (lesson.activities.length <= 1) {
      toast.error('Giáo án cần tối thiểu 1 hoạt động')
      return
    }
    const nextList = lesson.activities.filter((a) => a.id !== activityId)
    nextList.forEach((a, i) => { a.sortOrder = i })
    setLesson((prev) => {
      const next = { ...prev, activities: nextList }
      triggerAutosave(next)
      return next
    })
    setSelectedActivityId(nextList[0]?.id || '')
    toast.success('Đã xóa hoạt động')
  }

  // Move activity up/down
  const handleMoveActivity = (activityId: string, dir: -1 | 1) => {
    const idx = lesson.activities.findIndex((a) => a.id === activityId)
    if (idx === -1) return
    const targetIdx = idx + dir
    if (targetIdx < 0 || targetIdx >= lesson.activities.length) return
    const nextList = [...lesson.activities]
    const [moved] = nextList.splice(idx, 1)
    nextList.splice(targetIdx, 0, moved)
    nextList.forEach((a, i) => { a.sortOrder = i })
    setLesson((prev) => {
      const next = { ...prev, activities: nextList }
      triggerAutosave(next)
      return next
    })
    if (lesson.id) {
      reorderActivities(lesson.id, nextList.map((a) => a.id)).catch(() => {})
    }
  }

  // Save single activity to personal library
  const handleSaveToLibrary = async (act: Activity) => {
    if (!lesson.id) {
      toast.error('Vui lòng lưu giáo án trước khi lưu hoạt động vào thư viện')
      return
    }
    try {
      await saveActivityToLibrary(lesson.id, act.id, {
        title: act.title,
        typeName: act.phase,
        subject: lesson.subject,
        grade: lesson.grade,
      })
      toast.success(`Đã lưu "${act.title}" vào thư viện hoạt động cá nhân`)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu hoạt động vào thư viện')
    }
  }

  // Export handlers
  const handleExport = async (type: 'docx' | 'pdf', targetPlan: LessonPlan = lesson) => {
    if (!targetPlan.id) {
      toast.error('Vui lòng lưu giáo án trước khi xuất file')
      return
    }

    const isPdfFile =
      targetPlan.mimeType === 'application/pdf' ||
      targetPlan.originalFileName?.toLowerCase().endsWith('.pdf')

    // If PDF uploaded plan, download original file directly
    if (targetPlan.sourceType === 'UPLOADED' && isPdfFile) {
      try {
        toast.info('Đang tải tệp PDF gốc...')
        await downloadLessonPlanFile(targetPlan.id, targetPlan.originalFileName || `${targetPlan.title}.pdf`)
        toast.success('Đã tải tệp thành công!')
      } catch (err: any) {
        toast.error(err?.message || 'Lỗi khi tải tệp PDF')
      }
      return
    }

    setExportingType(type)
    try {
      toast.info(`Đang tạo file ${type === 'docx' ? 'Microsoft Word (.docx)' : 'PDF'}...`)
      if (type === 'docx') {
        await exportService.exportLessonPlanDocx(targetPlan.id, targetPlan.title)
      } else {
        await exportService.exportLessonPlanPdf(targetPlan.id, targetPlan.title)
      }
      toast.success(`Xuất ${type === 'docx' ? 'Word' : 'PDF'} thành công!`)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xuất tài liệu')
    } finally {
      setExportingType(null)
    }
  }

  const selectedActivity =
    lesson.activities.find((a) => a.id === selectedActivityId) ||
    lesson.activities[0] ||
    emptyActivity(0)

  const totalMinutes = useMemo(
    () => lesson.activities.reduce((sum, a) => sum + (Number(a.minutes) || 0), 0),
    [lesson.activities]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: LIST VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewMode === 'list') {
    return (
      <div className="mx-auto max-w-6xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-600">
              <BookOpen className="size-4" /> Kế hoạch bài dạy
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Giáo án giảng dạy
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý, biên soạn cấu trúc KHBD chuẩn GDVN, tải lên giáo án DOCX/PDF, tích hợp Lịch dạy và Trợ lý AI.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => setAiDraftOpen(true)}
              className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 gap-1.5 shadow-2xs font-semibold"
            >
              <Sparkles className="size-4 text-violet-600" /> Tạo bằng AI
            </Button>
            <Button
              variant="outline"
              onClick={() => setUploadModalOpen(true)}
              className="border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 gap-1.5 shadow-2xs font-semibold"
            >
              <Upload className="size-4 text-teal-600" /> Tải giáo án lên
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 gap-1.5 shadow-sm font-semibold"
            >
              <Plus className="size-4" /> Tạo giáo án
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bài, chủ đề, môn học, lớp, file đính kèm..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs sm:text-sm outline-none focus:border-teal-400 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter by class */}
          <select
            aria-label="Lọc theo lớp"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs"
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
          >
            <option value="">Tất cả lớp</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Filter by status */}
          <select
            aria-label="Lọc theo trạng thái"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="TAUGHT">Đã sử dụng</option>
          </select>
        </div>

        {/* Content list */}
        {loadingList ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="size-8 animate-spin text-teal-600" />
            <span className="text-sm font-medium">Đang tải danh sách giáo án...</span>
          </div>
        ) : listError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-xs">
            <AlertCircle className="mx-auto size-8 text-rose-500 mb-2" />
            <p className="text-sm font-semibold text-rose-900">{listError}</p>
            <Button onClick={loadPlans} size="sm" className="mt-3 bg-rose-600 hover:bg-rose-700 text-white">
              Thử lại
            </Button>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400 rounded-2xl border border-dashed border-slate-200 bg-white p-8">
            <div className="grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-600">
              <BookOpen className="size-7" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-800 text-base">Chưa có giáo án nào</p>
              <p className="text-xs text-slate-500 mt-1">
                Tạo giáo án mới trực tiếp trên TeachFlow hoặc tải lên tệp DOCX / PDF có sẵn.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setUploadModalOpen(true)} variant="outline" className="border-teal-200 text-teal-700">
                <Upload className="size-4" /> Tải giáo án lên
              </Button>
              <Button onClick={() => setCreateModalOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="size-4" /> Tạo giáo án
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5">
            {plans.map((p) => {
              const statusInfo = computeLessonStatus(p.status)
              const hasLinkedSchedule = p.schedules && p.schedules.length > 0
              const isUploaded = p.sourceType === 'UPLOADED'
              const isPdf = p.mimeType?.includes('pdf') || p.originalFileName?.toLowerCase().endsWith('.pdf')

              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all"
                >
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleOpenEditor(p.id!)}
                        className="text-left font-bold text-slate-900 hover:text-teal-700 text-base truncate transition"
                      >
                        {p.title}
                      </button>

                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {p.subject} · {p.grade}
                      </span>

                      {/* Source type badge */}
                      {isUploaded ? (
                        <span
                          className={`rounded-lg px-2 py-0.5 text-[10px] font-bold border flex items-center gap-1 ${
                            isPdf
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <FileText className="size-3" />
                          {isPdf ? 'PDF' : 'DOCX'}
                        </span>
                      ) : (
                        <span className="rounded-lg bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 border border-teal-200">
                          NATIVE
                        </span>
                      )}

                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-[11px] font-semibold border ${
                          statusInfo.tone === 'blue'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : statusInfo.tone === 'teal'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {statusInfo.label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        v{p.version || 1}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3.5 text-xs text-slate-500">
                      {isUploaded ? (
                        <>
                          <span className="font-mono text-slate-600">
                            📎 {p.originalFileName || 'Tệp đính kèm'}
                            {p.fileSize ? ` (${(p.fileSize / 1024).toFixed(0)} KB)` : ''}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>⏱ {p.duration || 40} phút</span>
                          <span>📋 {p.activitiesCount ?? p.activities?.length ?? 0} hoạt động</span>
                        </>
                      )}

                      {p.date && (
                        <span>📅 Ngày dạy: {new Date(p.date + 'T00:00:00').toLocaleDateString('vi-VN')}</span>
                      )}

                      {hasLinkedSchedule ? (
                        <span className="inline-flex items-center gap-1 text-teal-700 font-medium bg-teal-50 border border-teal-200 rounded-md px-1.5 py-0.5 text-[11px]">
                          <Calendar className="size-3" /> Đã gắn lịch ({p.schedules![0].plannedDate ? new Date(p.schedules![0].plannedDate).toLocaleDateString('vi-VN') : ''} {p.schedules![0].startTime || ''})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa gắn lịch dạy</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEditor(p.id!)}
                      className="text-xs h-8 gap-1 font-semibold text-teal-700 border-teal-200 hover:bg-teal-50"
                      title="Xem và chỉnh sửa giáo án"
                    >
                      <Eye className="size-3.5" /> Xem / Sửa
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (isPdf) {
                          downloadLessonPlanFile(p.id!, p.originalFileName || `${p.title}.pdf`)
                        } else if (isUploaded) {
                          downloadLessonPlanFile(p.id!, p.originalFileName || `${p.title}.docx`)
                        } else {
                          handleExport('docx', p)
                        }
                      }}
                      className="text-xs h-8 gap-1 font-medium text-slate-700 hover:text-blue-700"
                      title="Tải xuống tệp giáo án"
                    >
                      <Download className="size-3.5" /> Tải xuống
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLinkScheduleTarget(p)}
                      className="text-xs h-8 gap-1"
                      title="Gắn hoặc đổi lịch dạy"
                    >
                      <Link2 className="size-3.5" /> Lịch dạy
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDuplicateTarget(p)}
                      className="text-xs h-8 px-2"
                      title="Nhân bản giáo án"
                    >
                      <Copy className="size-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(p)}
                      className="text-xs h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      title="Xóa giáo án"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Dialogs */}
        <CreateLessonPlanDialog
          open={createModalOpen}
          classes={classes}
          onClose={() => setCreateModalOpen(false)}
          onCreated={(created) => {
            loadPlans()
            handleOpenEditor(created.id!)
          }}
        />

        <UploadLessonPlanDialog
          open={uploadModalOpen}
          classes={classes}
          onClose={() => setUploadModalOpen(false)}
          onUploaded={(created) => {
            loadPlans()
            handleOpenEditor(created.id!)
          }}
        />

        <PdfPreviewDialog
          target={pdfPreviewTarget}
          onClose={() => setPdfPreviewTarget(null)}
        />

        <DuplicateLessonPlanDialog
          target={duplicateTarget}
          classes={classes}
          onClose={() => setDuplicateTarget(null)}
          onDuplicated={(dup) => {
            loadPlans()
            handleOpenEditor(dup.id!)
          }}
        />

        <DeleteLessonPlanDialog
          target={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null)
            loadPlans()
          }}
        />

        <LinkScheduleModal
          target={linkScheduleTarget}
          onClose={() => setLinkScheduleTarget(null)}
          onUpdated={loadPlans}
        />

        <AiFullDraftModal
          open={aiDraftOpen}
          classes={classes}
          currentLesson={null}
          onClose={() => setAiDraftOpen(false)}
          onGenerated={(draft) => {
            setLesson(draft)
            setSelectedActivityId(draft.activities[0]?.id || '')
            setViewMode('editor')
            setEditorSubTab('edit')
            setAutosaveStatus('Bản nháp AI chưa lưu')
            toast.success('AI đã đổ giáo án vào trình soạn. Hãy rà soát rồi lưu.')
          }}
        />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: EDITOR / PREVIEW VIEW
  // ═══════════════════════════════════════════════════════════════════════════
  const statusInfo = computeLessonStatus(lesson.status)

  return (
    <div className="mx-auto max-w-6xl flex flex-col gap-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="gap-1.5 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="size-4" /> Danh sách
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            {isAutosaving ? (
              <Loader2 className="size-3.5 animate-spin text-teal-600" />
            ) : (
              <CheckCircle2 className="size-3.5 text-teal-600" />
            )}
            <span className="text-slate-500 font-mono text-[11px]">{autosaveStatus}</span>
          </span>
        </div>

        {/* Status switcher & Tab toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            aria-label="Trạng thái giáo án"
            value={lesson.status}
            onChange={(e) => updateLessonField('status', e.target.value)}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 shadow-2xs"
          >
            <option value="DRAFT">📝 Bản nháp</option>
            <option value="COMPLETED">✅ Đã hoàn thành</option>
            <option value="TAUGHT">🎓 Đã sử dụng</option>
          </select>

          {/* Sub tab toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
            <button
              onClick={() => setEditorSubTab('edit')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                editorSubTab === 'edit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Chỉnh sửa
            </button>
            <button
              onClick={() => setEditorSubTab('preview')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                editorSubTab === 'preview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Xem trước
            </button>
          </div>

          <Button
            size="sm"
            onClick={handleManualSave}
            disabled={isAutosaving}
            className="bg-teal-600 hover:bg-teal-700 text-xs h-8 gap-1 font-semibold text-white shadow-2xs"
            title="Lưu giáo án"
          >
            {isAutosaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />} Lưu
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setVersionHistoryOpen(true)}
            className="text-xs h-8 gap-1"
          >
            <History className="size-3.5" /> Lịch sử (v{lesson.version || 1})
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setAiDraftOpen(true)}
            className="text-xs h-8 gap-1 border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 font-semibold"
          >
            <Sparkles className="size-3.5 text-violet-600" /> Tạo bằng AI
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAiImageOpen(true)}
            className="text-xs h-8 gap-1"
          >
            <ImageIcon className="size-3.5" /> Tạo ảnh bằng AI
          </Button>
          <Button
            size="sm"
            onClick={() => handleExport('docx')}
            disabled={exportingType !== null}
            className="bg-teal-600 hover:bg-teal-700 text-xs h-8 gap-1 font-semibold text-white"
          >
            {exportingType === 'docx' ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />} Xuất Word
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleExport('pdf')}
            disabled={exportingType !== null}
            className="text-xs h-8 gap-1 font-semibold"
          >
            {exportingType === 'pdf' ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />} Xuất PDF
          </Button>
        </div>
      </div>

      {/* Mode A: PDF Mode */}
      {lesson.mimeType === 'application/pdf' || lesson.originalFileName?.endsWith('.pdf') ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
            <AlertCircle className="size-4 shrink-0 text-amber-600" />
            <span>Tệp PDF là tài liệu định dạng cố định. Bạn có thể xem trực tiếp bên dưới, chỉnh sửa thông tin bài dạy hoặc tải xuống.</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Metadata panel */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="size-4 text-rose-600" /> Thông tin giáo án PDF
                </h3>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Tên bài dạy</Label>
                  <Input
                    value={lesson.title}
                    onChange={(e) => updateLessonField('title', e.target.value)}
                    placeholder="Nhập tên bài..."
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Môn học</Label>
                    <Input
                      value={lesson.subject}
                      onChange={(e) => updateLessonField('subject', e.target.value)}
                      placeholder="Toán..."
                      className="text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Khối lớp</Label>
                    <Input
                      value={lesson.grade}
                      onChange={(e) => updateLessonField('grade', e.target.value)}
                      placeholder="Lớp 4A..."
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Thời lượng (phút)</Label>
                    <Input
                      type="number"
                      value={lesson.duration}
                      onChange={(e) => updateLessonField('duration', parseInt(e.target.value, 10) || 40)}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Ngày dạy</Label>
                    <Input
                      type="date"
                      value={lesson.date ? lesson.date.split('T')[0] : ''}
                      onChange={(e) => updateLessonField('date', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Chủ đề / Bài học</Label>
                  <Input
                    value={lesson.topic || ''}
                    onChange={(e) => updateLessonField('topic', e.target.value)}
                    placeholder="Nhập chủ đề..."
                    className="text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Ghi chú</Label>
                  <textarea
                    rows={3}
                    value={lesson.notes || ''}
                    onChange={(e) => updateLessonField('notes', e.target.value)}
                    placeholder="Ghi chú thêm về giáo án..."
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs focus:outline-teal-500"
                  />
                </div>

                <Button
                  onClick={() => downloadLessonPlanFile(lesson.id!, lesson.originalFileName || `${lesson.title}.pdf`)}
                  className="w-full gap-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <Download className="size-3.5" /> Tải xuống tệp PDF gốc
                </Button>
              </div>
            </div>

            {/* PDF Preview Frame */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs h-[750px] flex flex-col">
              <iframe
                src={getLessonPlanFileUrl(lesson.id!)}
                className="w-full h-full rounded-xl border-none"
                title={lesson.title}
              />
            </div>
          </div>
        </div>
      ) : editorSubTab === 'preview' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 shadow-sm flex flex-col gap-6 text-slate-800 font-sans">
          {/* Header */}
          <div className="text-center pb-6 border-b border-slate-200">
            <h2 className="text-xl font-bold tracking-tight uppercase text-slate-900">
              Kế hoạch bài dạy
            </h2>
            <h3 className="text-lg font-bold text-teal-800 mt-1">
              {lesson.title}
            </h3>
            {lesson.topic && <p className="text-sm font-medium text-slate-600 mt-0.5">{lesson.topic}</p>}
            <div className="flex justify-center gap-6 text-xs text-slate-500 mt-3 font-medium">
              <span>Môn: <strong className="text-slate-800">{lesson.subject}</strong></span>
              <span>Lớp: <strong className="text-slate-800">{lesson.grade}</strong></span>
              <span>Thời lượng: <strong className="text-slate-800">{totalMinutes} phút ({lesson.activities.length} hoạt động)</strong></span>
              <span>Ngày dạy: <strong className="text-slate-800">{lesson.date ? new Date(lesson.date + 'T00:00:00').toLocaleDateString('vi-VN') : '—'}</strong></span>
            </div>
          </div>

          {/* I. Yêu cầu cần đạt */}
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-sm text-slate-900 uppercase">I. Yêu cầu cần đạt</h4>
            <div className="pl-4 space-y-1.5 text-xs text-slate-700 leading-relaxed">
              {lesson.objective && (
                <p><strong>1. Mục tiêu chung:</strong> {lesson.objective}</p>
              )}
              {lesson.specificCompetencies && (
                <p><strong>2. Năng lực đặc thù:</strong> {lesson.specificCompetencies}</p>
              )}
              {lesson.generalCompetencies && (
                <p><strong>3. Năng lực chung:</strong> {lesson.generalCompetencies}</p>
              )}
              {lesson.qualities && (
                <p><strong>4. Phẩm chất:</strong> {lesson.qualities}</p>
              )}
            </div>
          </div>

          {/* II. Đồ dùng dạy học */}
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-sm text-slate-900 uppercase">II. Đồ dùng dạy học</h4>
            <p className="pl-4 text-xs text-slate-700 leading-relaxed">
              {lesson.teachingEquipment || 'Giáo viên và học sinh chuẩn bị đầy đủ sách giáo khoa, vở ghi và đồ dùng học tập theo môn học.'}
            </p>
          </div>

          {/* III. Các hoạt động dạy học */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-sm text-slate-900 uppercase">III. Các hoạt động dạy học</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3 w-1/2 border-r border-slate-200">Hoạt động của Giáo viên</th>
                    <th className="p-3 w-1/2">Hoạt động của Học sinh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lesson.activities.map((act, i) => (
                    <tr key={act.id} className="align-top">
                      <td className="p-3 border-r border-slate-200 space-y-1">
                        <p className="font-bold text-teal-800">
                          {i + 1}. {act.phase}: {act.title} ({act.minutes} phút)
                        </p>
                        {act.objective && (
                          <p className="text-slate-500 italic">🎯 {act.objective}</p>
                        )}
                        <p className="text-slate-800 whitespace-pre-line mt-1">{act.teacher || '—'}</p>
                      </td>
                      <td className="p-3 space-y-1">
                        <p className="font-bold text-slate-700">&nbsp;</p>
                        {act.equipment && (
                          <p className="text-slate-500 italic">📦 Đồ dùng: {act.equipment}</p>
                        )}
                        <p className="text-slate-800 whitespace-pre-line mt-1">{act.students || '—'}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* IV. Điều chỉnh sau bài dạy */}
          <div className="flex flex-col gap-2">
            <h4 className="font-bold text-sm text-slate-900 uppercase">IV. Điều chỉnh sau bài dạy</h4>
            <p className="pl-4 text-xs text-slate-700 leading-relaxed italic">
              {lesson.postLessonAdjustment || 'Học sinh nắm được kiến thức trọng tâm của bài; không có điều chỉnh phát sinh.'}
            </p>
          </div>
        </div>
      ) : (
        /* Mode B: Full Interactive KHBD Editor */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar: Activity Tabs */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-slate-900">Hoạt động dạy học</h3>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                  Tổng: {totalMinutes} phút
                </span>
              </div>

              {/* Activity buttons list */}
              <div className="flex flex-col gap-2">
                {lesson.activities.map((act, index) => {
                  const isSelected = act.id === selectedActivityId
                  return (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivityId(act.id)}
                      className={`group relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/60 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                          <span className="rounded bg-slate-100 px-1.5 py-0.2">{act.phase}</span>
                          <span>{act.minutes}p</span>
                        </div>
                        <p className={`font-semibold text-xs mt-0.5 truncate ${isSelected ? 'text-teal-900' : 'text-slate-800'}`}>
                          {index + 1}. {act.title}
                        </p>
                      </div>

                      {/* Reorder up/down & actions */}
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveActivity(act.id, -1) }}
                          disabled={index === 0}
                          className="size-6 grid place-items-center rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500"
                          title="Di chuyển lên"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMoveActivity(act.id, 1) }}
                          disabled={index === lesson.activities.length - 1}
                          className="size-6 grid place-items-center rounded hover:bg-slate-100 disabled:opacity-30 text-slate-500"
                          title="Di chuyển xuống"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Bottom activity actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <Button
                  onClick={() => handleAddActivity()}
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-semibold gap-1.5"
                >
                  <Plus className="size-3.5" /> Thêm hoạt động
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setLibraryPickerOpen(true)}
                    size="sm"
                    variant="outline"
                    className="text-[11px] gap-1 bg-slate-50"
                  >
                    <BookOpen className="size-3" /> Thư viện HĐ
                  </Button>
                  <Button
                    onClick={() => setAiAssistantOpen(true)}
                    size="sm"
                    variant="outline"
                    className="text-[11px] gap-1 bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100"
                  >
                    <Sparkles className="size-3 text-violet-600" /> AI Gợi ý
                  </Button>
                </div>
              </div>
            </div>

            {/* Linked Schedule Info Box */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-teal-600" /> Lịch dạy liên kết
                </h4>
                <button
                  onClick={() => setLinkScheduleTarget(lesson)}
                  className="text-xs text-teal-600 hover:underline font-semibold"
                >
                  {lesson.schedules && lesson.schedules.length > 0 ? 'Đổi lịch' : '+ Gắn lịch'}
                </button>
              </div>

              {lesson.schedules && lesson.schedules.length > 0 ? (
                <div className="space-y-2">
                  {lesson.schedules.map((s) => (
                    <div key={s.id} className="rounded-xl bg-teal-50/70 p-2.5 border border-teal-100 text-xs">
                      <p className="font-bold text-teal-900">{s.title}</p>
                      <p className="text-teal-700 mt-0.5">
                        📅 {s.plannedDate ? new Date(s.plannedDate).toLocaleDateString('vi-VN') : ''} ({s.startTime || '07:00'} - {s.endTime || '07:45'})
                      </p>
                      <p className="text-slate-500 mt-0.5 text-[11px]">Lớp: {s.classroom?.name || lesson.grade}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Chưa liên kết với tiết nào trong Lịch dạy.
                </p>
              )}
            </div>
          </div>

          {/* Right Area: Form & Active Activity Editor */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Section 1: General Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                Thông tin chung giáo án
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Tên bài học *</Label>
                  <Input
                    className="mt-1 font-semibold"
                    value={lesson.title}
                    onChange={(e) => updateLessonField('title', e.target.value)}
                    placeholder="VD: Tiết 1: Phân số bằng nhau"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Chủ đề</Label>
                  <Input
                    className="mt-1"
                    value={lesson.topic || ''}
                    onChange={(e) => updateLessonField('topic', e.target.value)}
                    placeholder="VD: Chủ đề 1: Phân số và các phép tính"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Ngày dự kiến dạy</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={lesson.date || ''}
                    onChange={(e) => updateLessonField('date', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Môn học</Label>
                  <Input
                    className="mt-1"
                    value={lesson.subject}
                    onChange={(e) => updateLessonField('subject', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Lớp học</Label>
                  <Input
                    className="mt-1"
                    value={lesson.grade}
                    onChange={(e) => updateLessonField('grade', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Requirements (I. Yêu cầu cần đạt) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                I. Yêu cầu cần đạt
              </h3>

              <div className="grid gap-3.5 text-xs">
                <div>
                  <Label className="text-xs font-semibold">1. Mục tiêu chung của bài học</Label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
                    placeholder="Nhận biết được kiến thức trọng tâm..."
                    value={lesson.objective}
                    onChange={(e) => updateLessonField('objective', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">2. Năng lực đặc thù</Label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
                    placeholder="Năng lực tư duy và lập luận toán học, mô hình hóa toán học..."
                    value={lesson.specificCompetencies || ''}
                    onChange={(e) => updateLessonField('specificCompetencies', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">3. Năng lực chung</Label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
                    placeholder="Tự chủ và tự học, giao tiếp và hợp tác, giải quyết vấn đề..."
                    value={lesson.generalCompetencies || ''}
                    onChange={(e) => updateLessonField('generalCompetencies', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">4. Phẩm chất chủ yếu</Label>
                  <Input
                    className="mt-1"
                    placeholder="Chăm chỉ, trung thực, trách nhiệm, yêu nước..."
                    value={lesson.qualities || ''}
                    onChange={(e) => updateLessonField('qualities', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Equipment (II. Đồ dùng dạy học) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                II. Đồ dùng dạy học
              </h3>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
                placeholder="GV chuẩn bị: Máy chiếu, bài giảng điện tử, phiếu học tập...&#10;HS chuẩn bị: SGK, vở ghi, đồ dùng học tập..."
                value={lesson.teachingEquipment || ''}
                onChange={(e) => updateLessonField('teachingEquipment', e.target.value)}
              />
            </div>

            {/* Section 4: Current Selected Activity Editor */}
            {selectedActivity && (
              <div className="rounded-2xl border-2 border-teal-500/40 bg-white p-5 shadow-sm flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-teal-600 text-white px-2 py-0.5 text-xs font-bold">
                      {selectedActivity.phase}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {selectedActivity.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const payload: GamePayload = {
                          gameType: 'QUIZ',
                          title: selectedActivity.title || 'Trò chơi củng cố bài học',
                          quizItems: [
                            {
                              question: `Nội dung trọng tâm của hoạt động: "${selectedActivity.title}"?`,
                              options: ['Khám phá & Vận dụng kiến thức', 'Ghi nhớ máy móc', 'Hoạt động cá nhân', 'Luyện viết nhanh'],
                              correctAnswer: 'Khám phá & Vận dụng kiến thức',
                              explanation: selectedActivity.objective || 'Mục tiêu phẩm chất và năng lực bài học',
                            },
                          ],
                        };
                        setPlayGamePayload(payload);
                      }}
                      className="text-xs h-7 gap-1 text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 font-bold"
                    >
                      🎮 Chạy trò chơi
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveToLibrary(selectedActivity)}
                      className="text-xs h-7 gap-1"
                    >
                      <BookOpen className="size-3" /> Lưu vào thư viện
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateActivity(selectedActivity.id)}
                      className="text-xs h-7 gap-1"
                    >
                      <Copy className="size-3" /> Nhân bản
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveActivity(selectedActivity.id)}
                      className="text-xs h-7 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Activity fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold">Tên hoạt động *</Label>
                    <Input
                      className="mt-1"
                      value={selectedActivity.title}
                      onChange={(e) => updateActivityField(selectedActivity.id, 'title', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Thời lượng (phút) *</Label>
                    <Input
                      type="number"
                      min={1}
                      className="mt-1"
                      value={selectedActivity.minutes}
                      onChange={(e) => updateActivityField(selectedActivity.id, 'minutes', parseInt(e.target.value, 10) || 5)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-xs font-semibold">Phương pháp dạy học</Label>
                    <Input
                      className="mt-1"
                      value={selectedActivity.method}
                      onChange={(e) => updateActivityField(selectedActivity.id, 'method', e.target.value)}
                      placeholder="VD: Trực quan, thảo luận nhóm, giải quyết vấn đề..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Kĩ thuật dạy học</Label>
                    <Input
                      className="mt-1"
                      value={selectedActivity.technique}
                      onChange={(e) => updateActivityField(selectedActivity.id, 'technique', e.target.value)}
                      placeholder="VD: Động não, khăn trải bàn, mảnh ghép..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Mục tiêu hoạt động</Label>
                    <Input
                      className="mt-1"
                      value={selectedActivity.objective}
                      onChange={(e) => updateActivityField(selectedActivity.id, 'objective', e.target.value)}
                      placeholder="Mục tiêu cụ thể học sinh cần đạt trong hoạt động này..."
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Đồ dùng / Thiết bị</Label>
                    <Input
                      className="mt-1"
                      value={selectedActivity.equipment || ''}
                      onChange={(e) => updateActivityField(selectedActivity.id, 'equipment', e.target.value)}
                      placeholder="VD: Thẻ số, phiếu học tập, bảng phụ..."
                    />
                  </div>
                </div>

                {/* 2-Column: Teacher vs Student activity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 flex flex-col gap-2">
                    <Label className="text-xs font-bold text-teal-800 flex items-center gap-1">
                      Hoạt động của Giáo viên
                    </Label>
                    <textarea
                      rows={6}
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs focus:outline-none focus:border-teal-400 leading-relaxed placeholder:text-slate-400"
                      placeholder="Mô tả chi tiết các bước chuyển giao nhiệm vụ, hướng dẫn, gợi mở và tổng kết..."
                      value={selectedActivity.teacher}
                      onChange={(e) => updateActivityField(selectedActivity.id, 'teacher', e.target.value)}
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 flex flex-col gap-2">
                    <Label className="text-xs font-bold text-blue-800 flex items-center gap-1">
                      Hoạt động của Học sinh
                    </Label>
                    <textarea
                      rows={6}
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-xs focus:outline-none focus:border-blue-400 leading-relaxed placeholder:text-slate-400"
                      placeholder="Mô tả cụ thể hành động của học sinh (nghe, thảo luận, thực hành, trình bày, nhận xét)..."
                      value={selectedActivity.students}
                      onChange={(e) => updateActivityField(selectedActivity.id, 'students', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Section 5: Post-lesson Adjustments & Notes */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                IV. Điều chỉnh sau bài dạy & Ghi chú
              </h3>
              <div className="grid gap-3.5 text-xs">
                <div>
                  <Label className="text-xs font-semibold">Điều chỉnh sau tiết dạy</Label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
                    placeholder="Ghi nhận những điểm học sinh nắm tốt, nội dung cần khắc sâu hoặc điều chỉnh thời lượng..."
                    value={lesson.postLessonAdjustment || ''}
                    onChange={(e) => updateLessonField('postLessonAdjustment', e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Ghi chú thêm</Label>
                  <textarea
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
                    placeholder="Dặn dò học sinh, chuẩn bị bài tiếp theo..."
                    value={lesson.notes || ''}
                    onChange={(e) => updateLessonField('notes', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Dialog */}
      <VersionHistoryDialog
        open={versionHistoryOpen}
        lessonPlanId={lesson.id}
        onClose={() => setVersionHistoryOpen(false)}
        onRestored={(restored) => {
          setLesson(restored)
          setVersionHistoryOpen(false)
          toast.success('Đã khôi phục phiên bản thành công')
        }}
      />

      {/* Activity Library Picker Dialog */}
      <ActivityLibraryPickerDialog
        open={libraryPickerOpen}
        onClose={() => setLibraryPickerOpen(false)}
        onSelect={(libAct) => {
          const newAct: Activity = {
            id: `act-${Date.now()}`,
            phase: libAct.type || 'Khởi động',
            title: libAct.title,
            minutes: libAct.durationMinutes || 10,
            method: libAct.method || (libAct.type === 'Trò chơi' ? 'Trò chơi học tập' : 'Thảo luận nhóm'),
            technique: libAct.technique || 'Think-Pair-Share',
            competencies: libAct.competencies || 'Năng lực giao tiếp và hợp tác',
            qualities: libAct.qualities || 'Chăm chỉ, trung thực',
            equipment: libAct.equipment || '',
            objective: libAct.objective || libAct.description || `Mục tiêu hoạt động ${libAct.title}`,
            teacher: libAct.teacherActivity || `GV tổ chức hoạt động ${libAct.title}.`,
            students: libAct.studentActivity || `HS tham gia hoạt động ${libAct.title}.`,
            sortOrder: lesson.activities.length,
          }
          setLesson((prev) => {
            const next = { ...prev, activities: [...prev.activities, newAct] }
            triggerAutosave(next)
            return next
          })
          setSelectedActivityId(newAct.id)
          setLibraryPickerOpen(false)
          toast.success(`Đã thêm "${libAct.title}" vào giáo án`)
        }}
      />

      {/* AI Assistant Modal for Activities */}
      <AiActivityAssistantModal
        open={aiAssistantOpen}
        lesson={lesson}
        onClose={() => setAiAssistantOpen(false)}
        onInsertNew={(genAct) => {
          const newAct: Activity = {
            id: `act-${Date.now()}`,
            phase: genAct.activityType || 'Khám phá',
            title: genAct.title,
            minutes: genAct.durationMinutes || 10,
            method: (genAct.methods || []).join(', ') || 'Thảo luận nhóm',
            technique: (genAct.techniques || []).join(', ') || 'Động não',
            competencies: (genAct.competencies || []).join(', '),
            qualities: (genAct.qualities || []).join(', '),
            equipment: '',
            objective: genAct.objective,
            teacher: genAct.teacherActivity,
            students: genAct.studentActivity,
            sortOrder: lesson.activities.length,
          }
          setLesson((prev) => {
            const next = { ...prev, activities: [...prev.activities, newAct] }
            triggerAutosave(next)
            return next
          })
          setSelectedActivityId(newAct.id)
          setAiAssistantOpen(false)
          toast.success('Đã chèn hoạt động từ AI vào giáo án')
        }}
        onReplaceCurrent={(genAct) => {
          if (!selectedActivity) return
          setLesson((prev) => {
            const nextActivities = prev.activities.map((a) =>
              a.id === selectedActivityId
                ? {
                    ...a,
                    title: genAct.title,
                    minutes: genAct.durationMinutes || a.minutes,
                    method: (genAct.methods || []).join(', ') || a.method,
                    technique: (genAct.techniques || []).join(', ') || a.technique,
                    competencies: (genAct.competencies || []).join(', ') || a.competencies,
                    qualities: (genAct.qualities || []).join(', ') || a.qualities,
                    objective: genAct.objective || a.objective,
                    teacher: genAct.teacherActivity,
                    students: genAct.studentActivity,
                  }
                : a
            )
            const next = { ...prev, activities: nextActivities }
            triggerAutosave(next)
            return next
          })
          setAiAssistantOpen(false)
          toast.success('Đã cập nhật hoạt động với nội dung từ AI')
        }}
      />

      <AiFullDraftModal
        open={aiDraftOpen}
        classes={classes}
        currentLesson={lesson}
        onClose={() => setAiDraftOpen(false)}
        onGenerated={(draft) => {
          const hasTeacherData = Boolean(
            lesson.objective ||
              lesson.activities.some((a) => (a.teacher && a.teacher.trim()) || (a.students && a.students.trim())),
          )
          if (hasTeacherData) {
            setPendingAiDraft(draft)
            setAiOverwriteOpen(true)
            return
          }
          setLesson((prev) => ({
            ...draft,
            id: prev.id,
            classroomId: prev.classroomId,
            date: prev.date,
            status: prev.status,
            version: prev.version,
            sourceType: prev.sourceType || 'NATIVE',
          }))
          setSelectedActivityId(draft.activities[0]?.id || '')
          toast.success('AI đã đổ nội dung vào trình soạn. Hãy rà soát rồi lưu.')
        }}
      />

      <AiImageDialog
        open={aiImageOpen}
        lessonPlanId={lesson.id}
        defaultPrompt={lesson.title}
        onClose={() => setAiImageOpen(false)}
      />

      <Dialog open={aiOverwriteOpen} onOpenChange={(o) => !o && setAiOverwriteOpen(false)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>AI sẽ thay nội dung đang soạn?</DialogTitle>
            <DialogDescription>
              Giáo án hiện tại đã có dữ liệu. Chọn cách áp dụng kết quả AI.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setAiOverwriteOpen(false); setPendingAiDraft(null) }}>Hủy</Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!pendingAiDraft) return
                setLesson((prev) => ({
                  ...prev,
                  objective: prev.objective || pendingAiDraft.objective,
                  teachingEquipment: prev.teachingEquipment || pendingAiDraft.teachingEquipment,
                  specificCompetencies: prev.specificCompetencies || pendingAiDraft.specificCompetencies,
                  generalCompetencies: prev.generalCompetencies || pendingAiDraft.generalCompetencies,
                  qualities: prev.qualities || pendingAiDraft.qualities,
                }))
                setAiOverwriteOpen(false)
                setPendingAiDraft(null)
                toast.success('Đã điền các phần trống từ AI, giữ nguyên nội dung đã nhập.')
              }}
            >
              Chỉ điền phần trống
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => {
                if (!pendingAiDraft) return
                setLesson((prev) => ({
                  ...pendingAiDraft,
                  id: prev.id,
                  classroomId: prev.classroomId,
                  date: prev.date,
                  status: prev.status,
                  version: prev.version,
                  sourceType: prev.sourceType || 'NATIVE',
                }))
                setSelectedActivityId(pendingAiDraft.activities[0]?.id || '')
                setAiOverwriteOpen(false)
                setPendingAiDraft(null)
                toast.success('Đã ghi đè giáo án bằng nội dung AI. Hãy rà soát rồi lưu.')
              }}
            >
              Ghi đè
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Interactive Game Runner for Lesson Plan */}
      <Dialog open={!!playGamePayload} onOpenChange={(val) => !val && setPlayGamePayload(null)}>
        <DialogContent size="xl" className="p-2 sm:p-4 bg-slate-950 border-slate-800 text-white">
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
    </div>
  )
}

// ─── Modal Dialog: Upload Lesson Plan ─────────────────────────────────────────
function UploadLessonPlanDialog({
  open,
  classes,
  onClose,
  onUploaded,
}: {
  open: boolean
  classes: ClassRecord[]
  onClose: () => void
  onUploaded: (plan: LessonPlan) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Toán')
  const [classroomId, setClassroomId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [topic, setTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setFile(null)
      setIsDragging(false)
      setTitle('')
      setSubject('Toán')
      setClassroomId(classes[0]?.id || '')
      setDate(new Date().toISOString().split('T')[0])
      setTopic('')
      setNotes('')
    }
  }, [open, classes])

  const handleSelectFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (ext !== 'docx' && ext !== 'pdf') {
      toast.error('Chỉ hỗ trợ tập tin định dạng Microsoft Word (.docx) hoặc PDF (.pdf)')
      return
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('Dung lượng tập tin không được vượt quá 50MB')
      return
    }

    setFile(selectedFile)
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '')
    setTitle(baseName)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectFile(e.dataTransfer.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Vui lòng chọn tập tin giáo án để tải lên')
      return
    }

    if (!title.trim()) {
      toast.error('Vui lòng nhập tên giáo án')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title.trim())
      formData.append('subject', subject)
      formData.append('classroomId', classroomId)
      if (date) formData.append('date', date)
      if (topic.trim()) formData.append('topic', topic.trim())
      if (notes.trim()) formData.append('notes', notes.trim())

      const cls = classes.find((c) => c.id === classroomId)
      if (cls) formData.append('grade', cls.name)

      const result = await uploadLessonPlanFile(formData)
      toast.success('Đã tải giáo án lên thành công!')
      onUploaded(result)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tải tập tin giáo án lên')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-teal-900">
            <Upload className="size-5 text-teal-600" /> Tải giáo án có sẵn
          </DialogTitle>
          <DialogDescription>
            Tải lên tài liệu giáo án định dạng DOCX hoặc PDF để quản lý và liên kết với lịch dạy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3.5 py-2 text-xs">
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition ${
              isDragging
                ? 'border-teal-500 bg-teal-50/80 scale-[0.99]'
                : file
                  ? 'border-teal-400 bg-teal-50/40'
                  : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleSelectFile(e.target.files[0])
                }
              }}
            />

            {file ? (
              <div className="flex items-center gap-3 w-full">
                <div className="grid size-10 place-items-center rounded-xl bg-teal-100 text-teal-700 shrink-0">
                  <FileCheck className="size-6" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-slate-900 text-xs truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(file.size / 1024).toFixed(0)} KB · {file.name.endsWith('.pdf') ? 'Tài liệu PDF' : 'Microsoft Word'}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="size-8 p-0 text-slate-400 hover:text-rose-600"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-600 mb-2">
                  <UploadCloud className="size-6" />
                </div>
                <p className="font-semibold text-slate-800 text-xs">
                  Kéo thả file vào đây hoặc <span className="text-teal-600 underline">chọn file</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Hỗ trợ định dạng DOCX, PDF (tối đa 50MB)
                </p>
              </>
            )}
          </div>

          {/* Form metadata */}
          <div>
            <Label className="text-xs font-semibold">Tên giáo án *</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="VD: Tiết 5: Ôn tập các số đến 100.000"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Môn học *</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-xs"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="Toán">Toán</option>
                <option value="Tiếng Việt">Tiếng Việt</option>
                <option value="Khoa học">Khoa học</option>
                <option value="Lịch sử & Địa lí">Lịch sử & Địa lí</option>
                <option value="Đạo đức">Đạo đức</option>
                <option value="Tin học">Tin học</option>
                <option value="Công nghệ">Công nghệ</option>
                <option value="Hoạt động trải nghiệm">Hoạt động trải nghiệm</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Lớp *</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-xs"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Ngày dự kiến dạy</Label>
              <Input
                type="date"
                className="mt-1 text-xs"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Chủ đề</Label>
              <Input
                className="mt-1 text-xs"
                placeholder="VD: Phân số"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Ghi chú</Label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
              placeholder="Ghi chú thêm về giáo án..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={uploading}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={uploading || !file}
              className="bg-teal-600 hover:bg-teal-700 font-semibold gap-1.5"
            >
              {uploading && <Loader2 className="size-3.5 animate-spin" />}
              {uploading ? 'Đang tải lên...' : 'Tải lên giáo án'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Dialog: PDF Preview ────────────────────────────────────────────────
function PdfPreviewDialog({
  target,
  onClose,
}: {
  target: LessonPlan | null
  onClose: () => void
}) {
  if (!target) return null

  const fileUrl = getLessonPlanFileUrl(target.id!)

  return (
    <Dialog open={!!target} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="xl" className="h-[85vh] p-4 sm:p-6">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
          <div>
            <DialogTitle className="text-base text-slate-900 truncate">
              {target.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {target.originalFileName} · {target.subject} · {target.grade}
            </DialogDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadLessonPlanFile(target.id!, target.originalFileName || `${target.title}.pdf`)}
            className="text-xs gap-1"
          >
            <Download className="size-3.5" /> Tải về máy
          </Button>
        </DialogHeader>

        <div className="flex-1 w-full h-full bg-slate-100 rounded-xl overflow-hidden my-2 border">
          <iframe
            src={fileUrl}
            className="w-full h-full border-none"
            title={target.title}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Dialog: Create Lesson Plan ─────────────────────────────────────────
function CreateLessonPlanDialog({
  open,
  classes,
  onClose,
  onCreated,
}: {
  open: boolean
  classes: ClassRecord[]
  onClose: () => void
  onCreated: (plan: LessonPlan) => void
}) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Toán')
  const [classroomId, setClassroomId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [duration, setDuration] = useState(40)
  const [topic, setTopic] = useState('')
  const [objective, setObjective] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle('')
      setSubject('Toán')
      setClassroomId(classes[0]?.id || '')
      setDate(new Date().toISOString().split('T')[0])
      setDuration(40)
      setTopic('')
      setObjective('')
    }
  }, [open, classes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Vui lòng nhập tên bài học'); return }
    setSubmitting(true)
    try {
      const cls = classes.find((c) => c.id === classroomId)
      // Strip any UI-only id before sending to create API
      const cleanActivities: any[] = [];
      const created = await createLessonPlan({
        title: title.trim(),
        subject,
        grade: cls?.name || 'Lớp 4A',
        classroomId: classroomId || undefined,
        date,
        duration,
        topic: topic.trim() || undefined,
        objective: objective.trim() || undefined,
        activities: cleanActivities as any,
        status: 'DRAFT',
      })
      toast.success('Đã tạo giáo án mới thành công')
      onCreated(created)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo giáo án')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Tạo giáo án mới</DialogTitle>
          <DialogDescription>
            Khởi tạo kế hoạch bài dạy mới theo cấu trúc chuẩn GDVN.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3.5 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold">Tên bài học *</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="VD: Tiết 1: Phân số bằng nhau"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Môn học *</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-xs"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="Toán">Toán</option>
                <option value="Tiếng Việt">Tiếng Việt</option>
                <option value="Khoa học">Khoa học</option>
                <option value="Lịch sử & Địa lí">Lịch sử & Địa lí</option>
                <option value="Đạo đức">Đạo đức</option>
                <option value="Tin học">Tin học</option>
                <option value="Công nghệ">Công nghệ</option>
                <option value="Hoạt động trải nghiệm">Hoạt động trải nghiệm</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Lớp *</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-xs"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Ngày dự kiến dạy</Label>
              <Input
                type="date"
                className="mt-1 text-xs"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Thời lượng (phút)</Label>
              <Input
                type="number"
                min={15}
                max={180}
                className="mt-1 text-xs"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 40)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Chủ đề</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="VD: Chủ đề 1: Phân số và các phép tính"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Mục tiêu cơ bản</Label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-teal-400"
              placeholder="Học sinh nhận biết và vận dụng..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700 font-semibold">
              {submitting && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Tạo giáo án
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Dialog: Duplicate Lesson Plan ──────────────────────────────────────
function DuplicateLessonPlanDialog({
  target,
  classes,
  onClose,
  onDuplicated,
}: {
  target: LessonPlan | null
  classes: ClassRecord[]
  onClose: () => void
  onDuplicated: (plan: LessonPlan) => void
}) {
  const [title, setTitle] = useState('')
  const [classroomId, setClassroomId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (target) {
      setTitle(`${target.title} (Bản sao)`)
      setClassroomId(target.classroomId || classes[0]?.id || '')
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [target, classes])

  if (!target) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const dup = await duplicateLessonPlan(target.id!, {
        title: title.trim() || undefined,
        classroomId: classroomId || undefined,
        date: date || undefined,
      })
      toast.success('Đã nhân bản giáo án thành công')
      onDuplicated(dup)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi nhân bản giáo án')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nhân bản giáo án</DialogTitle>
          <DialogDescription>
            Sao chép toàn bộ nội dung giáo án và hoạt động sang lớp hoặc ngày dạy mới.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3.5 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold">Tên giáo án mới</Label>
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Lớp học mới</Label>
            <select
              className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-xs"
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold">Ngày dạy mới</Label>
            <Input
              type="date"
              className="mt-1"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={submitting} className="bg-teal-600 hover:bg-teal-700 font-semibold">
              {submitting && <Loader2 className="size-3.5 animate-spin mr-1" />}
              Xác nhận nhân bản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Dialog: Delete Lesson Plan ─────────────────────────────────────────
function DeleteLessonPlanDialog({
  target,
  onClose,
  onDeleted,
}: {
  target: LessonPlan | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  if (!target) return null

  const handleDelete = async () => {
    setSubmitting(true)
    try {
      await deleteLessonPlan(target.id!)
      toast.success('Đã xóa giáo án thành công')
      onDeleted()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa giáo án')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa giáo án</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa giáo án "{target.title}"?
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-slate-500 my-2">
          Lịch dạy đã liên kết sẽ tự động chuyển về trạng thái Chưa có giáo án mà không bị ảnh hưởng.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
            {submitting && <Loader2 className="size-3.5 animate-spin mr-1" />}
            Xác nhận xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Dialog: Link Schedule ──────────────────────────────────────────────
function LinkScheduleModal({
  target,
  onClose,
  onUpdated,
}: {
  target: LessonPlan | null
  onClose: () => void
  onUpdated: () => void
}) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (target) {
      setLoading(true)
      getSchedules({ classroomId: target.classroomId || undefined })
        .then(setSchedules)
        .catch(() => setSchedules([]))
        .finally(() => setLoading(false))
    }
  }, [target])

  if (!target) return null

  const handleLink = async (schedId: string) => {
    try {
      await linkLessonPlanSchedule(target.id!, schedId)
      toast.success('Đã liên kết giáo án với lịch dạy thành công')
      onUpdated()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi liên kết lịch dạy')
    }
  }

  const handleUnlink = async (schedId: string) => {
    try {
      await unlinkLessonPlanSchedule(target.id!, schedId)
      toast.success('Đã gỡ liên kết lịch dạy')
      onUpdated()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi gỡ liên kết')
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gắn giáo án vào Lịch dạy</DialogTitle>
          <DialogDescription>
            Chọn tiết dạy trong lịch để liên kết với giáo án "{target.title}".
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[200px] my-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-teal-600" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              Không tìm thấy tiết dạy nào khả dụng cho lớp này trong lịch.
            </div>
          ) : (
            schedules.map((s) => {
              const isLinked = s.lessonPlanId === target.id
              return (
                <div key={s.id} className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 rounded-xl transition">
                  <div>
                    <p className="font-semibold text-slate-900">{s.title}</p>
                    <p className="text-slate-500 mt-0.5">
                      📅 {s.plannedDate ? new Date(s.plannedDate).toLocaleDateString('vi-VN') : ''} ({s.startTime || '07:00'} - {s.endTime || '07:45'}) · {s.classroom?.name}
                    </p>
                  </div>
                  {isLinked ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnlink(s.id)}
                      className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                    >
                      Gỡ liên kết
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleLink(s.id)}
                      className="text-xs bg-teal-600 hover:bg-teal-700"
                    >
                      Gắn giáo án
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Dialog: Version History ────────────────────────────────────────────
function VersionHistoryDialog({
  open,
  lessonPlanId,
  onClose,
  onRestored,
}: {
  open: boolean
  lessonPlanId?: string
  onClose: () => void
  onRestored: (plan: LessonPlan) => void
}) {
  const [versions, setVersions] = useState<LessonPlanVersionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    if (open && lessonPlanId) {
      setLoading(true)
      getLessonPlanVersions(lessonPlanId)
        .then(setVersions)
        .catch(() => setVersions([]))
        .finally(() => setLoading(false))
    }
  }, [open, lessonPlanId])

  const handleRestore = async (versionId: string) => {
    if (!lessonPlanId) return
    setRestoringId(versionId)
    try {
      const restored = await restoreLessonPlanVersion(lessonPlanId, versionId)
      onRestored(restored)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi khôi phục phiên bản')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lịch sử phiên bản giáo án</DialogTitle>
          <DialogDescription>
            Các mốc lưu snapshot tự động và hoàn thành giáo án.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[220px] my-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-teal-600" />
            </div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có phiên bản lịch sử nào được ghi lại.
            </div>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 rounded-xl transition">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                      Phiên bản v{v.versionNumber}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(v.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{v.changeSummary || v.title}</p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={restoringId !== null}
                  onClick={() => handleRestore(v.id)}
                  className="text-xs shrink-0"
                >
                  {restoringId === v.id ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="size-3 mr-1" />
                  )}
                  Khôi phục
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

// ─── Modal Dialog: Activity Library Picker ────────────────────────────────────
function ActivityLibraryPickerDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (act: LibraryActivity) => void
}) {
  const [activities, setActivities] = useState<LibraryActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Tất cả')
  const [previewAct, setPreviewAct] = useState<LibraryActivity | null>(null)

  useEffect(() => {
    if (open) {
      setLoading(true)
      setPreviewAct(null)
      getLibraryActivities()
        .then((res) => setActivities(res.items || []))
        .catch(() => setActivities([]))
        .finally(() => setLoading(false))
    }
  }, [open])

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      const matchType = typeFilter === 'Tất cả' || a.type === typeFilter || (a as any).typeName === typeFilter
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        `${a.title} ${a.subject} ${a.grade} ${a.type} ${a.method || ''} ${a.technique || ''}`
          .toLowerCase()
          .includes(q)
      return matchType && matchSearch
    })
  }, [activities, search, typeFilter])

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Thư viện hoạt động dạy học</DialogTitle>
          <DialogDescription>
            Khám phá và chèn bản sao hoạt động (snapshot) vào giáo án hiện tại.
          </DialogDescription>
        </DialogHeader>

        {previewAct ? (
          <div className="flex-1 overflow-y-auto space-y-3.5 my-2 text-xs">
            <div className="flex items-center justify-between pb-2 border-b">
              <div>
                <span className="rounded-lg bg-teal-50 px-2 py-0.5 text-[11px] font-bold text-teal-700 border border-teal-200">
                  {previewAct.type || 'Hoạt động'}
                </span>
                <h4 className="font-bold text-sm text-slate-900 mt-1">{previewAct.title}</h4>
                <p className="text-slate-500 text-[11px]">
                  {[previewAct.subject, previewAct.grade].filter(Boolean).join(' · ')} · ⏱ {previewAct.durationMinutes || 10} phút
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setPreviewAct(null)} className="text-xs">
                Quay lại danh sách
              </Button>
            </div>

            {previewAct.objective && (
              <div className="rounded-lg bg-slate-50 p-2.5 border">
                <strong className="text-slate-900 block mb-0.5">🎯 Mục tiêu:</strong>
                <p className="text-slate-700 leading-relaxed">{previewAct.objective}</p>
              </div>
            )}

            {(previewAct.method || previewAct.technique) && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {previewAct.method && (
                  <div className="rounded-lg border p-2">
                    <span className="text-slate-400 block text-[10px]">Phương pháp:</span>
                    <span className="font-semibold text-slate-800">{previewAct.method}</span>
                  </div>
                )}
                {previewAct.technique && (
                  <div className="rounded-lg border p-2">
                    <span className="text-slate-400 block text-[10px]">Kĩ thuật:</span>
                    <span className="font-semibold text-violet-700">{previewAct.technique}</span>
                  </div>
                )}
              </div>
            )}

            {previewAct.gameRules && (
              <div className="rounded-lg bg-amber-50 p-2.5 border border-amber-200 text-amber-950">
                <strong className="block mb-0.5 text-amber-900">🎮 Luật chơi:</strong>
                <p className="leading-relaxed whitespace-pre-line">{previewAct.gameRules}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-teal-100 bg-teal-50/30 p-2.5">
                <strong className="text-teal-900 block mb-1">Hoạt động Giáo viên:</strong>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{previewAct.teacherActivity || 'GV tổ chức hoạt động cho học sinh.'}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50/30 p-2.5">
                <strong className="text-blue-900 block mb-1">Hoạt động Học sinh:</strong>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">{previewAct.studentActivity || 'HS tham gia hoạt động theo hướng dẫn.'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => setPreviewAct(null)}>
                Đóng xem trước
              </Button>
              <Button
                size="sm"
                onClick={() => onSelect(previewAct)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1"
              >
                <Plus className="size-3.5" /> Chèn vào giáo án
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 my-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo tên trò chơi, khởi động, môn..."
                  className="pl-9 text-xs"
                />
              </div>

              <select
                aria-label="Lọc loại hoạt động"
                className="h-9 rounded-md border bg-background px-2.5 text-xs font-medium"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="Tất cả">Tất cả loại</option>
                <option value="Khởi động">Khởi động</option>
                <option value="Khám phá">Khám phá</option>
                <option value="Luyện tập">Luyện tập</option>
                <option value="Vận dụng">Vận dụng</option>
                <option value="Trò chơi">Trò chơi</option>
              </select>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[260px]">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-teal-600" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Không tìm thấy hoạt động nào phù hợp.
                </div>
              ) : (
                filtered.map((a) => (
                  <div
                    key={a.id}
                    className="group flex items-center justify-between p-3 hover:bg-teal-50/50 rounded-xl transition gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {a.type || 'Hoạt động'}
                        </span>
                        <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 truncate">
                          {a.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {[a.subject, a.grade].filter(Boolean).join(' · ')} · ⏱ {a.durationMinutes || 10}p
                        {a.method ? ` · ${a.method}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewAct(a)}
                        className="text-xs h-7 px-2 text-slate-600 hover:text-teal-700"
                      >
                        <Eye className="size-3.5 mr-1" /> Xem
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onSelect(a)}
                        className="text-xs h-7 bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                      >
                        Chèn
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={onClose}>Đóng</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Modal Dialog: AI Activity Assistant ──────────────────────────────────────
function AiActivityAssistantModal({
  open,
  lesson,
  onClose,
  onInsertNew,
  onReplaceCurrent,
}: {
  open: boolean
  lesson: LessonPlan
  onClose: () => void
  onInsertNew: (act: GeneratedActivity) => void
  onReplaceCurrent: (act: GeneratedActivity) => void
}) {
  const [phase, setPhase] = useState('Khởi động')
  const [requirement, setRequirement] = useState('')
  const [duration, setDuration] = useState(5)
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<GeneratedActivity | null>(null)

  useEffect(() => {
    if (open) {
      setPhase('Khởi động')
      setRequirement('')
      setDuration(5)
      setGenerated(null)
    }
  }, [open])

  const handleGenerate = async () => {
    setLoading(true)
    setGenerated(null)
    try {
      const gradeNum = parseInt(lesson.grade.replace(/\D/g, ''), 10) || 4
      const result = await generateActivity({
        grade: gradeNum,
        subject: lesson.subject || 'Toán',
        lessonTitle: lesson.title,
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

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Sparkles className="size-4 text-violet-600" /> Trợ lý AI thiết kế hoạt động
          </DialogTitle>
          <DialogDescription>
            Gợi ý hoạt động dạy học tương tác theo bối cảnh môn {lesson.subject} {lesson.grade}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Loại hoạt động</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-xs"
                value={phase}
                onChange={(e) => setPhase(e.target.value)}
              >
                <option value="Khởi động">Khởi động (Trò chơi, tạo hứng thú)</option>
                <option value="Khám phá">Khám phá / Hình thành kiến thức</option>
                <option value="Luyện tập">Luyện tập / Thực hành</option>
                <option value="Vận dụng">Vận dụng / Mở rộng</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Thời lượng (phút)</Label>
              <Input
                type="number"
                min={2}
                max={30}
                className="mt-1 text-xs"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 5)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Yêu cầu đặc biệt (tùy chọn)</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="VD: Dùng phương pháp khăn trải bàn, tích hợp trò chơi vận động..."
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-1.5 mt-1"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <WandSparkles className="size-4" />
            )}
            {loading ? 'AI đang tư duy và biên soạn...' : 'Tạo hoạt động với AI'}
          </Button>

          {/* Preview Box */}
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

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-violet-200/80">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReplaceCurrent(generated)}
                  className="text-xs h-8 border-violet-300"
                >
                  Thay thế hoạt động hiện tại
                </Button>
                <Button
                  size="sm"
                  onClick={() => onInsertNew(generated)}
                  className="text-xs h-8 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                >
                  Chèn làm hoạt động mới
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

// ─── Modal Dialog: AI Full Draft Generator ────────────────────────────────────
function mapAiLessonToEditor(
  aiPlan: GeneratedLessonPlan & { editorDraft?: LessonPlanEditorDraft },
  meta: { subject: string; grade: string; classroomId?: string; duration: number; title: string },
): LessonPlan {
  const PHASE: Record<string, string> = {
    WARM_UP: 'Khởi động',
    EXPLORE: 'Khám phá',
    PRACTICE: 'Luyện tập',
    APPLICATION: 'Vận dụng',
    OTHER: 'Hoạt động khác',
  }
  const draft = aiPlan.editorDraft
  const activities = (draft?.activities || aiPlan.activities || []).map((a: any, i: number) => ({
    id: `act-ai-${Date.now()}-${i}`,
    phase: a.phase || PHASE[a.activityType] || (i === 0 ? 'Khởi động' : i === 1 ? 'Khám phá' : i === 2 ? 'Luyện tập' : 'Vận dụng'),
    title: a.title,
    minutes: a.minutes || a.durationMinutes || 10,
    method: a.method || (a.methods || []).join(', ') || 'Thảo luận nhóm',
    technique: a.technique || (a.techniques || []).join(', ') || 'Động não',
    competencies: a.competencies || (Array.isArray(a.competencies) ? a.competencies.join(', ') : ''),
    qualities: a.qualities || (Array.isArray(a.qualities) ? a.qualities.join(', ') : ''),
    equipment: a.equipment || '',
    objective: a.objective || '',
    teacher: a.teacher || a.teacherActivity || '',
    students: a.students || a.studentActivity || '',
    sortOrder: i,
  }))

  return {
    title: draft?.title || aiPlan.title || meta.title,
    topic: draft?.topic || meta.title,
    subject: meta.subject,
    grade: meta.grade,
    classroomId: meta.classroomId,
    date: new Date().toISOString().split('T')[0],
    duration: draft?.duration || meta.duration,
    objective: draft?.objective || aiPlan.objectives || '',
    specificCompetencies: draft?.specificCompetencies || (aiPlan as any).specificCompetencies || '',
    generalCompetencies: draft?.generalCompetencies || (aiPlan as any).generalCompetencies || '',
    qualities: draft?.qualities || (aiPlan as any).qualities || '',
    teachingEquipment: draft?.teachingEquipment || aiPlan.teachingEquipment || '',
    postLessonAdjustment: '',
    notes: '',
    status: 'DRAFT',
    sourceType: 'NATIVE',
    version: 1,
    activities,
    resources: [],
    schedules: [],
  }
}

function AiFullDraftModal({
  open,
  classes,
  currentLesson,
  onClose,
  onGenerated,
}: {
  open: boolean
  classes: ClassRecord[]
  currentLesson: LessonPlan | null
  onClose: () => void
  onGenerated: (plan: LessonPlan) => void
}) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('Toán')
  const [classroomId, setClassroomId] = useState('')
  const [duration, setDuration] = useState(40)
  const [requirements, setRequirements] = useState('')
  const [objectives, setObjectives] = useState('')
  const [qualities, setQualities] = useState('')
  const [competencies, setCompetencies] = useState('')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(currentLesson?.title || '')
      setSubject(currentLesson?.subject || 'Toán')
      setClassroomId(currentLesson?.classroomId || classes[0]?.id || '')
      setDuration(currentLesson?.duration || 40)
      setRequirements('')
      setObjectives(currentLesson?.objective || '')
      setQualities(currentLesson?.qualities || '')
      setCompetencies(currentLesson?.specificCompetencies || '')
    }
  }, [open, classes, currentLesson])

  const handleGenerateFullDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Vui lòng nhập tên bài học'); return }
    setGenerating(true)
    try {
      const cls = classes.find((c) => c.id === classroomId)
      const gradeNum = parseInt((cls?.name || currentLesson?.grade || '4').replace(/\D/g, '') || '4', 10) || 4

      toast.info('AI đang tạo nội dung...')
      const aiPlan = await aiGenerateLessonPlan({
        grade: gradeNum,
        subject,
        lessonTitle: title.trim(),
        durationMinutes: duration,
        requirements: requirements.trim() || undefined,
        objectives: objectives.trim() || undefined,
        qualities: qualities.trim() || undefined,
        competencies: competencies.trim() || undefined,
        additionalRequirements: requirements.trim() || undefined,
        teacherContent: currentLesson
          ? [currentLesson.objective, currentLesson.notes, currentLesson.activities.map((a) => a.title).join('; ')].filter(Boolean).join('\n')
          : undefined,
      })

      const draft = mapAiLessonToEditor(aiPlan, {
        subject,
        grade: cls?.name || currentLesson?.grade || `Lớp ${gradeNum}`,
        classroomId: classroomId || currentLesson?.classroomId || undefined,
        duration,
        title: title.trim(),
      })
      onGenerated(draft)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo bản nháp giáo án lúc này')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-violet-900">
            <Sparkles className="size-4 text-violet-600" /> Tạo bằng AI
          </DialogTitle>
          <DialogDescription>
            AI trả về dữ liệu có cấu trúc và đổ vào trình soạn. Giáo án chưa được lưu cho đến khi bạn bấm Lưu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGenerateFullDraft} className="grid gap-3.5 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold">Tên bài học *</Label>
            <Input
              className="mt-1 text-xs"
              placeholder="VD: Tiết 1: Hình bình hành"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Môn học *</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-xs"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="Toán">Toán</option>
                <option value="Tiếng Việt">Tiếng Việt</option>
                <option value="Khoa học">Khoa học</option>
                <option value="Lịch sử & Địa lí">Lịch sử & Địa lí</option>
                <option value="Tin học">Tin học</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Lớp học *</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-xs"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Thời lượng (phút)</Label>
            <Input
              type="number"
              min={15}
              max={90}
              className="mt-1 text-xs"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10) || 40)}
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Yêu cầu cần đạt (tùy chọn)</Label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-violet-400"
              placeholder="VD: Nhận biết phân số bằng nhau..."
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Phẩm chất</Label>
              <Input className="mt-1 text-xs" value={qualities} onChange={(e) => setQualities(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Năng lực</Label>
              <Input className="mt-1 text-xs" value={competencies} onChange={(e) => setCompetencies(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Yêu cầu bổ sung (tùy chọn)</Label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs focus:outline-none focus:border-violet-400"
              placeholder="VD: Tăng cường hoạt động trải nghiệm thực hành cắt ghép hình..."
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={generating}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={generating}
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold gap-1.5"
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <WandSparkles className="size-4" />
              )}
              {generating ? 'AI đang tạo nội dung...' : '✨ Tạo bằng AI'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AiImageDialog({
  open,
  lessonPlanId,
  defaultPrompt,
  onClose,
}: {
  open: boolean
  lessonPlanId?: string
  defaultPrompt?: string
  onClose: () => void
}) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('minh họa sách giáo khoa')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (open) {
      setPrompt(defaultPrompt ? `Minh họa bài học ${defaultPrompt} dành cho học sinh tiểu học` : '')
      setStyle('minh họa sách giáo khoa')
      setAspectRatio('1:1')
    }
  }, [open, defaultPrompt])

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Vui lòng nhập mô tả ảnh')
      return
    }
    setGenerating(true)
    try {
      toast.info('AI đang tạo ảnh...')
      const result = await generateImage({
        prompt: prompt.trim(),
        style,
        aspectRatio,
        purpose: 'lesson-plan',
        title: defaultPrompt || 'Ảnh minh họa giáo án',
        lessonPlanId,
      })
      toast.success(`Đã lưu ảnh vào kho tài nguyên: ${result.name || result.fileName}`)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo ảnh lúc này')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-600" /> Tạo ảnh bằng AI
          </DialogTitle>
          <DialogDescription>
            Ảnh được backend tạo và lưu vào kho tài nguyên của giáo viên.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 text-xs">
          <div>
            <Label className="text-xs font-semibold">Mô tả ảnh *</Label>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-xs"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Phong cách</Label>
              <Input className="mt-1 text-xs" value={style} onChange={(e) => setStyle(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Tỷ lệ ảnh</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border px-2 text-xs"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                <option value="1:1">1:1</option>
                <option value="4:3">4:3</option>
                <option value="16:9">16:9</option>
                <option value="3:4">3:4</option>
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>Hủy</Button>
          <Button onClick={handleGenerate} disabled={generating} className="bg-violet-600 hover:bg-violet-700 gap-1.5">
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? 'AI đang tạo nội dung...' : '✨ Tạo ảnh bằng AI'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
