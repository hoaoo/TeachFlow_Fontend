'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { classroomClasses, commentSuggestions, type ClassRecord, type StudentRecord } from '@/lib/classroom-data'
import {
  getClasses,
  getSchoolYears,
  getGrades,
  createClass as apiCreateClass,
  updateClass as apiUpdateClass,
  deleteClass as apiDeleteClass,
  addStudentToClass as apiAddStudent,
  removeStudentFromClass as apiRemoveStudent,
  getStudentAttendance as apiGetStudentAttendance,
  getStudentComments as apiGetStudentComments,
  addStudentComment as apiAddStudentComment,
  getStudentEnrollments as apiGetStudentEnrollments,
  transferStudent as apiTransferStudent,
  withdrawStudent as apiWithdrawStudent,
  updateStudent as apiUpdateStudent,
  type SchoolYearOption,
  type GradeOption,
  type StudentEnrollmentRecord,
} from '@/services/classroom-service'
import {
  getMyTeachingContexts,
  declareTeachingContext,
  deactivateTeachingContext,
  getSubjects,
  type TeachingAssignmentRecord,
  type SubjectOption,
} from '@/services/teaching-assignment-service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { ArrowLeft, BarChart3, CalendarCheck2, ChevronRight, Download, Eye, Filter, GraduationCap, Heart, LayoutGrid, MessageSquare, Plus, Search, Trash2, UserPlus, Users, Sparkles, Loader2, ArrowRightLeft, History, Edit2, BookOpen, X } from 'lucide-react'
import { generateStudentComment } from '@/services/ai-service'
import { getStudentAttendanceSummary, type StudentAttendanceSummary } from '@/services/attendance-service'

type ViewState = { page: 'classes' | 'class' | 'student'; classId?: string; studentId?: string }
const statusVariant = (status: StudentRecord['status']) => status === 'Tốt' ? 'default' : status === 'Khá' ? 'secondary' : 'destructive'

export function ClassroomManager({ initialSection = 'classes' }: { initialSection?: 'classes' | 'students' }) {
  const [view, setView] = useState<ViewState>({ page: initialSection === 'students' ? 'classes' : 'classes' })
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([])
  const [grades, setGrades] = useState<GradeOption[]>([])
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('')
  const [selectedGradeId, setSelectedGradeId] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Tất cả')
  const [dialog, setDialog] = useState<'add-class' | 'edit-class' | 'add-student' | 'comment' | 'delete' | 'transfer' | null>(null)
  const [selected, setSelected] = useState<StudentRecord | null>(null)

  // Form states - Create Class
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formSchoolYearId, setFormSchoolYearId] = useState('')
  const [formGradeId, setFormGradeId] = useState('')
  const [formRoom, setFormRoom] = useState('')
  const [deleteClassOpen, setDeleteClassOpen] = useState(false)
  const [deletingClass, setDeletingClass] = useState(false)

  // Form states - Edit Class
  const [editClassName, setEditClassName] = useState('')
  const [editClassCode, setEditClassCode] = useState('')
  const [editClassRoom, setEditClassRoom] = useState('')
  const [editClassSchedule, setEditClassSchedule] = useState('')

  // Form states - Add Student (Full demographic & contact)
  const [studentName, setStudentName] = useState('')
  const [studentGender, setStudentGender] = useState('Nam')
  const [studentDob, setStudentDob] = useState('')
  const [studentParentName, setStudentParentName] = useState('')
  const [studentParentPhone, setStudentParentPhone] = useState('')
  const [studentNote, setStudentNote] = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => {
    let alive = true
    Promise.all([getSchoolYears(), getGrades(), getClasses()]).then(([years, gs, clsList]) => {
      if (alive) {
        setSchoolYears(years)
        setGrades(gs)
        const currentYear = years.find((y) => y.isCurrent) || years[0]
        if (currentYear) {
          setSelectedSchoolYearId(currentYear.id)
          setFormSchoolYearId(currentYear.id)
        }
        if (gs.length > 0) {
          setFormGradeId(gs[0].id)
        }
        setClasses(clsList)
        setLoading(false)
      }
    })
    return () => { alive = false }
  }, [])

  const reloadClasses = async (syId?: string, gId?: string) => {
    try {
      const cls = await getClasses({
        schoolYearId: syId || (selectedSchoolYearId || undefined),
        gradeId: gId && gId !== 'ALL' ? gId : undefined,
      })
      setClasses(cls)
    } catch {
      // keep existing
    }
  }

  const currentClass = classes.find((item) => item.id === view.classId) ?? classes[0] ?? {
    id: '', code: '', name: 'Lớp học', grade: 'Khối', room: 'Phòng học', schedule: 'Thứ 2 - Thứ 6', studentCount: 0, average: 0, attendance: 100, teacher: 'Giáo viên', accent: 'teal', students: []
  }
  const currentStudent = currentClass.students?.find((item) => item.id === view.studentId) ?? selected ?? currentClass.students?.[0]
  const allStudents = useMemo(() => classes.flatMap((item) => (item.students || []).map((student) => ({ ...student, className: item.name, classId: item.id }))), [classes])
  const filteredStudents = allStudents.filter((student) => (filter === 'Tất cả' || student.className === filter) && `${student.name} ${student.className}`.toLowerCase().includes(query.toLowerCase()))
  const notify = (message: string) => toast.success(message)
  const openStudent = (student: StudentRecord, classId = currentClass.id) => { setSelected(student); setView({ page: 'student', classId, studentId: student.id }) }

  const openEditClass = (item: ClassRecord) => {
    setEditClassName(item.name || '')
    setEditClassCode(item.code || '')
    setEditClassRoom(item.room || '')
    setEditClassSchedule(item.schedule || '')
    setDialog('edit-class')
  }

  const updateClassDetails = async () => {
    if (!editClassName.trim()) {
      toast.error('Vui lòng nhập tên lớp học')
      return
    }
    setSubmitting(true)
    try {
      const updated = await apiUpdateClass(currentClass.id, {
        name: editClassName.trim(),
        code: editClassCode.trim() || undefined,
        room: editClassRoom.trim() || undefined,
        schedule: editClassSchedule.trim() || undefined,
      })
      setClasses((items) => items.map((item) => (item.id === currentClass.id ? { ...item, ...updated } : item)))
      setDialog(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      notify(`Đã cập nhật thông tin lớp ${updated.name}`)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi cập nhật lớp học')
    } finally {
      setSubmitting(false)
    }
  }

  const addClass = async () => {
    if (!formName.trim()) {
      toast.error('Vui lòng nhập tên lớp học')
      return
    }
    if (!formSchoolYearId) {
      toast.error('Vui lòng chọn năm học')
      return
    }
    if (!formGradeId) {
      toast.error('Vui lòng chọn khối lớp')
      return
    }

    setSubmitting(true)
    try {
      const created = await apiCreateClass({
        name: formName.trim(),
        code: formCode.trim() || undefined,
        schoolYearId: formSchoolYearId,
        gradeId: formGradeId,
        room: formRoom.trim() || undefined,
      })
      setClasses((items) => [...items, created])
      setFormName('')
      setFormCode('')
      setDialog(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      notify(`Đã tạo lớp ${created.name} (${created.code || ''}) thành công`)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi tạo lớp học')
    } finally {
      setSubmitting(false)
    }
  }

  const addStudent = async () => {
    if (!studentName.trim()) return
    setSubmitting(true)
    try {
      const updatedClass = await apiAddStudent(currentClass.id, {
        fullName: studentName.trim(),
        gender: studentGender,
        dob: studentDob || undefined,
        parentName: studentParentName.trim() || undefined,
        parentPhone: studentParentPhone.trim() || undefined,
        note: studentNote.trim() || undefined,
      })
      setClasses((items) => items.map((item) => item.id === currentClass.id ? updatedClass : item))
      setStudentName('')
      setStudentDob('')
      setStudentParentName('')
      setStudentParentPhone('')
      setStudentNote('')
      setDialog(null)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      notify('Đã thêm học sinh thành công')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi thêm học sinh')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteStudent = async () => {
    if (!currentStudent) return
    try {
      await apiRemoveStudent(currentClass.id, currentStudent.id)
    } catch {
      // Continue locally
    }
    setClasses((items) => items.map((item) => item.id === currentClass.id ? { ...item, students: (item.students || []).filter((student) => student.id !== currentStudent.id), studentCount: Math.max(0, item.studentCount - 1) } : item))
    setDialog(null)
    setView({ page: 'class', classId: currentClass.id })
    notify('Đã xóa học sinh khỏi lớp')
  }

  const saveComment = async () => {
    if (!comment.trim() || !currentStudent) return
    try {
      await apiAddStudentComment(currentStudent.id, comment, currentClass.id)
    } catch {
      // Continue
    }
    setDialog(null)
    setComment('')
    notify('Đã lưu nhận xét học sinh')
  }

  const deleteClass = async () => {
    if (!currentClass?.id) return
    setDeletingClass(true)
    try {
      await apiDeleteClass(currentClass.id)
      setClasses((items) => items.filter((item) => item.id !== currentClass.id))
      setDeleteClassOpen(false)
      setView({ page: 'classes' })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      notify(`Đã lưu trữ và ngừng sử dụng lớp ${currentClass.name}`)
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa lớp học')
    } finally {
      setDeletingClass(false)
    }
  }

  if (view.page === 'student' && currentStudent) return (
    <StudentProfile
      student={currentStudent}
      classItem={currentClass}
      allClasses={classes}
      onBack={() => setView({ page: 'class', classId: currentClass.id })}
      onDelete={() => setDialog('delete')}
      onComment={() => setDialog('comment')}
      onTransfer={() => setDialog('transfer')}
      dialog={dialog}
      setDialog={setDialog}
      comment={comment}
      setComment={setComment}
      onSaveComment={saveComment}
      onConfirmDelete={deleteStudent}
      onTransferSuccess={() => {
        reloadClasses()
        setView({ page: 'classes' })
      }}
    />
  )
  if (view.page === 'class')
    return (
      <>
        <ClassDetail
          classItem={currentClass}
          query={query}
          setQuery={setQuery}
          onBack={() => setView({ page: 'classes' })}
          onOpenStudent={(student) => openStudent(student)}
          dialog={dialog}
          setDialog={setDialog}
          studentName={studentName}
          setStudentName={setStudentName}
          studentGender={studentGender}
          setStudentGender={setStudentGender}
          studentDob={studentDob}
          setStudentDob={setStudentDob}
          studentParentName={studentParentName}
          setStudentParentName={setStudentParentName}
          studentParentPhone={studentParentPhone}
          setStudentParentPhone={setStudentParentPhone}
          studentNote={studentNote}
          setStudentNote={setStudentNote}
          addStudent={addStudent}
          selected={selected}
          setSelected={setSelected}
          deleteStudent={deleteStudent}
          submitting={submitting}
          onOpenEditClass={() => openEditClass(currentClass)}
          onOpenDeleteClass={() => setDeleteClassOpen(true)}
          editClassName={editClassName}
          setEditClassName={setEditClassName}
          editClassCode={editClassCode}
          setEditClassCode={setEditClassCode}
          editClassRoom={editClassRoom}
          setEditClassRoom={setEditClassRoom}
          editClassSchedule={editClassSchedule}
          setEditClassSchedule={setEditClassSchedule}
          updateClassDetails={updateClassDetails}
        />
        {/* Delete Class Confirmation Dialog */}
        <Dialog open={deleteClassOpen} onOpenChange={setDeleteClassOpen}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>Xác nhận ngừng sử dụng lớp</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa / lưu trữ lớp <strong>{currentClass.name}</strong>? Lớp sẽ được lưu trữ an toàn và dữ liệu điểm danh, đánh giá trước đây sẽ được bảo toàn.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteClassOpen(false)}>Hủy</Button>
              <Button variant="destructive" onClick={deleteClass} disabled={deletingClass}>
                {deletingClass ? 'Đang lưu trữ...' : 'Xác nhận xóa'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  if (initialSection === 'students') return <StudentDirectory students={filteredStudents} classes={classes} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onOpenStudent={(student) => openStudent(student, allStudents.find((item) => item.id === student.id)?.classId)} />
  return (
    <ClassDirectory
      classes={classes}
      schoolYears={schoolYears}
      grades={grades}
      selectedSchoolYearId={selectedSchoolYearId}
      setSelectedSchoolYearId={(syId) => {
        setSelectedSchoolYearId(syId)
        reloadClasses(syId, selectedGradeId)
      }}
      selectedGradeId={selectedGradeId}
      setSelectedGradeId={(gId) => {
        setSelectedGradeId(gId)
        reloadClasses(selectedSchoolYearId, gId)
      }}
      query={query}
      setQuery={setQuery}
      onOpenClass={(item) => setView({ page: 'class', classId: item.id })}
      onAddClass={() => setDialog('add-class')}
      dialog={dialog}
      setDialog={setDialog}
      formName={formName}
      setFormName={setFormName}
      formCode={formCode}
      setFormCode={setFormCode}
      formSchoolYearId={formSchoolYearId}
      setFormSchoolYearId={setFormSchoolYearId}
      formGradeId={formGradeId}
      setFormGradeId={setFormGradeId}
      formRoom={formRoom}
      setFormRoom={setFormRoom}
      addClass={addClass}
    />
  )
}

function Header({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><GraduationCap className="size-4" /> TeachFlow Classroom</div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>{action}</div> }
function Stat({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: React.ReactNode }) { return <Card><CardContent className="flex items-start justify-between p-4"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{helper}</p></div><div className="rounded-xl bg-primary/10 p-2 text-primary">{icon}</div></CardContent></Card> }
function Empty({ title }: { title: string }) { return <div className="p-10 text-center text-sm text-muted-foreground"><Search className="mx-auto mb-3 size-5" />{title}</div> }
function ClassCard({ item, onClick }: { item: ClassRecord; onClick: () => void }) { return <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}><CardHeader><div className="flex justify-between"><div><CardTitle>{item.name} {item.code ? `(${item.code})` : ''}</CardTitle><CardDescription>{item.grade} · {item.room}</CardDescription></div><div className="rounded-xl bg-primary/10 p-3 text-primary"><Users className="size-5" /></div></div></CardHeader><CardContent className="grid gap-4"><div className="grid grid-cols-3 gap-2 text-center">{[['Sĩ số', item.studentCount], ['Điểm TB', item.average || 8.4], ['Đi học', `${item.attendance || 96}%`]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-muted/60 p-2"><p className="font-semibold">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>)}</div><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{item.schedule}</span><ChevronRight className="size-4" /></div></CardContent></Card> }

function ClassDirectory({
  classes,
  schoolYears,
  grades,
  selectedSchoolYearId,
  setSelectedSchoolYearId,
  selectedGradeId,
  setSelectedGradeId,
  query,
  setQuery,
  onOpenClass,
  onAddClass,
  dialog,
  setDialog,
  formName,
  setFormName,
  formCode,
  setFormCode,
  formSchoolYearId,
  setFormSchoolYearId,
  formGradeId,
  setFormGradeId,
  formRoom,
  setFormRoom,
  addClass,
}: {
  classes: ClassRecord[];
  schoolYears: SchoolYearOption[];
  grades: GradeOption[];
  selectedSchoolYearId: string;
  setSelectedSchoolYearId: (id: string) => void;
  selectedGradeId: string;
  setSelectedGradeId: (id: string) => void;
  query: string;
  setQuery: (value: string) => void;
  onOpenClass: (item: ClassRecord) => void;
  onAddClass: () => void;
  dialog: string | null;
  setDialog: (value: 'add-class' | null) => void;
  formName: string;
  setFormName: (value: string) => void;
  formCode: string;
  setFormCode: (value: string) => void;
  formSchoolYearId: string;
  setFormSchoolYearId: (value: string) => void;
  formGradeId: string;
  setFormGradeId: (value: string) => void;
  formRoom: string;
  setFormRoom: (value: string) => void;
  addClass: () => void;
}) {
  const filtered = classes.filter((item) => {
    const matchQuery = `${item.name} ${item.code || ''} ${item.grade}`.toLowerCase().includes(query.toLowerCase());
    const matchYear = !selectedSchoolYearId || item.schoolYearId === selectedSchoolYearId || !item.schoolYearId;
    const matchGrade = selectedGradeId === 'ALL' || item.gradeId === selectedGradeId;
    return matchQuery && matchYear && matchGrade;
  });

  const totalStudents = filtered.reduce((sum, item) => sum + (item.studentCount || 0), 0);
  const avgAttendance = filtered.length ? Math.round(filtered.reduce((sum, item) => sum + (item.attendance || 96), 0) / filtered.length) : 96;

  return (
    <div className="mx-auto max-w-7xl">
      <Header
        title="Lớp học của tôi"
        description="Theo dõi sĩ số, tiến độ học tập và hoạt động của từng lớp."
        action={<Button onClick={onAddClass}><Plus data-icon="inline-start" />Tạo lớp mới</Button>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên hoặc mã lớp..." className="pl-9" />
        </div>

        {/* School Year Filter */}
        <select
          aria-label="Lọc theo năm học"
          className="h-10 rounded-md border bg-background px-3 text-sm font-medium"
          value={selectedSchoolYearId}
          onChange={(e) => setSelectedSchoolYearId(e.target.value)}
        >
          {schoolYears.map((sy) => (
            <option key={sy.id} value={sy.id}>
              {sy.name} {sy.isCurrent ? '(Hiện tại)' : ''}
            </option>
          ))}
        </select>

        {/* Grade Filter */}
        <select
          aria-label="Lọc theo khối"
          className="h-10 rounded-md border bg-background px-3 text-sm font-medium"
          value={selectedGradeId}
          onChange={(e) => setSelectedGradeId(e.target.value)}
        >
          <option value="ALL">Tất cả các khối</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Tổng số lớp" value={String(filtered.length)} helper="Đang hiển thị" icon={<LayoutGrid />} />
        <Stat label="Tổng học sinh" value={String(totalStudents)} helper="Trong các lớp" icon={<Users />} />
        <Stat label="Tỷ lệ đi học" value={`${avgAttendance}%`} helper="Trung bình tháng này" icon={<CalendarCheck2 />} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item) => (
          <ClassCard key={item.id} item={item} onClick={() => onOpenClass(item)} />
        ))}
      </div>

      {!filtered.length && <Empty title="Chưa tìm thấy lớp học trong bộ lọc này" />}

      {/* Add Class Dialog */}
      <Dialog open={dialog === 'add-class'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Tạo lớp học mới</DialogTitle>
            <DialogDescription>Nhập thông tin năm học, khối và mã lớp theo quy chuẩn.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="create-school-year" className="text-xs font-semibold">Năm học *</Label>
                <select
                  id="create-school-year"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={formSchoolYearId}
                  onChange={(e) => setFormSchoolYearId(e.target.value)}
                >
                  {schoolYears.map((sy) => (
                    <option key={sy.id} value={sy.id}>
                      {sy.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="create-grade" className="text-xs font-semibold">Khối lớp *</Label>
                <select
                  id="create-grade"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={formGradeId}
                  onChange={(e) => setFormGradeId(e.target.value)}
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="class-code" className="text-xs font-semibold">Mã lớp (ví dụ: 4A1)</Label>
                <Input
                  id="class-code"
                  className="mt-1"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="4A1"
                />
              </div>

              <div>
                <Label htmlFor="class-name" className="text-xs font-semibold">Tên lớp *</Label>
                <Input
                  id="class-name"
                  className="mt-1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Lớp 4A1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="class-room" className="text-xs font-semibold">Phòng học</Label>
              <Input
                id="class-room"
                className="mt-1"
                value={formRoom}
                onChange={(e) => setFormRoom(e.target.value)}
                placeholder="Phòng 204"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button onClick={addClass}>Tạo lớp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClassDetail({
  classItem,
  query,
  setQuery,
  onBack,
  onOpenStudent,
  dialog,
  setDialog,
  studentName,
  setStudentName,
  studentGender,
  setStudentGender,
  studentDob,
  setStudentDob,
  studentParentName,
  setStudentParentName,
  studentParentPhone,
  setStudentParentPhone,
  studentNote,
  setStudentNote,
  addStudent,
  selected,
  setSelected,
  deleteStudent,
  submitting,
  onOpenEditClass,
  onOpenDeleteClass,
  editClassName,
  setEditClassName,
  editClassCode,
  setEditClassCode,
  editClassRoom,
  setEditClassRoom,
  editClassSchedule,
  setEditClassSchedule,
  updateClassDetails,
}: {
  classItem: ClassRecord;
  query: string;
  setQuery: (value: string) => void;
  onBack: () => void;
  onOpenStudent: (student: StudentRecord) => void;
  dialog: string | null;
  setDialog: (d: 'add-student' | 'edit-class' | 'delete' | null) => void;
  studentName: string;
  setStudentName: (v: string) => void;
  studentGender: string;
  setStudentGender: (v: string) => void;
  studentDob: string;
  setStudentDob: (v: string) => void;
  studentParentName: string;
  setStudentParentName: (v: string) => void;
  studentParentPhone: string;
  setStudentParentPhone: (v: string) => void;
  studentNote: string;
  setStudentNote: (v: string) => void;
  addStudent: () => void;
  selected: StudentRecord | null;
  setSelected: (s: StudentRecord | null) => void;
  deleteStudent: () => void;
  submitting: boolean;
  onOpenEditClass: () => void;
  onOpenDeleteClass: () => void;
  editClassName: string;
  setEditClassName: (v: string) => void;
  editClassCode: string;
  setEditClassCode: (v: string) => void;
  editClassRoom: string;
  setEditClassRoom: (v: string) => void;
  editClassSchedule: string;
  setEditClassSchedule: (v: string) => void;
  updateClassDetails: () => void;
}) {
  const students = (classItem.students || []).filter((student) =>
    student.name.toLowerCase().includes(query.toLowerCase()),
  );

  // Teaching contexts state for this classroom
  const [teachingContexts, setTeachingContexts] = useState<TeachingAssignmentRecord[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(true);
  const [subjectsList, setSubjectsList] = useState<SubjectOption[]>([]);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [declaring, setDeclaring] = useState(false);

  const loadTeachingContexts = useCallback(async () => {
    if (!classItem.id) return;
    setLoadingContexts(true);
    try {
      const [ctxs, subs] = await Promise.all([
        getMyTeachingContexts({ classroomId: classItem.id }),
        getSubjects(),
      ]);
      setTeachingContexts(ctxs.filter((c) => c.isActive !== false));
      setSubjectsList(subs.filter((s) => s.isActive !== false));
      if (subs.length > 0) {
        setSelectedSubjectId(subs[0].id);
      }
    } catch {
      setTeachingContexts([]);
    } finally {
      setLoadingContexts(false);
    }
  }, [classItem.id]);

  useEffect(() => {
    loadTeachingContexts();
  }, [loadTeachingContexts]);

  const handleDeclareSubject = async () => {
    if (!selectedSubjectId) {
      toast.error('Vui lòng chọn môn học');
      return;
    }
    setDeclaring(true);
    try {
      const declared = await declareTeachingContext({
        classroomId: classItem.id,
        subjectId: selectedSubjectId,
      });
      setTeachingContexts((prev) => [...prev, declared]);
      setDeclareOpen(false);
      toast.success('Đã khai báo môn giảng dạy thành công');
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi khai báo môn học');
    } finally {
      setDeclaring(false);
    }
  };

  const handleDeactivateSubject = async (ctxId: string, subjectName: string) => {
    try {
      await deactivateTeachingContext(ctxId);
      setTeachingContexts((prev) => prev.filter((c) => c.id !== ctxId));
      toast.success(`Đã ngừng phụ trách môn ${subjectName}`);
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi hủy phụ trách môn');
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Button variant="ghost" className="mb-4 -ml-3" onClick={onBack}>
        <ArrowLeft data-icon="inline-start" />Quay lại danh sách lớp
      </Button>
      <Header
        title={`${classItem.name} ${classItem.code ? `(${classItem.code})` : ''} · ${classItem.room}`}
        description={`${classItem.teacher} · ${classItem.schedule}`}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={onOpenEditClass}>
              <Edit2 className="size-4" /> Sửa thông tin
            </Button>
            <Button variant="outline" onClick={onOpenDeleteClass} className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700">
              <Trash2 className="size-4" /> Xóa lớp
            </Button>
            <Button onClick={() => setDialog('add-student')}>
              <UserPlus data-icon="inline-start" />Thêm học sinh
            </Button>
          </div>
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Sĩ số" value={String(classItem.studentCount || students.length)} helper="Học sinh" icon={<Users />} />
        <Stat label="Điểm trung bình" value={String(classItem.average || 8.4)} helper="Học kỳ này" icon={<BarChart3 />} />
        <Stat label="Chuyên cần" value={`${classItem.attendance || 96}%`} helper="Tháng 8/2026" icon={<CalendarCheck2 />} />
        <Stat
          label="Cần quan tâm"
          value={String(students.filter((student) => student.status === 'Cần cố gắng').length)}
          helper="Cần hỗ trợ thêm"
          icon={<Heart />}
        />
      </div>

      {/* Teaching Context Section (Môn học phụ trách trong lớp) */}
      <Card className="mb-6">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="size-4 text-teal-600" /> Môn học phụ trách tại lớp này
            </CardTitle>
            <CardDescription>
              Ngữ cảnh giảng dạy do giáo viên tự khai báo để sử dụng trong Lịch dạy, Đánh giá, và Giáo án.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDeclareOpen(true)} className="gap-1.5 text-xs">
            <Plus className="size-3.5" /> Khai báo môn dạy
          </Button>
        </CardHeader>
        <CardContent>
          {loadingContexts ? (
            <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Đang tải danh sách môn học...
            </div>
          ) : teachingContexts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
              Chưa khai báo môn dạy nào cho lớp này. Nhấn <strong>"Khai báo môn dạy"</strong> để bắt đầu.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {teachingContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/50 px-3 py-1.5 text-sm"
                >
                  <span className="font-medium text-teal-900">{ctx.subject?.name || 'Môn học'}</span>
                  <button
                    onClick={() => handleDeactivateSubject(ctx.id, ctx.subject?.name || '')}
                    className="text-slate-400 hover:text-red-600 transition"
                    title="Ngừng phụ trách môn này"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Danh sách học sinh</CardTitle>
            <CardDescription>Nhấn vào một học sinh để xem hồ sơ học tập.</CardDescription>
          </div>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm học sinh..."
            className="w-full sm:w-72"
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="pb-3">Học sinh</th>
                <th className="pb-3">Tiến độ</th>
                <th className="pb-3">Chuyên cần</th>
                <th className="pb-3">Trạng thái</th>
                <th className="pb-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b last:border-0">
                  <td className="py-3">
                    <button className="flex items-center gap-3 text-left" onClick={() => onOpenStudent(student)}>
                      <Avatar className="size-9">
                        <AvatarFallback className={student.color}>{student.initials}</AvatarFallback>
                      </Avatar>
                      <span>
                        <span className="block font-medium">{student.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {student.gender} · {student.dob}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${student.progress}%` }} />
                      </div>
                      {student.progress}%
                    </div>
                  </td>
                  <td className="py-3">{student.attendance || 96}%</td>
                  <td className="py-3">
                    <Badge variant={statusVariant(student.status)}>{student.status}</Badge>
                  </td>
                  <td className="py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => onOpenStudent(student)} aria-label={`Xem ${student.name}`}>
                      <Eye />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelected(student)
                        setDialog('delete')
                      }}
                      aria-label={`Xóa ${student.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!students.length && <Empty title="Chưa có học sinh phù hợp" />}
        </CardContent>
      </Card>

      {/* Add Student Dialog (Full Form) */}
      <Dialog open={dialog === 'add-student'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Thêm học sinh mới</DialogTitle>
            <DialogDescription>Nhập thông tin chi tiết học sinh vào lớp {classItem.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label htmlFor="student-name-input" className="text-xs font-semibold">
                Họ và tên học sinh *
              </Label>
              <Input
                id="student-name-input"
                className="mt-1"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="student-gender-input" className="text-xs font-semibold">Giới tính</Label>
                <select
                  id="student-gender-input"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={studentGender}
                  onChange={(e) => setStudentGender(e.target.value)}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <Label htmlFor="student-dob-input" className="text-xs font-semibold">Ngày sinh</Label>
                <Input
                  id="student-dob-input"
                  type="date"
                  className="mt-1"
                  value={studentDob}
                  onChange={(e) => setStudentDob(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="student-parent-name" className="text-xs font-semibold">Họ tên phụ huynh</Label>
                <Input
                  id="student-parent-name"
                  className="mt-1"
                  value={studentParentName}
                  onChange={(e) => setStudentParentName(e.target.value)}
                  placeholder="Nguyễn Văn Ba"
                />
              </div>

              <div>
                <Label htmlFor="student-parent-phone" className="text-xs font-semibold">SĐT phụ huynh</Label>
                <Input
                  id="student-parent-phone"
                  className="mt-1"
                  value={studentParentPhone}
                  onChange={(e) => setStudentParentPhone(e.target.value)}
                  placeholder="0912345678"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="student-note-input" className="text-xs font-semibold">Ghi chú ban đầu</Label>
              <Input
                id="student-note-input"
                className="mt-1"
                value={studentNote}
                onChange={(e) => setStudentNote(e.target.value)}
                placeholder="VD: Cần hỗ trợ môn Toán, ngồi bàn đầu..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Hủy
            </Button>
            <Button onClick={addStudent} disabled={submitting || !studentName.trim()} className="bg-teal-600 hover:bg-teal-700">
              {submitting ? 'Đang thêm...' : 'Thêm học sinh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Class Dialog */}
      <Dialog open={dialog === 'edit-class'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Sửa thông tin lớp học</DialogTitle>
            <DialogDescription>Cập nhật tên lớp, mã lớp, phòng học và thời khóa biểu.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label htmlFor="edit-class-name" className="text-xs font-semibold">Tên lớp *</Label>
              <Input
                id="edit-class-name"
                className="mt-1"
                value={editClassName}
                onChange={(e) => setEditClassName(e.target.value)}
                placeholder="Lớp 4A1"
              />
            </div>
            <div>
              <Label htmlFor="edit-class-code" className="text-xs font-semibold">Mã lớp</Label>
              <Input
                id="edit-class-code"
                className="mt-1"
                value={editClassCode}
                onChange={(e) => setEditClassCode(e.target.value)}
                placeholder="4A1"
              />
            </div>
            <div>
              <Label htmlFor="edit-class-room" className="text-xs font-semibold">Phòng học</Label>
              <Input
                id="edit-class-room"
                className="mt-1"
                value={editClassRoom}
                onChange={(e) => setEditClassRoom(e.target.value)}
                placeholder="Phòng 204"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button onClick={updateClassDetails} disabled={submitting || !editClassName.trim()}>
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Declare Subject Dialog */}
      <Dialog open={declareOpen} onOpenChange={(open) => !open && setDeclareOpen(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Khai báo môn giảng dạy</DialogTitle>
            <DialogDescription>
              Chọn môn học bạn trực tiếp giảng dạy tại lớp {classItem.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="declare-subject-select" className="text-xs font-semibold">Môn học *</Label>
            <select
              id="declare-subject-select"
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjectsList.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclareOpen(false)} disabled={declaring}>Hủy</Button>
            <Button onClick={handleDeclareSubject} disabled={declaring || !selectedSubjectId}>
              {declaring ? <Loader2 className="size-4 animate-spin" /> : 'Xác nhận khai báo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Student Dialog */}
      <Dialog open={dialog === 'delete'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xóa học sinh</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa học sinh <strong>{selected?.name}</strong> khỏi {classItem.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={deleteStudent} disabled={submitting}>
              {submitting ? 'Đang xóa...' : 'Xóa học sinh'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StudentDirectory({ students, classes, query, setQuery, filter, setFilter, onOpenStudent }: { students: Array<StudentRecord & { className: string; classId: string }>; classes: ClassRecord[]; query: string; setQuery: (value: string) => void; filter: string; setFilter: (value: string) => void; onOpenStudent: (student: StudentRecord) => void }) {
  return (
    <div className="mx-auto max-w-7xl">
      <Header
        title="Tất cả học sinh"
        description="Tìm kiếm nhanh và mở hồ sơ học tập của từng học sinh."
        action={<Button variant="outline" onClick={() => window.print()}><Download data-icon="inline-start" />Xuất danh sách</Button>}
      />
      <div className="mb-6 flex gap-3">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên học sinh hoặc lớp..." />
        <select
          aria-label="Lọc theo lớp"
          className="h-9 rounded-md border bg-background px-3 text-sm font-medium"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="Tất cả">Tất cả các lớp</option>
          {classes.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name} {c.code ? `(${c.code})` : ''}
            </option>
          ))}
        </select>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {students.map((student) => (
            <button
              key={`${student.classId}-${student.id}`}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/40 transition"
              onClick={() => onOpenStudent(student)}
            >
              <Avatar><AvatarFallback className={student.color}>{student.initials}</AvatarFallback></Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{student.name}</span>
                <span className="text-xs text-muted-foreground">{student.className} · {student.guardian}</span>
              </span>
              <Badge variant={statusVariant(student.status)}>{student.status}</Badge>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ))}
          {!students.length && <Empty title="Chưa tìm thấy học sinh" />}
        </CardContent>
      </Card>
    </div>
  )
}

function StudentProfile({
  student,
  classItem,
  allClasses,
  onBack,
  onDelete,
  onComment,
  onTransfer,
  dialog,
  setDialog,
  comment,
  setComment,
  onSaveComment,
  onConfirmDelete,
  onTransferSuccess,
}: {
  student: StudentRecord;
  classItem: ClassRecord;
  allClasses: ClassRecord[];
  onBack: () => void;
  onDelete: () => void;
  onComment: () => void;
  onTransfer: () => void;
  dialog: string | null;
  setDialog: (value: 'comment' | 'delete' | 'transfer' | null) => void;
  comment: string;
  setComment: (value: string) => void;
  onSaveComment: () => void;
  onConfirmDelete: () => void;
  onTransferSuccess: () => void;
}) {
  const [attendanceList, setAttendanceList] = useState<Array<{ date: string; type: string; note: string }>>([])
  const [attendanceSummary, setAttendanceSummary] = useState<StudentAttendanceSummary | null>(null)
  const [commentsList, setCommentsList] = useState<Array<{ id: string; content: string; date: string; teacherName: string }>>([])
  const [enrollmentsList, setEnrollmentsList] = useState<StudentEnrollmentRecord[]>([])
  const [suggestions, setSuggestions] = useState<string[]>(commentSuggestions)
  const [aiLoading, setAiLoading] = useState(false)

  // Transfer states
  const [targetClassId, setTargetClassId] = useState<string>('')
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [transferReason, setTransferReason] = useState<string>('')
  const [transferring, setTransferring] = useState(false)

  // Edit Profile states
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [editName, setEditName] = useState(student?.name || '')
  const [editGender, setEditGender] = useState(student?.gender || 'Nam')
  const [editDob, setEditDob] = useState(student?.dob || '')
  const [editParentName, setEditParentName] = useState(student?.guardian || '')
  const [editParentPhone, setEditParentPhone] = useState(student?.phone || '')
  const [editNote, setEditNote] = useState(student?.note || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Withdraw states
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  const openEditProfile = () => {
    setEditName(student.name || '')
    setEditGender(student.gender || 'Nam')
    setEditDob(student.dob || '')
    setEditParentName(student.guardian || '')
    setEditParentPhone(student.phone || '')
    setEditNote(student.note || '')
    setEditProfileOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error('Vui lòng nhập họ tên học sinh')
      return
    }
    setSavingProfile(true)
    try {
      await apiUpdateStudent(student.id, {
        fullName: editName.trim(),
        gender: editGender,
        dob: editDob || undefined,
        parentName: editParentName.trim() || undefined,
        parentPhone: editParentPhone.trim() || undefined,
        note: editNote.trim() || undefined,
      })
      toast.success(`Đã cập nhật hồ sơ học sinh ${editName}`)
      setEditProfileOpen(false)
      student.name = editName.trim()
      student.gender = editGender as any
      student.dob = editDob
      student.guardian = editParentName.trim()
      student.phone = editParentPhone.trim()
      student.note = editNote.trim()
      onTransferSuccess() // reloads class list
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi cập nhật hồ sơ học sinh')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleWithdraw = async () => {
    if (!activeEnrollment) {
      toast.error('Không tìm thấy bản ghi ghi danh để rút khỏi lớp')
      return
    }
    setWithdrawing(true)
    try {
      await apiWithdrawStudent(activeEnrollment.id, {
        reason: withdrawReason.trim() || undefined,
        withdrawDate: new Date().toISOString(),
      })
      toast.success(`Đã rút học sinh ${student.name} khỏi lớp ${classItem.name}`)
      setWithdrawOpen(false)
      onTransferSuccess()
      onBack()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi rút học sinh khỏi lớp')
    } finally {
      setWithdrawing(false)
    }
  }

  useEffect(() => {
    if (student?.id) {
      apiGetStudentAttendance(student.id).then(setAttendanceList).catch(() => {})
      getStudentAttendanceSummary(student.id).then(setAttendanceSummary).catch(() => {})
      apiGetStudentComments(student.id).then(setCommentsList)
      apiGetStudentEnrollments(student.id).then((enrs) => {
        setEnrollmentsList(enrs)
        // Select first available class in same school year that is not current class
        const sameYearClasses = allClasses.filter((c) => c.id !== classItem.id && (!classItem.schoolYearId || c.schoolYearId === classItem.schoolYearId))
        if (sameYearClasses.length > 0) {
          setTargetClassId(sameYearClasses[0].id)
        }
      })
    }
  }, [student?.id, classItem.id, classItem.schoolYearId, allClasses])

  const eligibleTransferClasses = allClasses.filter(
    (c) => c.id !== classItem.id && (!classItem.schoolYearId || c.schoolYearId === classItem.schoolYearId)
  )

  const activeEnrollment = enrollmentsList.find((e) => e.status === 'ACTIVE')

  const handleTransfer = async () => {
    if (!targetClassId) {
      toast.error('Vui lòng chọn lớp học chuyển đến')
      return
    }
    if (!activeEnrollment) {
      toast.error('Không tìm thấy bản ghi ghi danh đang hoạt động của học sinh này')
      return
    }

    setTransferring(true)
    try {
      await apiTransferStudent(activeEnrollment.id, {
        targetClassroomId: targetClassId,
        transferDate: new Date(transferDate).toISOString(),
        reason: transferReason.trim() || undefined,
      })
      toast.success(`Đã chuyển học sinh ${student.name} sang lớp mới thành công`)
      setDialog(null)
      onTransferSuccess()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể chuyển lớp lúc này')
    } finally {
      setTransferring(false)
    }
  }

  const fetchAiSuggestions = async () => {
    setAiLoading(true)
    try {
      const res = await generateStudentComment({
        subject: 'Tổng hợp',
        criteria: {
          'Tiến độ': `${student.progress}%`,
          'Chuyên cần': `${student.attendance || 96}%`,
        },
        assessmentLevel: student.status === 'Tốt' ? 'Hoàn thành tốt' : student.status === 'Khá' ? 'Hoàn thành' : 'Cần hỗ trợ',
        notes: student.note,
      })
      if (res.comments?.length) {
        setSuggestions(res.comments)
        toast.success('Đã tải gợi ý nhận xét từ Google Gemini!')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo gợi ý nhận xét lúc này.')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Button variant="ghost" className="mb-4 -ml-3" onClick={onBack}>
        <ArrowLeft data-icon="inline-start" />Quay lại {classItem.name}
      </Button>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className={`text-lg ${student.color}`}>{student.initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">{student.name}</h1>
                <Badge variant={statusVariant(student.status)}>{student.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {classItem.name} {classItem.code ? `(${classItem.code})` : ''} · {student.gender} · Sinh ngày {student.dob}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Phụ huynh: {student.guardian} · {student.phone}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openEditProfile}>
              <Edit2 data-icon="inline-start" className="size-4" />Sửa hồ sơ
            </Button>
            <Button variant="outline" onClick={onTransfer} className="border-teal-500 text-teal-700 hover:bg-teal-50">
              <ArrowRightLeft data-icon="inline-start" className="size-4" />Chuyển lớp
            </Button>
            <Button variant="outline" onClick={() => setWithdrawOpen(true)} className="border-amber-400 text-amber-700 hover:bg-amber-50">
              Rút khỏi lớp
            </Button>
            <Button onClick={onComment}>
              <MessageSquare data-icon="inline-start" className="size-4" />Nhận xét
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Tiến độ chung" value={`${student.progress}%`} helper="So với đầu kỳ" icon={<BarChart3 />} />
        <Stat label="Chuyên cần" value={`${student.attendance || 96}%`} helper="Tháng 8/2026" icon={<CalendarCheck2 />} />
        <Stat label="Nhận xét" value={String(commentsList.length || 12)} helper="Đã ghi nhận" icon={<MessageSquare />} />
        <Stat label="Mục tiêu" value="3/4" helper="Đang hoàn thành" icon={<Heart />} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="learning">Học tập</TabsTrigger>
          <TabsTrigger value="comments">Nhận xét</TabsTrigger>
          <TabsTrigger value="attendance">Chuyên cần</TabsTrigger>
          <TabsTrigger value="enrollments">Lịch sử phân lớp</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tiến độ học tập</CardTitle>
              <CardDescription>Kết quả các môn học trong tháng 8.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử & Địa lý'].map((subject, index) => (
                <div key={subject}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{subject}</span>
                    <span className="font-medium">{[9.1, 8.7, 8.9, 8.2][index]}/10</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${[91, 87, 89, 82][index]}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ghi chú gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="rounded-xl bg-primary/5 p-4 text-sm leading-6">{student.note}</p>
              <Button variant="link" className="px-0" onClick={onComment}>Thêm nhận xét mới</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Kết quả học tập</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {['Toán', 'Tiếng Việt', 'Khoa học', 'Lịch sử & Địa lý'].map((subject, index) => (
                <div key={subject} className="rounded-xl border p-4">
                  <p className="font-medium">{subject}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Điểm trung bình: {[9.1, 8.7, 8.9, 8.2][index]}/10</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle>Nhận xét học sinh</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="rounded-xl border p-4 text-sm leading-6">{student.note}</p>
              {commentsList.map((c) => (
                <div key={c.id} className="rounded-xl border bg-muted/40 p-4 text-sm">
                  <p className="text-slate-800">{c.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{c.date} · {c.teacherName}</p>
                </div>
              ))}
              <Button variant="outline" onClick={onComment}><Plus data-icon="inline-start" />Thêm nhận xét</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-5 space-y-4">
          {/* Summary metrics */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 font-medium">Tỷ lệ chuyên cần</p>
              <p className="mt-1 text-2xl font-bold text-teal-700">
                {attendanceSummary?.summary.attendanceRate ?? student.attendance ?? 100}%
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {attendanceSummary ? `${attendanceSummary.summary.presentCount}/${attendanceSummary.summary.totalPeriods} tiết có mặt` : 'Ghi nhận theo tiết'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 font-medium">Có mặt đúng giờ</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {attendanceSummary?.summary.presentCount ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">tiết học</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 font-medium">Vắng mặt</p>
              <p className="mt-1 text-2xl font-bold text-rose-600">
                {attendanceSummary?.summary.absentCount ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {attendanceSummary?.summary.excusedCount || 0} có phép · {attendanceSummary?.summary.unexcusedCount || 0} không phép
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500 font-medium">Đi muộn</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {attendanceSummary?.summary.lateCount ?? 0}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">lần ghi nhận</p>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Lịch sử điểm danh theo tiết học</CardTitle>
              <CardDescription>Ghi nhận chi tiết từ các tiết dạy trên Lịch dạy.</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceSummary && attendanceSummary.recentLogs.length > 0 ? (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                  {attendanceSummary.recentLogs.map((log) => {
                    const statusLabel =
                      log.status === 'PRESENT'
                        ? 'Có mặt'
                        : log.status === 'EXCUSED_ABSENCE'
                          ? 'Vắng có phép'
                          : log.status === 'UNEXCUSED_ABSENCE'
                            ? 'Vắng không phép'
                            : 'Đi muộn'
                    const statusColor =
                      log.status === 'PRESENT'
                        ? 'bg-teal-50 text-teal-700 border-teal-200'
                        : log.status === 'EXCUSED_ABSENCE'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : log.status === 'UNEXCUSED_ABSENCE'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'

                    return (
                      <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 text-sm hover:bg-slate-50/70 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-semibold text-slate-800 shrink-0">{log.date}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-700 truncate font-medium">{log.subjectName}</span>
                          <span className="text-xs text-slate-400 shrink-0 font-mono">({log.startTime} - {log.endTime})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${statusColor}`}>
                            {statusLabel}
                            {log.status === 'LATE' && log.lateMinutes > 0 && ` (${log.lateMinutes}p)`}
                          </span>
                          {log.note && (
                            <span className="text-xs text-slate-400 italic max-w-[200px] truncate">
                              📝 {log.note}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {(attendanceList.length > 0 ? attendanceList : ['20/08/2026 · Có mặt', '19/08/2026 · Có mặt', '18/08/2026 · Đi muộn', '17/08/2026 · Có mặt'].map((e) => typeof e === 'string' ? { date: e.split(' · ')[0], type: e.split(' · ')[1] || 'Có mặt', note: 'Đúng giờ' } : e)).map((event, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                      <span>{event.date} · {event.type}</span>
                      <span className="text-xs text-muted-foreground">{event.note}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrollments" className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="size-5 text-primary" />
                Lịch sử ghi danh và phân lớp
              </CardTitle>
              <CardDescription>Bảo toàn đầy đủ tiến trình học tập qua các năm học và chuyển lớp.</CardDescription>
            </CardHeader>
            <CardContent>
              {enrollmentsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có lịch sử ghi danh.</p>
              ) : (
                <div className="divide-y rounded-xl border">
                  {enrollmentsList.map((enr) => (
                    <div key={enr.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{enr.classroom?.name || classItem.name}</span>
                          <Badge variant={enr.status === 'ACTIVE' ? 'default' : enr.status === 'TRANSFERRED' ? 'secondary' : 'destructive'}>
                            {enr.status === 'ACTIVE' ? 'Đang học' : enr.status === 'TRANSFERRED' ? 'Đã chuyển lớp' : 'Đã rút hồ sơ'}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Năm học: {enr.schoolYear?.name || '2026 - 2027'} · Khối {enr.classroom?.gradeName || 'Khối 4'}
                        </p>
                        {enr.transferReason && (
                          <p className="mt-1 text-xs text-slate-600">Lý do chuyển: {enr.transferReason}</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>Từ: {new Date(enr.enrolledAt).toLocaleDateString('vi-VN')}</p>
                        {enr.leftAt && <p>Đến: {new Date(enr.leftAt).toLocaleDateString('vi-VN')}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button variant="ghost" className="text-destructive" onClick={onDelete}>
          <Trash2 data-icon="inline-start" />Xóa khỏi lớp
        </Button>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={dialog === 'transfer'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Chuyển lớp cho học sinh</DialogTitle>
            <DialogDescription>
              Chuyển học sinh sang lớp khác trong cùng năm học mà không làm mất lịch sử học tập.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="rounded-lg bg-muted/60 p-3 text-sm">
              <p><span className="text-muted-foreground">Học sinh:</span> <strong>{student.name}</strong></p>
              <p className="mt-1"><span className="text-muted-foreground">Lớp hiện tại:</span> <strong>{classItem.name}</strong></p>
            </div>

            <div>
              <Label htmlFor="target-class" className="text-xs font-semibold">Lớp chuyển đến *</Label>
              <select
                id="target-class"
                className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
              >
                {eligibleTransferClasses.length === 0 ? (
                  <option value="">Không có lớp khả dụng trong cùng năm học</option>
                ) : (
                  eligibleTransferClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `(${c.code})` : ''} - {c.grade} ({c.room})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <Label htmlFor="transfer-date" className="text-xs font-semibold">Ngày chuyển lớp *</Label>
              <Input
                id="transfer-date"
                type="date"
                className="mt-1"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="transfer-reason" className="text-xs font-semibold">Lý do chuyển lớp</Label>
              <Input
                id="transfer-reason"
                className="mt-1"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Ví dụ: Theo nguyện vọng gia đình, đổi phòng học..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button
              onClick={handleTransfer}
              disabled={transferring || eligibleTransferClasses.length === 0}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {transferring ? 'Đang chuyển...' : 'Xác nhận chuyển lớp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={dialog === 'comment'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Thêm nhận xét</span>
              <Button size="sm" variant="outline" disabled={aiLoading} onClick={fetchAiSuggestions} className="text-xs text-teal-700 hover:bg-teal-50">
                {aiLoading ? <Loader2 className="mr-1 size-3 animate-spin" /> : <Sparkles className="mr-1 size-3 text-teal-600" />}
                {aiLoading ? 'Đang tạo...' : 'Gợi ý AI (Gemini)'}
              </Button>
            </DialogTitle>
            <DialogDescription>Ghi nhận ngắn gọn, tích cực, mang tính khích lệ và chỉ dẫn hành động.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <Button key={item} size="sm" variant="outline" className="text-xs" onClick={() => setComment(item)}>
                {item}
              </Button>
            ))}
          </div>
          <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} placeholder="Nhập nhận xét..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button onClick={onSaveComment}>Lưu nhận xét</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={dialog === 'delete'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa học sinh</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa học sinh <strong>{student.name}</strong> khỏi {classItem.name}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button variant="destructive" onClick={onConfirmDelete}>Xóa học sinh</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hồ sơ học sinh</DialogTitle>
            <DialogDescription>Cập nhật thông tin lý lịch và liên hệ của {student.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label htmlFor="edit-student-name" className="text-xs font-semibold">Họ và tên *</Label>
              <Input
                id="edit-student-name"
                className="mt-1"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nguyễn Văn An"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-student-gender" className="text-xs font-semibold">Giới tính</Label>
                <select
                  id="edit-student-gender"
                  className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value as any)}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-student-dob" className="text-xs font-semibold">Ngày sinh</Label>
                <Input
                  id="edit-student-dob"
                  type="date"
                  className="mt-1"
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-parent-name" className="text-xs font-semibold">Họ tên phụ huynh</Label>
                <Input
                  id="edit-parent-name"
                  className="mt-1"
                  value={editParentName}
                  onChange={(e) => setEditParentName(e.target.value)}
                  placeholder="Phụ huynh"
                />
              </div>
              <div>
                <Label htmlFor="edit-parent-phone" className="text-xs font-semibold">SĐT phụ huynh</Label>
                <Input
                  id="edit-parent-phone"
                  className="mt-1"
                  value={editParentPhone}
                  onChange={(e) => setEditParentPhone(e.target.value)}
                  placeholder="0912345678"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-student-note" className="text-xs font-semibold">Ghi chú</Label>
              <Input
                id="edit-student-note"
                className="mt-1"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Ghi chú về học sinh..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfileOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile || !editName.trim()} className="bg-teal-600 hover:bg-teal-700">
              {savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Student Dialog */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Xác nhận rút học sinh khỏi lớp</DialogTitle>
            <DialogDescription>
              Học sinh <strong>{student.name}</strong> sẽ được chuyển trạng thái sang ĐÃ RÚT (Withdrawn). Lịch sử chuyên cần và điểm số trước đây vẫn được bảo toàn.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="withdraw-reason" className="text-xs font-semibold">Lý do rút học sinh</Label>
            <Input
              id="withdraw-reason"
              className="mt-1"
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
              placeholder="VD: Chuyển trường, nghỉ học..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleWithdraw} disabled={withdrawing}>
              {withdrawing ? 'Đang xử lý...' : 'Xác nhận rút'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ClassroomManager
