'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Edit2, Filter,
  Loader2, MapPin, MoreHorizontal, Plus, Search, Trash2, X, BookOpen
} from 'lucide-react'
import {
  createSchedule, deleteSchedule, formatDateVN, getDayOfWeekVN,
  getMonthRange, getSchedules, getTodayISO, getWeekRange, updateSchedule,
  type CreateScheduleData, type ScheduleEntry, type UpdateScheduleData
} from '@/services/schedule-service'
import {
  getClasses,
  type ClassRecord
} from '@/services/classroom-service'
import { getMyTeachingContexts } from '@/services/teaching-assignment-service'
import { api } from '@/services/api-client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Subject interface from teaching context ────────────────────────────────
interface SubjectOption {
  id: string
  name: string
  code: string
}

type CalendarTab = 'day' | 'week' | 'month'

// ─── Status display ─────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Đã lên lịch',
  TAUGHT: 'Đã dạy',
  CANCELLED: 'Đã hủy',
}
const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-teal-100 text-teal-700',
  TAUGHT: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-red-100 text-red-600',
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptySchedule({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
      <CalendarDays className="size-12 text-slate-300" />
      <div className="text-center">
        <p className="font-medium text-slate-600">Chưa có lịch dạy nào</p>
        <p className="text-sm mt-1">Nhấn "Thêm lịch dạy" để bắt đầu lên lịch.</p>
      </div>
      <Button onClick={onAdd}>
        <Plus className="size-4" /> Thêm lịch dạy đầu tiên
      </Button>
    </div>
  )
}

// ─── Schedule Card ────────────────────────────────────────────────────────────
function ScheduleCard({ entry, onEdit, onDelete }: {
  entry: ScheduleEntry
  onEdit: (e: ScheduleEntry) => void
  onDelete: (e: ScheduleEntry) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const status = entry.status || 'PLANNED'

  return (
    <div className="relative flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Left accent */}
      <div className={`w-1 rounded-full shrink-0 ${status === 'PLANNED' ? 'bg-teal-500' : status === 'TAUGHT' ? 'bg-blue-500' : 'bg-red-400'}`} />

      {/* Time column */}
      <div className="w-20 shrink-0 flex flex-col items-center justify-center text-center">
        {entry.startTime ? (
          <>
            <span className="text-sm font-bold text-slate-800">{entry.startTime}</span>
            {entry.endTime && <span className="text-xs text-slate-400 mt-0.5">{entry.endTime}</span>}
          </>
        ) : (
          <span className="text-xs text-slate-400">Chưa đặt giờ</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm leading-snug">{entry.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {entry.subject?.name || '—'} · {entry.classroom?.name || '—'}
              {entry.classroom?.gradeName ? ` (${entry.classroom.gradeName})` : ''}
            </p>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(entry) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Edit2 className="size-3.5" /> Sửa lịch
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(entry) }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-3.5" /> Xóa lịch
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded-md px-2 py-0.5 font-medium ${STATUS_COLORS[status] || 'bg-slate-100 text-slate-600'}`}>
            {STATUS_LABELS[status] || status}
          </span>
          {entry.room && (
            <span className="flex items-center gap-1 text-slate-400">
              <MapPin className="size-3" />{entry.room}
            </span>
          )}
          {entry.plannedDate && (
            <span className="text-slate-400">
              {getDayOfWeekVN(entry.plannedDate)}, {formatDateVN(entry.plannedDate)}
            </span>
          )}
        </div>
        {entry.notes && (
          <p className="mt-1.5 text-xs text-slate-400 italic truncate">📝 {entry.notes}</p>
        )}
      </div>
    </div>
  )
}

// ─── Schedule Form Dialog ─────────────────────────────────────────────────────
function ScheduleFormDialog({
  open, onClose, classes, editEntry, onSaved
}: {
  open: boolean
  onClose: () => void
  classes: ClassRecord[]
  editEntry: ScheduleEntry | null
  onSaved: (entry: ScheduleEntry) => void
}) {
  const isEdit = !!editEntry

  const [title, setTitle] = useState('')
  const [classroomId, setClassroomId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [plannedDate, setPlannedDate] = useState(getTodayISO())
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('07:45')
  const [room, setRoom] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('PLANNED')
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Populate form when editing
  useEffect(() => {
    if (editEntry) {
      setTitle(editEntry.title || '')
      setClassroomId(editEntry.classroomId || '')
      setSubjectId(editEntry.subjectId || '')
      setPlannedDate(editEntry.plannedDate || getTodayISO())
      setStartTime(editEntry.startTime || '07:00')
      setEndTime(editEntry.endTime || '07:45')
      setRoom(editEntry.room || '')
      setNotes(editEntry.notes || '')
      setStatus(editEntry.status || 'PLANNED')
    } else {
      setTitle('')
      setClassroomId(classes[0]?.id || '')
      setSubjectId('')
      setPlannedDate(getTodayISO())
      setStartTime('07:00')
      setEndTime('07:45')
      setRoom('')
      setNotes('')
      setStatus('PLANNED')
    }
  }, [editEntry, open, classes])

  // Load subjects from teaching contexts when classroom changes
  useEffect(() => {
    if (!classroomId) { setSubjects([]); return }
    let alive = true
    setLoadingSubjects(true)
    setSubjectId('')
    getMyTeachingContexts()
      .then((contexts) => {
        if (!alive) return
        const filtered = contexts
          .filter((c: any) => c.classroomId === classroomId && c.isActive !== false)
          .map((c: any) => ({
            id: c.subject?.id || c.subjectId,
            name: c.subject?.name || c.subjectId,
            code: c.subject?.code || '',
          }))
          .filter((s: SubjectOption) => s.id)
        setSubjects(filtered)
        // If editing, keep existing subject selection
        if (editEntry && filtered.find((s: SubjectOption) => s.id === editEntry.subjectId)) {
          setSubjectId(editEntry.subjectId)
        } else if (filtered.length > 0) {
          setSubjectId(filtered[0].id)
        }
      })
      .catch(() => {
        if (alive) setSubjects([])
      })
      .finally(() => { if (alive) setLoadingSubjects(false) })
    return () => { alive = false }
  }, [classroomId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Vui lòng nhập tên bài / nội dung tiết dạy'); return }
    if (!classroomId) { toast.error('Vui lòng chọn lớp học'); return }
    if (!subjectId) { toast.error('Vui lòng chọn môn học'); return }
    if (startTime && endTime && startTime >= endTime) { toast.error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc'); return }

    setSubmitting(true)
    try {
      let saved: ScheduleEntry
      if (isEdit && editEntry) {
        const payload: UpdateScheduleData = {
          title: title.trim(),
          plannedDate: plannedDate || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          room: room.trim() || undefined,
          notes: notes.trim() || undefined,
          status,
        }
        saved = await updateSchedule(editEntry.id, payload)
        toast.success('Đã cập nhật lịch dạy')
      } else {
        const payload: CreateScheduleData = {
          title: title.trim(),
          classroomId,
          subjectId,
          plannedDate: plannedDate || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          room: room.trim() || undefined,
          notes: notes.trim() || undefined,
        }
        saved = await createSchedule(payload)
        toast.success('Đã thêm lịch dạy mới')
      }
      onSaved(saved)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu lịch dạy')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa lịch dạy' : 'Thêm lịch dạy mới'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Cập nhật thông tin tiết dạy.' : 'Điền đầy đủ thông tin để lên lịch tiết dạy.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          {/* Nội dung tiết dạy */}
          <div>
            <Label htmlFor="sch-title" className="text-xs font-semibold">
              Tên bài / Nội dung tiết dạy *
            </Label>
            <Input
              id="sch-title"
              className="mt-1"
              placeholder="VD: Phân số và phép chia số tự nhiên"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Ngày dạy */}
          <div>
            <Label htmlFor="sch-date" className="text-xs font-semibold">Ngày dạy *</Label>
            <Input
              id="sch-date"
              type="date"
              className="mt-1"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              required
            />
          </div>

          {/* Giờ bắt đầu / kết thúc */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sch-start" className="text-xs font-semibold">Giờ bắt đầu *</Label>
              <Input
                id="sch-start"
                type="time"
                className="mt-1"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sch-end" className="text-xs font-semibold">Giờ kết thúc *</Label>
              <Input
                id="sch-end"
                type="time"
                className="mt-1"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Lớp học */}
          {!isEdit && (
            <div>
              <Label htmlFor="sch-class" className="text-xs font-semibold">Lớp *</Label>
              <select
                id="sch-class"
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
                required
              >
                <option value="">— Chọn lớp —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Môn học — từ teaching contexts của lớp đã chọn */}
          {!isEdit && (
            <div>
              <Label htmlFor="sch-subject" className="text-xs font-semibold">
                Môn học * {loadingSubjects && <Loader2 className="inline size-3 animate-spin ml-1" />}
              </Label>
              {subjects.length > 0 ? (
                <select
                  id="sch-subject"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                >
                  <option value="">— Chọn môn —</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <div className="mt-1 rounded-md border bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {classroomId
                    ? 'Chưa có môn học được khai báo cho lớp này. Vào "Thư viện hoạt động" để khai báo ngữ cảnh giảng dạy.'
                    : 'Vui lòng chọn lớp trước.'}
                </div>
              )}
            </div>
          )}

          {/* If edit: show classroom/subject as read-only */}
          {isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-500">Lớp (không thể đổi)</Label>
                <div className="mt-1 h-9 flex items-center rounded-md border bg-slate-50 px-3 text-sm text-slate-600">
                  {editEntry?.classroom?.name || '—'}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500">Môn (không thể đổi)</Label>
                <div className="mt-1 h-9 flex items-center rounded-md border bg-slate-50 px-3 text-sm text-slate-600">
                  {editEntry?.subject?.name || '—'}
                </div>
              </div>
            </div>
          )}

          {/* Phòng học */}
          <div>
            <Label htmlFor="sch-room" className="text-xs font-semibold">Phòng học</Label>
            <Input
              id="sch-room"
              className="mt-1"
              placeholder="VD: Phòng 204"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </div>

          {/* Ghi chú */}
          <div>
            <Label htmlFor="sch-notes" className="text-xs font-semibold">Ghi chú</Label>
            <textarea
              id="sch-notes"
              rows={2}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-teal-400"
              placeholder="VD: Chuẩn bị phiếu bài tập..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Trạng thái (chỉ hiện khi edit) */}
          {isEdit && (
            <div>
              <Label htmlFor="sch-status" className="text-xs font-semibold">Trạng thái</Label>
              <select
                id="sch-status"
                className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="PLANNED">Đã lên lịch</option>
                <option value="TAUGHT">Đã dạy</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit as any} disabled={submitting || (subjects.length === 0 && !isEdit && !!classroomId)}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Thêm lịch dạy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────
function DeleteScheduleDialog({ entry, onClose, onDeleted }: {
  entry: ScheduleEntry | null
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!entry) return
    setDeleting(true)
    try {
      await deleteSchedule(entry.id)
      toast.success('Đã xóa lịch dạy')
      onDeleted(entry.id)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa lịch dạy')
    } finally {
      setDeleting(false)
    }
  }

  const confirmText = entry
    ? `Xóa tiết ${entry.subject?.name || 'dạy'} lớp ${entry.classroom?.name || ''}${entry.startTime ? ` lúc ${entry.startTime}` : ''}${entry.plannedDate ? ` ngày ${formatDateVN(entry.plannedDate)}` : ''}?`
    : ''

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Xóa lịch dạy</DialogTitle>
          <DialogDescription>{confirmText}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-slate-500">Hành động này không thể hoàn tác.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Hủy</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="size-4 animate-spin" />} Xóa lịch dạy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ScheduleView ────────────────────────────────────────────────────────
export function ScheduleView() {
  const [tab, setTab] = useState<CalendarTab>('week')
  const [currentDate, setCurrentDate] = useState(getTodayISO())
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterClassId, setFilterClassId] = useState('')
  const [filterSubjectId, setFilterSubjectId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null)
  const [deleteEntry, setDeleteEntry] = useState<ScheduleEntry | null>(null)

  // Calculate date range for current view
  const { dateFrom, dateTo, label } = useMemo(() => {
    if (tab === 'day') {
      return { dateFrom: currentDate, dateTo: currentDate, label: `${getDayOfWeekVN(currentDate)}, ${formatDateVN(currentDate)}` }
    } else if (tab === 'week') {
      const range = getWeekRange(currentDate)
      return { ...range, label: `Tuần: ${formatDateVN(range.from)} – ${formatDateVN(range.to)}` }
    } else {
      const range = getMonthRange(currentDate)
      const d = new Date(currentDate + 'T00:00:00')
      return { ...range, label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}` }
    }
  }, [tab, currentDate])

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getSchedules({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        classroomId: filterClassId || undefined,
        subjectId: filterSubjectId || undefined,
      })
      setSchedules(data)
    } catch {
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, filterClassId, filterSubjectId])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  useEffect(() => {
    getClasses().then(setClasses).catch(() => setClasses([]))
  }, [])

  // Unique subjects from loaded schedule
  const allSubjects = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>()
    schedules.forEach((s) => {
      if (s.subject) seen.set(s.subject.id, { id: s.subject.id, name: s.subject.name })
    })
    return Array.from(seen.values())
  }, [schedules])

  const filtered = useMemo(() => {
    if (!query) return schedules
    const q = query.toLowerCase()
    return schedules.filter((s) =>
      `${s.title} ${s.subject?.name || ''} ${s.classroom?.name || ''} ${s.room || ''} ${s.notes || ''}`
        .toLowerCase()
        .includes(q)
    )
  }, [schedules, query])

  // Navigation
  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate + 'T00:00:00')
    if (tab === 'day') d.setDate(d.getDate() + dir)
    else if (tab === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d.toISOString().split('T')[0])
  }

  const handleSaved = (entry: ScheduleEntry) => {
    setSchedules((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = entry
        return next.sort((a, b) => {
          if (a.plannedDate !== b.plannedDate) return (a.plannedDate || '').localeCompare(b.plannedDate || '')
          return (a.startTime || '').localeCompare(b.startTime || '')
        })
      }
      return [entry, ...prev].sort((a, b) => {
        if (a.plannedDate !== b.plannedDate) return (a.plannedDate || '').localeCompare(b.plannedDate || '')
        return (a.startTime || '').localeCompare(b.startTime || '')
      })
    })
  }

  const handleDeleted = (id: string) => {
    setSchedules((prev) => prev.filter((e) => e.id !== id))
  }

  // Group by date for display
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>()
    filtered.forEach((e) => {
      const key = e.plannedDate || 'no-date'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-600">
            <CalendarDays className="size-4" /> TeachFlow Workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Lịch dạy</h1>
          <p className="mt-2 text-sm text-slate-500">Lập lịch, xem tiết dạy và chuẩn bị nội dung theo từng ngày.</p>
        </div>
        <Button onClick={() => { setEditEntry(null); setFormOpen(true) }}>
          <Plus className="size-4" /> Thêm lịch dạy
        </Button>
      </div>

      {/* Calendar Tabs + Navigation */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Tab switcher */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 gap-1">
          {(['day', 'week', 'month'] as CalendarTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {t === 'day' ? 'Hôm nay' : t === 'week' ? 'Tuần' : 'Tháng'}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50">
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[180px] text-center">{label}</span>
          <button onClick={() => navigate(1)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50">
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => setCurrentDate(getTodayISO())}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Hôm nay
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm bài dạy, môn, lớp..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-teal-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter by class */}
        <select
          aria-label="Lọc theo lớp"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
          value={filterClassId}
          onChange={(e) => setFilterClassId(e.target.value)}
        >
          <option value="">Tất cả lớp</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Filter by subject */}
        {allSubjects.length > 0 && (
          <select
            aria-label="Lọc theo môn"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
          >
            <option value="">Tất cả môn</option>
            {allSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng tiết', value: filtered.length, color: 'text-slate-900' },
          { label: 'Đã dạy', value: filtered.filter((e) => e.status === 'TAUGHT').length, color: 'text-blue-600' },
          { label: 'Chưa dạy', value: filtered.filter((e) => e.status === 'PLANNED').length, color: 'text-teal-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Schedule list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptySchedule onAdd={() => { setEditEntry(null); setFormOpen(true) }} />
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([dateKey, entries]) => (
            <div key={dateKey}>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  {dateKey === 'no-date' ? 'Chưa xếp ngày' : `${getDayOfWeekVN(dateKey)}, ${formatDateVN(dateKey)}`}
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <ScheduleCard
                    key={entry.id}
                    entry={entry}
                    onEdit={(e) => { setEditEntry(e); setFormOpen(true) }}
                    onDelete={(e) => setDeleteEntry(e)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ScheduleFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditEntry(null) }}
        classes={classes}
        editEntry={editEntry}
        onSaved={handleSaved}
      />
      <DeleteScheduleDialog
        entry={deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onDeleted={handleDeleted}
      />
    </div>
  )
}
