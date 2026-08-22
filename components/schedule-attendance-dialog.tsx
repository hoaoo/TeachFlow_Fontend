'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CheckCircle2, Clock, Loader2, Save, Users, X, AlertCircle,
  Check, XCircle, AlertTriangle, ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getScheduleAttendance,
  saveScheduleAttendance,
  type ScheduleAttendanceResponse,
  type ScheduleStudentAttendance,
} from '@/services/attendance-service'

interface ScheduleAttendanceDialogProps {
  scheduleId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

type AttendanceStatus = 'PRESENT' | 'EXCUSED_ABSENCE' | 'UNEXCUSED_ABSENCE' | 'LATE'

export function ScheduleAttendanceDialog({
  scheduleId,
  open,
  onOpenChange,
  onSaved,
}: ScheduleAttendanceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ScheduleAttendanceResponse | null>(null)
  const [students, setStudents] = useState<ScheduleStudentAttendance[]>([])
  const [sessionNote, setSessionNote] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  const loadData = useCallback(async (id: string) => {
    try {
      setLoading(true)
      const res = await getScheduleAttendance(id)
      setData(res)
      setStudents(res.students || [])
      setSessionNote(res.note || '')
      setIsDirty(false)
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tải thông tin điểm danh cho tiết học này')
      setData(null)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && scheduleId) {
      loadData(scheduleId)
    } else {
      setData(null)
      setStudents([])
      setSessionNote('')
      setIsDirty(false)
    }
  }, [open, scheduleId, loadData])

  // Mark all students present
  const handleMarkAllPresent = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'PRESENT',
        lateMinutes: 0,
      }))
    )
    setIsDirty(true)
    toast.success('Đã đánh dấu tất cả học sinh có mặt')
  }

  // Update status of single student
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s
        return {
          ...s,
          status,
          lateMinutes: status === 'LATE' ? (s.lateMinutes > 0 ? s.lateMinutes : 5) : 0,
        }
      })
    )
    setIsDirty(true)
  }

  // Update late minutes for student
  const handleSetLateMinutes = (studentId: string, minutes: number) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s
        return {
          ...s,
          lateMinutes: Math.max(0, minutes),
        }
      })
    )
    setIsDirty(true)
  }

  // Update student note
  const handleSetNote = (studentId: string, note: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s
        return { ...s, note }
      })
    )
    setIsDirty(true)
  }

  // Summary counts
  const summary = useMemo(() => {
    const total = students.length
    const present = students.filter((s) => s.status === 'PRESENT').length
    const excused = students.filter((s) => s.status === 'EXCUSED_ABSENCE').length
    const unexcused = students.filter((s) => s.status === 'UNEXCUSED_ABSENCE').length
    const late = students.filter((s) => s.status === 'LATE').length
    const absent = excused + unexcused
    return { total, present, excused, unexcused, late, absent }
  }, [students])

  // Save attendance
  const handleSave = async () => {
    if (!scheduleId || saving) return

    try {
      setSaving(true)
      const payload = {
        note: sessionNote.trim() || undefined,
        attendances: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          lateMinutes: s.status === 'LATE' ? s.lateMinutes : 0,
          note: s.note?.trim() || undefined,
        })),
      }

      const res = await saveScheduleAttendance(scheduleId, payload)
      toast.success(res.message || 'Lưu điểm danh thành công!')
      setIsDirty(false)
      onSaved?.()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi lưu điểm danh')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && isDirty) {
        if (!confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng không?')) {
          return
        }
      }
      onOpenChange(val)
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-slate-50 border-slate-200">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  Điểm danh {data?.schedule.className || 'tiết học'}
                </h3>
                {data?.isRecorded && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 text-xs font-semibold">
                    <CheckCircle2 className="size-3" /> Đã điểm danh
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {data?.schedule.subjectName || 'Môn học'} · Ngày {data?.schedule.plannedDate} · {data?.schedule.startTime} - {data?.schedule.endTime} · {data?.schedule.room}
              </p>
            </div>

            {/* Quick summary stats pill */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 text-xs font-medium border border-slate-200">
              <span className="text-teal-700 font-bold">{summary.present} có mặt</span>
              <span className="text-slate-300">|</span>
              <span className="text-rose-700 font-bold">{summary.absent} vắng</span>
              <span className="text-slate-300">|</span>
              <span className="text-amber-700 font-bold">{summary.late} đi muộn</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600 font-bold">{summary.total} HS</span>
            </div>
          </div>

          {/* Action bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleMarkAllPresent}
                disabled={loading || students.length === 0}
                className="text-xs font-semibold bg-white border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800 shadow-2xs gap-1.5"
              >
                <Check className="size-3.5 text-teal-600" /> Đánh dấu tất cả có mặt
              </Button>
            </div>
            <div className="text-xs text-slate-500">
              Lựa chọn trạng thái của từng học sinh:
            </div>
          </div>
        </div>

        {/* Body: Students List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="size-8 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-sm font-medium">Đang tải danh sách học sinh...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 p-8">
              <Users className="size-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Lớp chưa có học sinh để điểm danh</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng kiểm tra danh sách học sinh trong lớp học.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student, idx) => {
                const isLate = student.status === 'LATE'
                return (
                  <div
                    key={student.studentId}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                      student.status === 'PRESENT'
                        ? 'bg-white border-slate-200'
                        : student.status === 'EXCUSED_ABSENCE'
                          ? 'bg-blue-50/60 border-blue-200'
                          : student.status === 'UNEXCUSED_ABSENCE'
                            ? 'bg-rose-50/60 border-rose-200'
                            : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs font-semibold text-slate-400 w-5 text-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="size-8 rounded-full bg-slate-100 border border-slate-200 grid place-items-center text-xs font-bold text-slate-700 shrink-0">
                        {student.initials || student.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {student.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {student.gender}
                        </p>
                      </div>
                    </div>

                    {/* Status Buttons & Late Input */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {/* Status toggle group */}
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.studentId, 'PRESENT')}
                          className={`rounded-md px-2.5 py-1 transition-all ${
                            student.status === 'PRESENT'
                              ? 'bg-teal-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Có mặt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.studentId, 'EXCUSED_ABSENCE')}
                          className={`rounded-md px-2.5 py-1 transition-all ${
                            student.status === 'EXCUSED_ABSENCE'
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Có phép
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.studentId, 'UNEXCUSED_ABSENCE')}
                          className={`rounded-md px-2.5 py-1 transition-all ${
                            student.status === 'UNEXCUSED_ABSENCE'
                              ? 'bg-rose-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Vắng
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.studentId, 'LATE')}
                          className={`rounded-md px-2.5 py-1 transition-all ${
                            student.status === 'LATE'
                              ? 'bg-amber-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Đi muộn
                        </button>
                      </div>

                      {/* Late minutes input if LATE */}
                      {isLate && (
                        <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-lg px-2 py-0.5 text-xs">
                          <Clock className="size-3 text-amber-600" />
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={student.lateMinutes || 5}
                            onChange={(e) => handleSetLateMinutes(student.studentId, parseInt(e.target.value) || 0)}
                            className="w-10 text-center font-bold text-amber-800 bg-transparent outline-hidden"
                          />
                          <span className="text-[10px] text-amber-700 font-medium">phút</span>
                        </div>
                      )}

                      {/* Note input */}
                      <input
                        type="text"
                        placeholder="Ghi chú..."
                        value={student.note || ''}
                        onChange={(e) => handleSetNote(student.studentId, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-1 bg-white focus:outline-teal-500 w-32 sm:w-36 text-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="w-full sm:w-auto flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Ghi chú chung cho buổi điểm danh tiết này (tùy chọn)..."
              value={sessionNote}
              onChange={(e) => {
                setSessionNote(e.target.value)
                setIsDirty(true)
              }}
              className="text-xs h-8 bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || loading || students.length === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save className="size-3.5" /> Lưu điểm danh
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
