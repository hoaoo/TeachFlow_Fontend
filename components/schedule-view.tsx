'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Edit2, Filter,
  Loader2, MapPin, MoreHorizontal, Plus, Search, Trash2, X, BookOpen,
  Copy, CheckCircle2, Play, Check, AlertCircle, RefreshCw, Eye,
  Calendar, Layers, UserCheck, ArrowRight, Sparkles, HelpCircle
} from 'lucide-react'
import {
  createSchedule, deleteSchedule, duplicateSchedule, formatDateVN, getDayOfWeekShortVN,
  getDayOfWeekVN, getMonthCalendarMatrix, getMonthRange, getScheduleAttendance, getSchedules,
  getTodayISO, getWeekRange, linkScheduleLessonPlan, unlinkScheduleLessonPlan,
  updateSchedule, updateScheduleStatus, type CreateScheduleData, type DuplicateScheduleData,
  type ScheduleEntry, type UpdateScheduleData, type UpdateScheduleStatusData
} from '@/services/schedule-service'
import { getClasses, type ClassRecord } from '@/services/classroom-service'
import { getMyTeachingContexts } from '@/services/teaching-assignment-service'
import { getLessonPlans, type LessonPlan } from '@/services/lesson-service'
import { useAuth } from '@/context/auth-context'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Types & Constants ───────────────────────────────────────────────────────
interface SubjectOption {
  id: string
  name: string
  code: string
}

type CalendarTab = 'day' | 'week' | 'month'

export function computeScheduleStatus(
  entry: ScheduleEntry,
  nowTime: Date = new Date(),
): { label: string; tone: 'teal' | 'blue' | 'slate' | 'red'; code: string } {
  if (entry.isManualStatus) {
    if (entry.status === 'CANCELLED') return { label: 'Đã hủy', tone: 'red', code: 'CANCELLED' }
    if (entry.status === 'TAUGHT' || entry.status === 'COMPLETED') return { label: 'Đã hoàn thành', tone: 'blue', code: 'TAUGHT' }
    if (entry.status === 'IN_PROGRESS') return { label: 'Đang diễn ra', tone: 'teal', code: 'IN_PROGRESS' }
    if (entry.status === 'PLANNED' || entry.status === 'NOT_STARTED') return { label: 'Chưa bắt đầu', tone: 'slate', code: 'PLANNED' }
  }

  if (entry.status === 'CANCELLED') {
    return { label: 'Đã hủy', tone: 'red', code: 'CANCELLED' }
  }

  const lessonDateStr = entry.plannedDate || nowTime.toISOString().split('T')[0]
  const startStr = entry.startTime || '07:00'
  const endStr = entry.endTime || '07:45'

  const [y, m, d] = (lessonDateStr || '').split('-').map(Number)
  const [sh, sm] = (startStr || '').split(':').map(Number)
  const [eh, em] = (endStr || '').split(':').map(Number)

  if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
    return { label: 'Chưa bắt đầu', tone: 'slate', code: 'PLANNED' }
  }

  const slotStart = new Date(y, m - 1, d, sh, sm, 0)
  const slotEnd = new Date(y, m - 1, d, eh, em, 0)
  const nowMs = nowTime.getTime()

  if (nowMs < slotStart.getTime()) {
    return { label: 'Chưa bắt đầu', tone: 'slate', code: 'PLANNED' }
  } else if (nowMs >= slotStart.getTime() && nowMs <= slotEnd.getTime()) {
    return { label: 'Đang diễn ra', tone: 'teal', code: 'IN_PROGRESS' }
  } else {
    return { label: 'Đã hoàn thành', tone: 'blue', code: 'TAUGHT' }
  }
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptySchedule({ onAdd, message }: { onAdd: () => void; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
      <div className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 shadow-inner">
        <CalendarDays className="size-7" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-700">{message || 'Chưa có lịch dạy nào'}</p>
        <p className="text-xs text-slate-500 mt-1">Nhấn "Thêm lịch dạy" để bắt đầu lên lịch giảng dạy.</p>
      </div>
      <Button onClick={onAdd} className="bg-teal-600 hover:bg-teal-700 font-semibold shadow-xs">
        <Plus className="size-4" /> Thêm lịch dạy
      </Button>
    </div>
  )
}

// ─── Schedule Card (Day & List View) ──────────────────────────────────────────
function ScheduleCard({
  entry,
  nowTime,
  onOpenDetail,
  onEdit,
  onDuplicate,
  onDelete,
  onStartLesson,
  onCompleteLesson,
  onNavigate,
}: {
  entry: ScheduleEntry
  nowTime: Date
  onOpenDetail: (e: ScheduleEntry) => void
  onEdit: (e: ScheduleEntry) => void
  onDuplicate: (e: ScheduleEntry) => void
  onDelete: (e: ScheduleEntry) => void
  onStartLesson: (e: ScheduleEntry) => void
  onCompleteLesson: (e: ScheduleEntry) => void
  onNavigate?: (view: any) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const statusInfo = computeScheduleStatus(entry, nowTime)

  return (
    <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
      {/* Left section: Time + Indicator + Details */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
        {/* Time column */}
        <div className="w-24 shrink-0 text-center rounded-xl bg-slate-50 border border-slate-100 py-2 px-1.5">
          <span className="block text-xs font-bold text-slate-800 tracking-tight">
            {entry.startTime || '07:00'} - {entry.endTime || '07:45'}
          </span>
          {entry.actualStartTime && (
            <span className="mt-0.5 block text-[10px] text-teal-600 font-medium">
              Thực tế: {entry.actualStartTime}{entry.actualEndTime ? `-${entry.actualEndTime}` : ''}
            </span>
          )}
        </div>

        {/* Accent line */}
        <div
          className={`h-10 w-1 rounded-full shrink-0 ${
            statusInfo.tone === 'teal'
              ? 'bg-teal-500'
              : statusInfo.tone === 'blue'
                ? 'bg-blue-500'
                : statusInfo.tone === 'red'
                  ? 'bg-red-400'
                  : 'bg-slate-300'
          }`}
        />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenDetail(entry)}
              className="text-left font-semibold text-sm text-slate-900 hover:text-teal-700 truncate transition"
            >
              {entry.title}
            </button>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {entry.subject?.name || '—'}
            </span>
            {entry.recurrenceType === 'WEEKLY' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 text-[10px] font-medium" title="Lịch lặp hàng tuần">
                <RefreshCw className="size-2.5" /> Lặp tuần
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              {entry.classroom?.name || '—'}
              {entry.classroom?.gradeName ? ` (${entry.classroom.gradeName})` : ''}
            </span>
            {entry.room && (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <MapPin className="size-3" /> {entry.room}
              </span>
            )}
            {entry.lessonPlan && (
              <span className="inline-flex items-center gap-1 text-teal-600 font-medium truncate max-w-[200px]" title={entry.lessonPlan.title}>
                <BookOpen className="size-3 shrink-0" /> {entry.lessonPlan.title}
              </span>
            )}
            {entry.notes && (
              <span className="italic text-slate-400 truncate max-w-[220px]">
                📝 {entry.notes}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right section: Status & Actions */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {/* Status badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
            statusInfo.tone === 'teal'
              ? 'bg-teal-50 text-teal-700 border-teal-200'
              : statusInfo.tone === 'blue'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : statusInfo.tone === 'red'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {statusInfo.tone === 'teal' && <span className="size-1.5 rounded-full bg-teal-500 animate-ping" />}
          {statusInfo.label}
        </span>

        {/* Quick action: Start / Complete */}
        {statusInfo.code === 'PLANNED' && (
          <button
            onClick={() => onStartLesson(entry)}
            className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition shadow-2xs"
            title="Bắt đầu tiết dạy (ghi nhận giờ thực tế)"
          >
            <Play className="size-3" /> Bắt đầu
          </button>
        )}
        {statusInfo.code === 'IN_PROGRESS' && (
          <button
            onClick={() => onCompleteLesson(entry)}
            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition shadow-2xs"
            title="Hoàn thành tiết dạy"
          >
            <Check className="size-3" /> Hoàn thành
          </button>
        )}

        {/* Chi tiết button */}
        <button
          onClick={() => onOpenDetail(entry)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-teal-700 transition shadow-2xs"
        >
          Chi tiết
        </button>

        {/* Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="grid size-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition shadow-2xs"
            aria-label="Tác vụ lịch dạy"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg py-1 text-xs">
              <button
                onClick={() => { setMenuOpen(false); onOpenDetail(entry) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                <Eye className="size-3.5 text-slate-400" /> Xem chi tiết
              </button>
              <button
                onClick={() => { setMenuOpen(false); onEdit(entry) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                <Edit2 className="size-3.5 text-slate-400" /> Sửa lịch dạy
              </button>
              <button
                onClick={() => { setMenuOpen(false); onDuplicate(entry) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
              >
                <Copy className="size-3.5 text-slate-400" /> Nhân bản tiết này
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => { setMenuOpen(false); onDelete(entry) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-3.5" /> Xóa lịch dạy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Visual Timeline Grid for Week View ───────────────────────────────────────
function WeeklyTimetableGrid({
  weekDays,
  schedules,
  nowTime,
  onOpenDetail,
  onAddAtDate,
}: {
  weekDays: string[]
  schedules: ScheduleEntry[]
  nowTime: Date
  onOpenDetail: (e: ScheduleEntry) => void
  onAddAtDate: (dateStr: string) => void
}) {
  const todayISO = getTodayISO()

  // Map schedules by day
  const dayScheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>()
    for (const d of weekDays) map.set(d, [])
    for (const s of schedules) {
      if (s.plannedDate && map.has(s.plannedDate)) {
        map.get(s.plannedDate)!.push(s)
      }
    }
    return map
  }, [weekDays, schedules])

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="min-w-[760px]">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center">
          {weekDays.map((dateStr) => {
            const isToday = dateStr === todayISO
            const d = new Date(dateStr + 'T00:00:00')
            return (
              <div
                key={dateStr}
                className={`py-3 px-2 border-r border-slate-200 last:border-r-0 ${
                  isToday ? 'bg-teal-50/80 font-bold text-teal-900' : 'text-slate-700'
                }`}
              >
                <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  {getDayOfWeekShortVN(dateStr)}
                </p>
                <p className={`mt-0.5 text-sm font-bold ${isToday ? 'text-teal-700' : 'text-slate-800'}`}>
                  {d.getDate()}/{d.getMonth() + 1}
                </p>
              </div>
            )
          })}
        </div>

        {/* Day Content Columns */}
        <div className="grid grid-cols-7 min-h-[380px] divide-x divide-slate-100">
          {weekDays.map((dateStr) => {
            const dayLessons = dayScheduleMap.get(dateStr) || []
            const isToday = dateStr === todayISO
            return (
              <div
                key={dateStr}
                className={`p-2 flex flex-col gap-2 transition ${
                  isToday ? 'bg-teal-50/20' : 'hover:bg-slate-50/40'
                }`}
              >
                {dayLessons.length > 0 ? (
                  dayLessons
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                    .map((lesson) => {
                      const statusInfo = computeScheduleStatus(lesson, nowTime)
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => onOpenDetail(lesson)}
                          className={`cursor-pointer rounded-xl border p-2.5 shadow-2xs hover:shadow-sm transition ${
                            statusInfo.tone === 'teal'
                              ? 'border-teal-300 bg-teal-50 text-teal-900 hover:border-teal-400'
                              : statusInfo.tone === 'blue'
                                ? 'border-blue-200 bg-blue-50/80 text-blue-900 hover:border-blue-300'
                                : statusInfo.tone === 'red'
                                  ? 'border-rose-200 bg-rose-50/70 text-rose-900 opacity-60'
                                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                            <span className="font-mono text-slate-600">
                              {lesson.startTime || '07:00'} - {lesson.endTime || '07:45'}
                            </span>
                            <span
                              className={`size-1.5 rounded-full ${
                                statusInfo.tone === 'teal'
                                  ? 'bg-teal-500 animate-ping'
                                  : statusInfo.tone === 'blue'
                                    ? 'bg-blue-500'
                                    : statusInfo.tone === 'red'
                                      ? 'bg-red-400'
                                      : 'bg-slate-300'
                              }`}
                            />
                          </div>
                          <p className="mt-1 font-semibold text-xs leading-snug line-clamp-2">
                            {lesson.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                            {lesson.subject?.name || '—'} · {lesson.classroom?.name || '—'}
                          </p>
                          {lesson.room && (
                            <p className="mt-0.5 text-[10px] text-slate-400 flex items-center gap-0.5">
                              <MapPin className="size-2.5" /> {lesson.room}
                            </p>
                          )}
                        </div>
                      )
                    })
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-3 text-center">
                    <button
                      onClick={() => onAddAtDate(dateStr)}
                      className="opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-60 transition text-slate-400 hover:text-teal-600 inline-flex flex-col items-center gap-1 text-[11px]"
                    >
                      <Plus className="size-4" />
                      <span>Thêm tiết</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Month Matrix View ────────────────────────────────────────────────────────
function MonthCalendarView({
  currentDate,
  schedules,
  onSelectDate,
  onOpenDetail,
}: {
  currentDate: string
  schedules: ScheduleEntry[]
  onSelectDate: (dateStr: string) => void
  onOpenDetail: (e: ScheduleEntry) => void
}) {
  const matrix = useMemo(() => getMonthCalendarMatrix(currentDate), [currentDate])
  const todayISO = getTodayISO()

  // Map schedules by date
  const scheduleMap = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>()
    for (const s of schedules) {
      if (s.plannedDate) {
        if (!map.has(s.plannedDate)) map.set(s.plannedDate, [])
        map.get(s.plannedDate)!.push(s)
      }
    }
    return map
  }, [schedules])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Day header */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 py-2.5">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar weeks */}
      <div className="divide-y divide-slate-100">
        {matrix.map((week, wIdx) => (
          <div key={wIdx} className="grid grid-cols-7 divide-x divide-slate-100 min-h-[96px]">
            {week.map((cell) => {
              const dayLessons = scheduleMap.get(cell.date) || []
              return (
                <div
                  key={cell.date}
                  onClick={() => onSelectDate(cell.date)}
                  className={`p-2 transition cursor-pointer flex flex-col justify-between ${
                    cell.isToday
                      ? 'bg-teal-50/50'
                      : cell.isCurrentMonth
                        ? 'hover:bg-slate-50/80 bg-white'
                        : 'bg-slate-50/40 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold size-6 grid place-items-center rounded-full ${
                        cell.isToday
                          ? 'bg-teal-600 text-white'
                          : cell.isCurrentMonth
                            ? 'text-slate-700'
                            : 'text-slate-400'
                      }`}
                    >
                      {cell.dayOfMonth}
                    </span>
                    {dayLessons.length > 0 && (
                      <span className="rounded-md bg-teal-100 text-teal-800 text-[10px] font-bold px-1.5 py-0.5">
                        {dayLessons.length} tiết
                      </span>
                    )}
                  </div>

                  {/* Snippet chips */}
                  <div className="mt-1 flex flex-col gap-1">
                    {dayLessons.slice(0, 2).map((l) => (
                      <div
                        key={l.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpenDetail(l)
                        }}
                        className="truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-teal-100 hover:text-teal-800 transition"
                        title={`${l.startTime || ''} ${l.title} (${l.classroom?.name || ''})`}
                      >
                        {l.startTime ? `${l.startTime} ` : ''}{l.subject?.name || l.title}
                      </div>
                    ))}
                    {dayLessons.length > 2 && (
                      <span className="text-[10px] text-slate-400 italic">
                        +{dayLessons.length - 2} tiết khác...
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Lesson Detail Modal / Drawer ─────────────────────────────────────────────
function LessonDetailDialog({
  entry,
  open,
  nowTime,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
  onOpenLessonPicker,
  onUnlinkLessonPlan,
  onNavigate,
}: {
  entry: ScheduleEntry | null
  open: boolean
  nowTime: Date
  onClose: () => void
  onEdit: (e: ScheduleEntry) => void
  onDuplicate: (e: ScheduleEntry) => void
  onDelete: (e: ScheduleEntry) => void
  onStatusChange: (status: string, extra?: { actualStartTime?: string; actualEndTime?: string; postLessonNotes?: string }) => void
  onOpenLessonPicker: (e: ScheduleEntry) => void
  onUnlinkLessonPlan: (e: ScheduleEntry) => void
  onNavigate?: (view: any) => void
}) {
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [attendanceInfo, setAttendanceInfo] = useState<any>(null)
  const [loadingAttendance, setLoadingAttendance] = useState(false)

  useEffect(() => {
    if (entry) {
      setNotesDraft(entry.postLessonNotes || entry.notes || '')
      setLoadingAttendance(true)
      getScheduleAttendance(entry.id)
        .then(setAttendanceInfo)
        .catch(() => setAttendanceInfo(null))
        .finally(() => setLoadingAttendance(false))
    }
  }, [entry, open])

  if (!entry) return null

  const statusInfo = computeScheduleStatus(entry, nowTime)

  const handleSavePostNotes = async () => {
    setSavingNotes(true)
    try {
      await updateScheduleStatus(entry.id, {
        status: entry.status || 'PLANNED',
        postLessonNotes: notesDraft.trim(),
      })
      toast.success('Đã lưu ghi chú sau tiết')
    } catch {
      toast.error('Lỗi khi lưu ghi chú')
    } finally {
      setSavingNotes(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-semibold border ${
                statusInfo.tone === 'teal'
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : statusInfo.tone === 'blue'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : statusInfo.tone === 'red'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {statusInfo.tone === 'teal' && <span className="size-1.5 rounded-full bg-teal-500 animate-ping" />}
              {statusInfo.label}
            </span>
            {entry.recurrenceType === 'WEEKLY' && (
              <span className="rounded-md bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 text-[11px] font-medium">
                Lặp lại hàng tuần
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900 mt-2">
            {entry.title}
          </DialogTitle>
          <DialogDescription>
            {entry.subject?.name || '—'} · Lớp {entry.classroom?.name || '—'}
            {entry.classroom?.gradeName ? ` (${entry.classroom.gradeName})` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 text-sm">
          {/* Timing & Room Box */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3.5 border border-slate-100">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Thời gian dự kiến</p>
              <p className="font-bold text-slate-800 mt-0.5">
                {entry.startTime || '07:00'} - {entry.endTime || '07:45'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Ngày dạy</p>
              <p className="font-bold text-slate-800 mt-0.5">
                {entry.plannedDate ? `${getDayOfWeekVN(entry.plannedDate)}, ${formatDateVN(entry.plannedDate)}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Phòng học</p>
              <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                <MapPin className="size-3 text-slate-400" />
                {entry.room || entry.classroom?.room || 'Chưa xếp phòng'}
              </p>
            </div>
          </div>

          {/* Quick status actions */}
          <div className="flex flex-wrap items-center gap-2 border-y border-slate-100 py-3">
            <span className="text-xs font-semibold text-slate-600 mr-1">Thao tác tiết dạy:</span>
            {entry.status !== 'IN_PROGRESS' && entry.status !== 'TAUGHT' && entry.status !== 'CANCELLED' && (
              <button
                onClick={() => {
                  const nowStr = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
                  onStatusChange('IN_PROGRESS', { actualStartTime: nowStr })
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition shadow-2xs"
              >
                <Play className="size-3" /> Bắt đầu tiết dạy
              </button>
            )}
            {entry.status !== 'TAUGHT' && entry.status !== 'CANCELLED' && (
              <button
                onClick={() => {
                  const nowStr = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
                  onStatusChange('TAUGHT', { actualEndTime: nowStr })
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-2xs"
              >
                <Check className="size-3" /> Hoàn thành tiết
              </button>
            )}
            {entry.status !== 'CANCELLED' ? (
              <button
                onClick={() => onStatusChange('CANCELLED')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700 transition shadow-2xs"
              >
                Hủy tiết dạy
              </button>
            ) : (
              <button
                onClick={() => onStatusChange('PLANNED')}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-100 transition"
              >
                Khôi phục lịch dạy
              </button>
            )}
          </div>

          {/* Workflow Section 1: Lesson Plan */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-teal-600" />
                <h4 className="font-semibold text-slate-900 text-sm">Giáo án giảng dạy</h4>
              </div>
              {entry.lessonPlan ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenLessonPicker(entry)}
                    className="text-xs text-teal-600 hover:underline"
                  >
                    Đổi giáo án
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => onUnlinkLessonPlan(entry)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Gỡ
                  </button>
                </div>
              ) : null}
            </div>

            {entry.lessonPlan ? (
              <div className="rounded-lg bg-teal-50/60 p-3 border border-teal-100">
                <p className="font-semibold text-slate-900 text-sm">{entry.lessonPlan.title}</p>
                {entry.lessonPlan.objectives && (
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                    🎯 Mục tiêu: {entry.lessonPlan.objectives}
                  </p>
                )}
                <div className="mt-2.5 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1"
                    onClick={() => {
                      onClose()
                      onNavigate?.('Giáo án')
                    }}
                  >
                    <Eye className="size-3" /> Mở chi tiết giáo án
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-500">
                <span>Chưa có giáo án nào được gắn với tiết dạy này.</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1 bg-white"
                    onClick={() => onOpenLessonPicker(entry)}
                  >
                    <BookOpen className="size-3" /> Chọn giáo án
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs h-7 gap-1 bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => {
                      onClose()
                      onNavigate?.('Giáo án')
                    }}
                  >
                    <Sparkles className="size-3" /> Soạn mới
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Workflow Section 2: Attendance */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UserCheck className="size-4 text-teal-600" />
                <h4 className="font-semibold text-slate-900 text-sm">Điểm danh lớp học</h4>
              </div>
            </div>

            {loadingAttendance ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="size-3.5 animate-spin text-teal-600" />
                <span>Đang tải thông tin điểm danh...</span>
              </div>
            ) : attendanceInfo?.isRecorded ? (
              <div className="flex items-center justify-between rounded-lg bg-blue-50/70 p-3 border border-blue-100 text-xs">
                <div>
                  <p className="font-semibold text-blue-900">Đã hoàn thành điểm danh</p>
                  <p className="text-blue-700 mt-0.5">
                    {attendanceInfo.presentCount} có mặt · {attendanceInfo.absentCount} vắng mặt
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 bg-white"
                  onClick={() => {
                    onClose()
                    onNavigate?.('Điểm danh')
                  }}
                >
                  Xem chi tiết
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 border border-slate-100 text-xs text-slate-500">
                <span>Chưa có dữ liệu điểm danh cho ngày này.</span>
                <Button
                  size="sm"
                  className="text-xs h-7 bg-teal-600 hover:bg-teal-700 text-white gap-1"
                  onClick={() => {
                    onClose()
                    onNavigate?.('Điểm danh')
                  }}
                >
                  <UserCheck className="size-3" /> Điểm danh ngay
                </Button>
              </div>
            )}
          </div>

          {/* Post-lesson notes & preparation */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-semibold text-slate-900 text-sm">Ghi chú & Cần chuẩn bị</h4>
              <button
                onClick={handleSavePostNotes}
                disabled={savingNotes}
                className="text-xs font-semibold text-teal-600 hover:underline"
              >
                {savingNotes ? 'Đang lưu...' : 'Lưu ghi chú'}
              </button>
            </div>
            <textarea
              rows={2}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="VD: Nhắc học sinh hoàn thành bài tập 4, chuẩn bị tranh ảnh bài sau..."
              className="w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:border-teal-400"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 mr-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onClose(); onDuplicate(entry) }}
              className="gap-1 text-xs"
            >
              <Copy className="size-3.5" /> Nhân bản
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onClose(); onEdit(entry) }}
              className="gap-1 text-xs"
            >
              <Edit2 className="size-3.5" /> Sửa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { onClose(); onDelete(entry) }}
              className="gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="size-3.5" /> Xóa
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Schedule Form Dialog (Create / Edit) ─────────────────────────────────────
function ScheduleFormDialog({
  open,
  onClose,
  classes,
  editEntry,
  defaultDate,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  classes: ClassRecord[]
  editEntry: ScheduleEntry | null
  defaultDate?: string
  onSaved: (entry: ScheduleEntry) => void
}) {
  const isEdit = !!editEntry

  const [title, setTitle] = useState('')
  const [classroomId, setClassroomId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [plannedDate, setPlannedDate] = useState(defaultDate || getTodayISO())
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('07:45')
  const [room, setRoom] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('PLANNED')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('')
  const [recurrenceScope, setRecurrenceScope] = useState<'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL'>('THIS_ONLY')
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Populate form
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
      setIsRecurring(editEntry.recurrenceType === 'WEEKLY')
      setRecurrenceEndDate(editEntry.recurrenceEndDate || '')
      setRecurrenceScope('THIS_ONLY')
    } else {
      setTitle('')
      setClassroomId(classes[0]?.id || '')
      setSubjectId('')
      setPlannedDate(defaultDate || getTodayISO())
      setStartTime('07:00')
      setEndTime('07:45')
      setRoom('')
      setNotes('')
      setStatus('PLANNED')
      setIsRecurring(false)
      // Default recurrence end = 3 months later
      const d = new Date()
      d.setMonth(d.getMonth() + 3)
      setRecurrenceEndDate(d.toISOString().split('T')[0])
      setRecurrenceScope('THIS_ONLY')
    }
  }, [editEntry, open, classes, defaultDate])

  // Load subjects
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
        if (editEntry && filtered.find((s: SubjectOption) => s.id === editEntry.subjectId)) {
          setSubjectId(editEntry.subjectId)
        } else if (filtered.length > 0) {
          setSubjectId(filtered[0].id)
        }
      })
      .catch(() => { if (alive) setSubjects([]) })
      .finally(() => { if (alive) setLoadingSubjects(false) })
    return () => { alive = false }
  }, [classroomId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Vui lòng nhập tên bài / nội dung tiết dạy'); return }
    if (!classroomId) { toast.error('Vui lòng chọn lớp học'); return }
    if (!subjectId) { toast.error('Vui lòng chọn môn học'); return }
    if (startTime && endTime && startTime >= endTime) {
      toast.error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc')
      return
    }

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
          recurrenceScope: editEntry.recurrenceGroupId ? recurrenceScope : undefined,
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
          recurrenceType: isRecurring ? 'WEEKLY' : 'NONE',
          recurrenceEndDate: isRecurring ? recurrenceEndDate || undefined : undefined,
        }
        saved = await createSchedule(payload)
        toast.success(isRecurring ? 'Đã tạo chuỗi lịch dạy lặp lại hàng tuần thành công' : 'Đã thêm lịch dạy mới')
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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa lịch dạy' : 'Thêm lịch dạy mới'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Cập nhật thông tin tiết dạy.' : 'Điền đầy đủ thông tin để lên lịch tiết dạy.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3.5 py-2">
          {/* Tên bài */}
          <div>
            <Label htmlFor="sch-title" className="text-xs font-semibold">
              Tên bài / Nội dung tiết dạy *
            </Label>
            <Input
              id="sch-title"
              className="mt-1"
              placeholder="VD: Tiết 1: Ôn tập các phép tính với phân số"
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
                required
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
                required
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

          {/* Môn học */}
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

          {/* If edit: read-only class/subject */}
          {isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-500">Lớp</Label>
                <div className="mt-1 h-9 flex items-center rounded-md border bg-slate-50 px-3 text-xs text-slate-700">
                  {editEntry?.classroom?.name || '—'}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500">Môn</Label>
                <div className="mt-1 h-9 flex items-center rounded-md border bg-slate-50 px-3 text-xs text-slate-700">
                  {editEntry?.subject?.name || '—'}
                </div>
              </div>
            </div>
          )}

          {/* Recurrence Settings when creating */}
          {!isEdit && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 size-4"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Lặp lại lịch dạy hàng tuần
                </span>
              </label>

              {isRecurring && (
                <div className="mt-3 pt-3 border-t border-slate-200/80">
                  <Label htmlFor="sch-rec-end" className="text-xs font-medium text-slate-600">
                    Lặp lại đến ngày (kết thúc học kỳ / năm học):
                  </Label>
                  <Input
                    id="sch-rec-end"
                    type="date"
                    className="mt-1 bg-white"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    required={isRecurring}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Hệ thống sẽ tự động tạo các tiết học vào cùng khung giờ các tuần tiếp theo và kiểm tra trùng lịch.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recurrence Scope when editing a recurring schedule */}
          {isEdit && editEntry?.recurrenceGroupId && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5">
              <Label className="text-xs font-semibold text-violet-900">
                Tiết dạy này thuộc chuỗi lặp lại hàng tuần. Áp dụng thay đổi:
              </Label>
              <div className="mt-2 flex flex-col gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recScope"
                    value="THIS_ONLY"
                    checked={recurrenceScope === 'THIS_ONLY'}
                    onChange={() => setRecurrenceScope('THIS_ONLY')}
                    className="text-teal-600"
                  />
                  <span className="text-slate-800 font-medium">Chỉ tiết học này</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recScope"
                    value="THIS_AND_FUTURE"
                    checked={recurrenceScope === 'THIS_AND_FUTURE'}
                    onChange={() => setRecurrenceScope('THIS_AND_FUTURE')}
                    className="text-teal-600"
                  />
                  <span className="text-slate-800 font-medium">Tiết này và tất cả các tiết sau</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recScope"
                    value="ALL"
                    checked={recurrenceScope === 'ALL'}
                    onChange={() => setRecurrenceScope('ALL')}
                    className="text-teal-600"
                  />
                  <span className="text-slate-800 font-medium">Toàn bộ chuỗi lặp lại</span>
                </label>
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
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:border-teal-400"
              placeholder="VD: Mang theo thước kẻ và phiếu bài tập..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button
            onClick={handleSubmit as any}
            disabled={submitting || (subjects.length === 0 && !isEdit && !!classroomId)}
            className="bg-teal-600 hover:bg-teal-700 font-semibold"
          >
            {submitting && <Loader2 className="size-4 animate-spin mr-1" />}
            {isEdit ? 'Lưu thay đổi' : 'Thêm lịch dạy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Duplicate Dialog ─────────────────────────────────────────────────────────
function DuplicateScheduleDialog({
  entry,
  onClose,
  onDuplicated,
}: {
  entry: ScheduleEntry | null
  onClose: () => void
  onDuplicated: (created: ScheduleEntry) => void
}) {
  const [plannedDate, setPlannedDate] = useState(getTodayISO())
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('07:45')
  const [title, setTitle] = useState('')
  const [duplicating, setDuplicating] = useState(false)

  useEffect(() => {
    if (entry) {
      setTitle(entry.title || '')
      setPlannedDate(getTodayISO())
      setStartTime(entry.startTime || '07:00')
      setEndTime(entry.endTime || '07:45')
    }
  }, [entry])

  if (!entry) return null

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (startTime >= endTime) {
      toast.error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc')
      return
    }

    setDuplicating(true)
    try {
      const created = await duplicateSchedule(entry.id, {
        plannedDate,
        startTime,
        endTime,
        title: title.trim() || undefined,
      })
      toast.success('Đã nhân bản tiết dạy thành công')
      onDuplicated(created)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi nhân bản lịch dạy')
    } finally {
      setDuplicating(false)
    }
  }

  return (
    <Dialog open={!!entry} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nhân bản tiết dạy</DialogTitle>
          <DialogDescription>
            Tạo một tiết dạy mới dựa trên thông tin môn học và lớp của tiết hiện tại.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDuplicate} className="grid gap-3.5 py-2 text-sm">
          <div>
            <Label className="text-xs font-semibold">Tên bài học</Label>
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold">Ngày dạy mới *</Label>
            <Input
              type="date"
              className="mt-1"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Giờ bắt đầu *</Label>
              <Input
                type="time"
                className="mt-1"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Giờ kết thúc *</Label>
              <Input
                type="time"
                className="mt-1"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-100">
            <p>Lớp: <span className="font-semibold">{entry.classroom?.name}</span></p>
            <p>Môn: <span className="font-semibold">{entry.subject?.name}</span></p>
          </div>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={duplicating}>Hủy</Button>
            <Button type="submit" disabled={duplicating} className="bg-teal-600 hover:bg-teal-700">
              {duplicating && <Loader2 className="size-4 animate-spin mr-1" />}
              Xác nhận nhân bản
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Lesson Plan Picker Dialog ────────────────────────────────────────────────
function LessonPlanPickerDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  onSelect: (lp: LessonPlan) => void
}) {
  const [plans, setPlans] = useState<LessonPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      setLoading(true)
      getLessonPlans()
        .then(setPlans)
        .catch(() => setPlans([]))
        .finally(() => setLoading(false))
    }
  }, [open])

  const filtered = useMemo(() => {
    if (!search.trim()) return plans
    const q = search.toLowerCase()
    return plans.filter((p) =>
      `${p.title} ${p.subject} ${p.grade}`.toLowerCase().includes(q)
    )
  }, [plans, search])

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chọn giáo án liên kết</DialogTitle>
          <DialogDescription>
            Gắn giáo án đã soạn vào tiết dạy này để tiện theo dõi kế hoạch bài giảng.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên giáo án, môn học..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[220px]">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-teal-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Không tìm thấy giáo án nào phù hợp.
            </div>
          ) : (
            filtered.map((lp) => (
              <div
                key={lp.id}
                onClick={() => onSelect(lp)}
                className="group flex items-center justify-between p-3 hover:bg-teal-50/60 cursor-pointer rounded-xl transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-teal-700 truncate">
                    {lp.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {lp.subject} · Lớp {lp.grade} · {lp.duration || 40} phút
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="text-xs text-teal-600 shrink-0">
                  Chọn
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

// ─── Delete Dialog with Recurrence Scope ──────────────────────────────────────
function DeleteScheduleDialog({
  entry,
  onClose,
  onDeleted,
}: {
  entry: ScheduleEntry | null
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [scope, setScope] = useState<'THIS_ONLY' | 'THIS_AND_FUTURE' | 'ALL'>('THIS_ONLY')
  const [deleting, setDeleting] = useState(false)

  if (!entry) return null

  const isRecurring = Boolean(entry.recurrenceGroupId)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteSchedule(entry.id, isRecurring ? scope : 'THIS_ONLY')
      toast.success('Đã xóa lịch dạy thành công')
      onDeleted(entry.id)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa lịch dạy')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!entry} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa lịch dạy</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa tiết "{entry.title}" ({entry.classroom?.name})?
          </DialogDescription>
        </DialogHeader>

        {isRecurring ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 my-2">
            <Label className="text-xs font-semibold text-rose-900">
              Tiết dạy này thuộc chuỗi lặp lại hàng tuần. Chọn phạm vi xóa:
            </Label>
            <div className="mt-2 flex flex-col gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="delScope"
                  value="THIS_ONLY"
                  checked={scope === 'THIS_ONLY'}
                  onChange={() => setScope('THIS_ONLY')}
                  className="text-rose-600"
                />
                <span className="text-slate-800 font-medium">Chỉ xóa tiết này</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="delScope"
                  value="THIS_AND_FUTURE"
                  checked={scope === 'THIS_AND_FUTURE'}
                  onChange={() => setScope('THIS_AND_FUTURE')}
                  className="text-rose-600"
                />
                <span className="text-slate-800 font-medium">Xóa tiết này và các tiết sau</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="delScope"
                  value="ALL"
                  checked={scope === 'ALL'}
                  onChange={() => setScope('ALL')}
                  className="text-rose-600"
                />
                <span className="text-slate-800 font-medium">Xóa toàn bộ chuỗi lặp lại</span>
              </label>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 my-2">Hành động này không thể hoàn tác.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Hủy</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="size-4 animate-spin mr-1" />}
            Xác nhận xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main ScheduleView Component ──────────────────────────────────────────────
export function ScheduleView({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const { user } = useAuth()

  // State
  const [tab, setTab] = useState<CalendarTab>('week')
  const [weekSubView, setWeekSubView] = useState<'grid' | 'list'>('grid')
  const [currentDate, setCurrentDate] = useState(getTodayISO())
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterClassId, setFilterClassId] = useState('')
  const [filterSubjectId, setFilterSubjectId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modals & Drawers
  const [formOpen, setFormOpen] = useState(false)
  const [formDefaultDate, setFormDefaultDate] = useState<string | undefined>(undefined)
  const [editEntry, setEditEntry] = useState<ScheduleEntry | null>(null)
  const [detailEntry, setDetailEntry] = useState<ScheduleEntry | null>(null)
  const [duplicateEntry, setDuplicateEntry] = useState<ScheduleEntry | null>(null)
  const [deleteEntry, setDeleteEntry] = useState<ScheduleEntry | null>(null)
  const [lessonPickerSchedule, setLessonPickerSchedule] = useState<ScheduleEntry | null>(null)

  // Realtime clock
  const [nowTime, setNowTime] = useState<Date>(() => new Date())
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() =>
    new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )

  const reqSeqRef = useRef(0)

  // Clock interval (1s)
  useEffect(() => {
    const timer = setInterval(() => {
      const n = new Date()
      setNowTime(n)
      setCurrentTimeStr(
        n.toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Range calculation
  const { dateFrom, dateTo, label, weekDays } = useMemo(() => {
    if (tab === 'day') {
      return {
        dateFrom: currentDate,
        dateTo: currentDate,
        label: `${getDayOfWeekVN(currentDate)}, ${formatDateVN(currentDate)}`,
        weekDays: [currentDate],
      }
    } else if (tab === 'week') {
      const range = getWeekRange(currentDate)
      return {
        dateFrom: range.from,
        dateTo: range.to,
        label: `Tuần: ${formatDateVN(range.from)} – ${formatDateVN(range.to)}`,
        weekDays: range.days,
      }
    } else {
      const range = getMonthRange(currentDate)
      const d = new Date(currentDate + 'T00:00:00')
      return {
        dateFrom: range.from,
        dateTo: range.to,
        label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
        weekDays: [],
      }
    }
  }, [tab, currentDate])

  // Load schedule with request race condition protection
  const loadData = useCallback(async () => {
    if (!user) {
      setSchedules([])
      setLoading(false)
      return
    }

    const reqId = ++reqSeqRef.current
    setLoading(true)
    setError(null)

    try {
      const data = await getSchedules({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        classroomId: filterClassId || undefined,
        subjectId: filterSubjectId || undefined,
        status: filterStatus || undefined,
        search: searchQuery.trim() || undefined,
      })
      if (reqId === reqSeqRef.current) {
        setSchedules(Array.isArray(data) ? data : [])
      }
    } catch (err: any) {
      if (reqId === reqSeqRef.current) {
        setError(err?.message || 'Không thể tải danh sách lịch dạy lúc này')
        setSchedules([])
      }
    } finally {
      if (reqId === reqSeqRef.current) {
        setLoading(false)
      }
    }
  }, [user, dateFrom, dateTo, filterClassId, filterSubjectId, filterStatus, searchQuery])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    getClasses().then(setClasses).catch(() => setClasses([]))
  }, [])

  // Unique subjects for filter
  const allSubjects = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>()
    schedules.forEach((s) => {
      if (s.subject) seen.set(s.subject.id, { id: s.subject.id, name: s.subject.name })
    })
    return Array.from(seen.values())
  }, [schedules])

  // Filtered schedules for rendering
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return schedules
    const q = searchQuery.toLowerCase().trim()
    return schedules.filter((s) =>
      `${s.title} ${s.subject?.name || ''} ${s.classroom?.name || ''} ${s.room || ''} ${s.notes || ''}`
        .toLowerCase()
        .includes(q)
    )
  }, [schedules, searchQuery])

  // Summary statistics
  const stats = useMemo(() => {
    const total = filtered.length
    const taught = filtered.filter((s) => computeScheduleStatus(s, nowTime).code === 'TAUGHT').length
    const inProgress = filtered.filter((s) => computeScheduleStatus(s, nowTime).code === 'IN_PROGRESS').length
    const planned = filtered.filter((s) => computeScheduleStatus(s, nowTime).code === 'PLANNED').length
    const cancelled = filtered.filter((s) => s.status === 'CANCELLED').length
    return { total, taught, inProgress, planned, cancelled }
  }, [filtered, nowTime])

  // Grouped by plannedDate
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleEntry[]>()
    filtered.forEach((e) => {
      const key = e.plannedDate || 'no-date'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  // Navigation handlers
  const handleNavigateDate = (dir: -1 | 1) => {
    const d = new Date(currentDate + 'T00:00:00')
    if (tab === 'day') d.setDate(d.getDate() + dir)
    else if (tab === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setCurrentDate(d.toISOString().split('T')[0])
  }

  const handleStatusChange = async (
    target: ScheduleEntry,
    newStatus: string,
    extra?: { actualStartTime?: string; actualEndTime?: string; postLessonNotes?: string },
  ) => {
    try {
      const updated = await updateScheduleStatus(target.id, {
        status: newStatus,
        ...extra,
        isManualStatus: true,
      })
      setSchedules((prev) => prev.map((s) => (s.id === target.id ? updated : s)))
      if (detailEntry?.id === target.id) {
        setDetailEntry(updated)
      }
      toast.success('Đã cập nhật trạng thái tiết dạy')
    } catch (err: any) {
      toast.error(err?.message || 'Không thể cập nhật trạng thái lúc này')
    }
  }

  const handleLinkLessonPlan = async (schedule: ScheduleEntry, lp: LessonPlan) => {
    if (!lp.id) return
    try {
      const updated = await linkScheduleLessonPlan(schedule.id, lp.id)
      setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? updated : s)))
      if (detailEntry?.id === schedule.id) {
        setDetailEntry(updated)
      }
      setLessonPickerSchedule(null)
      toast.success(`Đã gắn giáo án "${lp.title}"`)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi gắn giáo án')
    }
  }

  const handleUnlinkLessonPlan = async (schedule: ScheduleEntry) => {
    try {
      const updated = await unlinkScheduleLessonPlan(schedule.id)
      setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? updated : s)))
      if (detailEntry?.id === schedule.id) {
        setDetailEntry(updated)
      }
      toast.success('Đã gỡ liên kết giáo án')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi gỡ giáo án')
    }
  }

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-600">
            <CalendarDays className="size-4" /> TeachFlow Workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Lịch dạy</h1>
          <p className="mt-2 text-sm text-slate-500">
            Lập lịch, theo dõi tiến độ tiết học, gắn giáo án và điểm danh nhanh.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Realtime clock */}
          <div className="flex items-center gap-1.5 rounded-xl bg-teal-50 px-3 py-2 text-xs font-mono font-bold text-teal-700 border border-teal-200 shadow-2xs">
            <Clock className="size-3.5 animate-pulse text-teal-600" />
            <span>{currentTimeStr}</span>
          </div>

          <Button
            onClick={() => {
              setEditEntry(null)
              setFormDefaultDate(currentDate)
              setFormOpen(true)
            }}
            className="bg-teal-600 hover:bg-teal-700 shadow-sm"
          >
            <Plus className="size-4" /> Thêm lịch dạy
          </Button>
        </div>
      </div>

      {/* Navigation & Tab Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Tab switcher: Day | Week | Month */}
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
          {(['day', 'week', 'month'] as CalendarTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                tab === t ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {t === 'day' ? 'Hôm nay' : t === 'week' ? 'Tuần' : 'Tháng'}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => handleNavigateDate(-1)}
            className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
            title="Trước"
          >
            <ChevronLeft className="size-4" />
          </button>

          <span className="text-xs sm:text-sm font-semibold text-slate-800 min-w-[160px] sm:min-w-[200px] text-center">
            {label}
          </span>

          <button
            onClick={() => handleNavigateDate(1)}
            className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
            title="Sau"
          >
            <ChevronRight className="size-4" />
          </button>

          <button
            onClick={() => setCurrentDate(getTodayISO())}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            Hôm nay
          </button>
        </div>

        {/* Week subview toggle (Grid vs List) */}
        {tab === 'week' && (
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => setWeekSubView('grid')}
              className={`rounded-lg px-2.5 py-1 transition ${
                weekSubView === 'grid' ? 'bg-white font-semibold text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Thời khóa biểu
            </button>
            <button
              onClick={() => setWeekSubView('list')}
              className={`rounded-lg px-2.5 py-1 transition ${
                weekSubView === 'list' ? 'bg-white font-semibold text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Danh sách
            </button>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bài dạy, môn, lớp, phòng học..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs sm:text-sm outline-none focus:border-teal-400 shadow-2xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Filter by subject */}
        {allSubjects.length > 0 && (
          <select
            aria-label="Lọc theo môn"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs"
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
          >
            <option value="">Tất cả môn</option>
            {allSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        {/* Filter by status */}
        <select
          aria-label="Lọc theo trạng thái"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs sm:text-sm font-medium text-slate-700 shadow-2xs"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PLANNED">Chưa bắt đầu</option>
          <option value="IN_PROGRESS">Đang diễn ra</option>
          <option value="TAUGHT">Đã hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Tổng số tiết', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Đã hoàn thành', value: stats.taught, color: 'text-blue-700', bg: 'bg-blue-50/50' },
          { label: 'Đang diễn ra', value: stats.inProgress, color: 'text-teal-700', bg: 'bg-teal-50/50' },
          { label: 'Chưa bắt đầu', value: stats.planned, color: 'text-slate-600', bg: 'bg-slate-50' },
          { label: 'Đã hủy', value: stats.cancelled, color: 'text-rose-600', bg: 'bg-rose-50/40' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border border-slate-200 ${bg} p-3.5 shadow-2xs`}>
            <p className="text-xs text-slate-500 font-medium">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="size-8 animate-spin text-teal-600" />
          <span className="text-sm font-medium">Đang tải lịch dạy...</span>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-8 text-center shadow-xs">
          <AlertCircle className="mx-auto size-8 text-rose-500 mb-2" />
          <p className="text-sm font-semibold text-rose-900">{error}</p>
          <button
            onClick={loadData}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition"
          >
            Thử lại
          </button>
        </div>
      ) : filtered.length === 0 && tab !== 'month' && (tab !== 'week' || weekSubView !== 'grid') ? (
        <EmptySchedule
          onAdd={() => {
            setEditEntry(null)
            setFormDefaultDate(currentDate)
            setFormOpen(true)
          }}
          message={`Không có lịch dạy nào trong ${tab === 'day' ? 'ngày này' : 'tuần này'}`}
        />
      ) : tab === 'day' ? (
        /* Day View */
        <div className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <ScheduleCard
              key={entry.id}
              entry={entry}
              nowTime={nowTime}
              onOpenDetail={setDetailEntry}
              onEdit={(e) => { setEditEntry(e); setFormOpen(true) }}
              onDuplicate={setDuplicateEntry}
              onDelete={setDeleteEntry}
              onStartLesson={(e) => {
                const nowStr = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
                handleStatusChange(e, 'IN_PROGRESS', { actualStartTime: nowStr })
              }}
              onCompleteLesson={(e) => {
                const nowStr = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
                handleStatusChange(e, 'TAUGHT', { actualEndTime: nowStr })
              }}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : tab === 'week' && weekSubView === 'grid' ? (
        /* Week Visual Timetable Grid */
        <WeeklyTimetableGrid
          weekDays={weekDays}
          schedules={filtered}
          nowTime={nowTime}
          onOpenDetail={setDetailEntry}
          onAddAtDate={(d) => {
            setEditEntry(null)
            setFormDefaultDate(d)
            setFormOpen(true)
          }}
        />
      ) : tab === 'week' && weekSubView === 'list' ? (
        /* Week List View Grouped by Day */
        <div className="flex flex-col gap-6">
          {grouped.map(([dateKey, entries]) => (
            <div key={dateKey}>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">
                  {dateKey === 'no-date' ? 'Chưa định ngày' : `${getDayOfWeekVN(dateKey)}, ${formatDateVN(dateKey)}`} ({entries.length} tiết)
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="flex flex-col gap-3">
                {entries.map((entry) => (
                  <ScheduleCard
                    key={entry.id}
                    entry={entry}
                    nowTime={nowTime}
                    onOpenDetail={setDetailEntry}
                    onEdit={(e) => { setEditEntry(e); setFormOpen(true) }}
                    onDuplicate={setDuplicateEntry}
                    onDelete={setDeleteEntry}
                    onStartLesson={(e) => {
                      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
                      handleStatusChange(e, 'IN_PROGRESS', { actualStartTime: nowStr })
                    }}
                    onCompleteLesson={(e) => {
                      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit' })
                      handleStatusChange(e, 'TAUGHT', { actualEndTime: nowStr })
                    }}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Month View */
        <MonthCalendarView
          currentDate={currentDate}
          schedules={filtered}
          onSelectDate={(d) => {
            setCurrentDate(d)
            setTab('day')
          }}
          onOpenDetail={setDetailEntry}
        />
      )}

      {/* Detail Dialog */}
      <LessonDetailDialog
        entry={detailEntry}
        open={!!detailEntry}
        nowTime={nowTime}
        onClose={() => setDetailEntry(null)}
        onEdit={(e) => { setEditEntry(e); setFormOpen(true) }}
        onDuplicate={setDuplicateEntry}
        onDelete={setDeleteEntry}
        onStatusChange={(status, extra) => {
          if (detailEntry) handleStatusChange(detailEntry, status, extra)
        }}
        onOpenLessonPicker={setLessonPickerSchedule}
        onUnlinkLessonPlan={handleUnlinkLessonPlan}
        onNavigate={onNavigate}
      />

      {/* Create / Edit Form Dialog */}
      <ScheduleFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditEntry(null) }}
        classes={classes}
        editEntry={editEntry}
        defaultDate={formDefaultDate}
        onSaved={loadData}
      />

      {/* Duplicate Dialog */}
      <DuplicateScheduleDialog
        entry={duplicateEntry}
        onClose={() => setDuplicateEntry(null)}
        onDuplicated={loadData}
      />

      {/* Delete Dialog */}
      <DeleteScheduleDialog
        entry={deleteEntry}
        onClose={() => setDeleteEntry(null)}
        onDeleted={loadData}
      />

      {/* Lesson Plan Picker Dialog */}
      <LessonPlanPickerDialog
        open={!!lessonPickerSchedule}
        onClose={() => setLessonPickerSchedule(null)}
        onSelect={(lp) => {
          if (lessonPickerSchedule) {
            handleLinkLessonPlan(lessonPickerSchedule, lp)
          }
        }}
      />
    </div>
  )
}
