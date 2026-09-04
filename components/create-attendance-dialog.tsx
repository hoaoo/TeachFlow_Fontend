'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CheckCircle2, Clock, Loader2, Save, Users, AlertCircle,
  Check, Calendar, BookOpen, Layers
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getClassStudents } from '@/services/classroom-service'
import { createAttendanceSession } from '@/services/attendance-service'

interface CreateAttendanceDialogProps {
  classroomId: string
  classroomName?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

type AttendanceStatus = 'PRESENT' | 'EXCUSED_ABSENCE' | 'UNEXCUSED_ABSENCE' | 'LATE'

interface StudentItem {
  studentId: string
  name: string
  studentCode: string
  initials: string
  gender: string
  status: AttendanceStatus
  lateMinutes: number
  note: string
}

export function CreateAttendanceDialog({
  classroomId,
  classroomName = 'Lớp học',
  open,
  onOpenChange,
  onSaved,
}: CreateAttendanceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [sessionPeriod, setSessionPeriod] = useState('MORNING')
  const [customPeriod, setCustomPeriod] = useState('')
  const [title, setTitle] = useState('')
  const [sessionNote, setSessionNote] = useState('')
  const [students, setStudents] = useState<StudentItem[]>([])
  const [isDirty, setIsDirty] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | AttendanceStatus>('ALL')

  // Load students for this classroom
  const loadStudents = useCallback(async () => {
    if (!classroomId) return
    try {
      setLoading(true)
      setError(null)
      const res = await getClassStudents(classroomId)
      const active = (Array.isArray(res) ? res : []).filter(
        (s: any) => s.status !== 'TRANSFER_OUT' && s.status !== 'INACTIVE'
      )

      const mapped: StudentItem[] = active.map((s) => {
        const name = s.fullName || (s as any).name || 'Học sinh'
        const initials =
          (s as any).initials ||
          (name
            ? name
                .trim()
                .split(/\s+/)
                .slice(-2)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase()
            : 'HS')
        const gender =
          s.gender === 'FEMALE' ? 'Nữ' : s.gender === 'MALE' ? 'Nam' : s.gender || ''

        return {
          studentId: s.id,
          name,
          studentCode: s.studentCode || '',
          initials,
          gender,
          status: 'PRESENT', // By default all learners are PRESENT (38/38)
          lateMinutes: 0,
          note: '',
        }
      })

      setStudents(mapped)
      setIsDirty(false)
    } catch (err: any) {
      const msg = err?.message || 'Không thể tải danh sách học sinh của lớp này'
      setError(msg)
      toast.error(msg)
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [classroomId])

  useEffect(() => {
    if (open) {
      setDate(new Date().toISOString().split('T')[0])
      setSessionPeriod('MORNING')
      setCustomPeriod('')
      setTitle('')
      setSessionNote('')
      setStatusFilter('ALL')
      loadStudents()
    } else {
      setStudents([])
      setIsDirty(false)
      setError(null)
    }
  }, [open, loadStudents])

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
    toast.success('Đã đặt tất cả học sinh có mặt')
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

  // Update late minutes
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

  // Update note
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

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (statusFilter === 'ALL') return students
    return students.filter((s) => s.status === statusFilter)
  }, [students, statusFilter])

  // Save attendance session
  const handleSave = async () => {
    if (!classroomId || saving) return

    const finalPeriod =
      sessionPeriod === 'CUSTOM'
        ? (customPeriod.trim().toUpperCase() || 'CUSTOM')
        : sessionPeriod

    try {
      setSaving(true)
      const payload = {
        classId: classroomId,
        date,
        sessionPeriod: finalPeriod,
        title: title.trim() || undefined,
        note: sessionNote.trim() || undefined,
        attendances: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          lateMinutes: s.status === 'LATE' ? Math.max(0, s.lateMinutes || 0) : 0,
          note: s.note?.trim() || undefined,
        })),
      }

      const res = await createAttendanceSession(payload)
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
      <DialogContent size="xl" className="p-0 overflow-hidden bg-slate-50 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-white px-5 sm:px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">
                  Điểm danh mới · {classroomName}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 text-xs font-semibold">
                  <CheckCircle2 className="size-3" /> Mặc định có mặt {summary.present}/{summary.total}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tạo buổi điểm danh linh hoạt theo buổi hoặc tiết học, tự động nạp danh sách học sinh.
              </p>
            </div>

            {/* Quick summary stats chips */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 rounded-xl p-1.5 border border-slate-200 text-xs font-semibold">
              <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg">
                {summary.present} có mặt
              </span>
              <span
                className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg"
                title={`${summary.excused} có phép, ${summary.unexcused} không phép`}
              >
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

          {/* Session Parameters: Date, Period, Title */}
          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100">
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                Ngày điểm danh
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setIsDirty(true)
                }}
                className="text-xs h-8.5 bg-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                Buổi / Loại buổi
              </label>
              <select
                value={sessionPeriod}
                onChange={(e) => {
                  setSessionPeriod(e.target.value)
                  setIsDirty(true)
                }}
                className="w-full text-xs h-8.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 font-medium text-slate-800 focus:outline-teal-500"
              >
                <option value="MORNING">Buổi sáng</option>
                <option value="AFTERNOON">Buổi chiều</option>
                <option value="PERIOD_1">Tiết 1</option>
                <option value="PERIOD_2">Tiết 2</option>
                <option value="PERIOD_3">Tiết 3</option>
                <option value="PERIOD_4">Tiết 4</option>
                <option value="PERIOD_5">Tiết 5</option>
                <option value="LECTURE">Lý thuyết / Lecture</option>
                <option value="LAB">Thực hành / Lab</option>
                <option value="CUSTOM">Khác (tùy chỉnh)...</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                {sessionPeriod === 'CUSTOM' ? 'Tên buổi tùy chỉnh' : 'Môn học / Tiêu đề (tùy chọn)'}
              </label>
              {sessionPeriod === 'CUSTOM' ? (
                <Input
                  type="text"
                  placeholder="Nhập mã buổi (ví dụ: CA_TOI)..."
                  value={customPeriod}
                  onChange={(e) => {
                    setCustomPeriod(e.target.value)
                    setIsDirty(true)
                  }}
                  className="text-xs h-8.5 bg-white"
                />
              ) : (
                <Input
                  type="text"
                  placeholder="Ví dụ: Toán, Sinh hoạt lớp, Lab 01..."
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setIsDirty(true)
                  }}
                  className="text-xs h-8.5 bg-white"
                />
              )}
            </div>
          </div>

          {/* Quick filter & Action Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleMarkAllPresent}
                disabled={loading || students.length === 0}
                className="text-xs font-semibold bg-teal-50/60 border-teal-200 text-teal-800 hover:bg-teal-100 hover:text-teal-900 shadow-2xs gap-1.5 h-7.5 cursor-pointer"
              >
                <Check className="size-3.5 text-teal-600" /> Tất cả có mặt
              </Button>

              <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Lọc:</span>
              {(['ALL', 'PRESENT', 'EXCUSED_ABSENCE', 'UNEXCUSED_ABSENCE', 'LATE'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`text-[11px] px-2 py-0.5 rounded-md font-semibold cursor-pointer transition ${
                    statusFilter === st
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Tất cả'
                    : st === 'PRESENT'
                    ? `Có mặt (${summary.present})`
                    : st === 'EXCUSED_ABSENCE'
                    ? `Có phép (${summary.excused})`
                    : st === 'UNEXCUSED_ABSENCE'
                    ? `Không phép (${summary.unexcused})`
                    : `Đi muộn (${summary.late})`}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-500">
              Hiển thị {filteredStudents.length}/{students.length} học sinh
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
                onClick={loadStudents}
                className="text-xs gap-1.5 cursor-pointer"
              >
                Thử lại
              </Button>
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 p-8">
              <Users className="size-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Lớp chưa có học sinh để điểm danh</p>
              <p className="text-xs text-slate-400 mt-1">Vui lòng thêm học sinh vào danh sách lớp trước.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student, idx) => {
                const isLate = student.status === 'LATE'

                return (
                  <div
                    key={student.studentId || `student-${idx}`}
                    className={`w-full max-w-full box-border rounded-xl border p-3.5 transition-all ${
                      student.status === 'PRESENT'
                        ? 'bg-white border-slate-200 hover:border-teal-200 shadow-2xs'
                        : student.status === 'EXCUSED_ABSENCE'
                        ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
                        : student.status === 'UNEXCUSED_ABSENCE'
                        ? 'bg-rose-50/70 border-rose-200 shadow-2xs'
                        : 'bg-amber-50/70 border-amber-200 shadow-2xs'
                    }`}
                  >
                    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 sm:gap-4 items-start w-full">
                      {/* Avatar */}
                      <div className="flex items-center gap-2 shrink-0 pt-0.5">
                        <span className="text-xs font-bold text-slate-400 w-5 text-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div
                          className={`size-10 rounded-full grid place-items-center text-xs font-bold shrink-0 border ${
                            student.status === 'PRESENT'
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : student.status === 'EXCUSED_ABSENCE'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : student.status === 'UNEXCUSED_ABSENCE'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {student.initials}
                        </div>
                      </div>

                      {/* Info & Status */}
                      <div className="min-w-0 flex flex-col gap-2.5 w-full">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-bold text-slate-900 leading-tight">
                              {student.name}
                            </span>
                            {student.studentCode && (
                              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {student.studentCode}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-slate-500">
                            {student.gender || 'Học sinh'}
                          </span>
                        </div>

                        {/* 4 Status Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.studentId, 'PRESENT')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold border transition-all cursor-pointer ${
                              student.status === 'PRESENT'
                                ? 'bg-teal-600 border-teal-600 text-white shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <Check className="size-3.5 shrink-0" />
                            Có mặt
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.studentId, 'EXCUSED_ABSENCE')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold border transition-all cursor-pointer ${
                              student.status === 'EXCUSED_ABSENCE'
                                ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            Có phép
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.studentId, 'UNEXCUSED_ABSENCE')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold border transition-all cursor-pointer ${
                              student.status === 'UNEXCUSED_ABSENCE'
                                ? 'bg-rose-600 border-rose-600 text-white shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            Không phép
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetStatus(student.studentId, 'LATE')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-semibold border transition-all cursor-pointer ${
                              student.status === 'LATE'
                                ? 'bg-amber-600 border-amber-600 text-white shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <Clock className="size-3.5 shrink-0" />
                            Đi muộn
                          </button>
                        </div>

                        {/* If LATE -> late minutes input */}
                        {isLate && (
                          <div className="flex items-center gap-2 bg-amber-50/90 border border-amber-300 rounded-lg p-2 text-xs text-amber-900 w-full sm:w-auto">
                            <Clock className="size-4 text-amber-600 shrink-0" />
                            <span className="font-medium">Số phút đi muộn:</span>
                            <input
                              type="number"
                              min="0"
                              max="180"
                              aria-label={`Số phút đi muộn của ${student.name}`}
                              value={student.lateMinutes >= 0 ? student.lateMinutes : 5}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0)
                                handleSetLateMinutes(student.studentId, val)
                              }}
                              className="w-16 h-7 rounded border border-amber-300 bg-white text-center font-bold text-amber-900 focus:outline-teal-500"
                            />
                            <span className="font-semibold text-amber-800">phút</span>
                          </div>
                        )}

                        {/* Note */}
                        <div className="w-full min-w-0">
                          <input
                            type="text"
                            aria-label={`Ghi chú cho ${student.name}`}
                            placeholder={`Ghi chú cho ${student.name} (ví dụ: sốt nhẹ, quên đồng phục...)...`}
                            value={student.note || ''}
                            onChange={(e) => handleSetNote(student.studentId, e.target.value)}
                            className="w-full text-xs h-8 border border-slate-200 rounded-lg px-3 bg-white focus:outline-teal-500 text-slate-800 placeholder:text-slate-400 shadow-2xs"
                          />
                        </div>
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
          <div className="w-full sm:flex-1 min-w-0">
            <Input
              type="text"
              placeholder="Ghi chú chung cho buổi điểm danh này (tùy chọn)..."
              value={sessionNote}
              onChange={(e) => {
                setSessionNote(e.target.value)
                setIsDirty(true)
              }}
              className="text-xs h-8.5 bg-slate-50 w-full"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="text-xs font-semibold h-8.5 px-4 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || loading || students.length === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 shadow-xs h-8.5 px-5 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save className="size-3.5" /> Lưu buổi điểm danh
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
