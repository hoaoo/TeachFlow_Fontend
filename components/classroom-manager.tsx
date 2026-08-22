'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { type ClassRecord, type StudentRecord } from '@/lib/classroom-data'
import {
  getClassesWithSummary,
  getSchoolYears,
  getGrades,
  createClass as apiCreateClass,
  updateClass as apiUpdateClass,
  deleteClass as apiDeleteClass,
  completeClass as apiCompleteClass,
  cloneClass as apiCloneClass,
  getClassDashboard,
  getClassStudents,
  addStudentToClass as apiAddStudent,
  importStudentsToClass as apiImportStudents,
  transferStudent as apiTransferStudent,
  removeStudentFromClass as apiRemoveStudent,
  getClassSchedules,
  getClassAttendance,
  getClassAssessments,
  getClassLessonPlans,
  getStudentAttendance as apiGetStudentAttendance,
  getStudentComments as apiGetStudentComments,
  addStudentComment as apiAddStudentComment,
  getStudentEnrollments as apiGetStudentEnrollments,
  updateStudent as apiUpdateStudent,
  type SchoolYearOption,
  type GradeOption,
  type ClassDashboardData,
  type ClassAttendanceData,
  type ClassAssessmentData,
  type ClassLessonPlanRecord,
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
import {
  getGradebook,
  saveAssessmentScores,
  createAssessmentColumn,
  updateAssessmentColumn,
  deleteAssessmentColumn,
  importGradebookScores,
  exportGradebook,
  type GradebookData,
  type AssessmentColumn,
  type StudentGradeRow,
} from '@/services/assessment-service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  ArrowLeft, BarChart3, CalendarCheck2, ChevronRight, Download, Eye, Filter, GraduationCap,
  Heart, LayoutGrid, MessageSquare, Plus, Search, Trash2, UserPlus, Users, Sparkles, Loader2,
  ArrowRightLeft, History, Edit2, BookOpen, X, Check, Copy, CheckCircle2, Clock, CalendarDays,
  FileSpreadsheet, FileText, UploadCloud, AlertCircle, RefreshCw, MoreVertical, ShieldCheck,
  TrendingUp, Award, Phone, Mail, User, School, ArrowUpRight
} from 'lucide-react'
import { ScheduleAttendanceDialog } from '@/components/schedule-attendance-dialog'
import { generateStudentComment } from '@/services/ai-service'

type ViewState = {
  page: 'classes' | 'class' | 'student'
  classId?: string
  studentId?: string
  initialTab?: string
}

const statusVariant = (status: StudentRecord['status']) =>
  status === 'Tốt' ? 'default' : status === 'Khá' ? 'secondary' : 'destructive'

export function ClassroomManager({
  initialSection = 'classes',
  initialClassId,
}: {
  initialSection?: 'classes' | 'students'
  initialClassId?: string
}) {
  const [view, setView] = useState<ViewState>({
    page: initialClassId ? 'class' : 'classes',
    classId: initialClassId,
  })

  useEffect(() => {
    if (initialClassId) {
      setView({ page: 'class', classId: initialClassId })
    }
  }, [initialClassId])
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [summaryStats, setSummaryStats] = useState<{ totalClasses: number; totalStudents: number; avgAttendanceRate: number | null }>({
    totalClasses: 0,
    totalStudents: 0,
    avgAttendanceRate: null,
  })
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([])
  const [grades, setGrades] = useState<GradeOption[]>([])
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('ALL')
  const [selectedGradeId, setSelectedGradeId] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedSort, setSelectedSort] = useState<string>('name')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // Global Dialog States (isolated from navigation view)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editClassTarget, setEditClassTarget] = useState<ClassRecord | null>(null)
  const [cloneClassTarget, setCloneClassTarget] = useState<ClassRecord | null>(null)
  const [completeClassTarget, setCompleteClassTarget] = useState<ClassRecord | null>(null)
  const [deleteClassTarget, setDeleteClassTarget] = useState<ClassRecord | null>(null)

  // Selected student for detail
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null)

  // Create Form State
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formSchoolYearId, setFormSchoolYearId] = useState('')
  const [formGradeId, setFormGradeId] = useState('')
  const [formRoom, setFormRoom] = useState('')
  const [formSchedule, setFormSchedule] = useState('Sáng · Thứ 2 - Thứ 6')
  const [creating, setCreating] = useState(false)

  // Edit Form State
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editRoom, setEditRoom] = useState('')
  const [editSchedule, setEditSchedule] = useState('')
  const [editGradeId, setEditGradeId] = useState('')
  const [editStatus, setEditStatus] = useState('ACTIVE')
  const [updating, setUpdating] = useState(false)

  // Clone Form State
  const [cloneTargetSyId, setCloneTargetSyId] = useState('')
  const [cloneTargetName, setCloneTargetName] = useState('')
  const [cloneTargetCode, setCloneTargetCode] = useState('')
  const [cloneCopyStudents, setCloneCopyStudents] = useState(false)
  const [cloning, setCloning] = useState(false)

  const loadInitialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [years, gs, classRes] = await Promise.all([
        getSchoolYears(),
        getGrades(),
        getClassesWithSummary(),
      ])
      setSchoolYears(years)
      setGrades(gs)

      const currentYear = years.find((y) => y.isCurrent) || years[0]
      if (currentYear) {
        setSelectedSchoolYearId(currentYear.id)
        setFormSchoolYearId(currentYear.id)
        setCloneTargetSyId(currentYear.id)
      }
      if (gs.length > 0) {
        setFormGradeId(gs[0].id)
      }

      setClasses(classRes.items)
      setSummaryStats(classRes.summary)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách lớp học')
      toast.error('Không thể tải danh sách lớp học')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const reloadClasses = async (params?: {
    schoolYearId?: string
    gradeId?: string
    status?: string
    keyword?: string
    sort?: string
  }) => {
    try {
      const res = await getClassesWithSummary({
        schoolYearId: params?.schoolYearId ?? (selectedSchoolYearId !== 'ALL' ? selectedSchoolYearId : undefined),
        gradeId: params?.gradeId ?? (selectedGradeId !== 'ALL' ? selectedGradeId : undefined),
        status: params?.status ?? (selectedStatus !== 'ALL' ? selectedStatus : undefined),
        keyword: params?.keyword ?? (query || undefined),
        sort: params?.sort ?? selectedSort,
      })
      setClasses(res.items)
      setSummaryStats(res.summary)
    } catch {
      // keep existing
    }
  }

  // Handle Search & Filter triggers
  const handleSearchChange = (kw: string) => {
    setQuery(kw)
    reloadClasses({ keyword: kw })
  }

  const handleSchoolYearChange = (syId: string) => {
    setSelectedSchoolYearId(syId)
    reloadClasses({ schoolYearId: syId !== 'ALL' ? syId : undefined })
  }

  const handleGradeChange = (gId: string) => {
    setSelectedGradeId(gId)
    reloadClasses({ gradeId: gId !== 'ALL' ? gId : undefined })
  }

  const handleStatusChange = (st: string) => {
    setSelectedStatus(st)
    reloadClasses({ status: st !== 'ALL' ? st : undefined })
  }

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort)
    reloadClasses({ sort })
  }

  // Action Handlers
  const handleCreateClass = async () => {
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

    setCreating(true)
    try {
      const created = await apiCreateClass({
        name: formName.trim(),
        code: formCode.trim() || undefined,
        schoolYearId: formSchoolYearId,
        gradeId: formGradeId,
        room: formRoom.trim() || undefined,
        schedule: formSchedule.trim() || undefined,
      })
      setClasses((prev) => [created, ...prev])
      setCreateDialogOpen(false)
      setFormName('')
      setFormCode('')
      setFormRoom('')
      toast.success(`Đã tạo lớp ${created.name} thành công!`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi tạo lớp học')
    } finally {
      setCreating(false)
    }
  }

  const openEditModal = (cls: ClassRecord) => {
    setEditClassTarget(cls)
    setEditName(cls.name || '')
    setEditCode(cls.code || '')
    setEditRoom(cls.room || '')
    setEditSchedule(cls.schedule || 'Sáng · Thứ 2 - Thứ 6')
    setEditGradeId(cls.gradeId || '')
    setEditStatus(cls.status || 'ACTIVE')
  }

  const handleUpdateClass = async () => {
    if (!editClassTarget || !editName.trim()) {
      toast.error('Tên lớp không được để trống')
      return
    }
    setUpdating(true)
    try {
      const updated = await apiUpdateClass(editClassTarget.id, {
        name: editName.trim(),
        code: editCode.trim() || undefined,
        room: editRoom.trim() || undefined,
        schedule: editSchedule.trim() || undefined,
        gradeId: editGradeId || undefined,
        status: editStatus,
      })
      setClasses((prev) => prev.map((c) => (c.id === editClassTarget.id ? { ...c, ...updated } : c)))
      setEditClassTarget(null)
      toast.success(`Đã cập nhật thông tin lớp ${updated.name}`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi cập nhật lớp học')
    } finally {
      setUpdating(false)
    }
  }

  const openCloneModal = (cls: ClassRecord) => {
    setCloneClassTarget(cls)
    setCloneTargetName(`${cls.name} (Mới)`)
    setCloneTargetCode(`${cls.code || ''}N`)
    setCloneCopyStudents(true)
  }

  const handleCloneClass = async () => {
    if (!cloneClassTarget || !cloneTargetName.trim() || !cloneTargetSyId) {
      toast.error('Vui lòng điền đầy đủ thông tin nhân bản')
      return
    }
    setCloning(true)
    try {
      const cloned = await apiCloneClass(cloneClassTarget.id, {
        targetSchoolYearId: cloneTargetSyId,
        targetName: cloneTargetName.trim(),
        targetCode: cloneTargetCode.trim() || undefined,
        copyStudents: cloneCopyStudents,
      })
      setClasses((prev) => [cloned, ...prev])
      setCloneClassTarget(null)
      toast.success(`Đã nhân bản lớp sang ${cloned.name} thành công!`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi nhân bản lớp học')
    } finally {
      setCloning(false)
    }
  }

  const handleCompleteClass = async () => {
    if (!completeClassTarget) return
    try {
      await apiCompleteClass(completeClassTarget.id)
      setClasses((prev) =>
        prev.map((c) => (c.id === completeClassTarget.id ? { ...c, status: 'COMPLETED' } : c)),
      )
      setCompleteClassTarget(null)
      toast.success(`Đã đánh dấu hoàn thành năm học cho lớp ${completeClassTarget.name}`)
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi kết thúc lớp học')
    }
  }

  const handleDeleteClass = async () => {
    if (!deleteClassTarget) return
    try {
      await apiDeleteClass(deleteClassTarget.id)
      setClasses((prev) => prev.filter((c) => c.id !== deleteClassTarget.id))
      const targetId = deleteClassTarget.id
      setDeleteClassTarget(null)
      if (view.page === 'class' && view.classId === targetId) {
        setView({ page: 'classes' })
      }
      toast.success(`Đã lưu trữ và ngừng sử dụng lớp ${deleteClassTarget.name}`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi xóa lớp học')
    }
  }

  // Selected current class
  const currentClass = classes.find((item) => item.id === view.classId) ?? classes[0]

  return (
    <div className="w-full">
      {/* 1. STUDENT PROFILE VIEW */}
      {view.page === 'student' && selectedStudent && currentClass ? (
        <StudentProfileView
          student={selectedStudent}
          classItem={currentClass}
          allClasses={classes}
          onBack={() => setView({ page: 'class', classId: currentClass.id })}
          onStudentUpdated={() => {
            reloadClasses()
          }}
        />
      ) : view.page === 'class' && currentClass ? (
        /* 2. CLASS DETAIL VIEW (Overlay Dialogs rendered globally) */
        <ClassDetailView
          classItem={currentClass}
          allClasses={classes}
          schoolYears={schoolYears}
          grades={grades}
          initialTab={view.initialTab}
          onBack={() => setView({ page: 'classes' })}
          onOpenStudent={(s) => {
            setSelectedStudent(s)
            setView({ page: 'student', classId: currentClass.id, studentId: s.id })
          }}
          onOpenEdit={() => openEditModal(currentClass)}
          onOpenClone={() => openCloneModal(currentClass)}
          onOpenComplete={() => setCompleteClassTarget(currentClass)}
          onOpenDelete={() => setDeleteClassTarget(currentClass)}
          onClassUpdated={() => reloadClasses()}
        />
      ) : (
        /* 3. DIRECTORY VIEW */
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
                <GraduationCap className="size-4" /> Quản lý lớp học TeachFlow
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Lớp học của tôi
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Trung tâm quản lý toàn bộ dữ liệu, học sinh, điểm danh và hoạt động học tập theo từng lớp.
              </p>
            </div>

            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 shadow-sm h-9 px-4 shrink-0"
            >
              <Plus className="size-4" /> Tạo lớp mới
            </Button>
          </div>

          {/* 3 Summary KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tổng số lớp</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{summaryStats.totalClasses}</p>
                  <p className="text-[11px] text-teal-700 font-medium mt-0.5">Theo bộ lọc hiện tại</p>
                </div>
                <div className="size-10 rounded-xl bg-teal-50 text-teal-700 grid place-items-center">
                  <LayoutGrid className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tổng học sinh</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{summaryStats.totalStudents}</p>
                  <p className="text-[11px] text-blue-700 font-medium mt-0.5">Học sinh đang theo học</p>
                </div>
                <div className="size-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center">
                  <Users className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tỷ lệ đi học</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summaryStats.avgAttendanceRate !== null && summaryStats.avgAttendanceRate !== undefined
                      ? `${summaryStats.avgAttendanceRate}%`
                      : '—'}
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                    {summaryStats.avgAttendanceRate !== null && summaryStats.avgAttendanceRate !== undefined
                      ? 'Trung bình tháng này'
                      : 'Chưa có dữ liệu tháng này'}
                  </p>
                </div>
                <div className="size-10 rounded-xl bg-amber-50 text-amber-700 grid place-items-center">
                  <CalendarCheck2 className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter and Search Bar */}
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-3.5 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search Input */}
                <div className="relative sm:col-span-2 lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Tìm theo tên lớp, mã lớp, phòng học..."
                    value={query}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
                  />
                </div>

                {/* School Year Filter */}
                <div>
                  <select
                    aria-label="Lọc theo năm học"
                    value={selectedSchoolYearId}
                    onChange={(e) => handleSchoolYearChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="ALL">Tất cả năm học</option>
                    {schoolYears.map((sy) => (
                      <option key={sy.id} value={sy.id}>
                        {sy.name} {sy.isCurrent ? '(Hiện tại)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Filter */}
                <div>
                  <select
                    aria-label="Lọc theo khối lớp"
                    value={selectedGradeId}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="ALL">Tất cả khối</option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <select
                    aria-label="Sắp xếp danh sách lớp"
                    value={selectedSort}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="name">Tên lớp (A-Z)</option>
                    <option value="studentCount">Sĩ số (Cao - Thấp)</option>
                    <option value="attendanceRate">Chuyên cần (Cao - Thấp)</option>
                    <option value="updatedAt">Cập nhật gần nhất</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Cards Grid */}
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="size-8 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-sm font-medium">Đang tải danh sách lớp học...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center bg-white rounded-xl border border-rose-200 p-6 space-y-3">
              <AlertCircle className="size-8 mx-auto text-rose-500" />
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <Button variant="outline" size="sm" onClick={() => loadInitialData()} className="text-xs gap-1.5">
                <RefreshCw className="size-3" /> Thử lại
              </Button>
            </div>
          ) : classes.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
              <School className="size-10 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-800">Bạn chưa có lớp học nào</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Bắt đầu thiết lập danh sách lớp học để quản lý học sinh, lập lịch dạy và ghi nhận điểm danh.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-teal-600 text-white text-xs font-semibold gap-1.5">
                <Plus className="size-3.5" /> Tạo lớp đầu tiên
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {classes.map((item) => (
                <Card
                  key={item.id}
                  className="group hover:border-teal-300 hover:shadow-md transition-all cursor-pointer border-slate-200 flex flex-col justify-between"
                  onClick={() => setView({ page: 'class', classId: item.id })}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                            {item.name}
                          </CardTitle>
                          {item.code && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {item.code}
                            </span>
                          )}
                        </div>
                        <CardDescription className="text-xs text-slate-500 mt-1">
                          {item.grade} · {item.room || 'Phòng học'} · {item.schoolYear?.name || ''}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Badge
                          variant={item.status === 'COMPLETED' ? 'secondary' : 'default'}
                          className={`text-[10px] ${
                            item.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-teal-50 text-teal-700 border-teal-200'
                          }`}
                        >
                          {item.status === 'COMPLETED' ? 'Đã kết thúc' : 'Đang hoạt động'}
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="size-8 text-slate-400 hover:text-slate-700">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'overview' })}>
                              <Eye className="size-3.5 mr-2" /> Xem tổng quan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'students' })}>
                              <Users className="size-3.5 mr-2" /> Quản lý học sinh
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'schedules' })}>
                              <CalendarDays className="size-3.5 mr-2" /> Lịch dạy
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'attendance' })}>
                              <CalendarCheck2 className="size-3.5 mr-2" /> Điểm danh
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'assessments' })}>
                              <BarChart3 className="size-3.5 mr-2" /> Đánh giá
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditModal(item)}>
                              <Edit2 className="size-3.5 mr-2" /> Chỉnh sửa lớp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCloneModal(item)}>
                              <Copy className="size-3.5 mr-2" /> Nhân bản sang năm mới
                            </DropdownMenuItem>
                            {item.status !== 'COMPLETED' && (
                              <DropdownMenuItem onClick={() => setCompleteClassTarget(item)}>
                                <CheckCircle2 className="size-3.5 mr-2 text-blue-600" /> Kết thúc năm học
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteClassTarget(item)} className="text-rose-600">
                              <Trash2 className="size-3.5 mr-2" /> Xóa / Lưu trữ
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="grid gap-3 pt-0">
                    {/* 3 Metrics Box */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-50/80 rounded-xl p-2.5 text-center border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.studentCount ?? item.students?.length ?? 0}</p>
                        <p className="text-[10px] text-slate-500">Sĩ số</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-teal-700">
                          {typeof item.average === 'number' && item.average !== null ? `${item.average} đ` : '—'}
                        </p>
                        <p className="text-[10px] text-slate-500">Điểm TB</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-700">
                          {typeof item.attendance === 'number' && item.attendance !== null ? `${item.attendance}%` : '—'}
                        </p>
                        <p className="text-[10px] text-slate-500">Đi học</p>
                      </div>
                    </div>

                    {/* Schedule and Arrow Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className="truncate">{item.schedule || 'Sáng · Thứ 2 - Thứ 6'}</span>
                      <span className="flex items-center text-teal-600 font-semibold group-hover:translate-x-0.5 transition-transform text-[11px]">
                        Xem chi tiết <ChevronRight className="size-3.5 ml-0.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* GLOBAL MODALS (Preserves Classroom Detail or Directory in background) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* CREATE CLASS DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Tạo lớp học mới</DialogTitle>
            <DialogDescription>
              Thiết lập thông tin lớp học theo năm học và khối lớp giảng dạy.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="create-sy" className="text-xs font-semibold">Năm học *</Label>
                <select
                  id="create-sy"
                  value={formSchoolYearId}
                  onChange={(e) => setFormSchoolYearId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  {schoolYears.map((sy) => (
                    <option key={sy.id} value={sy.id}>
                      {sy.name} {sy.isCurrent ? '(Hiện tại)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="create-grade" className="text-xs font-semibold">Khối lớp *</Label>
                <select
                  id="create-grade"
                  value={formGradeId}
                  onChange={(e) => setFormGradeId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
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
                <Label htmlFor="create-name" className="text-xs font-semibold">Tên lớp *</Label>
                <Input
                  id="create-name"
                  placeholder="Lớp 4A1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="create-code" className="text-xs font-semibold">Mã lớp *</Label>
                <Input
                  id="create-code"
                  placeholder="4A1"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="mt-1 text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="create-room" className="text-xs font-semibold">Phòng học</Label>
                <Input
                  id="create-room"
                  placeholder="Phòng 204"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="create-schedule" className="text-xs font-semibold">Ca học / Thời khóa biểu</Label>
                <Input
                  id="create-schedule"
                  placeholder="Sáng · Thứ 2 - Thứ 6"
                  value={formSchedule}
                  onChange={(e) => setFormSchedule(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleCreateClass}
              disabled={creating || !formName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5"
            >
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Tạo lớp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT CLASS DIALOG */}
      <Dialog open={!!editClassTarget} onOpenChange={(val) => !val && setEditClassTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin lớp {editClassTarget?.name}</DialogTitle>
            <DialogDescription>Cập nhật tên, mã lớp, phòng học và ca học.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-name" className="text-xs font-semibold">Tên lớp *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="edit-code" className="text-xs font-semibold">Mã lớp</Label>
                <Input
                  id="edit-code"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="mt-1 text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-room" className="text-xs font-semibold">Phòng học</Label>
                <Input
                  id="edit-room"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="edit-schedule" className="text-xs font-semibold">Ca học</Label>
                <Input
                  id="edit-schedule"
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-grade" className="text-xs font-semibold">Khối lớp</Label>
                <select
                  id="edit-grade"
                  value={editGradeId}
                  onChange={(e) => setEditGradeId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="edit-status" className="text-xs font-semibold">Trạng thái</Label>
                <select
                  id="edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="COMPLETED">Đã kết thúc</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditClassTarget(null)} disabled={updating}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateClass}
              disabled={updating || !editName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5"
            >
              {updating ? <Loader2 className="size-3.5 animate-spin" /> : <SaveIcon />} Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLONE CLASS DIALOG */}
      <Dialog open={!!cloneClassTarget} onOpenChange={(val) => !val && setCloneClassTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Nhân bản lớp sang năm học mới</DialogTitle>
            <DialogDescription>
              Tạo lớp mới từ lớp <strong>{cloneClassTarget?.name}</strong> cho năm học tiếp theo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Năm học đích *</Label>
              <select
                value={cloneTargetSyId}
                onChange={(e) => setCloneTargetSyId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
              >
                {schoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.name} {sy.isCurrent ? '(Hiện tại)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Tên lớp mới *</Label>
                <Input
                  value={cloneTargetName}
                  onChange={(e) => setCloneTargetName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Mã lớp mới</Label>
                <Input
                  value={cloneTargetCode}
                  onChange={(e) => setCloneTargetCode(e.target.value)}
                  className="mt-1 text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="copy-students"
                checked={cloneCopyStudents}
                onChange={(e) => setCloneCopyStudents(e.target.checked)}
                className="size-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <Label htmlFor="copy-students" className="text-xs text-slate-700 cursor-pointer font-medium">
                Tự động sao chép danh sách học sinh sang năm học mới (Ghi danh mới)
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCloneClassTarget(null)} disabled={cloning}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleCloneClass}
              disabled={cloning || !cloneTargetName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5"
            >
              {cloning ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />} Nhân bản lớp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMPLETE CLASS CONFIRMATION */}
      <Dialog open={!!completeClassTarget} onOpenChange={(val) => !val && setCompleteClassTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Kết thúc năm học lớp {completeClassTarget?.name}?</DialogTitle>
            <DialogDescription>
              Lớp sẽ chuyển sang trạng thái <strong>Đã kết thúc</strong>. Dữ liệu học sinh, điểm danh và đánh giá sẽ được bảo lưu an toàn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCompleteClassTarget(null)}>Hủy</Button>
            <Button size="sm" onClick={handleCompleteClass} className="bg-blue-600 hover:bg-blue-700 text-white">
              Xác nhận kết thúc
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CLASS CONFIRMATION */}
      <Dialog open={!!deleteClassTarget} onOpenChange={(val) => !val && setDeleteClassTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Lưu trữ và ngừng sử dụng lớp</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa/lưu trữ lớp <strong>{deleteClassTarget?.name}</strong>? Lớp sẽ không hiển thị trên danh sách chính nhưng dữ liệu lịch sử vẫn được bảo toàn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteClassTarget(null)}>Hủy</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteClass}>
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SaveIcon() {
  return <Check className="size-3.5" />
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS DETAIL VIEW (7 TABS LAZY-LOADED)
// ═══════════════════════════════════════════════════════════════════════════

function ClassDetailView({
  classItem,
  allClasses,
  schoolYears,
  grades,
  initialTab = 'overview',
  onBack,
  onOpenStudent,
  onOpenEdit,
  onOpenClone,
  onOpenComplete,
  onOpenDelete,
  onClassUpdated,
}: {
  classItem: ClassRecord
  allClasses: ClassRecord[]
  schoolYears: SchoolYearOption[]
  grades: GradeOption[]
  initialTab?: string
  onBack: () => void
  onOpenStudent: (student: StudentRecord) => void
  onOpenEdit: () => void
  onOpenClone: () => void
  onOpenComplete: () => void
  onOpenDelete: () => void
  onClassUpdated: () => void
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'overview')

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 mb-2 transition cursor-pointer"
          >
            <ArrowLeft className="size-3.5" /> Quay lại danh sách lớp
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {classItem.name}
            </h1>
            {classItem.code && (
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {classItem.code}
              </span>
            )}
            <Badge
              variant={classItem.status === 'COMPLETED' ? 'secondary' : 'default'}
              className={`text-xs ${
                classItem.status === 'COMPLETED'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-teal-50 text-teal-700 border-teal-200'
              }`}
            >
              {classItem.status === 'COMPLETED' ? 'Đã kết thúc' : 'Đang hoạt động'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {classItem.grade} · {classItem.schoolYear?.name || 'Năm học'} · {classItem.room || 'Phòng học'} · {classItem.schedule || 'Sáng · Thứ 2 - Thứ 6'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onOpenEdit} className="text-xs h-9 gap-1.5">
            <Edit2 className="size-3.5" /> Sửa thông tin
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenClone} className="text-xs h-9 gap-1.5">
            <Copy className="size-3.5" /> Nhân bản lớp
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              {classItem.status !== 'COMPLETED' && (
                <DropdownMenuItem onClick={onOpenComplete}>
                  <CheckCircle2 className="size-3.5 mr-2 text-blue-600" /> Kết thúc năm học
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onOpenDelete} className="text-rose-600">
                <Trash2 className="size-3.5 mr-2" /> Xóa / Lưu trữ lớp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 7 Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-7 h-auto p-1 bg-slate-100 rounded-xl">
          <TabsTrigger value="overview" className="text-xs py-2 font-medium">Tổng quan</TabsTrigger>
          <TabsTrigger value="students" className="text-xs py-2 font-medium">Học sinh</TabsTrigger>
          <TabsTrigger value="schedules" className="text-xs py-2 font-medium">Lịch dạy</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs py-2 font-medium">Điểm danh</TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs py-2 font-medium">Đánh giá</TabsTrigger>
          <TabsTrigger value="lesson-plans" className="text-xs py-2 font-medium">Giáo án</TabsTrigger>
          <TabsTrigger value="statistics" className="text-xs py-2 font-medium">Thống kê</TabsTrigger>
        </TabsList>

        {/* TAB 1: TỔNG QUAN */}
        <TabsContent value="overview" className="mt-5 space-y-5">
          <TabOverview classItem={classItem} onSwitchTab={(tab) => setActiveTab(tab)} />
        </TabsContent>

        {/* TAB 2: HỌC SINH */}
        <TabsContent value="students" className="mt-5 space-y-5">
          <TabStudents
            classItem={classItem}
            allClasses={allClasses}
            onOpenStudent={onOpenStudent}
            onClassUpdated={onClassUpdated}
          />
        </TabsContent>

        {/* TAB 3: LỊCH DẠY */}
        <TabsContent value="schedules" className="mt-5 space-y-5">
          <TabSchedules classItem={classItem} />
        </TabsContent>

        {/* TAB 4: ĐIỂM DANH */}
        <TabsContent value="attendance" className="mt-5 space-y-5">
          <TabAttendance classItem={classItem} />
        </TabsContent>

        {/* TAB 5: ĐÁNH GIÁ */}
        <TabsContent value="assessments" className="mt-5 space-y-5">
          <TabAssessments classItem={classItem} />
        </TabsContent>

        {/* TAB 6: GIÁO ÁN */}
        <TabsContent value="lesson-plans" className="mt-5 space-y-5">
          <TabLessonPlans classItem={classItem} />
        </TabsContent>

        {/* TAB 7: THỐNG KÊ */}
        <TabsContent value="statistics" className="mt-5 space-y-5">
          <TabStatistics classItem={classItem} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: TỔNG QUAN
// ═══════════════════════════════════════════════════════════════════════════

function TabOverview({
  classItem,
  onSwitchTab,
}: {
  classItem: ClassRecord
  onSwitchTab: (tab: string) => void
}) {
  const [data, setData] = useState<ClassDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [teachingContexts, setTeachingContexts] = useState<TeachingAssignmentRecord[]>([])
  const [subjectsList, setSubjectsList] = useState<SubjectOption[]>([])
  const [declareOpen, setDeclareOpen] = useState(false)
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [declaring, setDeclaring] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dash, ctxs, subs] = await Promise.all([
        getClassDashboard(classItem.id),
        getMyTeachingContexts({ classroomId: classItem.id }),
        getSubjects(),
      ])
      setData(dash)
      setTeachingContexts(ctxs.filter((c) => c.isActive !== false))
      setSubjectsList(subs.filter((s) => s.isActive !== false))
      if (subs.length > 0) setSelectedSubjectId(subs[0].id)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [classItem.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeclareSubject = async () => {
    if (!selectedSubjectId) return
    setDeclaring(true)
    try {
      const created = await declareTeachingContext({
        classroomId: classItem.id,
        subjectId: selectedSubjectId,
      })
      setTeachingContexts((prev) => [...prev, created])
      setDeclareOpen(false)
      toast.success('Đã khai báo môn học phụ trách thành công')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi khai báo môn học')
    } finally {
      setDeclaring(false)
    }
  }

  const handleDeactivate = async (ctxId: string) => {
    try {
      await deactivateTeachingContext(ctxId)
      setTeachingContexts((prev) => prev.filter((c) => c.id !== ctxId))
      toast.success('Đã ngừng phụ trách môn học')
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi hủy phụ trách')
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="size-8 animate-spin mx-auto text-teal-600 mb-2" />
        <p className="text-sm font-medium">Đang tải dữ liệu tổng quan...</p>
      </div>
    )
  }

  const kpis = data?.kpis || {
    studentCount: classItem.studentCount || 0,
    attendanceRate: classItem.attendance,
    averageScore: classItem.average,
    weeklyScheduleCount: 0,
    preparedLessonPlanCount: 0,
    needsSupportStudentCount: 0,
  }

  return (
    <div className="space-y-6">
      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <Users className="size-5 mx-auto text-teal-600 mb-1" />
            <p className="text-lg font-bold text-slate-900">{kpis.studentCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Sĩ số lớp</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <CalendarCheck2 className="size-5 mx-auto text-blue-600 mb-1" />
            <p className="text-lg font-bold text-blue-700">
              {kpis.attendanceRate !== null && kpis.attendanceRate !== undefined
                ? `${kpis.attendanceRate}%`
                : '—'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Chuyên cần</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <Award className="size-5 mx-auto text-amber-600 mb-1" />
            <p className="text-lg font-bold text-amber-700">
              {kpis.averageScore !== null && kpis.averageScore !== undefined
                ? `${kpis.averageScore} đ`
                : '—'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Điểm TB</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <CalendarDays className="size-5 mx-auto text-purple-600 mb-1" />
            <p className="text-lg font-bold text-purple-700">{kpis.weeklyScheduleCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Tiết tuần này</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <FileText className="size-5 mx-auto text-emerald-600 mb-1" />
            <p className="text-lg font-bold text-emerald-700">{kpis.preparedLessonPlanCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Giáo án đã dạy</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <Heart className="size-5 mx-auto text-rose-500 mb-1" />
            <p className="text-lg font-bold text-rose-600">{kpis.needsSupportStudentCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Cần hỗ trợ</p>
          </CardContent>
        </Card>
      </div>

      {/* Teaching Context Section */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="size-4 text-teal-600" /> Môn học phụ trách tại lớp này
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Khai báo môn bạn trực tiếp giảng dạy tại lớp để hiển thị lịch dạy và giáo án.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDeclareOpen(true)} className="text-xs h-8 gap-1">
            <Plus className="size-3.5" /> Khai báo môn
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          {teachingContexts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              Chưa khai báo môn dạy riêng nào. Nhấn <strong>"Khai báo môn"</strong> để bắt đầu.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {teachingContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/60 px-3 py-1.5 text-xs font-semibold text-teal-900"
                >
                  <span>{ctx.subject?.name || 'Môn học'}</span>
                  <button
                    type="button"
                    onClick={() => handleDeactivate(ctx.id)}
                    className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Ngừng phụ trách"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2x2 Grid of Summary Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent Schedules */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CalendarDays className="size-4 text-teal-600" /> Lịch dạy gần nhất
            </CardTitle>
            <button onClick={() => onSwitchTab('schedules')} className="text-xs text-teal-700 font-semibold hover:underline cursor-pointer">
              Xem tất cả
            </button>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {(data?.recentSchedules || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Chưa có lịch dạy gần đây</p>
            ) : (
              data?.recentSchedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{s.subjectName}</p>
                    <p className="text-[11px] text-slate-500">{s.plannedDate} · {s.startTime || '07:00'} - {s.endTime || '07:45'}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    {s.status === 'COMPLETED' ? 'Đã dạy' : 'Sắp tới'}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Absences & Lates */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="size-4 text-amber-600" /> Vắng / Đi muộn gần đây
            </CardTitle>
            <button onClick={() => onSwitchTab('attendance')} className="text-xs text-teal-700 font-semibold hover:underline cursor-pointer">
              Xem chi tiết
            </button>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {[...(data?.recentAbsences || []), ...(data?.recentLates || [])].length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Lớp chuyên cần tốt, không có vắng / đi muộn gần đây</p>
            ) : (
              [...(data?.recentAbsences || []), ...(data?.recentLates || [])].slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{item.studentName}</p>
                    <p className="text-[11px] text-slate-500">{item.date} · {item.subjectName}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    (item as any).lateMinutes ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {(item as any).lateMinutes ? `Đi muộn ${(item as any).lateMinutes}p` : `Vắng ${(item as any).type || ''}`}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Declare Subject Modal */}
      <Dialog open={declareOpen} onOpenChange={setDeclareOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Khai báo môn giảng dạy</DialogTitle>
            <DialogDescription>Chọn môn học bạn phụ trách giảng dạy tại lớp này.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-semibold">Môn học *</Label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
            >
              {subjectsList.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.code})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeclareOpen(false)}>Hủy</Button>
            <Button size="sm" onClick={handleDeclareSubject} disabled={declaring} className="bg-teal-600 text-white">
              {declaring ? 'Đang lưu...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: HỌC SINH (DANH SÁCH, THÊM, IMPORT EXCEL, CHUYỂN LỚP, RÚT LỚP)
// ═══════════════════════════════════════════════════════════════════════════

function TabStudents({
  classItem,
  allClasses,
  onOpenStudent,
  onClassUpdated,
}: {
  classItem: ClassRecord
  allClasses: ClassRecord[]
  onOpenStudent: (student: StudentRecord) => void
  onClassUpdated: () => void
}) {
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<StudentRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null)

  // Add Form
  const [addName, setAddName] = useState('')
  const [addGender, setAddGender] = useState('Nam')
  const [addDob, setAddDob] = useState('')
  const [addParentName, setAddParentName] = useState('')
  const [addParentPhone, setAddParentPhone] = useState('')
  const [addNote, setAddNote] = useState('')
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Import Form
  const [importText, setImportText] = useState('')
  const [importRows, setImportRows] = useState<Array<{ fullName: string; studentCode?: string; gender?: string; dob?: string; parentName?: string; parentPhone?: string; note?: string; error?: string }>>([])
  const [submittingImport, setSubmittingImport] = useState(false)

  // Transfer Form
  const [targetClassId, setTargetClassId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [submittingTransfer, setSubmittingTransfer] = useState(false)

  const loadStudents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getClassStudents(classItem.id)
      setStudents(data)
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [classItem.id])

  useEffect(() => {
    loadStudents()
  }, [loadStudents])

  const filteredStudents = useMemo(() => {
    return students.filter((s) =>
      `${s.name} ${s.studentCode || ''} ${s.phone || ''}`.toLowerCase().includes(search.toLowerCase()),
    )
  }, [students, search])

  const handleAddStudent = async () => {
    if (!addName.trim()) {
      toast.error('Vui lòng nhập họ và tên học sinh')
      return
    }
    setSubmittingAdd(true)
    try {
      await apiAddStudent(classItem.id, {
        fullName: addName.trim(),
        gender: addGender,
        dob: addDob || undefined,
        parentName: addParentName.trim() || undefined,
        parentPhone: addParentPhone.trim() || undefined,
        note: addNote.trim() || undefined,
      })
      setAddModalOpen(false)
      setAddName('')
      setAddDob('')
      setAddParentName('')
      setAddParentPhone('')
      setAddNote('')
      toast.success('Đã thêm học sinh vào lớp thành công!')
      loadStudents()
      onClassUpdated()
      window.dispatchEvent(new CustomEvent('teachflow:students-changed'))
      window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi thêm học sinh')
    } finally {
      setSubmittingAdd(false)
    }
  }

  // Parse CSV/Table text for Import
  const handleParseImport = (text: string) => {
    setImportText(text)
    if (!text.trim()) {
      setImportRows([])
      return
    }
    const lines = text.trim().split('\n')
    const parsed: typeof importRows = []
    lines.forEach((line) => {
      const parts = line.split(/[,\t|]/).map((p) => p.trim())
      if (parts.length > 0 && parts[0]) {
        const fullName = parts[0]
        const studentCode = parts[1] || ''
        const gender = parts[2] || 'Nam'
        const dob = parts[3] || ''
        const parentName = parts[4] || ''
        const parentPhone = parts[5] || ''
        const note = parts[6] || ''
        const error = !fullName ? 'Thiếu họ tên' : undefined
        parsed.push({ fullName, studentCode, gender, dob, parentName, parentPhone, note, error })
      }
    })
    setImportRows(parsed)
  }

  const handleExecuteImport = async () => {
    if (importRows.length === 0) return
    setSubmittingImport(true)
    try {
      const res = await apiImportStudents(classItem.id, importRows)
      if (res.success) {
        toast.success(res.message || `Đã import thành công ${res.importedCount} học sinh`)
        setImportModalOpen(false)
        setImportText('')
        setImportRows([])
        loadStudents()
        onClassUpdated()
        window.dispatchEvent(new CustomEvent('teachflow:students-changed'))
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi import học sinh')
    } finally {
      setSubmittingImport(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferTarget || !targetClassId) {
      toast.error('Vui lòng chọn lớp đích cần chuyển đến')
      return
    }
    setSubmittingTransfer(true)
    try {
      await apiTransferStudent(classItem.id, transferTarget.id, {
        targetClassroomId: targetClassId,
        reason: transferReason.trim() || undefined,
      })
      toast.success(`Đã chuyển học sinh ${transferTarget.name} sang lớp mới`)
      setTransferTarget(null)
      setTransferReason('')
      loadStudents()
      onClassUpdated()
      window.dispatchEvent(new CustomEvent('teachflow:students-changed'))
      window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi chuyển lớp')
    } finally {
      setSubmittingTransfer(false)
    }
  }

  const handleRemoveStudent = async () => {
    if (!deleteTarget) return
    try {
      await apiRemoveStudent(classItem.id, deleteTarget.id)
      toast.success(`Đã rút học sinh ${deleteTarget.name} khỏi lớp`)
      setDeleteTarget(null)
      loadStudents()
      onClassUpdated()
      window.dispatchEvent(new CustomEvent('teachflow:students-changed'))
      window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi rút học sinh')
    }
  }

  const otherClasses = allClasses.filter((c) => c.id !== classItem.id && c.status !== 'COMPLETED')

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">
            Danh sách học sinh ({students.length} HS)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Quản lý hồ sơ, thông tin liên lạc phụ huynh và theo dõi tiến độ từng học sinh.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="text"
            placeholder="Tìm học sinh theo tên, mã..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56 text-xs h-8.5 bg-slate-50"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="text-xs h-8.5 gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600" /> Import Excel
          </Button>
          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8.5 gap-1.5 font-semibold cursor-pointer"
          >
            <UserPlus className="size-3.5" /> Thêm học sinh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs">Đang tải danh sách học sinh...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="size-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Chưa có học sinh nào trong lớp</p>
            <p className="text-xs text-slate-400 mt-0.5">Nhấn "Thêm học sinh" hoặc "Import Excel" để bắt đầu.</p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-3">Mã HS</th>
                <th className="py-3 px-3">Giới tính</th>
                <th className="py-3 px-3">Ngày sinh</th>
                <th className="py-3 px-3">Học lực</th>
                <th className="py-3 px-3">Chuyên cần</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 text-center font-bold text-slate-400">#{idx + 1}</td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => onOpenStudent(s)}
                      className="flex items-center gap-2.5 text-left group cursor-pointer"
                    >
                      <Avatar className="size-8 border border-teal-100">
                        <AvatarFallback className={s.color || 'bg-teal-100 text-teal-700 font-bold text-xs'}>
                          {s.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                          {s.name}
                        </p>
                        <p className="text-[10px] text-slate-400">{s.guardian} ({s.phone})</p>
                      </div>
                    </button>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600 font-semibold">{s.studentCode || '—'}</td>
                  <td className="py-3 px-3 text-slate-600">{s.gender}</td>
                  <td className="py-3 px-3 text-slate-600">{s.dob}</td>
                  <td className="py-3 px-3">
                    <Badge variant={statusVariant(s.status)} className="text-[10px]">
                      {s.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-semibold text-teal-700">
                    {s.attendance !== null && s.attendance !== undefined ? `${s.attendance}%` : '—'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => onOpenStudent(s)}
                        title="Xem hồ sơ"
                        className="size-7 text-slate-500 hover:text-teal-700 cursor-pointer"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          setTransferTarget(s)
                          if (otherClasses.length > 0) setTargetClassId(otherClasses[0].id)
                        }}
                        title="Chuyển lớp"
                        className="size-7 text-slate-500 hover:text-blue-700 cursor-pointer"
                      >
                        <ArrowRightLeft className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(s)}
                        title="Rút khỏi lớp"
                        className="size-7 text-slate-500 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      {/* ADD STUDENT DIALOG */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Thêm học sinh mới vào lớp</DialogTitle>
            <DialogDescription>Nhập thông tin cá nhân và liên hệ phụ huynh.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Họ và tên *</Label>
                <Input
                  placeholder="Nguyễn Văn An"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Giới tính</Label>
                <select
                  value={addGender}
                  onChange={(e) => setAddGender(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Ngày sinh (DD/MM/YYYY)</Label>
                <Input
                  placeholder="12/04/2016"
                  value={addDob}
                  onChange={(e) => setAddDob(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Điện thoại phụ huynh</Label>
                <Input
                  placeholder="0901 234 567"
                  value={addParentPhone}
                  onChange={(e) => setAddParentPhone(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Họ tên phụ huynh / Người giám hộ</Label>
              <Input
                placeholder="Nguyễn Thị Hoa"
                value={addParentName}
                onChange={(e) => setAddParentName(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Ghi chú ban đầu (nếu có)</Label>
              <Input
                placeholder="Hăng hái phát biểu, tiếp thu bài nhanh..."
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)} disabled={submittingAdd}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleAddStudent}
              disabled={submittingAdd || !addName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs cursor-pointer"
            >
              {submittingAdd ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />} Thêm học sinh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMPORT EXCEL / CSV MODAL */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import danh sách học sinh từ Excel / Bảng dữ liệu</DialogTitle>
            <DialogDescription>
              Dán dữ liệu từ bảng tính (Excel/Google Sheets) theo định dạng: <br />
              <code>Họ tên, Mã HS, Giới tính, Ngày sinh, Tên phụ huynh, Số điện thoại, Ghi chú</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Textarea
              placeholder="Nguyễn Văn An	HS001	Nam	12/04/2016	Nguyễn Thị Hoa	0901234567	Chủ động phát biểu
Trần Thị Bình	HS002	Nữ	25/08/2016	Trần Văn Cường	0912345678	Tiếp thu nhanh"
              value={importText}
              onChange={(e) => handleParseImport(e.target.value)}
              rows={5}
              className="text-xs font-mono"
            />

            {importRows.length > 0 && (
              <div className="border rounded-xl p-3 bg-slate-50 max-h-48 overflow-y-auto space-y-1.5">
                <p className="font-bold text-slate-700">Xem trước ({importRows.length} dòng):</p>
                {importRows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] bg-white p-2 rounded border">
                    <span className="font-semibold text-slate-800">
                      {i + 1}. {r.fullName} ({r.gender || 'Nam'}) - Mã: {r.studentCode || 'Tự động'}
                    </span>
                    <span className="text-slate-500">{r.dob || 'Chưa ngày sinh'} · {r.parentPhone || 'Chưa SĐT'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>Hủy</Button>
            <Button
              size="sm"
              onClick={handleExecuteImport}
              disabled={submittingImport || importRows.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer"
            >
              {submittingImport ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />} Xác nhận Import ({importRows.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TRANSFER STUDENT MODAL */}
      <Dialog open={!!transferTarget} onOpenChange={(val) => !val && setTransferTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Chuyển lớp cho học sinh</DialogTitle>
            <DialogDescription>
              Chuyển học sinh <strong>{transferTarget?.name}</strong> sang một lớp học khác trong cùng năm học.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Chọn lớp chuyển đến *</Label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
              >
                {otherClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade} · {c.room})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Lý do chuyển lớp (tùy chọn)</Label>
              <Input
                placeholder="Chuyển phân ban / theo nguyện vọng..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setTransferTarget(null)}>Hủy</Button>
            <Button
              size="sm"
              onClick={handleTransfer}
              disabled={submittingTransfer || !targetClassId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer"
            >
              {submittingTransfer ? 'Đang chuyển...' : 'Xác nhận chuyển'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WITHDRAW / DELETE STUDENT CONFIRMATION */}
      <Dialog open={!!deleteTarget} onOpenChange={(val) => !val && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Rút học sinh khỏi lớp</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn rút học sinh <strong>{deleteTarget?.name}</strong> khỏi lớp? Hồ sơ và dữ liệu điểm danh, đánh giá trước đó vẫn được lưu giữ trong hệ thống.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="destructive" size="sm" onClick={handleRemoveStudent} className="cursor-pointer">
              Xác nhận rút học sinh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: LỊCH DẠY CỦA LỚP
// ═══════════════════════════════════════════════════════════════════════════

function TabSchedules({ classItem }: { classItem: ClassRecord }) {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [attendanceScheduleId, setAttendanceScheduleId] = useState<string | null>(null)

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getClassSchedules(classItem.id)
      setSchedules(data)
    } catch {
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [classItem.id])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">
            Thời khóa biểu & Tiết dạy ({schedules.length} tiết)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Danh sách các tiết giảng dạy được lên lịch tại lớp {classItem.name}.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs">Đang tải lịch dạy...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CalendarDays className="size-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Chưa có tiết dạy nào được xếp lịch</p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Ngày dạy</th>
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Môn học</th>
                <th className="py-3 px-3">Giáo viên</th>
                <th className="py-3 px-3">Giáo án</th>
                <th className="py-3 px-3">Điểm danh</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{s.plannedDate}</td>
                  <td className="py-3 px-3 text-slate-600">{s.startTime || '07:00'} - {s.endTime || '07:45'}</td>
                  <td className="py-3 px-3 font-semibold text-teal-900">{s.subject?.name || 'Môn học'}</td>
                  <td className="py-3 px-3 text-slate-600">{s.teacher?.fullName || 'Giáo viên'}</td>
                  <td className="py-3 px-3">
                    {s.lessonPlan ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="size-3" /> {s.lessonPlan.title}
                      </span>
                    ) : (
                      <span className="text-slate-400">Chưa gắn giáo án</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {s.isAttendanceRecorded ? (
                      <span className="inline-flex items-center gap-1 text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        <Check className="size-3" /> Đã điểm danh
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Chưa điểm danh
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAttendanceScheduleId(s.id)}
                      className="text-xs h-7.5 px-2.5 font-semibold text-teal-700 border-teal-200 hover:bg-teal-50 cursor-pointer"
                    >
                      Điểm danh
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <ScheduleAttendanceDialog
        scheduleId={attendanceScheduleId}
        open={!!attendanceScheduleId}
        onOpenChange={(val) => !val && setAttendanceScheduleId(null)}
        onSaved={() => loadSchedules()}
      />
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: ĐIỂM DANH CỦA LỚP
// ═══════════════════════════════════════════════════════════════════════════

function TabAttendance({ classItem }: { classItem: ClassRecord }) {
  const [data, setData] = useState<ClassAttendanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('month')
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)

  const loadAttendance = useCallback(async (r: string) => {
    setLoading(true)
    try {
      const res = await getClassAttendance(classItem.id, r)
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [classItem.id])

  useEffect(() => {
    loadAttendance(range)
  }, [loadAttendance, range])

  const summary = data?.summary || {
    attendanceRate: classItem.attendance,
    presentCount: 0,
    absentCount: 0,
    excusedCount: 0,
    unexcusedCount: 0,
    lateCount: 0,
    totalSessions: 0,
  }

  return (
    <div className="space-y-5">
      {/* Attendance KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-teal-700">
              {summary.attendanceRate !== null && summary.attendanceRate !== undefined
                ? `${summary.attendanceRate}%`
                : '—'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Tỷ lệ chuyên cần</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-slate-900">{summary.presentCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Lượt có mặt</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-blue-700">{summary.excusedCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Có phép</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-rose-700">{summary.unexcusedCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Không phép</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-amber-700">{summary.lateCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Đi muộn</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Sessions List */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Nhật ký các buổi điểm danh ({summary.totalSessions} buổi)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Ghi nhận chi tiết theo từng tiết dạy và ngày học.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['today', 'week', 'month', 'all'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  range === r ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'today' ? 'Hôm nay' : r === 'week' ? 'Tuần này' : r === 'month' ? 'Tháng này' : 'Tất cả'}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs">Đang tải nhật ký điểm danh...</p>
            </div>
          ) : (data?.sessions || []).length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CalendarCheck2 className="size-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Chưa có dữ liệu điểm danh trong khoảng thời gian này</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Ngày</th>
                  <th className="py-3 px-3">Môn học</th>
                  <th className="py-3 px-3">Giáo viên</th>
                  <th className="py-3 px-3">Có mặt</th>
                  <th className="py-3 px-3">Vắng</th>
                  <th className="py-3 px-3">Đi muộn</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{sess.date}</td>
                    <td className="py-3 px-3 font-semibold text-teal-900">{sess.subjectName}</td>
                    <td className="py-3 px-3 text-slate-600">{sess.teacherName}</td>
                    <td className="py-3 px-3 text-emerald-700 font-bold">{sess.stats.present} HS</td>
                    <td className="py-3 px-3 text-rose-700 font-semibold">
                      {sess.stats.excused + sess.stats.unexcused} HS ({sess.stats.excused} phép)
                    </td>
                    <td className="py-3 px-3 text-amber-700 font-semibold">{sess.stats.late} HS</td>
                    <td className="py-3 px-4 text-right">
                      {sess.scheduleId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedScheduleId(sess.scheduleId || null)}
                          className="text-xs h-7.5 px-2.5 text-teal-700 font-semibold cursor-pointer"
                        >
                          Xem chi tiết
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ScheduleAttendanceDialog
        scheduleId={selectedScheduleId}
        open={!!selectedScheduleId}
        onOpenChange={(val) => !val && setSelectedScheduleId(null)}
        onSaved={() => loadAttendance(range)}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: ĐÁNH GIÁ CỦA LỚP
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: SỔ ĐIỂM & ĐÁNH GIÁ CỦA LỚP (GRADEBOOK)
// ═══════════════════════════════════════════════════════════════════════════

function TabAssessments({ classItem }: { classItem: ClassRecord }) {
  const [gradebook, setGradebook] = useState<GradebookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL')
  const [selectedSemester, setSelectedSemester] = useState<number>(1)
  const [searchQuery, setSearchQuery] = useState('')

  // Cell editing state: studentId -> assessmentId -> score (string for typing, or number | null)
  const [localScores, setLocalScores] = useState<Record<string, Record<string, string | number | null>>>({})
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set()) // `${studentId}_${assessmentId}`
  const [saveStatus, setSaveStatus] = useState<'SAVED' | 'DIRTY' | 'SAVING' | 'ERROR'>('SAVED')

  // Dialog states
  const [createColOpen, setCreateColOpen] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const [newColSubjectId, setNewColSubjectId] = useState('')
  const [newColSemester, setNewColSemester] = useState(1)
  const [newColType, setNewColType] = useState('THUONG_XUYEN')
  const [newColWeight, setNewColWeight] = useState(1)
  const [newColDate, setNewColDate] = useState(new Date().toISOString().split('T')[0])
  const [creatingCol, setCreatingCol] = useState(false)

  // Single Column Scoring Modal
  const [scoringColTarget, setScoringColTarget] = useState<AssessmentColumn | null>(null)
  const [columnScoresState, setColumnScoresState] = useState<Record<string, { score: string; comment: string }>>({})
  const [savingColumnScores, setSavingColumnScores] = useState(false)
  const [aiGeneratingStudentId, setAiGeneratingStudentId] = useState<string | null>(null)

  // Import Excel Modal
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importTargetColId, setImportTargetColId] = useState<string>('')
  const [importRawText, setImportRawText] = useState('')
  const [importPreviewRows, setImportPreviewRows] = useState<Array<{ row: number; studentCode?: string; fullName?: string; score: number | null; comment?: string; valid: boolean; error?: string }>>([])
  const [importingScores, setImportingScores] = useState(false)

  // Load subjects
  useEffect(() => {
    getSubjects().then((list) => {
      setSubjects(list)
      if (list.length > 0 && !newColSubjectId) {
        setNewColSubjectId(list[0].id)
      }
    }).catch(() => {})
  }, [newColSubjectId])

  // Load Gradebook data
  const loadGradebookData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getGradebook({
        classroomId: classItem.id,
        subjectId: selectedSubjectId !== 'ALL' ? selectedSubjectId : undefined,
        semester: selectedSemester,
        schoolYearId: classItem.schoolYearId,
      })
      setGradebook(res)

      // Initialize local scores from response
      const initialMap: Record<string, Record<string, string | number | null>> = {}
      res.students.forEach((s) => {
        initialMap[s.studentId] = {}
        res.columns.forEach((c) => {
          const item = s.scores[c.id]
          initialMap[s.studentId][c.id] = item?.score !== undefined ? item.score : null
        })
      })
      setLocalScores(initialMap)
      setDirtyCells(new Set())
      setSaveStatus('SAVED')
    } catch {
      setGradebook(null)
      toast.error('Không thể tải dữ liệu sổ điểm lớp')
    } finally {
      setLoading(false)
    }
  }, [classItem.id, classItem.schoolYearId, selectedSubjectId, selectedSemester])

  useEffect(() => {
    loadGradebookData()
  }, [loadGradebookData])

  // Handle cell score changes
  const handleScoreChange = (studentId: string, assessmentId: string, val: string) => {
    setLocalScores((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [assessmentId]: val,
      },
    }))

    const key = `${studentId}_${assessmentId}`
    setDirtyCells((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
    setSaveStatus('DIRTY')
  }

  // Batch Save all modified cell scores
  const handleSaveAll = async () => {
    if (!gradebook || dirtyCells.size === 0) return

    setSaveStatus('SAVING')
    try {
      // Group dirty cells by assessment column
      const scoresByCol: Record<string, Array<{ studentId: string; score: number | null }>> = {}

      dirtyCells.forEach((key) => {
        const [studentId, assessmentId] = key.split('_')
        const rawVal = localScores[studentId]?.[assessmentId]

        let parsedScore: number | null = null
        if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
          const num = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.'))
          if (!isNaN(num) && num >= 0 && num <= 10) {
            parsedScore = num
          }
        }

        if (!scoresByCol[assessmentId]) {
          scoresByCol[assessmentId] = []
        }
        scoresByCol[assessmentId].push({
          studentId,
          score: parsedScore,
        })
      })

      // Send batch requests for each modified column
      const promises = Object.entries(scoresByCol).map(([colId, items]) =>
        saveAssessmentScores(colId, items)
      )

      await Promise.all(promises)
      toast.success('Đã lưu toàn bộ điểm vào sổ điểm!')
      setDirtyCells(new Set())
      setSaveStatus('SAVED')
      loadGradebookData()
    } catch {
      setSaveStatus('ERROR')
      toast.error('Lưu điểm thất bại, vui lòng kiểm tra lại điểm số')
    }
  }

  // Create new assessment column
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColTitle.trim()) {
      toast.error('Vui lòng nhập tên lần đánh giá')
      return
    }

    setCreatingCol(true)
    try {
      await createAssessmentColumn({
        title: newColTitle.trim(),
        classroomId: classItem.id,
        subjectId: newColSubjectId || undefined,
        semester: newColSemester,
        assessmentType: newColType,
        weight: Number(newColWeight) || 1,
        assessmentDate: newColDate,
      })

      toast.success(`Đã tạo cột điểm "${newColTitle.trim()}" thành công!`)
      setCreateColOpen(false)
      setNewColTitle('')
      loadGradebookData()
    } catch (err: any) {
      toast.error(err?.message || 'Không thể tạo cột điểm mới')
    } finally {
      setCreatingCol(false)
    }
  }

  // Delete an assessment column
  const handleDeleteColumn = async (col: AssessmentColumn) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa cột điểm "${col.title}"? Dữ liệu điểm của học sinh ở cột này sẽ bị xóa.`)) {
      return
    }

    try {
      await deleteAssessmentColumn(col.id)
      toast.success(`Đã xóa cột điểm "${col.title}"`)
      loadGradebookData()
    } catch {
      toast.error('Không thể xóa cột điểm')
    }
  }

  // Open single column scoring modal
  const handleOpenColumnModal = (col: AssessmentColumn) => {
    setScoringColTarget(col)
    const initialMap: Record<string, { score: string; comment: string }> = {}
    gradebook?.students.forEach((s) => {
      const item = s.scores[col.id]
      initialMap[s.studentId] = {
        score: item?.score !== null && item?.score !== undefined ? String(item.score) : '',
        comment: item?.comment || '',
      }
    })
    setColumnScoresState(initialMap)
  }

  // Save single column modal scores
  const handleSaveColumnModalScores = async () => {
    if (!scoringColTarget) return

    setSavingColumnScores(true)
    try {
      const payload = Object.entries(columnScoresState).map(([studentId, data]) => {
        let parsedScore: number | null = null
        if (data.score.trim() !== '') {
          const num = parseFloat(data.score.replace(',', '.'))
          if (!isNaN(num) && num >= 0 && num <= 10) {
            parsedScore = num
          }
        }
        return {
          studentId,
          score: parsedScore,
          comment: data.comment.trim() || undefined,
        }
      })

      await saveAssessmentScores(scoringColTarget.id, payload)
      toast.success(`Đã lưu điểm cho cột "${scoringColTarget.title}"`)
      setScoringColTarget(null)
      loadGradebookData()
    } catch {
      toast.error('Lưu điểm thất bại')
    } finally {
      setSavingColumnScores(false)
    }
  }

  // AI Comment Suggestion for individual student in scoring modal
  const handleAiComment = async (student: StudentGradeRow) => {
    if (!scoringColTarget) return
    setAiGeneratingStudentId(student.studentId)
    try {
      const currentScoreStr = columnScoresState[student.studentId]?.score
      const currentScore = currentScoreStr ? parseFloat(currentScoreStr) : student.averageScore
      const res = await generateStudentComment({
        studentId: student.studentId,
        subject: scoringColTarget.subjectName,
        assessmentLevel: student.classification?.code || 'GOOD',
        notes: `Học sinh đạt điểm ${currentScore || 8.0} trong bài ${scoringColTarget.title}`,
      })

      const commentText = res.overallAssessment || res.comments?.[0] || 'Hoàn thành tốt nhiệm vụ học tập.'

      setColumnScoresState((prev) => ({
        ...prev,
        [student.studentId]: {
          ...(prev[student.studentId] || { score: '' }),
          comment: commentText,
        },
      }))
      toast.success(`Đã sinh nhận xét AI cho ${student.fullName}`)
    } catch {
      toast.error('Không thể sinh nhận xét tự động')
    } finally {
      setAiGeneratingStudentId(null)
    }
  }

  // Export Gradebook to Excel (CSV UTF-8 BOM)
  const handleExportExcel = async () => {
    try {
      const data = await exportGradebook({
        classroomId: classItem.id,
        subjectId: selectedSubjectId !== 'ALL' ? selectedSubjectId : undefined,
        semester: selectedSemester,
        schoolYearId: classItem.schoolYearId,
      })

      // Convert rows to CSV with BOM for Vietnamese Excel compatibility
      let csvContent = '\uFEFF' + data.headers.join(',') + '\n'
      data.rows.forEach((row) => {
        const escaped = row.map((val) => `"${String(val).replace(/"/g, '""')}"`)
        csvContent += escaped.join(',') + '\n'
      })

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `So_Diem_${classItem.name}_HK${selectedSemester}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Đã xuất file sổ điểm thành công!')
    } catch {
      toast.error('Không thể xuất file sổ điểm')
    }
  }

  // Parse Raw Text for Excel Import Preview
  const handleParseImport = (text: string) => {
    setImportRawText(text)
    if (!text.trim() || !gradebook) {
      setImportPreviewRows([])
      return
    }

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    const rows: Array<{ row: number; studentCode?: string; fullName?: string; score: number | null; comment?: string; valid: boolean; error?: string }> = []

    lines.forEach((line, idx) => {
      const parts = line.split(/[,\t|]/).map((p) => p.trim())
      if (parts.length === 0) return

      const firstPart = parts[0]
      const secondPart = parts[1] || ''
      const thirdPart = parts[2] || ''

      let studentCode = ''
      let fullName = ''
      let scoreVal: number | null = null
      let comment = ''

      if (/^HS\d+/i.test(firstPart)) {
        studentCode = firstPart
        if (isNaN(Number(secondPart)) && secondPart) {
          fullName = secondPart
          if (thirdPart && !isNaN(Number(thirdPart.replace(',', '.')))) {
            scoreVal = parseFloat(thirdPart.replace(',', '.'))
          }
          comment = parts[3] || ''
        } else if (!isNaN(Number(secondPart.replace(',', '.')))) {
          scoreVal = parseFloat(secondPart.replace(',', '.'))
          comment = thirdPart
        }
      } else {
        fullName = firstPart
        if (!isNaN(Number(secondPart.replace(',', '.')))) {
          scoreVal = parseFloat(secondPart.replace(',', '.'))
        }
        comment = thirdPart
      }

      let valid = true
      let error = ''

      if (scoreVal !== null && (scoreVal < 0 || scoreVal > 10)) {
        valid = false
        error = 'Điểm số phải từ 0 đến 10'
      }

      const match = gradebook.students.find(
        (s) =>
          (studentCode && s.studentCode?.toLowerCase() === studentCode.toLowerCase()) ||
          (fullName && s.fullName.toLowerCase() === fullName.toLowerCase())
      )

      if (!match) {
        valid = false
        error = 'Không tìm thấy học sinh trong lớp'
      }

      rows.push({
        row: idx + 1,
        studentCode: studentCode || match?.studentCode,
        fullName: fullName || match?.fullName,
        score: scoreVal,
        comment,
        valid,
        error,
      })
    })

    setImportPreviewRows(rows)
  }

  // Commit Batch Import
  const handleConfirmImport = async () => {
    if (!importTargetColId || importPreviewRows.length === 0) {
      toast.error('Vui lòng chọn cột điểm và dán dữ liệu hợp lệ')
      return
    }

    setImportingScores(true)
    try {
      const validRows = importPreviewRows.filter((r) => r.valid)
      const res = await importGradebookScores({
        assessmentId: importTargetColId,
        classroomId: classItem.id,
        scores: validRows.map((r) => ({
          studentCode: r.studentCode,
          fullName: r.fullName,
          score: r.score,
          comment: r.comment,
        })),
      })

      if (res.success) {
        toast.success(`Đã import thành công điểm cho ${res.importedCount} học sinh!`)
        setImportModalOpen(false)
        setImportRawText('')
        setImportPreviewRows([])
        loadGradebookData()
      } else {
        toast.error(res.message || 'Import thất bại')
      }
    } catch {
      toast.error('Lỗi trong quá trình import điểm')
    } finally {
      setImportingScores(false)
    }
  }

  // Filter students by search
  const filteredStudents = useMemo(() => {
    if (!gradebook) return []
    if (!searchQuery.trim()) return gradebook.students
    const q = searchQuery.toLowerCase().trim()
    return gradebook.students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(q))
    )
  }, [gradebook, searchQuery])

  const summary = gradebook?.summary || {
    totalStudents: 0,
    gradedStudents: 0,
    classAverage: null,
    excellentCount: 0,
    goodCount: 0,
    completedCount: 0,
    needsSupportCount: 0,
    incompleteCount: 0,
  }

  const columns = gradebook?.columns || []

  return (
    <div className="space-y-5">
      {/* Gradebook Header & Action Bar */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="size-5 text-teal-600" />
            Sổ điểm điện tử · {classItem.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý điểm số, tính điểm trung bình môn và xếp loại học lực theo Thông tư 27/TT22.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save status indicator */}
          {saveStatus === 'DIRTY' && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold animate-pulse">
              <Clock className="size-3 mr-1" /> Có {dirtyCells.size} ô chưa lưu
            </Badge>
          )}
          {saveStatus === 'SAVED' && dirtyCells.size === 0 && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium">
              <CheckCircle2 className="size-3 mr-1" /> Đã lưu
            </Badge>
          )}
          {saveStatus === 'SAVING' && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-medium">
              <Loader2 className="size-3 mr-1 animate-spin" /> Đang lưu...
            </Badge>
          )}

          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={dirtyCells.size === 0 || saveStatus === 'SAVING'}
            className="bg-teal-600 text-white hover:bg-teal-700 font-semibold shadow-xs"
          >
            <Check className="size-3.5 mr-1.5" /> Lưu sổ điểm
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateColOpen(true)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            <Plus className="size-3.5 mr-1 text-teal-600" /> Tạo cột điểm
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (columns.length > 0) setImportTargetColId(columns[0].id)
              setImportModalOpen(true)
            }}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            <UploadCloud className="size-3.5 mr-1 text-blue-600" /> Import Excel
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportExcel}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            <Download className="size-3.5 mr-1 text-emerald-600" /> Xuất Excel
          </Button>
        </div>
      </div>

      {/* Grade Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-teal-700">
              {summary.classAverage !== null ? `${summary.classAverage} đ` : '—'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Điểm TB lớp</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-emerald-700">{summary.excellentCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Hoàn thành tốt</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-blue-700">{summary.goodCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Hoàn thành</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-amber-700">{summary.completedCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Đạt</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-rose-700">{summary.needsSupportCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Cần cố gắng</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-slate-400">{summary.incompleteCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Chưa đủ dữ liệu</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-slate-600">Môn học:</Label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-hidden"
          >
            <option value="ALL">Tất cả môn học</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-slate-600">Học kỳ:</Label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-hidden"
          >
            <option value={1}>Học kỳ I</option>
            <option value={2}>Học kỳ II</option>
          </select>
        </div>

        <div className="relative ml-auto min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Tìm theo tên / mã HS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      {/* Gradebook Matrix Table */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Ma trận Điểm số ({filteredStudents.length} học sinh · {columns.length} cột đánh giá)
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              Nhập trực tiếp điểm vào ô và bấm <b>Enter</b> hoặc <b>Tab</b> để di chuyển nhanh. Điểm số từ 0.0 đến 10.0.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadGradebookData}
            title="Tải lại dữ liệu"
            className="size-8 p-0 text-slate-500 hover:text-slate-800"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs">Đang tải bảng điểm...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="size-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Chưa có học sinh nào trong lớp học này</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                  <tr>
                    {/* Sticky Left Columns */}
                    <th className="sticky left-0 z-20 bg-slate-50 px-3 py-3 w-12 text-center border-r border-slate-200">
                      STT
                    </th>
                    <th className="sticky left-12 z-20 bg-slate-50 px-3 py-3 w-24 border-r border-slate-200">
                      Mã HS
                    </th>
                    <th className="sticky left-36 z-20 bg-slate-50 px-4 py-3 min-w-[160px] border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                      Họ và tên
                    </th>

                    {/* Dynamic Assessment Columns */}
                    {columns.map((col, cIdx) => (
                      <th key={col.id} className="px-3 py-2.5 min-w-[110px] text-center border-r border-slate-200 group relative">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-900 truncate max-w-[100px]" title={col.title}>
                              {col.title}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="opacity-0 group-hover:opacity-100 size-4 p-0.5 rounded-sm hover:bg-slate-200 transition">
                                  <MoreVertical className="size-3 text-slate-600" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem onClick={() => handleOpenColumnModal(col)}>
                                  <Edit2 className="size-3 mr-1.5 text-teal-600" /> Nhập điểm & Nhận xét cột này
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteColumn(col)} className="text-rose-600">
                                  <Trash2 className="size-3 mr-1.5" /> Xóa cột điểm này
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                              col.type === 'CUOI_KY' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              col.type === 'GIUA_KY' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-teal-50 text-teal-700 border-teal-200'
                            }`}>
                              {col.type === 'CUOI_KY' ? 'CK (x3)' : col.type === 'GIUA_KY' ? 'GK (x2)' : 'TX (x1)'}
                            </Badge>
                            <span className="text-[10px] text-slate-400">{col.date.slice(5)}</span>
                          </div>
                        </div>
                      </th>
                    ))}

                    {/* If no columns */}
                    {columns.length === 0 && (
                      <th className="px-6 py-3 text-slate-400 italic text-center font-normal">
                        Chưa có cột điểm nào. Bấm "+ Tạo cột điểm" để bắt đầu.
                      </th>
                    )}

                    {/* Sticky Right Columns */}
                    <th className="sticky right-28 z-20 bg-slate-50 px-3 py-3 w-28 text-right font-bold text-teal-800 border-l border-slate-200 shadow-[-2px_0_5px_rgba(0,0,0,0.03)]">
                      Điểm TB
                    </th>
                    <th className="sticky right-0 z-20 bg-slate-50 px-3 py-3 w-28 text-center font-bold text-slate-800">
                      Học lực
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student, rIdx) => (
                    <tr key={student.studentId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Sticky STT */}
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 text-center text-slate-400 font-medium border-r border-slate-100">
                        {rIdx + 1}
                      </td>

                      {/* Sticky Mã HS */}
                      <td className="sticky left-12 z-10 bg-white px-3 py-2 font-mono text-[11px] text-slate-500 border-r border-slate-100">
                        {student.studentCode || '—'}
                      </td>

                      {/* Sticky Họ tên */}
                      <td className="sticky left-36 z-10 bg-white px-4 py-2 font-bold text-slate-900 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.03)] truncate max-w-[180px]">
                        {student.fullName}
                      </td>

                      {/* Dynamic Column Inputs */}
                      {columns.map((col, cIdx) => {
                        const cellKey = `${student.studentId}_${col.id}`
                        const currentVal = localScores[student.studentId]?.[col.id]
                        const isDirty = dirtyCells.has(cellKey)
                        const displayVal = currentVal !== null && currentVal !== undefined ? currentVal : ''

                        return (
                          <td key={col.id} className={`px-2 py-1 text-center border-r border-slate-100 ${isDirty ? 'bg-amber-50/60' : ''}`}>
                            <input
                              id={`cell_${cIdx}_${rIdx}`}
                              type="text"
                              value={displayVal}
                              onChange={(e) => handleScoreChange(student.studentId, col.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  const nextInput = document.getElementById(`cell_${cIdx}_${rIdx + 1}`)
                                  if (nextInput) nextInput.focus()
                                }
                              }}
                              placeholder="—"
                              className={`w-14 h-7 text-center rounded font-semibold text-xs transition border focus:outline-hidden ${
                                isDirty
                                  ? 'border-amber-400 bg-amber-50 text-amber-900 ring-1 ring-amber-300'
                                  : displayVal !== ''
                                  ? 'border-slate-200 bg-slate-50/50 text-slate-900 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500'
                                  : 'border-dashed border-slate-200 bg-transparent text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-1 focus:ring-teal-500'
                              }`}
                            />
                          </td>
                        )
                      })}

                      {columns.length === 0 && <td className="px-6 py-2 text-center text-slate-300">—</td>}

                      {/* Sticky Điểm TB */}
                      <td className="sticky right-28 z-10 bg-white px-3 py-2 text-right font-extrabold text-teal-700 border-l border-slate-100 shadow-[-2px_0_5px_rgba(0,0,0,0.03)]">
                        {student.averageScore !== null ? `${student.averageScore}` : '—'}
                      </td>

                      {/* Sticky Học lực */}
                      <td className="sticky right-0 z-10 bg-white px-3 py-2 text-center">
                        {student.classification ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-2 py-0.5 ${
                              student.classification.code === 'EXCELLENT'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : student.classification.code === 'GOOD'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : student.classification.code === 'COMPLETED'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {student.classification.label}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Chưa đủ dữ liệu</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Dialog: Tạo cột điểm mới ── */}
      <Dialog open={createColOpen} onOpenChange={setCreateColOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Tạo cột điểm / Lần đánh giá</DialogTitle>
            <DialogDescription className="text-xs">
              Thêm một cột đánh giá mới vào sổ điểm của lớp {classItem.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateColumn} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Tên lần đánh giá *</Label>
              <Input
                placeholder="Ví dụ: Kiểm tra 15 phút bài 3, Giữa kỳ I..."
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                required
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Môn học</Label>
                <select
                  value={newColSubjectId}
                  onChange={(e) => setNewColSubjectId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-hidden"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Học kỳ</Label>
                <select
                  value={newColSemester}
                  onChange={(e) => setNewColSemester(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-hidden"
                >
                  <option value={1}>Học kỳ I</option>
                  <option value={2}>Học kỳ II</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Loại đánh giá</Label>
                <select
                  value={newColType}
                  onChange={(e) => {
                    setNewColType(e.target.value)
                    if (e.target.value === 'CUOI_KY') setNewColWeight(3)
                    else if (e.target.value === 'GIUA_KY') setNewColWeight(2)
                    else setNewColWeight(1)
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-hidden"
                >
                  <option value="THUONG_XUYEN">Thường xuyên (TX)</option>
                  <option value="GIUA_KY">Giữa học kỳ (GK)</option>
                  <option value="CUOI_KY">Cuối học kỳ (CK)</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Hệ số tính điểm</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={newColWeight}
                  onChange={(e) => setNewColWeight(Number(e.target.value))}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Ngày đánh giá</Label>
              <Input
                type="date"
                value={newColDate}
                onChange={(e) => setNewColDate(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreateColOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" size="sm" disabled={creatingCol} className="bg-teal-600 text-white hover:bg-teal-700 font-semibold">
                {creatingCol ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Plus className="size-3.5 mr-1" />} Tạo cột điểm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Chấm điểm & Nhận xét chi tiết theo Cột ── */}
      <Dialog open={!!scoringColTarget} onOpenChange={(open) => !open && setScoringColTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="size-4 text-teal-600" />
              Nhập điểm chi tiết: {scoringColTarget?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Môn: <b>{scoringColTarget?.subjectName}</b> · Hệ số: <b>{scoringColTarget?.weight}</b> · Lớp: <b>{classItem.name}</b>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2.5">
            {gradebook?.students.map((s, idx) => (
              <div key={s.studentId} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="min-w-[180px]">
                  <span className="text-slate-400 font-mono mr-1.5">#{idx + 1}</span>
                  <b className="text-slate-900 font-semibold">{s.fullName}</b>
                  <p className="text-[11px] text-slate-400 font-mono">{s.studentCode || '—'}</p>
                </div>

                <div className="w-24">
                  <Label className="text-[10px] text-slate-500">Điểm số (0-10)</Label>
                  <Input
                    type="text"
                    placeholder="—"
                    value={columnScoresState[s.studentId]?.score || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setColumnScoresState((prev) => ({
                        ...prev,
                        [s.studentId]: {
                          ...(prev[s.studentId] || { comment: '' }),
                          score: val,
                        },
                      }))
                    }}
                    className="h-8 text-center font-bold text-slate-900 bg-white"
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <Label className="text-[10px] text-slate-500">Nhận xét của giáo viên</Label>
                    <button
                      type="button"
                      onClick={() => handleAiComment(s)}
                      disabled={aiGeneratingStudentId === s.studentId}
                      className="text-[10px] text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {aiGeneratingStudentId === s.studentId ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Sparkles className="size-3" />
                      )}
                      Gợi ý AI
                    </button>
                  </div>
                  <Input
                    placeholder="Nhập nhận xét hoặc dùng gợi ý AI..."
                    value={columnScoresState[s.studentId]?.comment || ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setColumnScoresState((prev) => ({
                        ...prev,
                        [s.studentId]: {
                          ...(prev[s.studentId] || { score: '' }),
                          comment: val,
                        },
                      }))
                    }}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="ghost" size="sm" onClick={() => setScoringColTarget(null)}>
              Hủy
            </Button>
            <Button size="sm" onClick={handleSaveColumnModalScores} disabled={savingColumnScores} className="bg-teal-600 text-white hover:bg-teal-700 font-semibold">
              {savingColumnScores ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />} Lưu kết quả
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Import Điểm từ Excel ── */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="size-4 text-blue-600" />
              Import điểm từ Excel / Bảng tính
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dán dữ liệu từ file Excel theo định dạng: <b>Mã HS / Họ tên, Điểm số, Nhận xét (tùy chọn)</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Chọn cột điểm cần nhập dữ liệu *</Label>
              <select
                value={importTargetColId}
                onChange={(e) => setImportTargetColId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-500 focus:outline-hidden"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.subjectName} · {c.type === 'CUOI_KY' ? 'Hệ số 3' : c.type === 'GIUA_KY' ? 'Hệ số 2' : 'Hệ số 1'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Dán dữ liệu bảng tính vào đây:</Label>
              <Textarea
                rows={5}
                placeholder="HS0001, 8.5, Làm bài tốt&#10;HS0002, 9.0, Xuất sắc&#10;Nguyễn Văn C, 7.5, Cần cố gắng hơn"
                value={importRawText}
                onChange={(e) => handleParseImport(e.target.value)}
                className="mt-1 text-xs font-mono"
              />
            </div>

            {/* Preview Box */}
            {importPreviewRows.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 flex justify-between">
                  <span>Bản xem trước ({importPreviewRows.length} dòng)</span>
                  <span className="text-emerald-700">
                    {importPreviewRows.filter((r) => r.valid).length} hợp lệ / {importPreviewRows.filter((r) => !r.valid).length} lỗi
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {importPreviewRows.map((r) => (
                    <div key={r.row} className="px-3 py-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-800">
                        {r.studentCode || r.fullName} · Điểm: <b>{r.score !== null ? r.score : '—'}</b>
                      </span>
                      {r.valid ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">Hợp lệ</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 text-[10px]">{r.error}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmImport}
              disabled={importingScores || importPreviewRows.filter((r) => r.valid).length === 0}
              className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
            >
              {importingScores ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />} Xác nhận Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// TAB 6: GIÁO ÁN CỦA LỚP
// ═══════════════════════════════════════════════════════════════════════════

function TabLessonPlans({ classItem }: { classItem: ClassRecord }) {
  const [plans, setPlans] = useState<ClassLessonPlanRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadPlans = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getClassLessonPlans(classItem.id)
      setPlans(data)
    } catch {
      setPlans([])
    } finally {
      setLoading(false)
    }
  }, [classItem.id])

  useEffect(() => {
    loadPlans()
  }, [loadPlans])

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">
            Giáo án & Kế hoạch bài dạy ({plans.length} bài)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Danh sách các giáo án được soạn thảo và phân bổ cho lớp {classItem.name}.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs">Đang tải danh sách giáo án...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="size-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Chưa có giáo án nào được liên kết với lớp này</p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Tên bài học</th>
                <th className="py-3 px-3">Môn học</th>
                <th className="py-3 px-3">Nguồn</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-4 text-right">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.title}</td>
                  <td className="py-3 px-3 font-semibold text-teal-900">{p.subjectName}</td>
                  <td className="py-3 px-3">
                    <Badge variant="outline" className="text-[10px] bg-slate-50 font-mono">
                      {p.sourceType}
                    </Badge>
                  </td>
                  <td className="py-3 px-3">
                    <Badge
                      className={`text-[10px] ${
                        p.status === 'COMPLETED' || p.status === 'TAUGHT'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {p.status === 'COMPLETED' ? 'Đã hoàn thành' : p.status === 'TAUGHT' ? 'Đã dạy' : 'Bản nháp'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                    {new Date(p.updatedAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 7: THỐNG KÊ LỚP
// ═══════════════════════════════════════════════════════════════════════════

function TabStatistics({ classItem }: { classItem: ClassRecord }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="size-4 text-teal-600" /> Tỷ lệ chuyên cần chung
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-teal-700">
                {classItem.attendance !== null && classItem.attendance !== undefined ? `${classItem.attendance}%` : '—'}
              </span>
              <span className="text-xs text-slate-500">trên tổng số tiết</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-teal-600 h-full rounded-full"
                style={{ width: `${classItem.attendance !== null && classItem.attendance !== undefined ? classItem.attendance : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Award className="size-4 text-blue-600" /> Điểm trung bình học kỳ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-700">
                {classItem.average !== null && classItem.average !== undefined ? `${classItem.average} đ` : '—'}
              </span>
              <span className="text-xs text-slate-500">/ 10 điểm</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${classItem.average !== null && classItem.average !== undefined ? (classItem.average / 10) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="size-4 text-purple-600" /> Quy mô lớp học
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-purple-700">{classItem.studentCount || classItem.students?.length || 0}</span>
              <span className="text-xs text-slate-500">học sinh</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Đầy đủ hồ sơ và danh sách phân lớp</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
          <CardTitle className="text-sm font-bold">Gợi ý nâng cao chất lượng lớp học từ TeachFlow AI</CardTitle>
          <CardDescription className="text-xs">Phân tích tự động dựa trên chuyên cần và điểm đánh giá.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-2 text-xs text-slate-700">
          <div className="flex items-start gap-2 p-3 bg-teal-50/50 rounded-xl border border-teal-100">
            <Sparkles className="size-4 text-teal-600 shrink-0 mt-0.5" />
            <p>
              Tỷ lệ chuyên cần của lớp đạt <strong>{classItem.attendance !== null && classItem.attendance !== undefined ? `${classItem.attendance}%` : 'đang cập nhật'}</strong>. Nên duy trì các hoạt động khởi động sôi nổi để giữ vững tinh thần học tập.
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <Heart className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Đối với nhóm học sinh cần hỗ trợ, giáo viên có thể tạo thêm phiếu bài tập phân hóa dạng mức độ 1-2 từ mục <strong>Phiếu học tập</strong> để bổ trợ kiến thức.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INDIVIDUAL STUDENT PROFILE VIEW
// ═══════════════════════════════════════════════════════════════════════════

function StudentProfileView({
  student,
  classItem,
  allClasses,
  onBack,
  onStudentUpdated,
}: {
  student: StudentRecord
  classItem: ClassRecord
  allClasses: ClassRecord[]
  onBack: () => void
  onStudentUpdated: () => void
}) {
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)

  // Edit demographic modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editFullName, setEditFullName] = useState(student.name)
  const [editGender, setEditGender] = useState<string>(student.gender || 'Nam')
  const [editDob, setEditDob] = useState(student.dob)
  const [editParentName, setEditParentName] = useState(student.guardian || '')
  const [editParentPhone, setEditParentPhone] = useState(student.phone || '')
  const [savingEdit, setSavingEdit] = useState(false)

  const loadComments = useCallback(async () => {
    try {
      const data = await apiGetStudentComments(student.id)
      setComments(data)
    } catch {
      setComments([])
    }
  }, [student.id])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setSavingComment(true)
    try {
      await apiAddStudentComment(student.id, newComment.trim(), classItem.id)
      setNewComment('')
      toast.success('Đã lưu nhận xét học sinh')
      loadComments()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu nhận xét')
    } finally {
      setSavingComment(false)
    }
  }

  const handleGenerateAIComment = async () => {
    setGeneratingAI(true)
    try {
      const res = await generateStudentComment({
        studentId: student.id,
        subject: 'Tất cả môn học',
        notes: 'Chăm chỉ, hoàn thành bài tập đầy đủ',
      })
      const commentText = res?.comments?.[0] || res?.overallAssessment || ''
      if (commentText) {
        setNewComment(commentText)
        toast.success('Đã sinh gợi ý nhận xét từ AI!')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi sinh nhận xét AI')
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editFullName.trim()) return
    setSavingEdit(true)
    try {
      await apiUpdateStudent(student.id, {
        fullName: editFullName.trim(),
        gender: editGender,
        dob: editDob || undefined,
        parentName: editParentName.trim() || undefined,
        parentPhone: editParentPhone.trim() || undefined,
      })
      toast.success('Đã cập nhật hồ sơ học sinh!')
      setEditModalOpen(false)
      onStudentUpdated()
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi cập nhật hồ sơ')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 mb-2 transition cursor-pointer"
      >
        <ArrowLeft className="size-3.5" /> Quay lại lớp {classItem.name}
      </button>

      {/* Student Identity Card */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-teal-200">
              <AvatarFallback className={student.color || 'bg-teal-100 text-teal-700 text-xl font-bold'}>
                {student.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{student.name}</h2>
                <Badge variant={statusVariant(student.status)} className="text-xs">{student.status}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lớp {classItem.name} ({classItem.code || ''}) · Mã HS: <span className="font-mono font-bold text-slate-700">{student.studentCode || 'Chưa cấp'}</span>
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} className="text-xs gap-1.5 cursor-pointer">
            <Edit2 className="size-3.5" /> Sửa hồ sơ
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Demographics & Parent info */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="size-4 text-teal-600" /> Thông tin cá nhân & Gia đình
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Giới tính:</span>
              <span className="font-semibold text-slate-900">{student.gender}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Ngày sinh:</span>
              <span className="font-semibold text-slate-900">{student.dob}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Phụ huynh / Giám hộ:</span>
              <span className="font-semibold text-slate-900">{student.guardian || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Số điện thoại liên hệ:</span>
              <span className="font-mono font-bold text-teal-700">{student.phone || 'Chưa cập nhật'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Learning metrics */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-600" /> Tiến độ & Chuyên cần
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Tỷ lệ chuyên cần:</span>
              <span className="font-bold text-teal-700">
                {student.attendance !== null && student.attendance !== undefined ? `${student.attendance}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Mức độ hoàn thành bài:</span>
              <span className="font-bold text-blue-700">{student.progress}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Đánh giá chung:</span>
              <Badge variant={statusVariant(student.status)} className="text-[10px]">{student.status}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Comments Section */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MessageSquare className="size-4 text-teal-600" /> Nhận xét của giáo viên
            </CardTitle>
            <CardDescription className="text-xs">
              Lưu trữ nhật ký nhận xét và đánh giá thường xuyên cho học sinh.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateAIComment}
            disabled={generatingAI}
            className="text-xs gap-1.5 text-teal-700 border-teal-200 cursor-pointer"
          >
            {generatingAI ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3.5 text-amber-500" />} Gợi ý từ AI
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Nhập nhận xét cho học sinh (hoặc bấm 'Gợi ý từ AI')..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="text-xs"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={savingComment || !newComment.trim()}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
              >
                {savingComment ? 'Đang lưu...' : 'Lưu nhận xét'}
              </Button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 pt-2">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Chưa có nhận xét nào được ghi nhận</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">{c.teacherName || 'Giáo viên'}</span>
                    <span>{c.date || new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <p className="text-slate-800 leading-relaxed">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* EDIT STUDENT MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa hồ sơ học sinh</DialogTitle>
            <DialogDescription>Cập nhật thông tin cá nhân và số điện thoại phụ huynh.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Họ và tên *</Label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Giới tính</Label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Ngày sinh</Label>
                <Input
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Họ tên phụ huynh</Label>
              <Input
                value={editParentName}
                onChange={(e) => setEditParentName(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Điện thoại phụ huynh</Label>
              <Input
                value={editParentPhone}
                onChange={(e) => setEditParentPhone(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>Hủy</Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={savingEdit || !editFullName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs cursor-pointer"
            >
              {savingEdit ? 'Đang lưu...' : 'Lưu hồ sơ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
