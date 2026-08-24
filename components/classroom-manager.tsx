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
  setClassAsHomeroom,
  unsetClassAsHomeroom,
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
  getConfiguredClassSubjects,
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
import { notifyStudentDataChanged } from '@/services/student-service'
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
  FileSpreadsheet, FileText, UploadCloud, AlertCircle, RefreshCw, MoreVertical,
  TrendingUp, Award, Phone, Mail, User, School, ArrowUpRight, House
} from 'lucide-react'
import { ScheduleAttendanceDialog } from '@/components/schedule-attendance-dialog'
import { generateStudentComment } from '@/services/ai-service'
import { useAuth } from '@/context/auth-context'

type ViewState = {
  page: 'classes' | 'class' | 'student'
  classId?: string
  studentId?: string
  initialTab?: string
}

const statusVariant = (status: StudentRecord['status']) =>
  status === 'Tá»‘t' ? 'default' : status === 'KhÃ¡' ? 'secondary' : 'destructive'

export function ClassroomManager({
  initialSection = 'classes',
  initialClassId,
}: {
  initialSection?: 'classes' | 'students'
  initialClassId?: string
}) {
  const { user } = useAuth()
  const authenticatedTeacherId = user?.teacher?.id || (user as any)?.teacherId
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
  const [formSchedule, setFormSchedule] = useState('SÃ¡ng Â· Thá»© 2 - Thá»© 6')
  const [allSubjects, setAllSubjects] = useState<SubjectOption[]>([])
  const [formSubjectIds, setFormSubjectIds] = useState<string[]>([])
  const [formIsHomeroom, setFormIsHomeroom] = useState(false)
  const [creating, setCreating] = useState(false)

  // Edit Form State
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editRoom, setEditRoom] = useState('')
  const [editSchedule, setEditSchedule] = useState('')
  const [editGradeId, setEditGradeId] = useState('')
  const [editStatus, setEditStatus] = useState('ACTIVE')
  const [editSubjectIds, setEditSubjectIds] = useState<string[]>([])
  const [editIsHomeroom, setEditIsHomeroom] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [updatingHomeroomId, setUpdatingHomeroomId] = useState<string | null>(null)

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
      const [years, gs, classRes, subjects] = await Promise.all([
        getSchoolYears(),
        getGrades(),
        getClassesWithSummary(),
        getSubjects(),
      ])
      setSchoolYears(years)
      setGrades(gs)
      setAllSubjects(subjects.filter((subject) => subject.isActive !== false))

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
      setError(err?.message || 'KhÃ´ng thá»ƒ táº£i danh sÃ¡ch lá»›p há»c')
      toast.error('KhÃ´ng thá»ƒ táº£i danh sÃ¡ch lá»›p há»c')
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
      toast.error('Vui lÃ²ng nháº­p tÃªn lá»›p há»c')
      return
    }
    if (!formSchoolYearId) {
      toast.error('Vui lÃ²ng chá»n nÄƒm há»c')
      return
    }
    if (!formGradeId) {
      toast.error('Vui lÃ²ng chá»n khá»‘i lá»›p')
      return
    }

    if (formIsHomeroom) {
      const selectedYear = schoolYears.find((sy) => sy.id === formSchoolYearId)
      if (selectedYear && selectedYear.isCurrent === false) {
        toast.error('\u0043h\u1ec9 c\u00f3 th\u1ec3 \u0111\u1eb7t l\u1edbp ch\u1ee7 nhi\u1ec7m trong n\u0103m h\u1ecdc hi\u1ec7n t\u1ea1i')
        return
      }
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
        subjectIds: formSubjectIds,
        isHomeroom: formIsHomeroom,
      })
      setClasses((prev) => [created, ...prev])
      setCreateDialogOpen(false)
      setFormName('')
      setFormCode('')
      setFormRoom('')
      setFormSubjectIds([])
      setFormIsHomeroom(false)
      toast.success(`ÄÃ£ táº¡o lá»›p ${created.name} thÃ nh cÃ´ng!`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'CÃ³ lá»—i xáº£y ra khi táº¡o lá»›p há»c')
    } finally {
      setCreating(false)
    }
  }

  const openEditModal = async (cls: ClassRecord) => {
    setEditClassTarget(cls)
    setEditName(cls.name || '')
    setEditCode(cls.code || '')
    setEditRoom(cls.room || '')
    setEditSchedule(cls.schedule || 'SÃ¡ng Â· Thá»© 2 - Thá»© 6')
    setEditGradeId(cls.gradeId || '')
    setEditStatus(cls.status || 'ACTIVE')
    setEditIsHomeroom(Boolean(authenticatedTeacherId && cls.homeroomTeacherId === authenticatedTeacherId))
    setEditSubjectIds([])
    try {
      const configured = await getConfiguredClassSubjects(cls.id)
      setEditSubjectIds(configured.map((subject) => subject.id))
    } catch (err: any) {
      toast.error(err?.message || 'KhÃ´ng thá»ƒ táº£i cáº¥u hÃ¬nh mÃ´n há»c cá»§a lá»›p')
    }
  }

  const handleUpdateClass = async () => {
    if (!editClassTarget || !editName.trim()) {
      toast.error('TÃªn lá»›p khÃ´ng Ä‘Æ°á»£c Ä‘á»ƒ trá»‘ng')
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
        subjectIds: editSubjectIds,
        isHomeroom: editIsHomeroom,
      })
      setClasses((prev) => prev.map((c) => (c.id === editClassTarget.id ? { ...c, ...updated } : c)))
      setEditClassTarget(null)
      toast.success(`ÄÃ£ cáº­p nháº­t thÃ´ng tin lá»›p ${updated.name}`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi cáº­p nháº­t lá»›p há»c')
    } finally {
      setUpdating(false)
    }
  }

  const openCloneModal = (cls: ClassRecord) => {
    setCloneClassTarget(cls)
    setCloneTargetName(`${cls.name} (Má»›i)`)
    setCloneTargetCode(`${cls.code || ''}N`)
    setCloneCopyStudents(true)
  }

  const handleCloneClass = async () => {
    if (!cloneClassTarget || !cloneTargetName.trim() || !cloneTargetSyId) {
      toast.error('Vui lÃ²ng Ä‘iá»n Ä‘áº§y Ä‘á»§ thÃ´ng tin nhÃ¢n báº£n')
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
      toast.success(`ÄÃ£ nhÃ¢n báº£n lá»›p sang ${cloned.name} thÃ nh cÃ´ng!`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi nhÃ¢n báº£n lá»›p há»c')
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
      toast.success(`ÄÃ£ Ä‘Ã¡nh dáº¥u hoÃ n thÃ nh nÄƒm há»c cho lá»›p ${completeClassTarget.name}`)
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi káº¿t thÃºc lá»›p há»c')
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
      toast.success(`ÄÃ£ lÆ°u trá»¯ vÃ  ngá»«ng sá»­ dá»¥ng lá»›p ${deleteClassTarget.name}`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi xÃ³a lá»›p há»c')
    }
  }

  const isHomeroomOfCurrentTeacher = (classroom: ClassRecord) =>
    Boolean(authenticatedTeacherId && classroom.homeroomTeacherId === authenticatedTeacherId)

  const handleHomeroomChange = async (classroom: ClassRecord) => {
    if (updatingHomeroomId) return
    if (classroom.teacherId !== authenticatedTeacherId) {
      toast.error('\u0042\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n qu\u1ea3n l\u00fd ph\u00e2n c\u00f4ng ch\u1ee7 nhi\u1ec7m c\u1ee7a l\u1edbp n\u00e0y')
      return
    }
    const isCurrentHomeroom = isHomeroomOfCurrentTeacher(classroom)
    if (!isCurrentHomeroom && classroom.schoolYear && !classroom.schoolYear.isCurrent) {
      toast.error('\u0043h\u1ec9 c\u00f3 th\u1ec3 \u0111\u1eb7t l\u1edbp ch\u1ee7 nhi\u1ec7m trong n\u0103m h\u1ecdc hi\u1ec7n t\u1ea1i')
      return
    }
    setUpdatingHomeroomId(classroom.id)
    try {
      const updated = isCurrentHomeroom
        ? await unsetClassAsHomeroom(classroom.id)
        : await setClassAsHomeroom(classroom.id)
      setClasses((prev) =>
        prev.map((item) =>
          item.id === classroom.id
            ? { ...item, ...updated, homeroomTeacherId: updated.homeroomTeacherId }
            : item,
        ),
      )
      toast.success(
        isCurrentHomeroom
          ? '\u0110\u00e3 b\u1ecf l\u1edbp ' + classroom.name + ' kh\u1ecfi l\u1edbp ch\u1ee7 nhi\u1ec7m.'
          : '\u0110\u00e3 \u0111\u1eb7t l\u1edbp ' + classroom.name + ' l\u00e0m l\u1edbp ch\u1ee7 nhi\u1ec7m.',
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
      }
      await reloadClasses()
    } catch (err: any) {
      toast.error(err?.message || '\u004bh\u00f4ng th\u1ec3 c\u1eadp nh\u1eadt ph\u00e2n c\u00f4ng ch\u1ee7 nhi\u1ec7m')
    } finally {
      setUpdatingHomeroomId(null)
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
                <GraduationCap className="size-4" /> Quáº£n lÃ½ lá»›p há»c TeachFlow
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                Lá»›p há»c cá»§a tÃ´i
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Trung tÃ¢m quáº£n lÃ½ toÃ n bá»™ dá»¯ liá»‡u, há»c sinh, Ä‘iá»ƒm danh vÃ  hoáº¡t Ä‘á»™ng há»c táº­p theo tá»«ng lá»›p.
              </p>
            </div>

            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 shadow-sm h-9 px-4 shrink-0"
            >
              <Plus className="size-4" /> Táº¡o lá»›p má»›i
            </Button>
          </div>

          {/* 3 Summary KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tá»•ng sá»‘ lá»›p</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{summaryStats.totalClasses}</p>
                  <p className="text-[11px] text-teal-700 font-medium mt-0.5">Theo bá»™ lá»c hiá»‡n táº¡i</p>
                </div>
                <div className="size-10 rounded-xl bg-teal-50 text-teal-700 grid place-items-center">
                  <LayoutGrid className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tá»•ng há»c sinh</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">{summaryStats.totalStudents}</p>
                  <p className="text-[11px] text-blue-700 font-medium mt-0.5">Há»c sinh Ä‘ang theo há»c</p>
                </div>
                <div className="size-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center">
                  <Users className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xs">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Tá»· lá»‡ Ä‘i há»c</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {summaryStats.avgAttendanceRate !== null && summaryStats.avgAttendanceRate !== undefined
                      ? `${summaryStats.avgAttendanceRate}%`
                      : 'â€”'}
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                    {summaryStats.avgAttendanceRate !== null && summaryStats.avgAttendanceRate !== undefined
                      ? 'Trung bÃ¬nh thÃ¡ng nÃ y'
                      : 'ChÆ°a cÃ³ dá»¯ liá»‡u thÃ¡ng nÃ y'}
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
                    placeholder="TÃ¬m theo tÃªn lá»›p, mÃ£ lá»›p, phÃ²ng há»c..."
                    value={query}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9 text-xs h-9 bg-slate-50 border-slate-200"
                  />
                </div>

                {/* School Year Filter */}
                <div>
                  <select
                    aria-label="Lá»c theo nÄƒm há»c"
                    value={selectedSchoolYearId}
                    onChange={(e) => handleSchoolYearChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="ALL">Táº¥t cáº£ nÄƒm há»c</option>
                    {schoolYears.map((sy) => (
                      <option key={sy.id} value={sy.id}>
                        {sy.name} {sy.isCurrent ? '(Hiá»‡n táº¡i)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grade Filter */}
                <div>
                  <select
                    aria-label="Lá»c theo khá»‘i lá»›p"
                    value={selectedGradeId}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="ALL">Táº¥t cáº£ khá»‘i</option>
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
                    aria-label="Sáº¯p xáº¿p danh sÃ¡ch lá»›p"
                    value={selectedSort}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 focus:outline-teal-500"
                  >
                    <option value="name">TÃªn lá»›p (A-Z)</option>
                    <option value="studentCount">SÄ© sá»‘ (Cao - Tháº¥p)</option>
                    <option value="attendanceRate">ChuyÃªn cáº§n (Cao - Tháº¥p)</option>
                    <option value="updatedAt">Cáº­p nháº­t gáº§n nháº¥t</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Cards Grid */}
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="size-8 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-sm font-medium">Äang táº£i danh sÃ¡ch lá»›p há»c...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center bg-white rounded-xl border border-rose-200 p-6 space-y-3">
              <AlertCircle className="size-8 mx-auto text-rose-500" />
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <Button variant="outline" size="sm" onClick={() => loadInitialData()} className="text-xs gap-1.5">
                <RefreshCw className="size-3" /> Thá»­ láº¡i
              </Button>
            </div>
          ) : classes.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200 p-8 space-y-3">
              <School className="size-10 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-800">Báº¡n chÆ°a cÃ³ lá»›p há»c nÃ o</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Báº¯t Ä‘áº§u thiáº¿t láº­p danh sÃ¡ch lá»›p há»c Ä‘á»ƒ quáº£n lÃ½ há»c sinh, láº­p lá»‹ch dáº¡y vÃ  ghi nháº­n Ä‘iá»ƒm danh.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-teal-600 text-white text-xs font-semibold gap-1.5">
                <Plus className="size-3.5" /> Táº¡o lá»›p Ä‘áº§u tiÃªn
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
                          {isHomeroomOfCurrentTeacher(item) && (
                            <Badge className="border-teal-200 bg-teal-50 text-teal-700 gap-1 px-1.5 py-0 text-[10px] font-semibold">
                              <House className="size-3" />
                              {'Ch\u1ee7 nhi\u1ec7m'}
                            </Badge>
                          )}
                          {item.code && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {item.code}
                            </span>
                          )}
                        </div>
                        <CardDescription className="text-xs text-slate-500 mt-1">
                          {item.grade} Â· {item.room || 'PhÃ²ng há»c'} Â· {item.schoolYear?.name || ''}
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
                          {item.status === 'COMPLETED' ? 'ÄÃ£ káº¿t thÃºc' : 'Äang hoáº¡t Ä‘á»™ng'}
                        </Badge>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="size-8 text-slate-400 hover:text-slate-700">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'overview' })}>
                              <Eye className="size-3.5 mr-2" /> Xem tá»•ng quan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'students' })}>
                              <Users className="size-3.5 mr-2" /> Quáº£n lÃ½ há»c sinh
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'schedules' })}>
                              <CalendarDays className="size-3.5 mr-2" /> Lá»‹ch dáº¡y
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'attendance' })}>
                              <CalendarCheck2 className="size-3.5 mr-2" /> Äiá»ƒm danh
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView({ page: 'class', classId: item.id, initialTab: 'assessments' })}>
                              <BarChart3 className="size-3.5 mr-2" /> ÄÃ¡nh giÃ¡
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {item.teacherId === authenticatedTeacherId && (
                            <DropdownMenuItem
                              className={updatingHomeroomId === item.id || (!isHomeroomOfCurrentTeacher(item) && item.schoolYear?.isCurrent === false) ? 'opacity-50 pointer-events-none' : undefined}
                              onClick={() => handleHomeroomChange(item)}
                            >
                              <House className="size-3.5 mr-2" />
                              {isHomeroomOfCurrentTeacher(item)
                                ? 'B\u1ecf l\u1edbp ch\u1ee7 nhi\u1ec7m'
                                : '\u0110\u1eb7t l\u00e0m l\u1edbp ch\u1ee7 nhi\u1ec7m'}
                            </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditModal(item)}>
                              <Edit2 className="size-3.5 mr-2" /> Chá»‰nh sá»­a lá»›p
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCloneModal(item)}>
                              <Copy className="size-3.5 mr-2" /> NhÃ¢n báº£n sang nÄƒm má»›i
                            </DropdownMenuItem>
                            {item.status !== 'COMPLETED' && (
                              <DropdownMenuItem onClick={() => setCompleteClassTarget(item)}>
                                <CheckCircle2 className="size-3.5 mr-2 text-blue-600" /> Káº¿t thÃºc nÄƒm há»c
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteClassTarget(item)} className="text-rose-600">
                              <Trash2 className="size-3.5 mr-2" /> XÃ³a / LÆ°u trá»¯
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
                        <p className="text-[10px] text-slate-500">SÄ© sá»‘</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-teal-700">
                          {typeof item.average === 'number' && item.average !== null ? `${item.average} Ä‘` : 'â€”'}
                        </p>
                        <p className="text-[10px] text-slate-500">Äiá»ƒm TB</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-blue-700">
                          {typeof item.attendance === 'number' && item.attendance !== null ? `${item.attendance}%` : 'â€”'}
                        </p>
                        <p className="text-[10px] text-slate-500">Äi há»c</p>
                      </div>
                    </div>

                    {item.teacherId === authenticatedTeacherId && item.status !== 'COMPLETED' && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          size="sm"
                          variant={isHomeroomOfCurrentTeacher(item) ? 'outline' : 'default'}
                          disabled={updatingHomeroomId === item.id || (!isHomeroomOfCurrentTeacher(item) && item.schoolYear?.isCurrent === false)}
                          aria-label={(isHomeroomOfCurrentTeacher(item) ? 'B\u1ecf ' : '\u0110\u1eb7t ') + item.name + ' l\u00e0m l\u1edbp ch\u1ee7 nhi\u1ec7m'}
                          onClick={() => handleHomeroomChange(item)}
                          className="h-8 w-full gap-1.5 text-[11px] font-semibold"
                        >
                          {updatingHomeroomId === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <House className="size-3.5" />
                          )}
                          {isHomeroomOfCurrentTeacher(item)
                            ? 'B\u1ecf l\u1edbp ch\u1ee7 nhi\u1ec7m'
                            : '\u0110\u1eb7t l\u00e0m l\u1edbp ch\u1ee7 nhi\u1ec7m'}
                        </Button>
                      </div>
                    )}

                    {/* Schedule and Arrow Footer */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className="truncate">{item.schedule || 'SÃ¡ng Â· Thá»© 2 - Thá»© 6'}</span>
                      <span className="flex items-center text-teal-600 font-semibold group-hover:translate-x-0.5 transition-transform text-[11px]">
                        Xem chi tiáº¿t <ChevronRight className="size-3.5 ml-0.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/* GLOBAL MODALS (Preserves Classroom Detail or Directory in background) */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      {/* CREATE CLASS DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Táº¡o lá»›p há»c má»›i</DialogTitle>
            <DialogDescription>
              Thiáº¿t láº­p thÃ´ng tin lá»›p há»c theo nÄƒm há»c vÃ  khá»‘i lá»›p giáº£ng dáº¡y.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="create-sy" className="text-xs font-semibold">NÄƒm há»c *</Label>
                <select
                  id="create-sy"
                  value={formSchoolYearId}
                  onChange={(e) => setFormSchoolYearId(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  {schoolYears.map((sy) => (
                    <option key={sy.id} value={sy.id}>
                      {sy.name} {sy.isCurrent ? '(Hiá»‡n táº¡i)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="create-grade" className="text-xs font-semibold">Khá»‘i lá»›p *</Label>
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
                <Label htmlFor="create-name" className="text-xs font-semibold">TÃªn lá»›p *</Label>
                <Input
                  id="create-name"
                  placeholder="Lá»›p 4A1"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="create-code" className="text-xs font-semibold">MÃ£ lá»›p *</Label>
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
                <Label htmlFor="create-room" className="text-xs font-semibold">PhÃ²ng há»c</Label>
                <Input
                  id="create-room"
                  placeholder="PhÃ²ng 204"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="create-schedule" className="text-xs font-semibold">Ca há»c / Thá»i khÃ³a biá»ƒu</Label>
                <Input
                  id="create-schedule"
                  placeholder="SÃ¡ng Â· Thá»© 2 - Thá»© 6"
                  value={formSchedule}
                  onChange={(e) => setFormSchedule(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">MÃ´n há»c cáº¥u hÃ¬nh cho lá»›p</Label>
              <select multiple value={formSubjectIds} onChange={(e) => setFormSubjectIds([...e.target.selectedOptions].map((option) => option.value))} className="mt-1 h-28 w-full rounded-md border border-slate-200 bg-white p-2 text-xs">
                {allSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">Giá»¯ Ctrl (Windows) hoáº·c Command (macOS) Ä‘á»ƒ chá»n nhiá»u mÃ´n.</p>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                id="create-is-homeroom"
                checked={formIsHomeroom}
                onChange={(e) => setFormIsHomeroom(e.target.checked)}
                disabled={schoolYears.find((sy) => sy.id === formSchoolYearId)?.isCurrent === false}
                className="mt-0.5 size-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <div>
                <Label htmlFor="create-is-homeroom" className="text-xs text-slate-800 cursor-pointer font-semibold">
                  {'\u0110\u00e2y l\u00e0 l\u1edbp t\u00f4i \u0111ang ch\u1ee7 nhi\u1ec7m'}
                </Label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {'Khi b\u1eadt, l\u1edbp n\u00e0y s\u1ebd \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng trong m\u00e0n Ch\u1ee7 nhi\u1ec7m.'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
              Há»§y
            </Button>
            <Button
              size="sm"
              onClick={handleCreateClass}
              disabled={creating || !formName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5"
            >
              {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Táº¡o lá»›p
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT CLASS DIALOG */}
      <Dialog open={!!editClassTarget} onOpenChange={(val) => !val && setEditClassTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Chá»‰nh sá»­a thÃ´ng tin lá»›p {editClassTarget?.name}</DialogTitle>
            <DialogDescription>Cáº­p nháº­t tÃªn, mÃ£ lá»›p, phÃ²ng há»c vÃ  ca há»c.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-name" className="text-xs font-semibold">TÃªn lá»›p *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="edit-code" className="text-xs font-semibold">MÃ£ lá»›p</Label>
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
                <Label htmlFor="edit-room" className="text-xs font-semibold">PhÃ²ng há»c</Label>
                <Input
                  id="edit-room"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label htmlFor="edit-schedule" className="text-xs font-semibold">Ca há»c</Label>
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
                <Label htmlFor="edit-grade" className="text-xs font-semibold">Khá»‘i lá»›p</Label>
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
                <Label htmlFor="edit-status" className="text-xs font-semibold">Tráº¡ng thÃ¡i</Label>
                <select
                  id="edit-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="ACTIVE">Äang hoáº¡t Ä‘á»™ng</option>
                  <option value="COMPLETED">ÄÃ£ káº¿t thÃºc</option>
                </select>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                id="edit-is-homeroom"
                checked={editIsHomeroom}
                onChange={(e) => setEditIsHomeroom(e.target.checked)}
                disabled={!editIsHomeroom && editClassTarget?.schoolYear?.isCurrent === false}
                className="mt-0.5 size-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <div>
                <Label htmlFor="edit-is-homeroom" className="text-xs text-slate-800 cursor-pointer font-semibold">
                  {'\u0110\u00e2y l\u00e0 l\u1edbp t\u00f4i \u0111ang ch\u1ee7 nhi\u1ec7m'}
                </Label>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {'Khi b\u1eadt, l\u1edbp n\u00e0y s\u1ebd \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng trong m\u00e0n Ch\u1ee7 nhi\u1ec7m.'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditClassTarget(null)} disabled={updating}>
              Há»§y
            </Button>
            <Button
              size="sm"
              onClick={handleUpdateClass}
              disabled={updating || !editName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5"
            >
              {updating ? <Loader2 className="size-3.5 animate-spin" /> : <SaveIcon />} LÆ°u thay Ä‘á»•i
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CLONE CLASS DIALOG */}
      <Dialog open={!!cloneClassTarget} onOpenChange={(val) => !val && setCloneClassTarget(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>NhÃ¢n báº£n lá»›p sang nÄƒm há»c má»›i</DialogTitle>
            <DialogDescription>
              Táº¡o lá»›p má»›i tá»« lá»›p <strong>{cloneClassTarget?.name}</strong> cho nÄƒm há»c tiáº¿p theo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">NÄƒm há»c Ä‘Ã­ch *</Label>
              <select
                value={cloneTargetSyId}
                onChange={(e) => setCloneTargetSyId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
              >
                {schoolYears.map((sy) => (
                  <option key={sy.id} value={sy.id}>
                    {sy.name} {sy.isCurrent ? '(Hiá»‡n táº¡i)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">TÃªn lá»›p má»›i *</Label>
                <Input
                  value={cloneTargetName}
                  onChange={(e) => setCloneTargetName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">MÃ£ lá»›p má»›i</Label>
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
                Tá»± Ä‘á»™ng sao chÃ©p danh sÃ¡ch há»c sinh sang nÄƒm há»c má»›i (Ghi danh má»›i)
              </Label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setCloneClassTarget(null)} disabled={cloning}>
              Há»§y
            </Button>
            <Button
              size="sm"
              onClick={handleCloneClass}
              disabled={cloning || !cloneTargetName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5"
            >
              {cloning ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />} NhÃ¢n báº£n lá»›p
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMPLETE CLASS CONFIRMATION */}
      <Dialog open={!!completeClassTarget} onOpenChange={(val) => !val && setCompleteClassTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Káº¿t thÃºc nÄƒm há»c lá»›p {completeClassTarget?.name}?</DialogTitle>
            <DialogDescription>
              Lá»›p sáº½ chuyá»ƒn sang tráº¡ng thÃ¡i <strong>ÄÃ£ káº¿t thÃºc</strong>. Dá»¯ liá»‡u há»c sinh, Ä‘iá»ƒm danh vÃ  Ä‘Ã¡nh giÃ¡ sáº½ Ä‘Æ°á»£c báº£o lÆ°u an toÃ n.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCompleteClassTarget(null)}>Há»§y</Button>
            <Button size="sm" onClick={handleCompleteClass} className="bg-blue-600 hover:bg-blue-700 text-white">
              XÃ¡c nháº­n káº¿t thÃºc
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CLASS CONFIRMATION */}
      <Dialog open={!!deleteClassTarget} onOpenChange={(val) => !val && setDeleteClassTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>LÆ°u trá»¯ vÃ  ngá»«ng sá»­ dá»¥ng lá»›p</DialogTitle>
            <DialogDescription>
              Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a/lÆ°u trá»¯ lá»›p <strong>{deleteClassTarget?.name}</strong>? Lá»›p sáº½ khÃ´ng hiá»ƒn thá»‹ trÃªn danh sÃ¡ch chÃ­nh nhÆ°ng dá»¯ liá»‡u lá»‹ch sá»­ váº«n Ä‘Æ°á»£c báº£o toÃ n.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteClassTarget(null)}>Há»§y</Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteClass}>
              XÃ¡c nháº­n xÃ³a
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CLASS DETAIL VIEW (7 TABS LAZY-LOADED)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
            <ArrowLeft className="size-3.5" /> Quay láº¡i danh sÃ¡ch lá»›p
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
              {classItem.status === 'COMPLETED' ? 'ÄÃ£ káº¿t thÃºc' : 'Äang hoáº¡t Ä‘á»™ng'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {classItem.grade} Â· {classItem.schoolYear?.name || 'NÄƒm há»c'} Â· {classItem.room || 'PhÃ²ng há»c'} Â· {classItem.schedule || 'SÃ¡ng Â· Thá»© 2 - Thá»© 6'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onOpenEdit} className="text-xs h-9 gap-1.5">
            <Edit2 className="size-3.5" /> Sá»­a thÃ´ng tin
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenClone} className="text-xs h-9 gap-1.5">
            <Copy className="size-3.5" /> NhÃ¢n báº£n lá»›p
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
                  <CheckCircle2 className="size-3.5 mr-2 text-blue-600" /> Káº¿t thÃºc nÄƒm há»c
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onOpenDelete} className="text-rose-600">
                <Trash2 className="size-3.5 mr-2" /> XÃ³a / LÆ°u trá»¯ lá»›p
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 7 Tabs Container */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-7 h-auto p-1 bg-slate-100 rounded-xl">
          <TabsTrigger value="overview" className="text-xs py-2 font-medium">Tá»•ng quan</TabsTrigger>
          <TabsTrigger value="students" className="text-xs py-2 font-medium">Há»c sinh</TabsTrigger>
          <TabsTrigger value="schedules" className="text-xs py-2 font-medium">Lá»‹ch dáº¡y</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs py-2 font-medium">Äiá»ƒm danh</TabsTrigger>
          <TabsTrigger value="assessments" className="text-xs py-2 font-medium">ÄÃ¡nh giÃ¡</TabsTrigger>
          <TabsTrigger value="lesson-plans" className="text-xs py-2 font-medium">GiÃ¡o Ã¡n</TabsTrigger>
          <TabsTrigger value="statistics" className="text-xs py-2 font-medium">Thá»‘ng kÃª</TabsTrigger>
        </TabsList>

        {/* TAB 1: Tá»”NG QUAN */}
        <TabsContent value="overview" className="mt-5 space-y-5">
          <TabOverview classItem={classItem} onSwitchTab={(tab) => setActiveTab(tab)} />
        </TabsContent>

        {/* TAB 2: Há»ŒC SINH */}
        <TabsContent value="students" className="mt-5 space-y-5">
          <TabStudents
            classItem={classItem}
            allClasses={allClasses}
            onOpenStudent={onOpenStudent}
            onClassUpdated={onClassUpdated}
          />
        </TabsContent>

        {/* TAB 3: Lá»ŠCH Dáº Y */}
        <TabsContent value="schedules" className="mt-5 space-y-5">
          <TabSchedules classItem={classItem} />
        </TabsContent>

        {/* TAB 4: ÄIá»‚M DANH */}
        <TabsContent value="attendance" className="mt-5 space-y-5">
          <TabAttendance classItem={classItem} />
        </TabsContent>

        {/* TAB 5: ÄÃNH GIÃ */}
        <TabsContent value="assessments" className="mt-5 space-y-5">
          <TabAssessments classItem={classItem} />
        </TabsContent>

        {/* TAB 6: GIÃO ÃN */}
        <TabsContent value="lesson-plans" className="mt-5 space-y-5">
          <TabLessonPlans classItem={classItem} />
        </TabsContent>

        {/* TAB 7: THá»NG KÃŠ */}
        <TabsContent value="statistics" className="mt-5 space-y-5">
          <TabStatistics classItem={classItem} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 1: Tá»”NG QUAN
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
      toast.success('ÄÃ£ khai bÃ¡o mÃ´n há»c phá»¥ trÃ¡ch thÃ nh cÃ´ng')
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi khai bÃ¡o mÃ´n há»c')
    } finally {
      setDeclaring(false)
    }
  }

  const handleDeactivate = async (ctxId: string) => {
    try {
      await deactivateTeachingContext(ctxId)
      setTeachingContexts((prev) => prev.filter((c) => c.id !== ctxId))
      toast.success('ÄÃ£ ngá»«ng phá»¥ trÃ¡ch mÃ´n há»c')
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi há»§y phá»¥ trÃ¡ch')
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="size-8 animate-spin mx-auto text-teal-600 mb-2" />
        <p className="text-sm font-medium">Äang táº£i dá»¯ liá»‡u tá»•ng quan...</p>
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
            <p className="text-[11px] text-slate-500 font-medium">SÄ© sá»‘ lá»›p</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <CalendarCheck2 className="size-5 mx-auto text-blue-600 mb-1" />
            <p className="text-lg font-bold text-blue-700">
              {kpis.attendanceRate !== null && kpis.attendanceRate !== undefined
                ? `${kpis.attendanceRate}%`
                : 'â€”'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">ChuyÃªn cáº§n</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <Award className="size-5 mx-auto text-amber-600 mb-1" />
            <p className="text-lg font-bold text-amber-700">
              {kpis.averageScore !== null && kpis.averageScore !== undefined
                ? `${kpis.averageScore} Ä‘`
                : 'â€”'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Äiá»ƒm TB</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <CalendarDays className="size-5 mx-auto text-purple-600 mb-1" />
            <p className="text-lg font-bold text-purple-700">{kpis.weeklyScheduleCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Tiáº¿t tuáº§n nÃ y</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <FileText className="size-5 mx-auto text-emerald-600 mb-1" />
            <p className="text-lg font-bold text-emerald-700">{kpis.preparedLessonPlanCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">GiÃ¡o Ã¡n Ä‘Ã£ dáº¡y</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <Heart className="size-5 mx-auto text-rose-500 mb-1" />
            <p className="text-lg font-bold text-rose-600">{kpis.needsSupportStudentCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Cáº§n há»— trá»£</p>
          </CardContent>
        </Card>
      </div>

      {/* Teaching Context Section */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="size-4 text-teal-600" /> MÃ´n há»c phá»¥ trÃ¡ch táº¡i lá»›p nÃ y
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Khai bÃ¡o mÃ´n báº¡n trá»±c tiáº¿p giáº£ng dáº¡y táº¡i lá»›p Ä‘á»ƒ hiá»ƒn thá»‹ lá»‹ch dáº¡y vÃ  giÃ¡o Ã¡n.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDeclareOpen(true)} className="text-xs h-8 gap-1">
            <Plus className="size-3.5" /> Khai bÃ¡o mÃ´n
          </Button>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 pt-0">
          {teachingContexts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
              ChÆ°a khai bÃ¡o mÃ´n dáº¡y riÃªng nÃ o. Nháº¥n <strong>"Khai bÃ¡o mÃ´n"</strong> Ä‘á»ƒ báº¯t Ä‘áº§u.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {teachingContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/60 px-3 py-1.5 text-xs font-semibold text-teal-900"
                >
                  <span>{ctx.subject?.name || 'MÃ´n há»c'}</span>
                  <button
                    type="button"
                    onClick={() => handleDeactivate(ctx.id)}
                    className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Ngá»«ng phá»¥ trÃ¡ch"
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
              <CalendarDays className="size-4 text-teal-600" /> Lá»‹ch dáº¡y gáº§n nháº¥t
            </CardTitle>
            <button onClick={() => onSwitchTab('schedules')} className="text-xs text-teal-700 font-semibold hover:underline cursor-pointer">
              Xem táº¥t cáº£
            </button>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {(data?.recentSchedules || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">ChÆ°a cÃ³ lá»‹ch dáº¡y gáº§n Ä‘Ã¢y</p>
            ) : (
              data?.recentSchedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{s.subjectName}</p>
                    <p className="text-[11px] text-slate-500">{s.plannedDate} Â· {s.startTime || '07:00'} - {s.endTime || '07:45'}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    {s.status === 'COMPLETED' ? 'ÄÃ£ dáº¡y' : 'Sáº¯p tá»›i'}
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
              <Clock className="size-4 text-amber-600" /> Váº¯ng / Äi muá»™n gáº§n Ä‘Ã¢y
            </CardTitle>
            <button onClick={() => onSwitchTab('attendance')} className="text-xs text-teal-700 font-semibold hover:underline cursor-pointer">
              Xem chi tiáº¿t
            </button>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {[...(data?.recentAbsences || []), ...(data?.recentLates || [])].length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Lá»›p chuyÃªn cáº§n tá»‘t, khÃ´ng cÃ³ váº¯ng / Ä‘i muá»™n gáº§n Ä‘Ã¢y</p>
            ) : (
              [...(data?.recentAbsences || []), ...(data?.recentLates || [])].slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{item.studentName}</p>
                    <p className="text-[11px] text-slate-500">{item.date} Â· {item.subjectName}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    (item as any).lateMinutes ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {(item as any).lateMinutes ? `Äi muá»™n ${(item as any).lateMinutes}p` : `Váº¯ng ${(item as any).type || ''}`}
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
            <DialogTitle>Khai bÃ¡o mÃ´n giáº£ng dáº¡y</DialogTitle>
            <DialogDescription>Chá»n mÃ´n há»c báº¡n phá»¥ trÃ¡ch giáº£ng dáº¡y táº¡i lá»›p nÃ y.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-xs font-semibold">MÃ´n há»c *</Label>
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
            <Button variant="outline" size="sm" onClick={() => setDeclareOpen(false)}>Há»§y</Button>
            <Button size="sm" onClick={handleDeclareSubject} disabled={declaring} className="bg-teal-600 text-white">
              {declaring ? 'Äang lÆ°u...' : 'XÃ¡c nháº­n'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 2: Há»ŒC SINH (DANH SÃCH, THÃŠM, IMPORT EXCEL, CHUYá»‚N Lá»šP, RÃšT Lá»šP)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
      toast.error('Vui lÃ²ng nháº­p há» vÃ  tÃªn há»c sinh')
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
      toast.success('ÄÃ£ thÃªm há»c sinh vÃ o lá»›p thÃ nh cÃ´ng!')
      loadStudents()
      onClassUpdated()
      notifyStudentDataChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi thÃªm há»c sinh')
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
        const error = !fullName ? 'Thiáº¿u há» tÃªn' : undefined
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
        toast.success(res.message || `ÄÃ£ import thÃ nh cÃ´ng ${res.importedCount} há»c sinh`)
        setImportModalOpen(false)
        setImportText('')
        setImportRows([])
        loadStudents()
        onClassUpdated()
        notifyStudentDataChanged()
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi import há»c sinh')
    } finally {
      setSubmittingImport(false)
    }
  }

  const handleTransfer = async () => {
    if (!transferTarget || !targetClassId) {
      toast.error('Vui lÃ²ng chá»n lá»›p Ä‘Ã­ch cáº§n chuyá»ƒn Ä‘áº¿n')
      return
    }
    setSubmittingTransfer(true)
    try {
      await apiTransferStudent(classItem.id, transferTarget.id, {
        targetClassroomId: targetClassId,
        reason: transferReason.trim() || undefined,
      })
      toast.success(`ÄÃ£ chuyá»ƒn há»c sinh ${transferTarget.name} sang lá»›p má»›i`)
      setTransferTarget(null)
      setTransferReason('')
      loadStudents()
      onClassUpdated()
      notifyStudentDataChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi chuyá»ƒn lá»›p')
    } finally {
      setSubmittingTransfer(false)
    }
  }

  const handleRemoveStudent = async () => {
    if (!deleteTarget) return
    try {
      await apiRemoveStudent(classItem.id, deleteTarget.id)
      toast.success(`ÄÃ£ rÃºt há»c sinh ${deleteTarget.name} khá»i lá»›p`)
      setDeleteTarget(null)
      loadStudents()
      onClassUpdated()
      notifyStudentDataChanged()
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi rÃºt há»c sinh')
    }
  }

  const otherClasses = allClasses.filter((c) => c.id !== classItem.id && c.status !== 'COMPLETED')

  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">
            Danh sÃ¡ch há»c sinh ({students.length} HS)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Quáº£n lÃ½ há»“ sÆ¡, thÃ´ng tin liÃªn láº¡c phá»¥ huynh vÃ  theo dÃµi tiáº¿n Ä‘á»™ tá»«ng há»c sinh.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="text"
            placeholder="TÃ¬m há»c sinh theo tÃªn, mÃ£..."
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
            <UserPlus className="size-3.5" /> ThÃªm há»c sinh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs">Äang táº£i danh sÃ¡ch há»c sinh...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Users className="size-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">ChÆ°a cÃ³ há»c sinh nÃ o trong lá»›p</p>
            <p className="text-xs text-slate-400 mt-0.5">Nháº¥n "ThÃªm há»c sinh" hoáº·c "Import Excel" Ä‘á»ƒ báº¯t Ä‘áº§u.</p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4">Há» vÃ  tÃªn</th>
                <th className="py-3 px-3">MÃ£ HS</th>
                <th className="py-3 px-3">Giá»›i tÃ­nh</th>
                <th className="py-3 px-3">NgÃ y sinh</th>
                <th className="py-3 px-3">Há»c lá»±c</th>
                <th className="py-3 px-3">ChuyÃªn cáº§n</th>
                <th className="py-3 px-4 text-right">Thao tÃ¡c</th>
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
                  <td className="py-3 px-3 font-mono text-slate-600 font-semibold">{s.studentCode || 'â€”'}</td>
                  <td className="py-3 px-3 text-slate-600">{s.gender}</td>
                  <td className="py-3 px-3 text-slate-600">{s.dob}</td>
                  <td className="py-3 px-3">
                    <Badge variant={statusVariant(s.status)} className="text-[10px]">
                      {s.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-semibold text-teal-700">
                    {s.attendance !== null && s.attendance !== undefined ? `${s.attendance}%` : 'â€”'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => onOpenStudent(s)}
                        title="Xem há»“ sÆ¡"
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
                        title="Chuyá»ƒn lá»›p"
                        className="size-7 text-slate-500 hover:text-blue-700 cursor-pointer"
                      >
                        <ArrowRightLeft className="size-3.5" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setDeleteTarget(s)}
                        title="RÃºt khá»i lá»›p"
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
            <DialogTitle>ThÃªm há»c sinh má»›i vÃ o lá»›p</DialogTitle>
            <DialogDescription>Nháº­p thÃ´ng tin cÃ¡ nhÃ¢n vÃ  liÃªn há»‡ phá»¥ huynh.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs font-semibold">Há» vÃ  tÃªn *</Label>
                <Input
                  placeholder="Nguyá»…n VÄƒn An"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Giá»›i tÃ­nh</Label>
                <select
                  value={addGender}
                  onChange={(e) => setAddGender(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Ná»¯">Ná»¯</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">NgÃ y sinh (DD/MM/YYYY)</Label>
                <Input
                  placeholder="12/04/2016"
                  value={addDob}
                  onChange={(e) => setAddDob(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Äiá»‡n thoáº¡i phá»¥ huynh</Label>
                <Input
                  placeholder="0901 234 567"
                  value={addParentPhone}
                  onChange={(e) => setAddParentPhone(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Há» tÃªn phá»¥ huynh / NgÆ°á»i giÃ¡m há»™</Label>
              <Input
                placeholder="Nguyá»…n Thá»‹ Hoa"
                value={addParentName}
                onChange={(e) => setAddParentName(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Ghi chÃº ban Ä‘áº§u (náº¿u cÃ³)</Label>
              <Input
                placeholder="HÄƒng hÃ¡i phÃ¡t biá»ƒu, tiáº¿p thu bÃ i nhanh..."
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)} disabled={submittingAdd}>
              Há»§y
            </Button>
            <Button
              size="sm"
              onClick={handleAddStudent}
              disabled={submittingAdd || !addName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs cursor-pointer"
            >
              {submittingAdd ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />} ThÃªm há»c sinh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMPORT EXCEL / CSV MODAL */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import danh sÃ¡ch há»c sinh tá»« Excel / Báº£ng dá»¯ liá»‡u</DialogTitle>
            <DialogDescription>
              DÃ¡n dá»¯ liá»‡u tá»« báº£ng tÃ­nh (Excel/Google Sheets) theo Ä‘á»‹nh dáº¡ng: <br />
              <code>Há» tÃªn, MÃ£ HS, Giá»›i tÃ­nh, NgÃ y sinh, TÃªn phá»¥ huynh, Sá»‘ Ä‘iá»‡n thoáº¡i, Ghi chÃº</code>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Textarea
              placeholder="Nguyá»…n VÄƒn An	HS001	Nam	12/04/2016	Nguyá»…n Thá»‹ Hoa	0901234567	Chá»§ Ä‘á»™ng phÃ¡t biá»ƒu
Tráº§n Thá»‹ BÃ¬nh	HS002	Ná»¯	25/08/2016	Tráº§n VÄƒn CÆ°á»ng	0912345678	Tiáº¿p thu nhanh"
              value={importText}
              onChange={(e) => handleParseImport(e.target.value)}
              rows={5}
              className="text-xs font-mono"
            />

            {importRows.length > 0 && (
              <div className="border rounded-xl p-3 bg-slate-50 max-h-48 overflow-y-auto space-y-1.5">
                <p className="font-bold text-slate-700">Xem trÆ°á»›c ({importRows.length} dÃ²ng):</p>
                {importRows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] bg-white p-2 rounded border">
                    <span className="font-semibold text-slate-800">
                      {i + 1}. {r.fullName} ({r.gender || 'Nam'}) - MÃ£: {r.studentCode || 'Tá»± Ä‘á»™ng'}
                    </span>
                    <span className="text-slate-500">{r.dob || 'ChÆ°a ngÃ y sinh'} Â· {r.parentPhone || 'ChÆ°a SÄT'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportModalOpen(false)}>Há»§y</Button>
            <Button
              size="sm"
              onClick={handleExecuteImport}
              disabled={submittingImport || importRows.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer"
            >
              {submittingImport ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />} XÃ¡c nháº­n Import ({importRows.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TRANSFER STUDENT MODAL */}
      <Dialog open={!!transferTarget} onOpenChange={(val) => !val && setTransferTarget(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Chuyá»ƒn lá»›p cho há»c sinh</DialogTitle>
            <DialogDescription>
              Chuyá»ƒn há»c sinh <strong>{transferTarget?.name}</strong> sang má»™t lá»›p há»c khÃ¡c trong cÃ¹ng nÄƒm há»c.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Chá»n lá»›p chuyá»ƒn Ä‘áº¿n *</Label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
              >
                {otherClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade} Â· {c.room})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">LÃ½ do chuyá»ƒn lá»›p (tÃ¹y chá»n)</Label>
              <Input
                placeholder="Chuyá»ƒn phÃ¢n ban / theo nguyá»‡n vá»ng..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setTransferTarget(null)}>Há»§y</Button>
            <Button
              size="sm"
              onClick={handleTransfer}
              disabled={submittingTransfer || !targetClassId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer"
            >
              {submittingTransfer ? 'Äang chuyá»ƒn...' : 'XÃ¡c nháº­n chuyá»ƒn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WITHDRAW / DELETE STUDENT CONFIRMATION */}
      <Dialog open={!!deleteTarget} onOpenChange={(val) => !val && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>RÃºt há»c sinh khá»i lá»›p</DialogTitle>
            <DialogDescription>
              Báº¡n cÃ³ cháº¯c muá»‘n rÃºt há»c sinh <strong>{deleteTarget?.name}</strong> khá»i lá»›p? Há»“ sÆ¡ vÃ  dá»¯ liá»‡u Ä‘iá»ƒm danh, Ä‘Ã¡nh giÃ¡ trÆ°á»›c Ä‘Ã³ váº«n Ä‘Æ°á»£c lÆ°u giá»¯ trong há»‡ thá»‘ng.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Há»§y</Button>
            <Button variant="destructive" size="sm" onClick={handleRemoveStudent} className="cursor-pointer">
              XÃ¡c nháº­n rÃºt há»c sinh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 3: Lá»ŠCH Dáº Y Cá»¦A Lá»šP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
            Thá»i khÃ³a biá»ƒu & Tiáº¿t dáº¡y ({schedules.length} tiáº¿t)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Danh sÃ¡ch cÃ¡c tiáº¿t giáº£ng dáº¡y Ä‘Æ°á»£c lÃªn lá»‹ch táº¡i lá»›p {classItem.name}.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs">Äang táº£i lá»‹ch dáº¡y...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CalendarDays className="size-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">ChÆ°a cÃ³ tiáº¿t dáº¡y nÃ o Ä‘Æ°á»£c xáº¿p lá»‹ch</p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">NgÃ y dáº¡y</th>
                <th className="py-3 px-3">Thá»i gian</th>
                <th className="py-3 px-3">MÃ´n há»c</th>
                <th className="py-3 px-3">GiÃ¡o viÃªn</th>
                <th className="py-3 px-3">GiÃ¡o Ã¡n</th>
                <th className="py-3 px-3">Äiá»ƒm danh</th>
                <th className="py-3 px-4 text-right">Thao tÃ¡c</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900">{s.plannedDate}</td>
                  <td className="py-3 px-3 text-slate-600">{s.startTime || '07:00'} - {s.endTime || '07:45'}</td>
                  <td className="py-3 px-3 font-semibold text-teal-900">{s.subject?.name || 'MÃ´n há»c'}</td>
                  <td className="py-3 px-3 text-slate-600">{s.teacher?.fullName || 'GiÃ¡o viÃªn'}</td>
                  <td className="py-3 px-3">
                    {s.lessonPlan ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="size-3" /> {s.lessonPlan.title}
                      </span>
                    ) : (
                      <span className="text-slate-400">ChÆ°a gáº¯n giÃ¡o Ã¡n</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {s.isAttendanceRecorded ? (
                      <span className="inline-flex items-center gap-1 text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        <Check className="size-3" /> ÄÃ£ Ä‘iá»ƒm danh
                      </span>
                    ) : (
                      <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ChÆ°a Ä‘iá»ƒm danh
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
                      Äiá»ƒm danh
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 4: ÄIá»‚M DANH Cá»¦A Lá»šP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
                : 'â€”'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Tá»· lá»‡ chuyÃªn cáº§n</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-slate-900">{summary.presentCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">LÆ°á»£t cÃ³ máº·t</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-blue-700">{summary.excusedCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">CÃ³ phÃ©p</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-rose-700">{summary.unexcusedCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">KhÃ´ng phÃ©p</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 text-center">
            <p className="text-2xl font-extrabold text-amber-700">{summary.lateCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Äi muá»™n</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Sessions List */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Nháº­t kÃ½ cÃ¡c buá»•i Ä‘iá»ƒm danh ({summary.totalSessions} buá»•i)
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Ghi nháº­n chi tiáº¿t theo tá»«ng tiáº¿t dáº¡y vÃ  ngÃ y há»c.
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
                {r === 'today' ? 'HÃ´m nay' : r === 'week' ? 'Tuáº§n nÃ y' : r === 'month' ? 'ThÃ¡ng nÃ y' : 'Táº¥t cáº£'}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs">Äang táº£i nháº­t kÃ½ Ä‘iá»ƒm danh...</p>
            </div>
          ) : (data?.sessions || []).length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CalendarCheck2 className="size-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">ChÆ°a cÃ³ dá»¯ liá»‡u Ä‘iá»ƒm danh trong khoáº£ng thá»i gian nÃ y</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">NgÃ y</th>
                  <th className="py-3 px-3">MÃ´n há»c</th>
                  <th className="py-3 px-3">GiÃ¡o viÃªn</th>
                  <th className="py-3 px-3">CÃ³ máº·t</th>
                  <th className="py-3 px-3">Váº¯ng</th>
                  <th className="py-3 px-3">Äi muá»™n</th>
                  <th className="py-3 px-4 text-right">Chi tiáº¿t</th>
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
                      {sess.stats.excused + sess.stats.unexcused} HS ({sess.stats.excused} phÃ©p)
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
                          Xem chi tiáº¿t
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 5: ÄÃNH GIÃ Cá»¦A Lá»šP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 5: Sá»” ÄIá»‚M & ÄÃNH GIÃ Cá»¦A Lá»šP (GRADEBOOK)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
      toast.error('KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u sá»• Ä‘iá»ƒm lá»›p')
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
      toast.success('ÄÃ£ lÆ°u toÃ n bá»™ Ä‘iá»ƒm vÃ o sá»• Ä‘iá»ƒm!')
      setDirtyCells(new Set())
      setSaveStatus('SAVED')
      loadGradebookData()
    } catch {
      setSaveStatus('ERROR')
      toast.error('LÆ°u Ä‘iá»ƒm tháº¥t báº¡i, vui lÃ²ng kiá»ƒm tra láº¡i Ä‘iá»ƒm sá»‘')
    }
  }

  // Create new assessment column
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newColTitle.trim()) {
      toast.error('Vui lÃ²ng nháº­p tÃªn láº§n Ä‘Ã¡nh giÃ¡')
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

      toast.success(`ÄÃ£ táº¡o cá»™t Ä‘iá»ƒm "${newColTitle.trim()}" thÃ nh cÃ´ng!`)
      setCreateColOpen(false)
      setNewColTitle('')
      loadGradebookData()
    } catch (err: any) {
      toast.error(err?.message || 'KhÃ´ng thá»ƒ táº¡o cá»™t Ä‘iá»ƒm má»›i')
    } finally {
      setCreatingCol(false)
    }
  }

  // Delete an assessment column
  const handleDeleteColumn = async (col: AssessmentColumn) => {
    if (!window.confirm(`Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a cá»™t Ä‘iá»ƒm "${col.title}"? Dá»¯ liá»‡u Ä‘iá»ƒm cá»§a há»c sinh á»Ÿ cá»™t nÃ y sáº½ bá»‹ xÃ³a.`)) {
      return
    }

    try {
      await deleteAssessmentColumn(col.id)
      toast.success(`ÄÃ£ xÃ³a cá»™t Ä‘iá»ƒm "${col.title}"`)
      loadGradebookData()
    } catch {
      toast.error('KhÃ´ng thá»ƒ xÃ³a cá»™t Ä‘iá»ƒm')
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
      toast.success(`ÄÃ£ lÆ°u Ä‘iá»ƒm cho cá»™t "${scoringColTarget.title}"`)
      setScoringColTarget(null)
      loadGradebookData()
    } catch {
      toast.error('LÆ°u Ä‘iá»ƒm tháº¥t báº¡i')
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
        notes: `Há»c sinh Ä‘áº¡t Ä‘iá»ƒm ${currentScore || 8.0} trong bÃ i ${scoringColTarget.title}`,
      })

      const commentText = res.overallAssessment || res.comments?.[0] || 'HoÃ n thÃ nh tá»‘t nhiá»‡m vá»¥ há»c táº­p.'

      setColumnScoresState((prev) => ({
        ...prev,
        [student.studentId]: {
          ...(prev[student.studentId] || { score: '' }),
          comment: commentText,
        },
      }))
      toast.success(`ÄÃ£ sinh nháº­n xÃ©t AI cho ${student.fullName}`)
    } catch {
      toast.error('KhÃ´ng thá»ƒ sinh nháº­n xÃ©t tá»± Ä‘á»™ng')
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
      toast.success('ÄÃ£ xuáº¥t file sá»• Ä‘iá»ƒm thÃ nh cÃ´ng!')
    } catch {
      toast.error('KhÃ´ng thá»ƒ xuáº¥t file sá»• Ä‘iá»ƒm')
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
        error = 'Äiá»ƒm sá»‘ pháº£i tá»« 0 Ä‘áº¿n 10'
      }

      const match = gradebook.students.find(
        (s) =>
          (studentCode && s.studentCode?.toLowerCase() === studentCode.toLowerCase()) ||
          (fullName && s.fullName.toLowerCase() === fullName.toLowerCase())
      )

      if (!match) {
        valid = false
        error = 'KhÃ´ng tÃ¬m tháº¥y há»c sinh trong lá»›p'
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
      toast.error('Vui lÃ²ng chá»n cá»™t Ä‘iá»ƒm vÃ  dÃ¡n dá»¯ liá»‡u há»£p lá»‡')
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
        toast.success(`ÄÃ£ import thÃ nh cÃ´ng Ä‘iá»ƒm cho ${res.importedCount} há»c sinh!`)
        setImportModalOpen(false)
        setImportRawText('')
        setImportPreviewRows([])
        loadGradebookData()
      } else {
        toast.error(res.message || 'Import tháº¥t báº¡i')
      }
    } catch {
      toast.error('Lá»—i trong quÃ¡ trÃ¬nh import Ä‘iá»ƒm')
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
            Sá»• Ä‘iá»ƒm Ä‘iá»‡n tá»­ Â· {classItem.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quáº£n lÃ½ Ä‘iá»ƒm sá»‘, tÃ­nh Ä‘iá»ƒm trung bÃ¬nh mÃ´n vÃ  xáº¿p loáº¡i há»c lá»±c theo ThÃ´ng tÆ° 27/TT22.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save status indicator */}
          {saveStatus === 'DIRTY' && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-semibold animate-pulse">
              <Clock className="size-3 mr-1" /> CÃ³ {dirtyCells.size} Ã´ chÆ°a lÆ°u
            </Badge>
          )}
          {saveStatus === 'SAVED' && dirtyCells.size === 0 && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 font-medium">
              <CheckCircle2 className="size-3 mr-1" /> ÄÃ£ lÆ°u
            </Badge>
          )}
          {saveStatus === 'SAVING' && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 font-medium">
              <Loader2 className="size-3 mr-1 animate-spin" /> Äang lÆ°u...
            </Badge>
          )}

          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={dirtyCells.size === 0 || saveStatus === 'SAVING'}
            className="bg-teal-600 text-white hover:bg-teal-700 font-semibold shadow-xs"
          >
            <Check className="size-3.5 mr-1.5" /> LÆ°u sá»• Ä‘iá»ƒm
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateColOpen(true)}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
          >
            <Plus className="size-3.5 mr-1 text-teal-600" /> Táº¡o cá»™t Ä‘iá»ƒm
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
            <Download className="size-3.5 mr-1 text-emerald-600" /> Xuáº¥t Excel
          </Button>
        </div>
      </div>

      {/* Grade Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-teal-700">
              {summary.classAverage !== null ? `${summary.classAverage} Ä‘` : 'â€”'}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Äiá»ƒm TB lá»›p</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-emerald-700">{summary.excellentCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">HoÃ n thÃ nh tá»‘t</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-blue-700">{summary.goodCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">HoÃ n thÃ nh</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-amber-700">{summary.completedCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Äáº¡t</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-rose-700">{summary.needsSupportCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Cáº§n cá»‘ gáº¯ng</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-extrabold text-slate-400">{summary.incompleteCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">ChÆ°a Ä‘á»§ dá»¯ liá»‡u</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-slate-600">MÃ´n há»c:</Label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-hidden"
          >
            <option value="ALL">Táº¥t cáº£ mÃ´n há»c</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-slate-600">Há»c ká»³:</Label>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-teal-500 focus:outline-hidden"
          >
            <option value={1}>Há»c ká»³ I</option>
            <option value={2}>Há»c ká»³ II</option>
          </select>
        </div>

        <div className="relative ml-auto min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="TÃ¬m theo tÃªn / mÃ£ HS..."
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
              Ma tráº­n Äiá»ƒm sá»‘ ({filteredStudents.length} há»c sinh Â· {columns.length} cá»™t Ä‘Ã¡nh giÃ¡)
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              Nháº­p trá»±c tiáº¿p Ä‘iá»ƒm vÃ o Ã´ vÃ  báº¥m <b>Enter</b> hoáº·c <b>Tab</b> Ä‘á»ƒ di chuyá»ƒn nhanh. Äiá»ƒm sá»‘ tá»« 0.0 Ä‘áº¿n 10.0.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadGradebookData}
            title="Táº£i láº¡i dá»¯ liá»‡u"
            className="size-8 p-0 text-slate-500 hover:text-slate-800"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
              <p className="text-xs">Äang táº£i báº£ng Ä‘iá»ƒm...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="size-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">ChÆ°a cÃ³ há»c sinh nÃ o trong lá»›p há»c nÃ y</p>
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
                      MÃ£ HS
                    </th>
                    <th className="sticky left-36 z-20 bg-slate-50 px-4 py-3 min-w-[160px] border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                      Há» vÃ  tÃªn
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
                                  <Edit2 className="size-3 mr-1.5 text-teal-600" /> Nháº­p Ä‘iá»ƒm & Nháº­n xÃ©t cá»™t nÃ y
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteColumn(col)} className="text-rose-600">
                                  <Trash2 className="size-3 mr-1.5" /> XÃ³a cá»™t Ä‘iá»ƒm nÃ y
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
                        ChÆ°a cÃ³ cá»™t Ä‘iá»ƒm nÃ o. Báº¥m "+ Táº¡o cá»™t Ä‘iá»ƒm" Ä‘á»ƒ báº¯t Ä‘áº§u.
                      </th>
                    )}

                    {/* Sticky Right Columns */}
                    <th className="sticky right-28 z-20 bg-slate-50 px-3 py-3 w-28 text-right font-bold text-teal-800 border-l border-slate-200 shadow-[-2px_0_5px_rgba(0,0,0,0.03)]">
                      Äiá»ƒm TB
                    </th>
                    <th className="sticky right-0 z-20 bg-slate-50 px-3 py-3 w-28 text-center font-bold text-slate-800">
                      Há»c lá»±c
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

                      {/* Sticky MÃ£ HS */}
                      <td className="sticky left-12 z-10 bg-white px-3 py-2 font-mono text-[11px] text-slate-500 border-r border-slate-100">
                        {student.studentCode || 'â€”'}
                      </td>

                      {/* Sticky Há» tÃªn */}
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
                              placeholder="â€”"
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

                      {columns.length === 0 && <td className="px-6 py-2 text-center text-slate-300">â€”</td>}

                      {/* Sticky Äiá»ƒm TB */}
                      <td className="sticky right-28 z-10 bg-white px-3 py-2 text-right font-extrabold text-teal-700 border-l border-slate-100 shadow-[-2px_0_5px_rgba(0,0,0,0.03)]">
                        {student.averageScore !== null ? `${student.averageScore}` : 'â€”'}
                      </td>

                      {/* Sticky Há»c lá»±c */}
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
                          <span className="text-slate-400 text-[11px]">ChÆ°a Ä‘á»§ dá»¯ liá»‡u</span>
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

      {/* â”€â”€ Dialog: Táº¡o cá»™t Ä‘iá»ƒm má»›i â”€â”€ */}
      <Dialog open={createColOpen} onOpenChange={setCreateColOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Táº¡o cá»™t Ä‘iá»ƒm / Láº§n Ä‘Ã¡nh giÃ¡</DialogTitle>
            <DialogDescription className="text-xs">
              ThÃªm má»™t cá»™t Ä‘Ã¡nh giÃ¡ má»›i vÃ o sá»• Ä‘iá»ƒm cá»§a lá»›p {classItem.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateColumn} className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">TÃªn láº§n Ä‘Ã¡nh giÃ¡ *</Label>
              <Input
                placeholder="VÃ­ dá»¥: Kiá»ƒm tra 15 phÃºt bÃ i 3, Giá»¯a ká»³ I..."
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                required
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">MÃ´n há»c</Label>
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
                <Label className="text-xs font-semibold">Há»c ká»³</Label>
                <select
                  value={newColSemester}
                  onChange={(e) => setNewColSemester(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-teal-500 focus:outline-hidden"
                >
                  <option value={1}>Há»c ká»³ I</option>
                  <option value={2}>Há»c ká»³ II</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Loáº¡i Ä‘Ã¡nh giÃ¡</Label>
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
                  <option value="THUONG_XUYEN">ThÆ°á»ng xuyÃªn (TX)</option>
                  <option value="GIUA_KY">Giá»¯a há»c ká»³ (GK)</option>
                  <option value="CUOI_KY">Cuá»‘i há»c ká»³ (CK)</option>
                  <option value="OTHER">KhÃ¡c</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Há»‡ sá»‘ tÃ­nh Ä‘iá»ƒm</Label>
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
              <Label className="text-xs font-semibold">NgÃ y Ä‘Ã¡nh giÃ¡</Label>
              <Input
                type="date"
                value={newColDate}
                onChange={(e) => setNewColDate(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreateColOpen(false)}>
                Há»§y
              </Button>
              <Button type="submit" size="sm" disabled={creatingCol} className="bg-teal-600 text-white hover:bg-teal-700 font-semibold">
                {creatingCol ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Plus className="size-3.5 mr-1" />} Táº¡o cá»™t Ä‘iá»ƒm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Dialog: Cháº¥m Ä‘iá»ƒm & Nháº­n xÃ©t chi tiáº¿t theo Cá»™t â”€â”€ */}
      <Dialog open={!!scoringColTarget} onOpenChange={(open) => !open && setScoringColTarget(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="size-4 text-teal-600" />
              Nháº­p Ä‘iá»ƒm chi tiáº¿t: {scoringColTarget?.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              MÃ´n: <b>{scoringColTarget?.subjectName}</b> Â· Há»‡ sá»‘: <b>{scoringColTarget?.weight}</b> Â· Lá»›p: <b>{classItem.name}</b>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 pr-1 space-y-2.5">
            {gradebook?.students.map((s, idx) => (
              <div key={s.studentId} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="min-w-[180px]">
                  <span className="text-slate-400 font-mono mr-1.5">#{idx + 1}</span>
                  <b className="text-slate-900 font-semibold">{s.fullName}</b>
                  <p className="text-[11px] text-slate-400 font-mono">{s.studentCode || 'â€”'}</p>
                </div>

                <div className="w-24">
                  <Label className="text-[10px] text-slate-500">Äiá»ƒm sá»‘ (0-10)</Label>
                  <Input
                    type="text"
                    placeholder="â€”"
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
                    <Label className="text-[10px] text-slate-500">Nháº­n xÃ©t cá»§a giÃ¡o viÃªn</Label>
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
                      Gá»£i Ã½ AI
                    </button>
                  </div>
                  <Input
                    placeholder="Nháº­p nháº­n xÃ©t hoáº·c dÃ¹ng gá»£i Ã½ AI..."
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
              Há»§y
            </Button>
            <Button size="sm" onClick={handleSaveColumnModalScores} disabled={savingColumnScores} className="bg-teal-600 text-white hover:bg-teal-700 font-semibold">
              {savingColumnScores ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />} LÆ°u káº¿t quáº£
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Dialog: Import Äiá»ƒm tá»« Excel â”€â”€ */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UploadCloud className="size-4 text-blue-600" />
              Import Ä‘iá»ƒm tá»« Excel / Báº£ng tÃ­nh
            </DialogTitle>
            <DialogDescription className="text-xs">
              DÃ¡n dá»¯ liá»‡u tá»« file Excel theo Ä‘á»‹nh dáº¡ng: <b>MÃ£ HS / Há» tÃªn, Äiá»ƒm sá»‘, Nháº­n xÃ©t (tÃ¹y chá»n)</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div>
              <Label className="text-xs font-semibold">Chá»n cá»™t Ä‘iá»ƒm cáº§n nháº­p dá»¯ liá»‡u *</Label>
              <select
                value={importTargetColId}
                onChange={(e) => setImportTargetColId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-500 focus:outline-hidden"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.subjectName} Â· {c.type === 'CUOI_KY' ? 'Há»‡ sá»‘ 3' : c.type === 'GIUA_KY' ? 'Há»‡ sá»‘ 2' : 'Há»‡ sá»‘ 1'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">DÃ¡n dá»¯ liá»‡u báº£ng tÃ­nh vÃ o Ä‘Ã¢y:</Label>
              <Textarea
                rows={5}
                placeholder="HS0001, 8.5, LÃ m bÃ i tá»‘t&#10;HS0002, 9.0, Xuáº¥t sáº¯c&#10;Nguyá»…n VÄƒn C, 7.5, Cáº§n cá»‘ gáº¯ng hÆ¡n"
                value={importRawText}
                onChange={(e) => handleParseImport(e.target.value)}
                className="mt-1 text-xs font-mono"
              />
            </div>

            {/* Preview Box */}
            {importPreviewRows.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                <div className="bg-slate-100 px-3 py-2 font-bold text-slate-700 flex justify-between">
                  <span>Báº£n xem trÆ°á»›c ({importPreviewRows.length} dÃ²ng)</span>
                  <span className="text-emerald-700">
                    {importPreviewRows.filter((r) => r.valid).length} há»£p lá»‡ / {importPreviewRows.filter((r) => !r.valid).length} lá»—i
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {importPreviewRows.map((r) => (
                    <div key={r.row} className="px-3 py-1.5 flex items-center justify-between text-[11px]">
                      <span className="font-medium text-slate-800">
                        {r.studentCode || r.fullName} Â· Äiá»ƒm: <b>{r.score !== null ? r.score : 'â€”'}</b>
                      </span>
                      {r.valid ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">Há»£p lá»‡</Badge>
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
              Há»§y
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmImport}
              disabled={importingScores || importPreviewRows.filter((r) => r.valid).length === 0}
              className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
            >
              {importingScores ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Check className="size-3.5 mr-1" />} XÃ¡c nháº­n Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 6: GIÃO ÃN Cá»¦A Lá»šP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
            GiÃ¡o Ã¡n & Káº¿ hoáº¡ch bÃ i dáº¡y ({plans.length} bÃ i)
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Danh sÃ¡ch cÃ¡c giÃ¡o Ã¡n Ä‘Æ°á»£c soáº¡n tháº£o vÃ  phÃ¢n bá»• cho lá»›p {classItem.name}.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="size-6 animate-spin mx-auto text-teal-600 mb-2" />
            <p className="text-xs">Äang táº£i danh sÃ¡ch giÃ¡o Ã¡n...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="size-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">ChÆ°a cÃ³ giÃ¡o Ã¡n nÃ o Ä‘Æ°á»£c liÃªn káº¿t vá»›i lá»›p nÃ y</p>
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">TÃªn bÃ i há»c</th>
                <th className="py-3 px-3">MÃ´n há»c</th>
                <th className="py-3 px-3">Nguá»“n</th>
                <th className="py-3 px-3">Tráº¡ng thÃ¡i</th>
                <th className="py-3 px-4 text-right">Cáº­p nháº­t</th>
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
                      {p.status === 'COMPLETED' ? 'ÄÃ£ hoÃ n thÃ nh' : p.status === 'TAUGHT' ? 'ÄÃ£ dáº¡y' : 'Báº£n nhÃ¡p'}
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TAB 7: THá»NG KÃŠ Lá»šP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function TabStatistics({ classItem }: { classItem: ClassRecord }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="size-4 text-teal-600" /> Tá»· lá»‡ chuyÃªn cáº§n chung
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-teal-700">
                {classItem.attendance !== null && classItem.attendance !== undefined ? `${classItem.attendance}%` : 'â€”'}
              </span>
              <span className="text-xs text-slate-500">trÃªn tá»•ng sá»‘ tiáº¿t</span>
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
              <Award className="size-4 text-blue-600" /> Äiá»ƒm trung bÃ¬nh há»c ká»³
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-blue-700">
                {classItem.average !== null && classItem.average !== undefined ? `${classItem.average} Ä‘` : 'â€”'}
              </span>
              <span className="text-xs text-slate-500">/ 10 Ä‘iá»ƒm</span>
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
              <Users className="size-4 text-purple-600" /> Quy mÃ´ lá»›p há»c
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-purple-700">{classItem.studentCount || classItem.students?.length || 0}</span>
              <span className="text-xs text-slate-500">há»c sinh</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Äáº§y Ä‘á»§ há»“ sÆ¡ vÃ  danh sÃ¡ch phÃ¢n lá»›p</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100">
          <CardTitle className="text-sm font-bold">Gá»£i Ã½ nÃ¢ng cao cháº¥t lÆ°á»£ng lá»›p há»c tá»« TeachFlow AI</CardTitle>
          <CardDescription className="text-xs">PhÃ¢n tÃ­ch tá»± Ä‘á»™ng dá»±a trÃªn chuyÃªn cáº§n vÃ  Ä‘iá»ƒm Ä‘Ã¡nh giÃ¡.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-2 text-xs text-slate-700">
          <div className="flex items-start gap-2 p-3 bg-teal-50/50 rounded-xl border border-teal-100">
            <Sparkles className="size-4 text-teal-600 shrink-0 mt-0.5" />
            <p>
              Tá»· lá»‡ chuyÃªn cáº§n cá»§a lá»›p Ä‘áº¡t <strong>{classItem.attendance !== null && classItem.attendance !== undefined ? `${classItem.attendance}%` : 'Ä‘ang cáº­p nháº­t'}</strong>. NÃªn duy trÃ¬ cÃ¡c hoáº¡t Ä‘á»™ng khá»Ÿi Ä‘á»™ng sÃ´i ná»•i Ä‘á»ƒ giá»¯ vá»¯ng tinh tháº§n há»c táº­p.
            </p>
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
            <Heart className="size-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Äá»‘i vá»›i nhÃ³m há»c sinh cáº§n há»— trá»£, giÃ¡o viÃªn cÃ³ thá»ƒ táº¡o thÃªm phiáº¿u bÃ i táº­p phÃ¢n hÃ³a dáº¡ng má»©c Ä‘á»™ 1-2 tá»« má»¥c <strong>Phiáº¿u há»c táº­p</strong> Ä‘á»ƒ bá»• trá»£ kiáº¿n thá»©c.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// INDIVIDUAL STUDENT PROFILE VIEW
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
      toast.success('ÄÃ£ lÆ°u nháº­n xÃ©t há»c sinh')
      loadComments()
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i khi lÆ°u nháº­n xÃ©t')
    } finally {
      setSavingComment(false)
    }
  }

  const handleGenerateAIComment = async () => {
    setGeneratingAI(true)
    try {
      const res = await generateStudentComment({
        studentId: student.id,
        subject: 'Táº¥t cáº£ mÃ´n há»c',
        notes: 'ChÄƒm chá»‰, hoÃ n thÃ nh bÃ i táº­p Ä‘áº§y Ä‘á»§',
      })
      const commentText = res?.comments?.[0] || res?.overallAssessment || ''
      if (commentText) {
        setNewComment(commentText)
        toast.success('ÄÃ£ sinh gá»£i Ã½ nháº­n xÃ©t tá»« AI!')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i sinh nháº­n xÃ©t AI')
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
      toast.success('ÄÃ£ cáº­p nháº­t há»“ sÆ¡ há»c sinh!')
      setEditModalOpen(false)
      onStudentUpdated()
    } catch (err: any) {
      toast.error(err?.message || 'Lá»—i cáº­p nháº­t há»“ sÆ¡')
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
        <ArrowLeft className="size-3.5" /> Quay láº¡i lá»›p {classItem.name}
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
                Lá»›p {classItem.name} ({classItem.code || ''}) Â· MÃ£ HS: <span className="font-mono font-bold text-slate-700">{student.studentCode || 'ChÆ°a cáº¥p'}</span>
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)} className="text-xs gap-1.5 cursor-pointer">
            <Edit2 className="size-3.5" /> Sá»­a há»“ sÆ¡
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Demographics & Parent info */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <User className="size-4 text-teal-600" /> ThÃ´ng tin cÃ¡ nhÃ¢n & Gia Ä‘Ã¬nh
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Giá»›i tÃ­nh:</span>
              <span className="font-semibold text-slate-900">{student.gender}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">NgÃ y sinh:</span>
              <span className="font-semibold text-slate-900">{student.dob}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Phá»¥ huynh / GiÃ¡m há»™:</span>
              <span className="font-semibold text-slate-900">{student.guardian || 'ChÆ°a cáº­p nháº­t'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Sá»‘ Ä‘iá»‡n thoáº¡i liÃªn há»‡:</span>
              <span className="font-mono font-bold text-teal-700">{student.phone || 'ChÆ°a cáº­p nháº­t'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Learning metrics */}
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-600" /> Tiáº¿n Ä‘á»™ & ChuyÃªn cáº§n
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Tá»· lá»‡ chuyÃªn cáº§n:</span>
              <span className="font-bold text-teal-700">
                {student.attendance !== null && student.attendance !== undefined ? `${student.attendance}%` : 'â€”'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Má»©c Ä‘á»™ hoÃ n thÃ nh bÃ i:</span>
              <span className="font-bold text-blue-700">{student.progress}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">ÄÃ¡nh giÃ¡ chung:</span>
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
              <MessageSquare className="size-4 text-teal-600" /> Nháº­n xÃ©t cá»§a giÃ¡o viÃªn
            </CardTitle>
            <CardDescription className="text-xs">
              LÆ°u trá»¯ nháº­t kÃ½ nháº­n xÃ©t vÃ  Ä‘Ã¡nh giÃ¡ thÆ°á»ng xuyÃªn cho há»c sinh.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateAIComment}
            disabled={generatingAI}
            className="text-xs gap-1.5 text-teal-700 border-teal-200 cursor-pointer"
          >
            {generatingAI ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3.5 text-amber-500" />} Gá»£i Ã½ tá»« AI
          </Button>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Nháº­p nháº­n xÃ©t cho há»c sinh (hoáº·c báº¥m 'Gá»£i Ã½ tá»« AI')..."
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
                {savingComment ? 'Äang lÆ°u...' : 'LÆ°u nháº­n xÃ©t'}
              </Button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 pt-2">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">ChÆ°a cÃ³ nháº­n xÃ©t nÃ o Ä‘Æ°á»£c ghi nháº­n</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-700">{c.teacherName || 'GiÃ¡o viÃªn'}</span>
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
            <DialogTitle>Chá»‰nh sá»­a há»“ sÆ¡ há»c sinh</DialogTitle>
            <DialogDescription>Cáº­p nháº­t thÃ´ng tin cÃ¡ nhÃ¢n vÃ  sá»‘ Ä‘iá»‡n thoáº¡i phá»¥ huynh.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Há» vÃ  tÃªn *</Label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Giá»›i tÃ­nh</Label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs focus:outline-teal-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Ná»¯">Ná»¯</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">NgÃ y sinh</Label>
                <Input
                  value={editDob}
                  onChange={(e) => setEditDob(e.target.value)}
                  className="mt-1 text-xs h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Há» tÃªn phá»¥ huynh</Label>
              <Input
                value={editParentName}
                onChange={(e) => setEditParentName(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Äiá»‡n thoáº¡i phá»¥ huynh</Label>
              <Input
                value={editParentPhone}
                onChange={(e) => setEditParentPhone(e.target.value)}
                className="mt-1 text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>Há»§y</Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={savingEdit || !editFullName.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs cursor-pointer"
            >
              {savingEdit ? 'Äang lÆ°u...' : 'LÆ°u há»“ sÆ¡'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
