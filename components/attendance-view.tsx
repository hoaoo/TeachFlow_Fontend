'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2, ChevronLeft, Clock, Loader2, Plus, Save, Users, X, History, Edit2
} from 'lucide-react'
import { getClasses, type ClassRecord } from '@/services/classroom-service'
import { api } from '@/services/api-client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ─── Types ────────────────────────────────────────────────────────────────────
type AttendanceStatus = 'PRESENT' | 'EXCUSED_ABSENCE' | 'UNEXCUSED_ABSENCE' | 'LATE'

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Có mặt',
  EXCUSED_ABSENCE: 'Vắng có phép',
  UNEXCUSED_ABSENCE: 'Vắng không phép',
  LATE: 'Đi muộn',
}
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-teal-100 text-teal-700 border-teal-200',
  EXCUSED_ABSENCE: 'bg-blue-100 text-blue-700 border-blue-200',
  UNEXCUSED_ABSENCE: 'bg-red-100 text-red-700 border-red-200',
  LATE: 'bg-orange-100 text-orange-700 border-orange-200',
}

interface StudentAttendanceEntry {
  studentId: string
  studentName: string
  status: AttendanceStatus
  note: string
}

interface AttendanceSession {
  id: string
  classroomId: string
  classroom?: { name: string }
  attendanceDate: string
  sessionPeriod?: string
  title?: string
  status?: string
  attendances: Array<{
    studentId: string
    student?: { fullName: string }
    status: AttendanceStatus
    note?: string
  }>
}

interface HistorySession {
  id: string
  attendanceDate: string
  sessionPeriod?: string
  title?: string
  status?: string
  classroomId: string
  classroom?: { name: string }
  present?: number
  absent?: number
  total?: number
}

// ─── API helpers ─────────────────────────────────────────────────────────────
async function getAttendanceHistory(params?: { classroomId?: string }): Promise<HistorySession[]> {
  try {
    const qs = params?.classroomId ? `?classroomId=${params.classroomId}` : ''
    const data = await api.get<any>(`/attendance${qs}`)
    // Backend may return { sessions: [...] } or []
    const arr = Array.isArray(data) ? data : (data?.sessions || data?.data || [])
    return arr
  } catch { return [] }
}

async function getAttendanceSession(sessionId: string): Promise<AttendanceSession | null> {
  try { return await api.get<AttendanceSession>(`/attendance/${sessionId}`) }
  catch { return null }
}

async function getClassStudentsForAttendance(classroomId: string): Promise<Array<{ id: string; fullName: string }>> {
  try {
    const data = await api.get<any>(`/classes/${classroomId}/students`)
    return Array.isArray(data) ? data : (data?.students || [])
  } catch { return [] }
}

async function saveAttendanceSession(data: {
  classroomId: string
  attendanceDate: string
  sessionPeriod: string
  entries: Array<{ studentId: string; status: AttendanceStatus; note?: string }>
}) {
  return api.put('/attendance', {
    classId: data.classroomId,
    date: data.attendanceDate,
    sessionPeriod: data.sessionPeriod,
    attendances: data.entries.map((e) => ({
      studentId: e.studentId,
      status: e.status,
      note: e.note || undefined,
    })),
  })
}

// ─── Session flow: Step 1 = Select class+date, Step 2 = Mark, Step 3 = History ──
type FlowStep = 'select' | 'mark' | 'history'

export function AttendanceView() {
  const [step, setStep] = useState<FlowStep>('select')
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionPeriod, setSessionPeriod] = useState('MORNING')
  const [students, setStudents] = useState<Array<{ id: string; fullName: string }>>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [entries, setEntries] = useState<StudentAttendanceEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [editSessionId, setEditSessionId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistorySession[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [filterClass, setFilterClass] = useState('')

  // Load classes
  useEffect(() => {
    getClasses()
      .then((cls) => { setClasses(cls); setLoadingClasses(false) })
      .catch(() => setLoadingClasses(false))
  }, [])

  // Load history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const data = await getAttendanceHistory(filterClass ? { classroomId: filterClass } : undefined)
      setHistory(data)
    } catch { setHistory([]) }
    finally { setLoadingHistory(false) }
  }, [filterClass])

  useEffect(() => {
    if (step === 'history') loadHistory()
  }, [step, loadHistory])

  // Start attendance session
  const startSession = async () => {
    if (!selectedClass) { toast.error('Vui lòng chọn lớp'); return }
    setLoadingStudents(true)
    try {
      const studs = await getClassStudentsForAttendance(selectedClass.id)
      if (studs.length === 0) {
        toast.error('Lớp này chưa có học sinh. Vui lòng thêm học sinh trước.')
        setLoadingStudents(false)
        return
      }
      setStudents(studs)
      setEntries(studs.map((s) => ({ studentId: s.id, studentName: s.fullName, status: 'PRESENT', note: '' })))
      setEditSessionId(null)
      setStep('mark')
    } catch { toast.error('Lỗi khi tải danh sách học sinh') }
    finally { setLoadingStudents(false) }
  }

  // Edit existing session
  const editSession = async (session: HistorySession) => {
    setLoadingStudents(true)
    try {
      const full = await getAttendanceSession(session.id)
      const studs = await getClassStudentsForAttendance(session.classroomId)
      setStudents(studs)
      if (full) {
        // Merge student list with existing attendance
        setEntries(studs.map((s) => {
          const existing = full.attendances.find((a) => a.studentId === s.id)
          return {
            studentId: s.id,
            studentName: s.fullName,
            status: existing?.status || 'PRESENT',
            note: existing?.note || '',
          }
        }))
      } else {
        setEntries(studs.map((s) => ({ studentId: s.id, studentName: s.fullName, status: 'PRESENT', note: '' })))
      }
      const cls = classes.find((c) => c.id === session.classroomId)
      setSelectedClass(cls || null)
      setSelectedDate(session.attendanceDate.split('T')[0])
      setSessionPeriod(session.sessionPeriod || 'MORNING')
      setEditSessionId(session.id)
      setStep('mark')
    } catch { toast.error('Lỗi khi tải phiên điểm danh') }
    finally { setLoadingStudents(false) }
  }

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setEntries((prev) => prev.map((e) => e.studentId === studentId ? { ...e, status } : e))
  }

  const setNote = (studentId: string, note: string) => {
    setEntries((prev) => prev.map((e) => e.studentId === studentId ? { ...e, note } : e))
  }

  const markAll = (status: AttendanceStatus) => {
    setEntries((prev) => prev.map((e) => ({ ...e, status })))
  }

  const saveSession = async () => {
    if (!selectedClass) return
    setSaving(true)
    try {
      const payload = {
        classroomId: selectedClass.id,
        attendanceDate: selectedDate,
        sessionPeriod,
        entries: entries.map((e) => ({ studentId: e.studentId, status: e.status, note: e.note || undefined })),
      }
      await saveAttendanceSession(payload)
      toast.success('Đã lưu điểm danh thành công')
      setStep('history')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu điểm danh')
    } finally { setSaving(false) }
  }

  const stats = useMemo(() => ({
    present: entries.filter((e) => e.status === 'PRESENT').length,
    late: entries.filter((e) => e.status === 'LATE').length,
    absent: entries.filter((e) => e.status !== 'PRESENT' && e.status !== 'LATE').length,
    total: entries.length,
  }), [entries])

  // ─── Step 1: Select class and date ───────────────────────────────────────
  if (step === 'select') return (
    <div className="mx-auto max-w-lg flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-600">
          <CheckCircle2 className="size-4" /> TeachFlow Workspace
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Điểm danh</h1>
        <p className="mt-2 text-sm text-slate-500">Điểm danh nhanh, ghi nhận lý do vắng và xem lịch sử chuyên cần.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-5">
        <h2 className="font-semibold text-slate-800">Bắt đầu điểm danh</h2>

        <div>
          <label className="text-xs font-semibold text-slate-700">Lớp học *</label>
          {loadingClasses ? (
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400"><Loader2 className="size-3.5 animate-spin" />Đang tải...</div>
          ) : (
            <select
              aria-label="Chọn lớp"
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedClass?.id || ''}
              onChange={(e) => setSelectedClass(classes.find((c) => c.id === e.target.value) || null)}
            >
              <option value="">— Chọn lớp —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Ngày điểm danh *</label>
          <input
            type="date"
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700">Buổi học</label>
          <select
            aria-label="Buổi học"
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={sessionPeriod}
            onChange={(e) => setSessionPeriod(e.target.value)}
          >
            <option value="MORNING">Buổi sáng</option>
            <option value="AFTERNOON">Buổi chiều</option>
          </select>
        </div>

        <Button onClick={startSession} disabled={!selectedClass || loadingStudents} className="w-full">
          {loadingStudents ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Bắt đầu điểm danh
        </Button>
      </div>

      <button onClick={() => setStep('history')} className="flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700">
        <History className="size-4" /> Xem lịch sử điểm danh
      </button>
    </div>
  )

  // ─── Step 2: Mark attendance ──────────────────────────────────────────────
  if (step === 'mark') return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep('select')} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
          <ChevronLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Điểm danh {selectedClass?.name} — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('vi-VN')}
          </h1>
          <p className="text-xs text-slate-500">
            {sessionPeriod === 'MORNING' ? 'Buổi sáng' : 'Buổi chiều'} · {students.length} học sinh
          </p>
        </div>
      </div>

      {/* Quick mark all */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Đánh dấu tất cả:</span>
        {(Object.entries(STATUS_LABELS) as Array<[AttendanceStatus, string]>).map(([s, label]) => (
          <button
            key={s}
            onClick={() => markAll(s)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${STATUS_COLORS[s]}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Tổng', value: stats.total, color: 'text-slate-900' },
          { label: 'Có mặt', value: stats.present, color: 'text-teal-700' },
          { label: 'Đi muộn', value: stats.late, color: 'text-orange-600' },
          { label: 'Vắng', value: stats.absent, color: 'text-red-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Student list */}
      <div className="flex flex-col gap-2">
        {entries.map((entry, idx) => (
          <div key={entry.studentId} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{entry.studentName}</p>
              </div>
              {/* Status buttons */}
              <div className="flex gap-1 flex-wrap justify-end">
                {(Object.entries(STATUS_LABELS) as Array<[AttendanceStatus, string]>).map(([s, label]) => (
                  <button
                    key={s}
                    onClick={() => setStatus(entry.studentId, s)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${entry.status === s ? STATUS_COLORS[s] + ' shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {(entry.status === 'EXCUSED_ABSENCE' || entry.status === 'UNEXCUSED_ABSENCE' || entry.status === 'LATE') && (
              <div className="mt-2 ml-12">
                <input
                  type="text"
                  value={entry.note}
                  onChange={(e) => setNote(entry.studentId, e.target.value)}
                  placeholder="Ghi chú lý do..."
                  className="h-8 w-full rounded-md border bg-slate-50 px-3 text-xs outline-none focus:border-teal-400"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save */}
      <div className="flex gap-3 justify-end sticky bottom-4">
        <Button variant="outline" onClick={() => setStep('select')}>Hủy</Button>
        <Button onClick={saveSession} disabled={saving} className="shadow-md">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {editSessionId ? 'Cập nhật điểm danh' : 'Lưu điểm danh'}
        </Button>
      </div>
    </div>
  )

  // ─── Step 3: History ──────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-3xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('select')} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
            <ChevronLeft className="size-4" />
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Lịch sử điểm danh</h1>
        </div>
        <Button onClick={() => setStep('select')}>
          <Plus className="size-4" /> Điểm danh mới
        </Button>
      </div>

      {/* Filter */}
      <select
        aria-label="Lọc theo lớp"
        className="h-10 w-full sm:w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        value={filterClass}
        onChange={(e) => setFilterClass(e.target.value)}
      >
        <option value="">Tất cả lớp</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      {loadingHistory ? (
        <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-teal-600" /></div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
          <History className="size-12 text-slate-300" />
          <p className="text-center text-sm text-slate-500">Chưa có phiên điểm danh nào.<br />Nhấn "Điểm danh mới" để bắt đầu.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm">
                  {s.classroom?.name || classes.find((c) => c.id === s.classroomId)?.name || 'Lớp học'} —{' '}
                  {new Date(s.attendanceDate).toLocaleDateString('vi-VN')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {s.sessionPeriod === 'MORNING' ? 'Buổi sáng' : s.sessionPeriod === 'AFTERNOON' ? 'Buổi chiều' : ''}
                  {s.present !== undefined ? ` · ${s.present}/${s.total || '?'} có mặt` : ''}
                </p>
              </div>
              <button
                onClick={() => editSession(s)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                <Edit2 className="size-3.5" /> Sửa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
