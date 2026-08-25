'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ClipboardCheck, Edit2, Loader2, MoreHorizontal, Plus, Search, Trash2, X, Users
} from 'lucide-react'
import { getClasses, type ClassRecord } from '@/services/classroom-service'
import { api } from '@/services/api-client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Assessment {
  id: string
  title: string
  subtitle?: string
  status: string
  classroomId: string
  classroom?: { id: string; name: string }
  subjectId?: string
  subject?: { id: string; name: string }
  assessmentDate: string
  meta?: string
  tone?: string
  createdAt: string
}

interface SubjectOption { id: string; name: string; code: string }

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  DRAFT: 'Bản nháp',
}
const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-teal-100 text-teal-700',
  DRAFT: 'bg-slate-100 text-slate-600',
}

// ─── API helpers ─────────────────────────────────────────────────────────────
async function getAssessments(params?: { classroomId?: string }): Promise<Assessment[]> {
  try {
    const qs = params?.classroomId ? `?classroomId=${params.classroomId}` : ''
    const res = await api.get<Assessment[]>(`/assessments${qs}`)
    return Array.isArray(res) ? res : []
  } catch { return [] }
}

async function createAssessment(data: {
  title: string; classroomId: string; subjectId?: string;
  status?: string; assessmentDate?: string; subtitle?: string
}): Promise<Assessment> {
  return api.post<Assessment>('/assessments', data)
}

async function updateAssessment(id: string, data: Partial<{
  title: string; status: string; assessmentDate: string; subtitle: string
}>): Promise<Assessment> {
  return api.patch<Assessment>(`/assessments/${id}`, data)
}

async function deleteAssessment(id: string): Promise<void> {
  await api.delete(`/assessments/${id}`)
}

// ─── Assessment Form Dialog ───────────────────────────────────────────────────
function AssessmentFormDialog({ open, onClose, editEntry, classes, onSaved }: {
  open: boolean; onClose: () => void; editEntry: Assessment | null
  classes: ClassRecord[]; onSaved: (a: Assessment) => void
}) {
  const isEdit = !!editEntry
  const [title, setTitle] = useState('')
  const [classroomId, setClassroomId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState('IN_PROGRESS')
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editEntry) {
      setTitle(editEntry.title || '')
      setClassroomId(editEntry.classroomId || '')
      setSubjectId(editEntry.subjectId || '')
      setAssessmentDate(editEntry.assessmentDate?.split('T')[0] || new Date().toISOString().split('T')[0])
      setStatus(editEntry.status || 'IN_PROGRESS')
    } else {
      setTitle('')
      setClassroomId(classes[0]?.id || '')
      setSubjectId('')
      setAssessmentDate(new Date().toISOString().split('T')[0])
      setStatus('IN_PROGRESS')
    }
  }, [editEntry, open, classes])

  useEffect(() => {
    if (!classroomId) { setSubjects([]); return }
    api.get<any[]>(`/teaching-assignments?classroomId=${classroomId}`)
      .then((contexts) => {
        const subs = (Array.isArray(contexts) ? contexts : [])
          .filter((c) => c.isActive !== false)
          .map((c) => ({ id: c.subject?.id || c.subjectId, name: c.subject?.name || '', code: c.subject?.code || '' }))
          .filter((s) => s.id)
        setSubjects(subs)
        if (!isEdit && subs.length > 0) setSubjectId(subs[0].id)
      })
      .catch(() => setSubjects([]))
  }, [classroomId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Vui lòng nhập tên đánh giá'); return }
    if (!classroomId) { toast.error('Vui lòng chọn lớp học'); return }
    setSubmitting(true)
    try {
      let saved: Assessment
      if (isEdit && editEntry) {
        saved = await updateAssessment(editEntry.id, { title: title.trim(), status, assessmentDate })
        toast.success('Đã cập nhật đánh giá')
      } else {
        saved = await createAssessment({
          title: title.trim(),
          classroomId,
          subjectId: subjectId || undefined,
          status,
          assessmentDate,
          subtitle: subjects.find((s) => s.id === subjectId)?.name,
        })
        toast.success('Đã tạo đánh giá mới')
      }
      onSaved(saved)
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu đánh giá')
    } finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa đánh giá' : 'Tạo đánh giá mới'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Cập nhật thông tin đánh giá.' : 'Nhập thông tin bài đánh giá học sinh.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div>
            <Label htmlFor="ass-title" className="text-xs font-semibold">Tên đánh giá *</Label>
            <Input id="ass-title" className="mt-1" placeholder="VD: Đánh giá giữa kỳ I - Toán 4A" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          {!isEdit && (
            <>
              <div>
                <Label htmlFor="ass-class" className="text-xs font-semibold">Lớp *</Label>
                <select id="ass-class" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
                  <option value="">— Chọn lớp —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="ass-subject" className="text-xs font-semibold">Môn học</Label>
                {subjects.length > 0 ? (
                  <select id="ass-subject" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    <option value="">— Tất cả môn —</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                ) : (
                  <div className="mt-1 rounded-md border bg-slate-50 px-3 py-2 text-xs text-slate-400">
                    {classroomId ? 'Chưa có ngữ cảnh giảng dạy cho lớp này.' : 'Chọn lớp trước.'}
                  </div>
                )}
              </div>
            </>
          )}
          <div>
            <Label htmlFor="ass-date" className="text-xs font-semibold">Ngày đánh giá *</Label>
            <Input id="ass-date" type="date" className="mt-1" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ass-status" className="text-xs font-semibold">Trạng thái</Label>
            <select id="ass-status" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="DRAFT">Bản nháp</option>
              <option value="IN_PROGRESS">Đang thực hiện</option>
              <option value="COMPLETED">Hoàn thành</option>
            </select>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit as any} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? 'Lưu thay đổi' : 'Tạo đánh giá'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

async function getAssessmentDetail(id: string): Promise<any> {
  return api.get(`/assessments/${id}`)
}

async function saveAssessmentScores(id: string, data: {
  assessments: Array<{ studentId: string; score?: number; level?: string; comment?: string }>
}): Promise<any> {
  return api.put(`/assessments/${id}/students`, data)
}

// ─── Student Grading Dialog ───────────────────────────────────────────────────
function GradingDialog({
  assessment,
  onClose,
  onSaved,
}: {
  assessment: Assessment | null
  onClose: () => void
  onSaved: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<Array<{
    studentId: string
    studentName: string
    score: string
    level: string
    comment: string
  }>>([])

  useEffect(() => {
    if (!assessment) return
    let alive = true
    setLoading(true)

    Promise.all([
      getAssessmentDetail(assessment.id),
      api.get<any>(`/classes/${assessment.classroomId}/students`),
    ]).then(([detail, classData]) => {
      if (!alive) return
      const rawStudents = Array.isArray(classData) ? classData : (classData?.students || [])
      const existingResults = detail?.students || []

      const mapped = rawStudents.map((s: any) => {
        const res = existingResults.find((r: any) => r.studentId === s.id || r.id === s.id)
        return {
          studentId: s.id,
          studentName: s.fullName || s.name || 'Học sinh',
          score: res?.score !== undefined && res?.score !== null ? String(res.score) : '',
          level: res?.level || 'COMPLETED',
          comment: res?.comment || '',
        }
      })
      setStudents(mapped)
    }).catch(() => {
      toast.error('Lỗi khi tải danh sách học sinh và kết quả')
    }).finally(() => {
      if (alive) setLoading(false)
    })

    return () => { alive = false }
  }, [assessment])

  const handleSave = async () => {
    if (!assessment) return
    setSaving(true)
    try {
      const payload = {
        assessments: students.map((s) => ({
          studentId: s.studentId,
          score: s.score !== '' ? parseFloat(s.score) : undefined,
          level: s.level,
          comment: s.comment.trim() || undefined,
        })),
      }
      await saveAssessmentScores(assessment.id, payload)
      toast.success('Đã lưu bảng điểm và nhận xét đánh giá thành công')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu kết quả đánh giá')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!assessment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Bảng kết quả đánh giá học sinh</span>
            <span className="text-xs font-normal text-slate-500">{assessment?.classroom?.name} · {assessment?.title}</span>
          </DialogTitle>
          <DialogDescription>
            Nhập điểm số (thang điểm 10), mức độ đạt và nhận xét chi tiết cho từng học sinh.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-teal-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              Lớp học này chưa có học sinh nào.
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden overflow-x-auto">
              <div className="min-w-[560px] divide-y">
                <div className="grid grid-cols-[1.5fr_1fr_1.2fr_2fr] gap-2 p-3 bg-slate-50 text-xs font-semibold text-slate-600">
                  <span>Học sinh</span>
                  <span>Điểm (0-10)</span>
                  <span>Mức đạt</span>
                  <span>Nhận xét sư phạm</span>
                </div>
                {students.map((s, idx) => (
                  <div key={s.studentId} className="grid grid-cols-[1.5fr_1fr_1.2fr_2fr] gap-2 p-3 items-center text-sm hover:bg-slate-50/60 transition">
                    <span className="font-medium text-slate-800 break-words leading-tight">{s.studentName}</span>
                    <div>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        placeholder="Điểm"
                        className="h-8 text-xs"
                        value={s.score}
                        onChange={(e) => {
                          const val = e.target.value
                          setStudents((prev) => prev.map((item, j) => j === idx ? { ...item, score: val } : item))
                        }}
                      />
                    </div>
                    <div>
                      <select
                        className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                        value={s.level}
                        onChange={(e) => {
                          const val = e.target.value
                          setStudents((prev) => prev.map((item, j) => j === idx ? { ...item, level: val } : item))
                        }}
                      >
                        <option value="EXCELLENT">Tốt (HT Tốt)</option>
                        <option value="COMPLETED">Đạt (Hoàn thành)</option>
                        <option value="NEEDS_SUPPORT">Cần cố gắng</option>
                      </select>
                    </div>
                    <div>
                      <Input
                        placeholder="Ghi nhận xét..."
                        className="h-8 text-xs"
                        value={s.comment}
                        onChange={(e) => {
                          const val = e.target.value
                          setStudents((prev) => prev.map((item, j) => j === idx ? { ...item, comment: val } : item))
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 border-t pt-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
          <Button onClick={handleSave} disabled={saving || loading || students.length === 0} className="bg-teal-600 hover:bg-teal-700">
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
            Lưu kết quả đánh giá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main AssessmentManager ───────────────────────────────────────────────────
export function AssessmentManager() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<Assessment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Assessment | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [gradingTarget, setGradingTarget] = useState<Assessment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, cls] = await Promise.all([getAssessments(), getClasses()])
      setAssessments(data)
      setClasses(cls)
    } catch { setAssessments([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    return assessments.filter((a) => {
      const matchClass = !filterClass || a.classroomId === filterClass
      const matchQ = !query || `${a.title} ${a.classroom?.name || ''} ${a.subject?.name || ''}`.toLowerCase().includes(query.toLowerCase())
      return matchClass && matchQ
    })
  }, [assessments, filterClass, query])

  const handleSaved = (a: Assessment) => {
    setAssessments((prev) => {
      const idx = prev.findIndex((x) => x.id === a.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = a; return next }
      return [a, ...prev]
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteAssessment(deleteTarget.id)
      setAssessments((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      toast.success('Đã xóa đánh giá')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa đánh giá')
    } finally { setDeleting(false) }
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-600">
            <ClipboardCheck className="size-4" /> TeachFlow Workspace
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Đánh giá</h1>
          <p className="mt-2 text-sm text-slate-500">Theo dõi bài đánh giá và tiến bộ học sinh theo từng lớp, môn.</p>
        </div>
        <Button onClick={() => { setEditEntry(null); setFormOpen(true) }}>
          <Plus className="size-4" /> Tạo đánh giá
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm đánh giá..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-teal-400" />
          {query && <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="size-4" /></button>}
        </div>
        <select aria-label="Lọc theo lớp" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          <option value="">Tất cả lớp</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng đánh giá', value: filtered.length, color: 'text-slate-900' },
          { label: 'Đang thực hiện', value: filtered.filter((a) => a.status === 'IN_PROGRESS').length, color: 'text-orange-600' },
          { label: 'Hoàn thành', value: filtered.filter((a) => a.status === 'COMPLETED').length, color: 'text-teal-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-teal-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
          <ClipboardCheck className="size-12 text-slate-300" />
          <div className="text-center">
            <p className="font-medium text-slate-600">Chưa có đánh giá nào</p>
            <p className="text-sm mt-1">Nhấn "Tạo đánh giá" để bắt đầu.</p>
          </div>
          <Button onClick={() => { setEditEntry(null); setFormOpen(true) }}>
            <Plus className="size-4" /> Tạo đánh giá đầu tiên
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setGradingTarget(a)}
            >
              <div className={`w-1 rounded-full shrink-0 self-stretch ${a.status === 'COMPLETED' ? 'bg-teal-500' : a.status === 'IN_PROGRESS' ? 'bg-orange-400' : 'bg-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm hover:text-teal-600 transition">{a.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.classroom?.name || '—'}{a.subject?.name ? ` · ${a.subject.name}` : ''}
                      {a.assessmentDate ? ` · ${new Date(a.assessmentDate).toLocaleDateString('vi-VN')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setGradingTarget(a)}
                      title="Nhập điểm & Đánh giá"
                      className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-50 transition text-xs font-semibold flex items-center gap-1"
                    >
                      <Users className="size-3.5" /> Chấm điểm
                    </button>
                    <button
                      onClick={() => { setEditEntry(a); setFormOpen(true) }}
                      title="Sửa thông tin"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      title="Xóa đánh giá"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[a.status] || a.status}
                  </span>
                  <span className="text-xs text-slate-400">Nhấn để xem và nhập kết quả học sinh</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <AssessmentFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditEntry(null) }}
        editEntry={editEntry}
        classes={classes}
        onSaved={handleSaved}
      />

      {/* Grading Dialog */}
      <GradingDialog
        assessment={gradingTarget}
        onClose={() => setGradingTarget(null)}
        onSaved={load}
      />

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Xóa đánh giá</DialogTitle>
            <DialogDescription>
              Xóa đánh giá "{deleteTarget?.title}"? Bài đánh giá sẽ được lưu trữ an toàn để không làm mất kết quả trước đây của học sinh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />} Xóa đánh giá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
