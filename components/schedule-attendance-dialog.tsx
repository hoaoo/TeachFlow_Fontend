'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CheckCircle2, Clock, Loader2, Save, Users, AlertCircle,
  Check, RefreshCw
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
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ScheduleAttendanceResponse | null>(null)
  const [students, setStudents] = useState<ScheduleStudentAttendance[]>([])
  const [sessionNote, setSessionNote] = useState('')
  const [isDirty, setIsDirty] = useState(false)

  const loadData = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      const res = await getScheduleAttendance(id)
      setData(res)
      setStudents(res.students || [])
      setSessionNote(res.note || '')
      setIsDirty(false)
    } catch (err: any) {
      const msg = err?.message || 'Không thể tải thông tin điểm danh cho tiết học này'
      setError(msg)
      toast.error(msg)
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
      setError(null)
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

  // Summary counts calculated dynamically from local state
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
          lateMinutes: s.status === 'LATE' ? Math.max(0, s.lateMinutes || 0) : 0,
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
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && isDirty) {
          if (!confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng không?')) {
            return
          }
        }
        onOpenChange(val)
      }}
    >
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-slate-50 border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="bg-white px-5 sm:px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
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
                {data?.schedule.subjectName || 'Môn học'}
                {data?.schedule.plannedDate ? ` · Ngày ${data.schedule.plannedDate}` : ''}
                {data?.schedule.startTime && data?.schedule.endTime ? ` · ${data.schedule.startTime} - ${data.schedule.endTime}` : ''}
                {data?.schedule.room ? ` · ${data.schedule.room}` : ''}
              </p>
            </div>

            {/* Quick summary stats badge chips */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 rounded-xl p-1.5 border border-slate-200 text-xs font-semibold">
              <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg">
                {summary.present} có mặt
              </span>
              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg" title={`${summary.excused} có phép, ${summary.unexcused} không phép`}>
                {summary.absent} vắng ({summary.excused} phép)
              </span>
              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg">
                {summary.late} đi muộn
              </span>
              <span className="bg-slate-200/80 text-slate-700 px-2.5 py-1 rounded-lg">
                Tổng: {summary.total} HS
              </span>
            </div>
          </div>

          {/* Quick action bar */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleMarkAllPresent}
              disabled={loading || students.length === 0}
              className="text-xs font-semibold bg-teal-50/60 border-teal-200 text-teal-800 hover:bg-teal-100 hover:text-teal-900 shadow-2xs gap-1.5 h-8"
            >
              <Check className="size-3.5 text-teal-600" /> Đánh dấu tất cả có mặt
            </Button>
            <span className="text-xs text-slate-500">
              Chọn trạng thái và ghi chú cho từng học sinh:
            </span>
          </div>
        </div>

        {/* Body: Students List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="size-8 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-sm font-medium">Đang tải danh sách học sinh...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center bg-white rounded-xl border border-rose-200 p-6 space-y-3">
              <AlertCircle className="size-8 mx-auto text-rose-500" />
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => scheduleId && loadData(scheduleId)}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="size-3" /> Thử lại
              </Button>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 p-8">
              <Users className="size-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Lớp chưa có học sinh để điểm danh</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng kiểm tra danh sách phân lớp của lớp học này.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {students.map((student, idx) => {
                const displayName = student.name || student.fullName || (student as any)?.displayName || 'Học sinh không tên'
                const displayCode = student.studentCode || (student as any)?.code || ''
                const displayInitials = student.initials || (displayName ? displayName.trim().split(/\s+/).slice(-2).map((w: string) => w[0]).join('').toUpperCase() : 'HS')
                const isLate = student.status === 'LATE'

                return (
                  <div
                    key={student.studentId || `student-${idx}`}
                    className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border transition-all ${
                      student.status === 'PRESENT'
                        ? 'bg-white border-slate-200 hover:border-teal-200 shadow-2xs'
                        : student.status === 'EXCUSED_ABSENCE'
                          ? 'bg-blue-50/60 border-blue-200 shadow-2xs'
                          : student.status === 'UNEXCUSED_ABSENCE'
                            ? 'bg-rose-50/60 border-rose-200 shadow-2xs'
                            : 'bg-amber-50/60 border-amber-200 shadow-2xs'
                    }`}
                  >
                    {/* Left: Student Identity (STT, Avatar, Name, Code, Gender) */}
                    <div className="flex items-center gap-3 min-w-[200px] shrink-0">
                      <span className="text-xs font-bold text-slate-400 w-6 text-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div
                        className={`size-9 rounded-full grid place-items-center text-xs font-bold shrink-0 border ${
                          student.status === 'PRESENT'
                            ? 'bg-teal-50 text-teal-700 border-teal-200'
                            : student.status === 'EXCUSED_ABSENCE'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : student.status === 'UNEXCUSED_ABSENCE'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {displayInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-slate-900 leading-tight break-words">
                            {displayName}
                          </p>
                          {displayCode && (
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              {displayCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {student.gender || 'Học sinh'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Status Toggle Buttons, Late Minutes, and Note */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 justify-start lg:justify-end">
                      {/* 4 Status Buttons */}
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/90 p-1 text-xs font-medium shrink-0 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.studentId, 'PRESENT')}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium transition-all ${
                            student.status === 'PRESENT'
                              ? 'bg-teal-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          <Check className="size-3" />
                          Có mặt
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.studentId, 'EXCUSED_ABSENCE')}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium transition-all ${
                            student.status === 'EXCUSED_ABSENCE'
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          Có phép
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.studentId, 'UNEXCUSED_ABSENCE')}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium transition-all ${
                            student.status === 'UNEXCUSED_ABSENCE'
                              ? 'bg-rose-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          Vắng
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStatus(student.studentId, 'LATE')}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 font-medium transition-all ${
                            student.status === 'LATE'
                              ? 'bg-amber-600 text-white font-bold shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          <Clock className="size-3" />
                          Đi muộn
                        </button>
                      </div>

                      {/* Late Minutes input if LATE */}
                      {isLate && (
                        <div className="flex items-center gap-1.5 bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs shadow-2xs">
                          <Clock className="size-3.5 text-amber-600" />
                          <input
                            type="number"
                            min="0"
                            max="180"
                            aria-label={`Số phút đi muộn của ${displayName}`}
                            value={student.lateMinutes >= 0 ? student.lateMinutes : 5}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0)
                              handleSetLateMinutes(student.studentId, val)
                            }}
                            className="w-10 text-center font-bold text-amber-900 bg-transparent border-b border-amber-400 focus:outline-hidden"
                          />
                          <span className="text-amber-800 font-medium">phút</span>
                        </div>
                      )}

                      {/* Student note input */}
                      <div className="relative min-w-[160px] sm:w-44 lg:w-48 flex-1 sm:flex-none">
                        <input
                          type="text"
                          aria-label={`Ghi chú cho ${displayName}`}
                          placeholder="Ghi chú học sinh..."
                          value={student.note || ''}
                          onChange={(e) => handleSetNote(student.studentId, e.target.value)}
                          className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-teal-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-5 sm:px-6 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="w-full sm:w-auto flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Ghi chú chung cho tiết dạy (tùy chọn)..."
              value={sessionNote}
              onChange={(e) => {
                setSessionNote(e.target.value)
                setIsDirty(true)
              }}
              className="text-xs h-8.5 bg-slate-50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="text-xs font-semibold h-8.5"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || loading || students.length === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 shadow-xs h-8.5"
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
