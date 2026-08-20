'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  GripVertical,
  Lightbulb,
  MoreHorizontal,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
  Loader2,
  FileDown,
  FileType,
  Paperclip,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Presentation,
  Table as TableIcon,
  UploadCloud,
  File as FileIcon,
  Link2,
} from 'lucide-react'
import {
  getLessonPlans,
  saveLessonPlan as apiSaveLessonPlan,
  duplicateLessonPlan as apiDuplicateLessonPlan,
  reorderActivities as apiReorderActivities,
  type LessonPlan,
  type Activity,
} from '@/services/lesson-service'
import {
  getResources,
  uploadResourceFile,
  downloadResourceFile,
  attachResourceToLessonPlan,
  detachResourceFromLessonPlan,
  type TeachingResource,
} from '@/services/resource-service'
import { generateActivity, type GeneratedActivity } from '@/services/ai-service'
import { exportService } from '@/services/export-service'
import { toast } from 'sonner'

const starterActivities: Activity[] = [
  {
    id: 'warmup',
    phase: 'Khởi động',
    title: 'Trò chơi: Ai nhanh hơn?',
    minutes: 5,
    method: 'Trò chơi học tập',
    technique: 'Động não',
    competencies: 'Giao tiếp và hợp tác',
    qualities: 'Chăm chỉ',
    objective: 'Tạo hứng thú và kết nối kiến thức đã học với bài mới.',
    teacher:
      'GV tổ chức trò chơi nhận diện các cặp phân số bằng nhau. Đặt câu hỏi gợi mở và dẫn dắt vào bài.',
    students: 'HS tham gia trò chơi theo nhóm, suy nghĩ nhanh và chia sẻ cách nhận biết của mình.',
  },
  {
    id: 'explore',
    phase: 'Khám phá',
    title: 'Tìm hiểu phân số bằng nhau',
    minutes: 15,
    method: 'Trực quan – thảo luận nhóm',
    technique: 'Mảnh ghép',
    competencies: 'Tư duy và lập luận toán học',
    qualities: 'Trung thực',
    objective: 'HS hình thành quy tắc tạo phân số bằng nhau.',
    teacher: 'GV giao nhiệm vụ với các băng giấy, theo dõi nhóm và đặt câu hỏi: Em nhận thấy điều gì?',
    students:
      'HS gấp, tô màu băng giấy; thảo luận và trình bày phát hiện bằng ngôn ngữ của mình.',
  },
  {
    id: 'practice',
    phase: 'Luyện tập',
    title: 'Thử thách phân số',
    minutes: 12,
    method: 'Luyện tập cá nhân',
    technique: 'Khăn trải bàn',
    competencies: 'Giải quyết vấn đề',
    qualities: 'Trách nhiệm',
    objective: 'Củng cố quy tắc qua các bài tập từ nhận biết đến vận dụng.',
    teacher: 'GV phát phiếu 3 mức độ, hỗ trợ nhóm cần giúp đỡ và tổ chức chữa bài nhanh.',
    students: 'HS hoàn thành phiếu, đổi bài kiểm tra theo cặp và giải thích cách làm.',
  },
  {
    id: 'apply',
    phase: 'Vận dụng',
    title: 'Phân số quanh em',
    minutes: 8,
    method: 'Dự án nhỏ',
    technique: 'Trình bày một phút',
    competencies: 'Vận dụng kiến thức',
    qualities: 'Trách nhiệm',
    objective: 'Vận dụng phân số bằng nhau để mô tả tình huống thực tế.',
    teacher: 'GV yêu cầu HS tìm một ví dụ trong đời sống và mời đại diện chia sẻ.',
    students: 'HS tạo ví dụ minh họa, trình bày ngắn gọn và nhận xét sản phẩm của bạn.',
  },
]

const emptyActivity = (index: number): Activity => ({
  id: `activity-${Date.now()}-${index}`,
  phase: 'Hoạt động mới',
  title: 'Tên hoạt động mới',
  minutes: 5,
  method: 'Thảo luận nhóm',
  technique: 'Động não',
  competencies: 'Giao tiếp và hợp tác',
  qualities: 'Chăm chỉ',
  objective: '',
  teacher: '',
  students: '',
})

function getResourceFileIcon(type?: string, ext?: string) {
  if (type === 'VIDEO' || ext === 'MP4') return <Film className="size-4 text-purple-600" />
  if (type === 'IMAGE' || ['PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext || ''))
    return <ImageIcon className="size-4 text-emerald-600" />
  if (type === 'PRESENTATION' || ['PPT', 'PPTX'].includes(ext || ''))
    return <Presentation className="size-4 text-orange-600" />
  if (type === 'SPREADSHEET' || ['XLS', 'XLSX'].includes(ext || ''))
    return <TableIcon className="size-4 text-green-600" />
  return <FileText className="size-4 text-blue-600" />
}

export function LessonView({ onNavigate }: { onNavigate: (view: 'Giáo án') => void }) {
  const [lesson, setLesson] = useState<LessonPlan>({
    title: 'Phân số bằng nhau',
    subject: 'Toán',
    grade: 'Lớp 4A',
    date: '2026-08-21',
    duration: 40,
    objective: 'Nhận biết được các phân số bằng nhau và vận dụng để giải quyết bài toán thực tế.',
    version: 1,
    activities: starterActivities,
    resources: [],
  })
  const [selectedId, setSelectedId] = useState('warmup')
  const [aiOpen, setAiOpen] = useState(true)
  const [preview, setPreview] = useState(false)
  const [saved, setSaved] = useState('Đã lưu lúc 09:42')
  const [notice, setNotice] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState('')
  const [prompt, setPrompt] = useState('')
  const [targetField, setTargetField] = useState<'teacher' | 'students'>('teacher')
  const [aiLoading, setAiLoading] = useState(false)
  const [lastGeneratedAct, setLastGeneratedAct] = useState<GeneratedActivity | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportingType, setExportingType] = useState<'docx' | 'pdf' | null>(null)

  // Resource Attachment State
  const [resourceModalOpen, setResourceModalOpen] = useState(false)
  const [availableResources, setAvailableResources] = useState<TeachingResource[]>([])
  const [resourceTab, setResourceTab] = useState<'library' | 'upload'>('library')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newFileName, setNewFileName] = useState('')
  const [newFileDesc, setNewFileDesc] = useState('')
  const [resourceLoading, setResourceLoading] = useState(false)
  const [resourceDragActive, setResourceDragActive] = useState(false)
  const resourceFileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async (type: 'docx' | 'pdf') => {
    try {
      setExportingType(type)
      setExportOpen(false)
      let planToExport = lesson
      if (!planToExport.id) {
        toast.info('Đang lưu giáo án trước khi xuất...')
        planToExport = await apiSaveLessonPlan(lesson)
        setLesson(planToExport)
      }

      toast.info(`Đang tạo file ${type === 'docx' ? 'Word (.docx)' : 'PDF (.pdf)'}...`)
      if (type === 'docx') {
        await exportService.exportLessonPlanDocx(planToExport.id!, planToExport.title)
      } else {
        await exportService.exportLessonPlanPdf(planToExport.id!, planToExport.title)
      }
      toast.success(`Đã xuất ${type === 'docx' ? 'Word' : 'PDF'} thành công!`)
    } catch (err: any) {
      toast.error(`Lỗi khi xuất tài liệu: ${err.message || 'Vui lòng thử lại'}`)
    } finally {
      setExportingType(null)
    }
  }

  useEffect(() => {
    let alive = true
    getLessonPlans().then((plans) => {
      if (alive && plans.length > 0) {
        setLesson(plans[0])
        if (plans[0].activities?.length) {
          setSelectedId(plans[0].activities[0].id)
        }
      }
    })
    return () => {
      alive = false
    }
  }, [])

  // Load available resources when modal opens
  useEffect(() => {
    if (resourceModalOpen) {
      getResources().then(setAvailableResources)
    }
  }, [resourceModalOpen])

  const selected =
    lesson.activities.find((activity) => activity.id === selectedId) ??
    lesson.activities[0] ??
    emptyActivity(0)
  const totalMinutes = useMemo(
    () =>
      lesson.activities.reduce(
        (sum, activity) => sum + Number(activity.minutes || 0),
        0,
      ),
    [lesson.activities],
  )

  const flash = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const updateLesson = (key: keyof LessonPlan, value: string | number) =>
    setLesson((current) => ({ ...current, [key]: value }))

  const updateActivity = (key: keyof Activity, value: string | number) =>
    setLesson((current) => ({
      ...current,
      activities: current.activities.map((activity) =>
        activity.id === selectedId ? { ...activity, [key]: value } : activity,
      ),
    }))

  const add = () => {
    const fresh = emptyActivity(lesson.activities.length)
    setLesson((current) => ({ ...current, activities: [...current.activities, fresh] }))
    setSelectedId(fresh.id)
    flash('Đã thêm hoạt động mới')
  }

  const duplicate = () => {
    const index = lesson.activities.findIndex((activity) => activity.id === selectedId)
    if (index === -1) return
    const clone = {
      ...lesson.activities[index],
      id: `activity-${Date.now()}`,
      title: `${lesson.activities[index].title} (Bản sao)`,
    }
    const next = [...lesson.activities]
    next.splice(index + 1, 0, clone)
    setLesson((current) => ({ ...current, activities: next }))
    setSelectedId(clone.id)
    flash('Đã nhân bản hoạt động')
  }

  const remove = () => {
    if (lesson.activities.length <= 1) {
      flash('Giáo án cần ít nhất 1 hoạt động')
      return
    }
    const next = lesson.activities.filter((activity) => activity.id !== selectedId)
    setLesson((current) => ({ ...current, activities: next }))
    setSelectedId(next[0].id)
    flash('Đã xóa hoạt động')
  }

  const move = async (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    const fromIndex = lesson.activities.findIndex((activity) => activity.id === sourceId)
    const toIndex = lesson.activities.findIndex((activity) => activity.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return
    const next = [...lesson.activities]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    setLesson((current) => ({ ...current, activities: next }))

    // Persist reorder to backend if saved
    if (lesson.id) {
      try {
        await apiReorderActivities(
          lesson.id,
          next.map((a) => a.id),
        )
      } catch (err) {
        console.error('Failed to persist reorder', err)
      }
    }
  }

  const save = async () => {
    try {
      const savedPlan = await apiSaveLessonPlan(lesson)
      setLesson(savedPlan)
      const now = new Date()
      setSaved(`Đã lưu lúc ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
      flash('Đã lưu giáo án thành công!')
    } catch (err: any) {
      flash('Lỗi khi lưu giáo án: ' + (err.message || 'Thử lại sau'))
    }
  }

  // Attached Resources Handlers
  const handleAttachResource = async (res: TeachingResource) => {
    try {
      setResourceLoading(true)
      let planId = lesson.id
      if (!planId) {
        const savedPlan = await apiSaveLessonPlan(lesson)
        planId = savedPlan.id
        setLesson(savedPlan)
      }

      const attached = await attachResourceToLessonPlan(planId!, res.id)
      setLesson((prev) => ({
        ...prev,
        resources: [
          attached,
          ...(prev.resources || []).filter((r: any) => r.id !== res.id),
        ],
      }))
      toast.success(`Đã gắn tài nguyên "${res.name}" vào giáo án!`)
      setResourceModalOpen(false)
    } catch (err: any) {
      toast.error(`Lỗi đính kèm: ${err.message || 'Vui lòng thử lại'}`)
    } finally {
      setResourceLoading(false)
    }
  }

  const handleDetachResource = async (resId: string) => {
    try {
      if (lesson.id) {
        await detachResourceFromLessonPlan(lesson.id, resId)
      }
      setLesson((prev) => ({
        ...prev,
        resources: (prev.resources || []).filter((r: any) => r.id !== resId),
      }))
      toast.success('Đã gỡ tài nguyên khỏi giáo án')
    } catch (err: any) {
      toast.error(`Lỗi gỡ tài nguyên: ${err.message || 'Vui lòng thử lại'}`)
    }
  }

  const handleDownloadResource = async (res: any) => {
    try {
      toast.info(`Đang tải xuống: ${res.name}...`)
      await downloadResourceFile(res.id, res.originalFileName || res.name)
      toast.success('Tải xuống hoàn tất!')
    } catch (err: any) {
      toast.error(`Lỗi tải xuống: ${err.message || 'Vui lòng thử lại'}`)
    }
  }

  const handleUploadAndAttach = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFile) {
      toast.error('Vui lòng chọn tập tin để tải lên')
      return
    }

    try {
      setResourceLoading(true)
      const formData = new FormData()
      formData.append('file', newFile)
      if (newFileName.trim()) formData.append('name', newFileName.trim())
      if (newFileDesc.trim()) formData.append('description', newFileDesc.trim())

      toast.info('Đang tải lên tập tin học liệu...')
      const uploaded = await uploadResourceFile(formData)

      let planId = lesson.id
      if (!planId) {
        const savedPlan = await apiSaveLessonPlan(lesson)
        planId = savedPlan.id
        setLesson(savedPlan)
      }

      const attached = await attachResourceToLessonPlan(planId!, uploaded.id)
      setLesson((prev) => ({
        ...prev,
        resources: [
          attached,
          ...(prev.resources || []).filter((r: any) => r.id !== uploaded.id),
        ],
      }))

      toast.success(`Đã tải lên và gắn "${uploaded.name}" vào giáo án thành công!`)
      setResourceModalOpen(false)
      setNewFile(null)
      setNewFileName('')
      setNewFileDesc('')
    } catch (err: any) {
      toast.error(`Lỗi tải lên và gắn tệp: ${err.message || 'Vui lòng thử lại'}`)
    } finally {
      setResourceLoading(false)
    }
  }

  const runAi = async (action: string) => {
    try {
      setAiLoading(true)
      const activityType = selected.phase.includes('Khởi động')
        ? 'WARM_UP'
        : selected.phase.includes('Khám phá')
        ? 'EXPLORE'
        : selected.phase.includes('Luyện tập')
        ? 'PRACTICE'
        : 'APPLICATION'

      const act = await generateActivity({
        grade: 4,
        subject: lesson.subject || 'Toán',
        lessonTitle: lesson.title,
        activityType,
        durationMinutes: selected.minutes || 5,
        requirement: action,
      })

      setLastGeneratedAct(act)

      if (targetField === 'teacher') {
        setSuggestion(act.teacherActivity || act.objective)
      } else {
        setSuggestion(act.studentActivity || act.objective)
      }
      flash('Trợ lý AI đã tạo gợi ý mới!')
    } catch (err: any) {
      toast.error('Lỗi trợ lý AI: ' + (err.message || 'Không thể kết nối Gemini'))
    } finally {
      setAiLoading(false)
    }
  }

  const sendPrompt = async () => {
    if (!prompt.trim()) return
    await runAi(prompt.trim())
    setPrompt('')
  }

  const insertSuggestion = () => {
    if (!suggestion) return
    updateActivity(targetField, `${selected[targetField]}\n\n${suggestion}`.trim())
    flash('Đã chèn nội dung AI vào hoạt động!')
    setSuggestion('')
    setLastGeneratedAct(null)
  }

  const applyFullGeneratedAct = () => {
    if (!lastGeneratedAct) return
    setLesson((current) => ({
      ...current,
      activities: current.activities.map((act) =>
        act.id === selectedId
          ? {
              ...act,
              title: lastGeneratedAct.title || act.title,
              minutes: lastGeneratedAct.durationMinutes || act.minutes,
              objective: lastGeneratedAct.objective || act.objective,
              method: lastGeneratedAct.methods?.join(', ') || act.method,
              technique: lastGeneratedAct.techniques?.join(', ') || act.technique,
              teacher: lastGeneratedAct.teacherActivity || act.teacher,
              students: lastGeneratedAct.studentActivity || act.students,
            }
          : act,
      ),
    }))
    flash('Đã áp dụng toàn bộ hoạt động do AI tạo!')
    setSuggestion('')
    setLastGeneratedAct(null)
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
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('Giáo án')}
            aria-label="Quay lại danh sách giáo án"
            className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                Lớp 4
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">Môn {lesson.subject}</span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500">v{lesson.version || 1}</span>
            </div>
            <input
              value={lesson.title}
              onChange={(event) => updateLesson('title', event.target.value)}
              className="mt-1 border-0 bg-transparent text-xl font-bold text-slate-900 outline-none hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 rounded px-1"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-slate-400">{saved}</span>
          <button
            onClick={save}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-teal-300"
          >
            <Save className="size-4" /> Lưu bản nháp
          </button>
          <button
            onClick={() => setPreview(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100"
          >
            Xem trước
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              disabled={!!exportingType}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-50"
            >
              {exportingType ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              <span>{exportingType ? 'Đang xuất...' : 'Xuất'}</span>
              <ChevronDown className="size-3.5" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <button
                  onClick={() => handleExport('docx')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
                >
                  <FileType className="size-4 text-blue-600" />
                  <span>Xuất Word (.docx)</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-700"
                >
                  <FileType className="size-4 text-rose-600" />
                  <span>Xuất PDF (.pdf)</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setPreview(true)
              setTimeout(() => window.print(), 300)
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="size-4" /> In
          </button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* General Info */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Thông tin chung</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Môn học', 'subject'],
                ['Lớp', 'grade'],
                ['Ngày dạy', 'date'],
              ].map(([label, key]) => (
                <label key={key}>
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
                  <input
                    type={key === 'date' ? 'date' : 'text'}
                    value={lesson[key as 'subject' | 'grade' | 'date'] as string}
                    onChange={(event) =>
                      updateLesson(key as keyof LessonPlan, event.target.value)
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-teal-400"
                  />
                </label>
              ))}
              <label>
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Thời lượng dự kiến
                </span>
                <div className="relative">
                  <Clock3 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    value={totalMinutes}
                    readOnly
                    className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm text-slate-600 outline-none"
                  />
                </div>
              </label>
              <label className="sm:col-span-2 lg:col-span-4">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Mục tiêu bài học
                </span>
                <textarea
                  value={lesson.objective}
                  onChange={(event) => updateLesson('objective', event.target.value)}
                  rows={2}
                  className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-teal-400"
                />
              </label>
            </div>
          </section>

          {/* Activities List */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Tiến trình dạy học</h2>
              <p className="mt-1 text-xs text-slate-400">Kéo thả để sắp xếp các hoạt động</p>
            </div>
            <button
              onClick={add}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-slate-200 hover:ring-teal-300"
            >
              <Plus className="size-4" /> Thêm hoạt động
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {lesson.activities.map((activity, index) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                index={index}
                selected={activity.id === selectedId}
                onSelect={() => setSelectedId(activity.id)}
                onDragStart={() => setDragId(activity.id)}
                onDrop={() => {
                  if (dragId) move(dragId, activity.id)
                  setDragId(null)
                }}
                onChange={updateActivity}
                onDuplicate={duplicate}
                onDelete={remove}
              />
            ))}
          </div>

          {/* Attached Resources Section */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="size-4 text-teal-600" />
                <h2 className="font-semibold text-slate-900">Tài nguyên đính kèm</h2>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                  {lesson.resources?.length || 0}
                </span>
              </div>
              <button
                onClick={() => setResourceModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100"
              >
                <Plus className="size-3.5" /> Thêm tài nguyên
              </button>
            </div>

            {(!lesson.resources || lesson.resources.length === 0) ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <Paperclip className="mx-auto mb-2 size-6 text-slate-300" />
                Chưa có tài nguyên nào được đính kèm. Nhấn "+ Thêm tài nguyên" để liên kết bài giảng, phiếu bài tập hoặc học liệu số.
              </div>
            ) : (
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {lesson.resources.map((res: any) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="grid size-8 place-items-center rounded-lg bg-white shadow-xs shrink-0">
                        {getResourceFileIcon(res.resourceType, res.extension)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate">{res.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {res.formattedSize || '0 KB'} · {res.extension || 'DOC'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleDownloadResource(res)}
                        title="Tải xuống tệp tin"
                        className="grid size-7 place-items-center rounded text-slate-400 hover:bg-white hover:text-teal-700"
                      >
                        <Download className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDetachResource(res.id)}
                        title="Gỡ khỏi giáo án"
                        className="grid size-7 place-items-center rounded text-slate-400 hover:bg-white hover:text-rose-600"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {aiOpen ? (
          <aside className="sticky top-5 flex flex-col gap-4 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm print:hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-teal-100 text-teal-700">
                  <Sparkles className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">Trợ lý AI · Gemini</h2>
                  <p className="text-xs text-teal-600">Đang hỗ trợ: {selected.phase}</p>
                </div>
              </div>
              <button
                onClick={() => setAiOpen(false)}
                aria-label="Thu gọn trợ lý AI"
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Hoạt động đang chọn</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{selected.title}</p>
            </div>
            <div className="flex flex-col gap-2">
              {[
                'Gợi ý hoạt động',
                'Viết hoạt động giáo viên',
                'Viết hoạt động học sinh',
                'Điều chỉnh phù hợp lớp 4',
              ].map((action) => (
                <button
                  key={action}
                  disabled={aiLoading}
                  onClick={() => runAi(action)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
                >
                  <WandSparkles className="size-3.5" />
                  {action}
                </button>
              ))}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-slate-600">Chèn vào</label>
                <select
                  value={targetField}
                  onChange={(event) =>
                    setTargetField(event.target.value as 'teacher' | 'students')
                  }
                  className="rounded border-0 bg-transparent text-xs font-medium text-teal-700 outline-none"
                >
                  <option value="teacher">Hoạt động giáo viên</option>
                  <option value="students">Hoạt động học sinh</option>
                </select>
              </div>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    sendPrompt()
                  }
                }}
                rows={3}
                placeholder="Ví dụ: Gợi ý câu hỏi phân hóa cho học sinh..."
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs leading-5 outline-none focus:border-teal-400"
              />
              <button
                disabled={aiLoading || !prompt.trim()}
                onClick={sendPrompt}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Bot className="size-3.5" />
                )}
                {aiLoading ? 'Đang tạo nội dung...' : 'Hỏi trợ lý AI'}
              </button>
            </div>
            {suggestion && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
                <div className="flex gap-2">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-teal-700" />
                  <p className="whitespace-pre-line text-xs leading-5 text-slate-700">
                    {suggestion}
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-1.5">
                  <button
                    onClick={insertSuggestion}
                    className="w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                  >
                    Chèn vào {targetField === 'teacher' ? 'Hoạt động GV' : 'Hoạt động HS'}
                  </button>
                  {lastGeneratedAct && (
                    <button
                      onClick={applyFullGeneratedAct}
                      className="w-full rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      Áp dụng toàn bộ hoạt động
                    </button>
                  )}
                </div>
              </div>
            )}
          </aside>
        ) : (
          <button
            onClick={() => setAiOpen(true)}
            className="fixed bottom-5 right-5 z-20 inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg print:hidden"
          >
            <Sparkles className="size-4" /> Mở trợ lý AI
          </button>
        )}
      </div>

      {/* Resource Selection / Upload Modal */}
      {resourceModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
                  Học liệu bài dạy
                </p>
                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Đính kèm tài nguyên vào giáo án
                </h2>
              </div>
              <button
                onClick={() => setResourceModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-2 border-b border-slate-100 pb-2">
              <button
                onClick={() => setResourceTab('library')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  resourceTab === 'library'
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Chọn từ kho học liệu ({availableResources.length})
              </button>
              <button
                onClick={() => setResourceTab('upload')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  resourceTab === 'upload'
                    ? 'bg-teal-50 text-teal-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                Tải lên tệp mới ngay
              </button>
            </div>

            {resourceTab === 'library' ? (
              <div className="mt-4">
                {availableResources.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Kho học liệu của bạn đang trống. Hãy chọn tab "Tải lên tệp mới ngay" để thêm tệp.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {availableResources.map((res) => {
                      const isAttached = (lesson.resources || []).some(
                        (r: any) => r.id === res.id,
                      )
                      return (
                        <div
                          key={res.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="grid size-8 place-items-center rounded-lg bg-white shadow-xs shrink-0">
                              {getResourceFileIcon(res.resourceType, res.extension)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 truncate">{res.name}</p>
                              <p className="text-[11px] text-slate-400">
                                {res.formattedSize || '0 KB'} · {res.originalFileName || res.subtitle}
                              </p>
                            </div>
                          </div>

                          {isAttached ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-teal-100 px-2 py-1 text-[11px] font-semibold text-teal-800 ml-2">
                              <Check className="size-3" /> Đã gắn
                            </span>
                          ) : (
                            <button
                              disabled={resourceLoading}
                              onClick={() => handleAttachResource(res)}
                              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 ml-2"
                            >
                              <Plus className="size-3.5" /> Gắn vào bài
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleUploadAndAttach} className="mt-4 flex flex-col gap-3">
                <div
                  onDragEnter={(e) => {
                    e.preventDefault()
                    setResourceDragActive(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setResourceDragActive(false)
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    setResourceDragActive(false)
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0]
                      setNewFile(file)
                      if (!newFileName) setNewFileName(file.name.replace(/\.[^.]+$/, ''))
                    }
                  }}
                  onClick={() => resourceFileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition ${
                    resourceDragActive
                      ? 'border-teal-500 bg-teal-50/50'
                      : newFile
                      ? 'border-teal-400 bg-teal-50/30'
                      : 'border-slate-200 hover:border-teal-400'
                  }`}
                >
                  <input
                    ref={resourceFileInputRef}
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0]
                        setNewFile(file)
                        if (!newFileName) setNewFileName(file.name.replace(/\.[^.]+$/, ''))
                      }
                    }}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.mp4"
                    className="hidden"
                  />

                  {newFile ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="grid size-10 place-items-center rounded-lg bg-teal-100 text-teal-700">
                        <FileIcon className="size-5" />
                      </span>
                      <p className="font-semibold text-xs text-slate-800">{newFile.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {(newFile.size / (1024 * 1024)).toFixed(2)} MB · Nhấn để đổi tệp khác
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <UploadCloud className="size-6 text-slate-400" />
                      <p className="text-xs font-semibold text-slate-700">
                        Kéo thả tập tin vào đây hoặc <span className="text-teal-600 underline">duyệt tệp</span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        PDF, Word, PPTX, Excel, PNG, JPG, MP4 (Tối đa 25MB)
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-600">
                    Tên hiển thị học liệu
                  </label>
                  <input
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="Ví dụ: Phiếu hoạt động nhóm..."
                    className="h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-teal-400"
                  />
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResourceModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={resourceLoading || !newFile}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {resourceLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="size-3.5" />
                    )}
                    Tải lên & Đính kèm
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
              <button
                onClick={() => setResourceModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <Preview
          lesson={lesson}
          onClose={() => setPreview(false)}
          onExport={handleExport}
          exportingType={exportingType}
        />
      )}
    </div>
  )
}

function ActivityCard({
  activity,
  index,
  selected,
  onSelect,
  onDragStart,
  onDrop,
  onChange,
  onDuplicate,
  onDelete,
}: {
  activity: Activity
  index: number
  selected: boolean
  onSelect: () => void
  onDragStart: () => void
  onDrop: () => void
  onChange: (key: keyof Activity, value: string | number) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onClick={onSelect}
      className={`rounded-2xl border bg-white shadow-sm transition ${
        selected ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <button
          aria-label={`Kéo ${activity.phase}`}
          className="cursor-grab text-slate-300 hover:text-teal-600"
        >
          <GripVertical className="size-5" />
        </button>
        <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
          {index + 1}
        </span>
        <input
          value={activity.phase}
          onChange={(event) => onChange('phase', event.target.value)}
          onClick={(event) => event.stopPropagation()}
          className="w-28 border-0 bg-transparent text-xs font-semibold uppercase tracking-wide text-teal-700 outline-none"
        />
        <input
          value={activity.title}
          onChange={(event) => onChange('title', event.target.value)}
          onClick={(event) => event.stopPropagation()}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-teal-200"
        />
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Clock3 className="size-3.5" />
          <input
            type="number"
            value={activity.minutes}
            onChange={(event) => onChange('minutes', Number(event.target.value))}
            onClick={(event) => event.stopPropagation()}
            className="w-8 border-0 bg-transparent text-right outline-none"
          />{' '}
          phút
        </span>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onDuplicate()
          }}
          aria-label="Nhân bản hoạt động"
          className="text-slate-400 hover:text-teal-600"
        >
          <Copy className="size-4" />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
          aria-label="Xóa hoạt động"
          className="text-slate-400 hover:text-rose-600"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Phương pháp
          </span>
          <input
            value={activity.method}
            onChange={(event) => onChange('method', event.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-teal-400"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Kỹ thuật
          </span>
          <input
            value={activity.technique}
            onChange={(event) => onChange('technique', event.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-teal-400"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Năng lực
          </span>
          <input
            value={activity.competencies}
            onChange={(event) => onChange('competencies', event.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-teal-400"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Phẩm chất
          </span>
          <input
            value={activity.qualities}
            onChange={(event) => onChange('qualities', event.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-teal-400"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Mục tiêu hoạt động
          </span>
          <input
            value={activity.objective}
            onChange={(event) => onChange('objective', event.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-teal-400"
          />
        </label>
      </div>
      <div className="grid border-t border-slate-100 sm:grid-cols-2">
        <div className="border-b border-slate-100 p-4 sm:border-b-0 sm:border-r">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Hoạt động giáo viên</span>
            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
              GV
            </span>
          </div>
          <textarea
            value={activity.teacher}
            onFocus={onSelect}
            onChange={(event) => onChange('teacher', event.target.value)}
            rows={5}
            className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 py-2 text-xs leading-5 text-slate-700 outline-none focus:border-teal-400 focus:bg-white"
          />
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Hoạt động học sinh</span>
            <span className="rounded bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
              HS
            </span>
          </div>
          <textarea
            value={activity.students}
            onFocus={onSelect}
            onChange={(event) => onChange('students', event.target.value)}
            rows={5}
            className="w-full resize-y rounded-lg border border-orange-100 bg-white px-2.5 py-2 text-xs leading-5 text-slate-700 outline-none focus:border-orange-400"
          />
        </div>
      </div>
    </article>
  )
}

function Preview({
  lesson,
  onClose,
  onExport,
  exportingType,
}: {
  lesson: LessonPlan
  onClose: () => void
  onExport?: (type: 'docx' | 'pdf') => void
  exportingType?: 'docx' | 'pdf' | null
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 sm:p-8 print:static print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white shadow-xl print:max-w-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 print:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
              Xem trước giáo án
            </p>
            <h2 className="mt-1 font-semibold text-slate-900">Bản in sẵn sàng</h2>
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <>
                <button
                  onClick={() => onExport('docx')}
                  disabled={!!exportingType}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileType className="size-3.5 text-blue-600" />
                  <span>Xuất Word</span>
                </button>
                <button
                  onClick={() => onExport('pdf')}
                  disabled={!!exportingType}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileType className="size-3.5 text-rose-600" />
                  <span>Xuất PDF</span>
                </button>
              </>
            )}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
            >
              <Printer className="size-3.5" /> In
            </button>
            <button
              onClick={onClose}
              aria-label="Đóng xem trước"
              className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"
            >
              <X />
            </button>
          </div>
        </div>
        <div className="p-6 sm:p-10">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              KẾ HOẠCH BÀI DẠY
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">{lesson.title}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {lesson.subject} · {lesson.grade} · Ngày {lesson.date}
            </p>
          </div>
          <div className="mt-8 rounded-xl bg-slate-50 p-4 text-sm leading-6">
            <b>Mục tiêu:</b> {lesson.objective}
          </div>
          <div className="mt-8 flex flex-col gap-6">
            {lesson.activities.map((activity, index) => (
              <section key={activity.id} className="break-inside-avoid">
                <div className="flex items-center justify-between border-b-2 border-teal-600 pb-2">
                  <h3 className="font-bold text-slate-900">
                    {index + 1}. {activity.phase}: {activity.title}
                  </h3>
                  <span className="text-sm text-slate-500">{activity.minutes} phút</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Phương pháp: {activity.method} · Kỹ thuật: {activity.technique} · Năng lực:{' '}
                  {activity.competencies} · Phẩm chất: {activity.qualities}
                </p>
                <p className="mt-2 text-sm">
                  <b>Mục tiêu:</b> {activity.objective}
                </p>
                <div className="mt-3 grid grid-cols-2 border border-slate-300 text-sm">
                  <div className="border-r border-slate-300 p-3">
                    <b className="mb-2 block">Hoạt động giáo viên</b>
                    {activity.teacher}
                  </div>
                  <div className="p-3">
                    <b className="mb-2 block">Hoạt động học sinh</b>
                    {activity.students}
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Attached Resources in Preview */}
          {lesson.resources && lesson.resources.length > 0 && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <h3 className="font-bold text-slate-900 text-sm mb-3">V. TÀI NGUYÊN VÀ HỌC LIỆU ĐÍNH KÈM</h3>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                {lesson.resources.map((r: any) => (
                  <li key={r.id}>
                    <b>{r.name}</b> ({r.formattedSize || '0 KB'}) · {r.originalFileName || ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
